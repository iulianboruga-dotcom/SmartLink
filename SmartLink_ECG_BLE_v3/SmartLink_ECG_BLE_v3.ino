// ============================================================
// SmartLink_ECG_BLE_v3.ino  —  MAIN FIRMWARE
//
// This is the production firmware for the SmartLink ESP32 board.
// It reads data from three sensors simultaneously and streams it
// to the Android app over Bluetooth Low Energy (BLE).
//
// ---- Sensors ----
//   AD8232 ECG module   → GPIO4 (signal), GPIO5 (LO+), GPIO6 (LO-)
//   DHT22               → GPIO1 (temperature + humidity)
//   (Pulse from ECG)    → BPM computed from AD8232 R-peak detection
//
// ---- BLE Protocol ----
//   Service UUID:         0000FFE0-...
//   ECG characteristic:   0000FFE2-... (notify)
//     Payload: comma-separated 12-bit ADC integers, 10 samples/packet
//     Example: "2048,2060,2055,2043,2070,2080,2055,2040,2065,2058"
//   Status characteristic: 0000FFE1-... (notify + read)
//     Payload: JSON sent every 5 seconds
//     Example: {"leadOff":false,"rate":100,"temp":36.5,"hum":55.2,"bpm":72}
//
// ---- Changes vs v2 ----
//   + DHT22 temperature + humidity added
//   + BPM rolling average over the last 8 detected R-peaks
//   + Status JSON extended with "temp", "hum", "bpm" fields
//   + DHT22 is initialized in setup() but first read is deferred to loop()
//     to avoid Interrupt WDT crashes during BLE init on ESP32-S3
//
// ---- Required Libraries (Arduino Library Manager) ----
//   "DHT sensor library" by Adafruit
//   "Adafruit Unified Sensor" by Adafruit (dependency of DHT lib)
//   "ESP32 BLE Arduino" (included in the esp32 board package)
//
// ---- Board ----
//   ESP32-S3 Dev Module (or similar ESP32 variant)
//   compileSdk: Arduino ESP32 core 3.x
// ============================================================

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "DHT.h"    // Adafruit DHT sensor library

// ===================== PIN DEFINITIONS =====================

// AD8232 ECG module connections:
//   OUTPUT → GPIO4 (analog signal, 0–3.3V, read with ADC)
//   LO+    → GPIO5 (lead-off detection positive, digital)
//   LO-    → GPIO6 (lead-off detection negative, digital)
// When either LO pin reads HIGH, electrodes are not in contact — signal is invalid.
#define ECG_PIN       4
#define LO_PLUS_PIN   5
#define LO_MINUS_PIN  6

// DHT22 temperature + humidity sensor:
//   VCC  → 3.3V
//   GND  → GND
//   DATA → GPIO1 (10kΩ pull-up resistor between DATA and VCC recommended)
#define DHT_PIN   1
#define DHT_TYPE  DHT22

// Built-in LED — flashes on each detected heartbeat for visual feedback.
// On most ESP32 boards, the built-in LED is on GPIO2.
#define LED_PIN  2

// ===================== BLE UUIDs =====================
// These must match exactly what the Android app expects.
// Using the HM-10 / BT module convention (FFE0 service family).
#define SERVICE_UUID     "0000ffe0-0000-1000-8000-00805f9b34fb"
#define ECG_CHAR_UUID    "0000ffe2-0000-1000-8000-00805f9b34fb"
#define STATUS_CHAR_UUID "0000ffe1-0000-1000-8000-00805f9b34fb"

// ===================== ECG SAMPLING =====================

// Sampling rate: 100 Hz = one ADC reading every 10ms.
// Lower than v1 (250 Hz) because DHT22 reads (blocking ~2ms) were
// occasionally causing timing jitter at higher rates.
#define SAMPLE_RATE         100
#define SAMPLES_PER_PKT     10
#define SAMPLE_INTERVAL_US  (1000000 / SAMPLE_RATE)   // 10,000 µs

// ===================== MOVING AVERAGE FILTER =====================
// Simple FIR low-pass filter to reduce high-frequency noise from the ADC.
// MA_SIZE = 2: light smoothing that preserves QRS peak sharpness.
// WARNING: increasing MA_SIZE beyond 4 will flatten the R-peak and break
// heartbeat detection — tested and confirmed during development.
#define MA_SIZE 2
uint16_t maBuffer[MA_SIZE] = {0, 0};
int      maIndex = 0;
uint32_t maSum   = 0;

/**
 * Returns the moving average of the last MA_SIZE ADC samples.
 * Uses a circular buffer to avoid recomputing the entire sum each tick.
 */
uint16_t movingAvg(uint16_t newSample) {
  maSum -= maBuffer[maIndex];    // subtract oldest value
  maBuffer[maIndex] = newSample;
  maSum += newSample;            // add newest value
  maIndex = (maIndex + 1) % MA_SIZE;
  return (uint16_t)(maSum / MA_SIZE);
}

// ===================== HEARTBEAT DETECTION + LED =====================
// Simple threshold-crossing R-peak detector.
// Fires when the filtered ECG signal crosses HEARTBEAT_THRESHOLD on a rising edge.
// HEARTBEAT_REFRACTORY prevents double-counting during the T-wave.

#define HEARTBEAT_THRESHOLD   2700   // ADC units (0–4095). Adjust to your signal amplitude.
#define HEARTBEAT_REFRACTORY  300    // ms — min time between valid beats (~200 BPM max)
#define LED_FLASH_MS          80     // ms — how long the LED stays on per beat

unsigned long lastHeartbeatMs = 0;
unsigned long ledOffMs        = 0;
bool          ledOn           = false;
bool          wasAboveThresh  = false;  // edge detection: was signal above threshold last tick?

// ===================== BPM ROLLING AVERAGE =====================
// Stores the timestamps (ms) of the last BPM_WINDOW detected R-peaks.
// BPM is calculated as: 60000 * (beatCount-1) / timespan_ms
// Using 8 beats gives a ~5-second averaging window at 60 BPM.
#define BPM_WINDOW 8
unsigned long beatTimes[BPM_WINDOW] = {0};
int  beatHead   = 0;   // next write position in the ring buffer
int  beatCount  = 0;   // number of valid beats stored (capped at BPM_WINDOW)
int  currentBpm = 0;   // last computed BPM (0 = not yet valid)

/**
 * Records a new R-peak timestamp and recomputes BPM.
 * BPM is clamped to 20–250 to reject noise-triggered false peaks.
 * Called from the main loop when a valid heartbeat is detected.
 */
void recordBeat(unsigned long nowMs) {
  beatTimes[beatHead] = nowMs;
  beatHead = (beatHead + 1) % BPM_WINDOW;
  if (beatCount < BPM_WINDOW) beatCount++;

  if (beatCount >= 2) {
    int oldestIdx = (beatHead - beatCount + BPM_WINDOW) % BPM_WINDOW;
    int newestIdx = (beatHead - 1 + BPM_WINDOW) % BPM_WINDOW;
    unsigned long span = beatTimes[newestIdx] - beatTimes[oldestIdx];
    if (span > 0) {
      // (beatCount-1) intervals span over 'span' milliseconds
      currentBpm = (int)(60000UL * (unsigned long)(beatCount - 1) / span);
      if (currentBpm < 20 || currentBpm > 250) currentBpm = 0;  // clamp
    }
  }
}

// ===================== DHT22 =====================
DHT   dht(DHT_PIN, DHT_TYPE);
float currentTemp = NAN;   // NAN = no valid reading yet
float currentHum  = NAN;
unsigned long lastDhtReadMs = 0;

// DHT22 maximum refresh rate is 0.5 Hz (one reading per 2 seconds minimum).
// Reading more often returns stale data or NaN.
#define DHT_READ_INTERVAL_MS 2000

// ===================== BLE STATE =====================
BLEServer*         pServer     = NULL;
BLECharacteristic* pEcgChar    = NULL;
BLECharacteristic* pStatusChar = NULL;
bool deviceConnected    = false;
bool oldDeviceConnected = false;

/**
 * BLE connection event callbacks.
 * onConnect: resets the moving average buffer and BPM history to avoid
 *   stale data artifacts from a previous session appearing at the start
 *   of a new connection.
 * onDisconnect: sets deviceConnected = false, triggering re-advertising
 *   in the main loop so the device is discoverable again immediately.
 */
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* s) {
    deviceConnected = true;
    // Clear MA buffer to avoid old samples bleeding into new session
    memset(maBuffer, 0, sizeof(maBuffer));
    maSum = 0; maIndex = 0;
    // Clear BPM history
    beatCount = 0; beatHead = 0; currentBpm = 0;
    Serial.println("\n>>> TELEFON CONECTAT!\n");
  }
  void onDisconnect(BLEServer* s) {
    deviceConnected = false;
    Serial.println("\n>>> TELEFON DECONECTAT!\n");
  }
};

// ===================== SAMPLING STATE =====================
uint16_t      sampleBuffer[SAMPLES_PER_PKT];  // Holds samples for current BLE packet
int           sampleIndex    = 0;             // Write position in sampleBuffer
unsigned long lastSampleTime = 0;             // Timestamp of last ADC read (µs)
bool          leadOff        = false;         // Current lead-off state
unsigned long lastStatusSend = 0;             // Timestamp of last status JSON send (ms)
unsigned long packetCount    = 0;             // Total BLE packets sent this session

// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n============================================");
  Serial.println("=== SmartLink ECG v3 — ECG + DHT22 + BPM ===");
  Serial.println("============================================\n");

  // Configure ECG sensor pins
  pinMode(LO_PLUS_PIN,  INPUT);
  pinMode(LO_MINUS_PIN, INPUT);
  pinMode(LED_PIN,      OUTPUT);
  digitalWrite(LED_PIN, LOW);

  // Configure ADC: 12-bit resolution (0–4095), full 3.3V range (11dB attenuation)
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // Initialize DHT22.
  // IMPORTANT: Do NOT read DHT22 here in setup().
  // Calling dht.read() while BLE is initializing can trigger an Interrupt WDT
  // on ESP32-S3. The first actual read happens in loop() after 2 seconds.
  dht.begin();
  Serial.println("[OK] DHT22 init pe GPIO" + String(DHT_PIN) + " (prima citire dupa 2s)");

  // Initialize BLE stack and create server
  Serial.println("[..] Pornire BLE...");
  BLEDevice::init("SmartLink-ECG");   // This is the advertised device name
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  // Create the service and its two characteristics
  BLEService* pService = pServer->createService(SERVICE_UUID);

  // ECG characteristic: notify-only, sends comma-separated ADC values
  pEcgChar = pService->createCharacteristic(
    ECG_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY
  );
  pEcgChar->addDescriptor(new BLE2902());  // Required for Android to enable notifications

  // Status characteristic: readable + notifiable, sends JSON every 5 seconds
  pStatusChar = pService->createCharacteristic(
    STATUS_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pStatusChar->addDescriptor(new BLE2902());

  pService->start();

  // Configure and start BLE advertising so the Android app can discover the device
  BLEAdvertising* pAdv = BLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);   // Advertise our service UUID for filtered scans
  pAdv->setScanResponse(true);
  pAdv->setMinPreferred(0x06);          // Helps with iOS connectivity (harmless on Android)
  BLEDevice::startAdvertising();

  Serial.println("[OK] BLE pornit: SmartLink-ECG");
  Serial.println("[OK] Format status: {leadOff, rate, temp, hum, bpm}");
  Serial.println("[OK] Astept conexiune Android...\n");

  lastSampleTime = micros();
  lastStatusSend = millis();
  lastDhtReadMs  = millis();
}

// ============================================================
void loop() {

  unsigned long nowMs = millis();

  // ===================== DHT22 READ (every 2 seconds) =====================
  // Non-blocking: uses millis() timer instead of delay().
  // If the sensor returns NaN (bad wiring or sensor fault), we keep the
  // last valid reading and log a warning to Serial.
  if (nowMs - lastDhtReadMs >= DHT_READ_INTERVAL_MS) {
    lastDhtReadMs = nowMs;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) currentTemp = t;   // Only update if reading is valid
    if (!isnan(h)) currentHum  = h;
    if (isnan(t) || isnan(h)) {
      Serial.println("[DHT] Eroare citire — NaN! Verifica firele si pin-ul GPIO" + String(DHT_PIN));
    } else {
      Serial.printf("[DHT] %.1f°C  %.1f%%\n", currentTemp, currentHum);
    }
  }

  // ===================== ECG SAMPLING (100 Hz) =====================
  // Uses micros() for precise timing — millis() resolution (1ms) is not
  // sufficient at 100 Hz (10ms period). This runs continuously regardless
  // of BLE connection state, so Serial Plotter works without the phone.
  unsigned long nowUs = micros();
  if (nowUs - lastSampleTime >= SAMPLE_INTERVAL_US) {
    lastSampleTime = nowUs;
    nowMs = millis();  // refresh ms timestamp after micros() call

    // Read lead-off pins — HIGH = electrode not in contact
    bool loPlus  = digitalRead(LO_PLUS_PIN);
    bool loMinus = digitalRead(LO_MINUS_PIN);
    leadOff = (loPlus || loMinus);

    // When lead-off is detected, send 0 instead of ADC garbage
    uint16_t raw      = leadOff ? 0 : analogRead(ECG_PIN);
    uint16_t filtered = movingAvg(raw);

    // ---- R-peak detection + LED flash + BPM computation ----
    if (!leadOff) {
      if (filtered > HEARTBEAT_THRESHOLD && !wasAboveThresh) {
        // Rising edge above threshold = potential R-peak
        if (nowMs - lastHeartbeatMs > HEARTBEAT_REFRACTORY) {
          lastHeartbeatMs = nowMs;
          recordBeat(nowMs);           // Update BPM rolling average
          digitalWrite(LED_PIN, HIGH); // Flash LED
          ledOffMs = nowMs + LED_FLASH_MS;
          ledOn    = true;
        }
        wasAboveThresh = true;
      } else if (filtered <= HEARTBEAT_THRESHOLD) {
        wasAboveThresh = false;  // Reset edge detector for next peak
      }
    } else {
      // Electrodes lifted: reset peak detector and BPM history
      wasAboveThresh = false;
      currentBpm     = 0;
      beatCount      = 0;
      beatHead       = 0;
    }

    // Turn off LED non-blocking (avoids using delay())
    if (ledOn && nowMs >= ledOffMs) {
      digitalWrite(LED_PIN, LOW);
      ledOn = false;
    }

    // ---- Serial Plotter output at ~33 Hz (every 3 ticks) ----
    // At 100Hz, printing every tick would overflow the Serial buffer.
    // At 33Hz we still capture 2–3 samples per QRS complex (~80ms wide).
    static uint8_t plotterTick = 0;
    if (++plotterTick >= 3) {
      plotterTick = 0;
      Serial.print("raw:");      Serial.print(raw);
      Serial.print(",filtered:"); Serial.print(filtered);
      Serial.print(",bpm:");     Serial.println(currentBpm);
    }

    // ---- Accumulate samples and send BLE packet when full ----
    sampleBuffer[sampleIndex++] = filtered;

    if (sampleIndex >= SAMPLES_PER_PKT) {
      if (deviceConnected) {
        // Build comma-separated string: "2048,2060,2055,..."
        String pkt = "";
        for (int i = 0; i < SAMPLES_PER_PKT; i++) {
          if (i > 0) pkt += ",";
          pkt += String(sampleBuffer[i]);
        }
        pEcgChar->setValue(pkt.c_str());
        pEcgChar->notify();
        packetCount++;
      }
      sampleIndex = 0;
    }
  }

  // ===================== STATUS JSON (every 5 seconds) =====================
  // Sent only when a phone is connected — no point transmitting otherwise.
  // Fields "temp", "hum", "bpm" are omitted if not yet available,
  // so the Android app uses optDouble/optInt which return defaults on missing keys.
  if (deviceConnected && millis() - lastStatusSend >= 5000) {
    lastStatusSend = millis();

    String status = "{\"leadOff\":"  + String(leadOff ? "true" : "false") +
                    ",\"rate\":"     + String(SAMPLE_RATE);

    if (!isnan(currentTemp)) {
      char tbuf[8];
      snprintf(tbuf, sizeof(tbuf), "%.1f", currentTemp);  // 1 decimal = DHT22 precision
      status += String(",\"temp\":") + tbuf;
    }
    if (!isnan(currentHum)) {
      char hbuf[8];
      snprintf(hbuf, sizeof(hbuf), "%.1f", currentHum);
      status += String(",\"hum\":") + hbuf;
    }
    if (currentBpm > 0) {
      status += String(",\"bpm\":") + String(currentBpm);
    }

    status += "}";

    pStatusChar->setValue(status.c_str());
    pStatusChar->notify();

    Serial.printf("[Status] %s\n", status.c_str());
  }

  // ===================== RE-ADVERTISING AFTER DISCONNECT =====================
  // When the phone disconnects, the ESP32 must call startAdvertising() again
  // to become discoverable. The 500ms delay allows the BLE stack to fully
  // clean up the previous connection before starting a new advertisement.
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  delay(1);  // Yield to RTOS — prevents watchdog timer reset
}
