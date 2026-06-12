// ============================================================
// SmartLink_ECG_BLE_v4.ino  —  MAIN FIRMWARE
//
// Production firmware for the SmartLink ESP32-S3 board.
// Reads sensors and streams data to the Android app over BLE.
//
// ---- Sensors ----
//   AD8232 ECG module   → GPIO4 (signal), GPIO5 (LO+), GPIO6 (LO-)
//   DS18B20 (contact)   → GPIO7  — body/contact temperature  [NEW in v4]
//   DHT22               → GPIO1  — humidity (+ ambient temp, kept internal)
//   (Pulse from ECG)    → BPM computed from AD8232 R-peak detection
//
// ---- BLE Protocol ----
//   Service UUID:         0000FFE0-...
//   ECG characteristic:   0000FFE2-... (notify)
//     Payload: comma-separated 12-bit ADC integers, 10 samples/packet
//   Status characteristic: 0000FFE1-... (notify + read)
//     Payload: JSON sent every 5 seconds
//     Example: {"leadOff":false,"rate":100,"temp":36.5,"hum":55.2,"bpm":72}
//     NOTE v4: "temp" is now the DS18B20 CONTACT temperature, not ambient.
//              "hum" still comes from the DHT22.
//              DHT22 ambient temperature is still read and stored in
//              currentAmbientTemp — uncomment the "ambTemp" block below
//              to add it as a new JSON field later.
//
// ---- Changes vs v3 ----
//   + DS18B20 contact temperature sensor on GPIO7 (OneWire)
//   + "temp" JSON field now = contact temperature (DS18B20)
//   + DHT22 kept for humidity; its temperature stored but not sent
//   + DS18B20 read is fully non-blocking (async conversion) so the
//     100 Hz ECG sampling is not disturbed
//
// ---- Required Libraries (Arduino Library Manager) ----
//   "OneWire" by Paul Stoffregen                       [NEW in v4]
//   "DallasTemperature" by Miles Burton                [NEW in v4]
//   "DHT sensor library" by Adafruit
//   "Adafruit Unified Sensor" by Adafruit (dependency of DHT lib)
//   "ESP32 BLE Arduino" (included in the esp32 board package)
//
// ---- Board ----
//   ESP32-S3 Dev Module, Arduino ESP32 core 3.x
// ============================================================

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "DHT.h"               // Adafruit DHT sensor library
#include <Wire.h>              // I2C — auto-detect optional pulse sensor
#include <OneWire.h>           // DS18B20 bus protocol
#include <DallasTemperature.h> // DS18B20 driver

// ===================== PIN DEFINITIONS =====================

// AD8232 ECG module:
//   OUTPUT → GPIO4 (analog), LO+ → GPIO5, LO- → GPIO6
#define ECG_PIN       4
#define LO_PLUS_PIN   5
#define LO_MINUS_PIN  6

// DHT22 (humidity + ambient temperature):
//   DATA → GPIO1 (10kΩ pull-up to 3.3V)
#define DHT_PIN   1
#define DHT_TYPE  DHT22

// DS18B20 contact temperature sensor:           [NEW in v4]
//   VCC  → 3.3V
//   GND  → GND
//   DATA → GPIO7 (4.7kΩ pull-up resistor between DATA and 3.3V — REQUIRED)
#define DS18B20_PIN  7

// Built-in LED — flashes on each detected heartbeat.
#define LED_PIN  2

// ===================== SENZOR DE PULS (opțional, I2C) =====================
// Identic cu v3 — detecție automată MAX30102 la 0x57, fallback pe ECG.
#define PULSE_I2C_ADDR  0x57

bool g_hasPulseSensor = false;
int  g_lastValidBpm   = 0;

bool detectPulseSensor() {
  Wire.beginTransmission(PULSE_I2C_ADDR);
  return (Wire.endTransmission() == 0);
}

// PAUL: completează cu citirea senzorului tău (vezi comentariile din v3).
int readPulseSensorBpm() {
  return 0;
}

// ===================== BLE UUIDs =====================
#define SERVICE_UUID     "0000ffe0-0000-1000-8000-00805f9b34fb"
#define ECG_CHAR_UUID    "0000ffe2-0000-1000-8000-00805f9b34fb"
#define STATUS_CHAR_UUID "0000ffe1-0000-1000-8000-00805f9b34fb"

// ===================== ECG SAMPLING =====================
#define SAMPLE_RATE         100
#define SAMPLES_PER_PKT     10
#define SAMPLE_INTERVAL_US  (1000000 / SAMPLE_RATE)

// ===================== MOVING AVERAGE FILTER =====================
// MA_SIZE = 2: light smoothing, preserves QRS sharpness. Do not increase >4.
#define MA_SIZE 2
uint16_t maBuffer[MA_SIZE] = {0, 0};
int      maIndex = 0;
uint32_t maSum   = 0;

uint16_t movingAvg(uint16_t newSample) {
  maSum -= maBuffer[maIndex];
  maBuffer[maIndex] = newSample;
  maSum += newSample;
  maIndex = (maIndex + 1) % MA_SIZE;
  return (uint16_t)(maSum / MA_SIZE);
}

// ===================== HEARTBEAT DETECTION + LED =====================
#define HEARTBEAT_THRESHOLD   2700
#define HEARTBEAT_REFRACTORY  300
#define LED_FLASH_MS          80

unsigned long lastHeartbeatMs = 0;
unsigned long ledOffMs        = 0;
bool          ledOn           = false;
bool          wasAboveThresh  = false;

// ===================== BPM ROLLING AVERAGE =====================
#define BPM_WINDOW 8
unsigned long beatTimes[BPM_WINDOW] = {0};
int  beatHead   = 0;
int  beatCount  = 0;
int  currentBpm = 0;

void recordBeat(unsigned long nowMs) {
  beatTimes[beatHead] = nowMs;
  beatHead = (beatHead + 1) % BPM_WINDOW;
  if (beatCount < BPM_WINDOW) beatCount++;

  if (beatCount >= 2) {
    int oldestIdx = (beatHead - beatCount + BPM_WINDOW) % BPM_WINDOW;
    int newestIdx = (beatHead - 1 + BPM_WINDOW) % BPM_WINDOW;
    unsigned long span = beatTimes[newestIdx] - beatTimes[oldestIdx];
    if (span > 0) {
      currentBpm = (int)(60000UL * (unsigned long)(beatCount - 1) / span);
      if (currentBpm < 20 || currentBpm > 250) currentBpm = 0;
    }
  }
}

// ===================== DHT22 (humidity + ambient temp) =====================
DHT   dht(DHT_PIN, DHT_TYPE);
float currentAmbientTemp = NAN;  // ambient °C — kept internal, NOT sent (yet)
float currentHum         = NAN;  // relative humidity % — sent as "hum"
unsigned long lastDhtReadMs = 0;
#define DHT_READ_INTERVAL_MS 2000

// ===================== DS18B20 (contact temp) =====================  [NEW in v4]
// Read NON-BLOCKING: a 12-bit conversion takes ~750ms, so we never wait for it.
// State machine:
//   1. every DS_READ_INTERVAL_MS → requestTemperatures() (returns immediately
//      because setWaitForConversion(false)) and remember the request time
//   2. once DS_CONVERSION_MS have passed → read the result from the scratchpad
// Each step blocks the loop only ~5-10ms (OneWire bus transaction), same
// order of magnitude as a DHT22 read — confirmed not to disturb ECG sampling.
OneWire           oneWire(DS18B20_PIN);
DallasTemperature ds18b20(&oneWire);
DeviceAddress     dsAddr;                  // ROM address cached at boot (faster reads)
bool  g_hasDS18B20       = false;          // auto-detected in setup()
float currentContactTemp = NAN;            // contact °C — sent as "temp"
bool  dsConversionPending = false;
unsigned long dsRequestMs = 0;
#define DS_READ_INTERVAL_MS  2000          // how often to start a new conversion
#define DS_CONVERSION_MS     800           // 12-bit conversion needs 750ms; 800 = margin

// ===================== BLE STATE =====================
BLEServer*         pServer     = NULL;
BLECharacteristic* pEcgChar    = NULL;
BLECharacteristic* pStatusChar = NULL;
bool deviceConnected    = false;
bool oldDeviceConnected = false;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* s) {
    deviceConnected = true;
    memset(maBuffer, 0, sizeof(maBuffer));
    maSum = 0; maIndex = 0;
    beatCount = 0; beatHead = 0; currentBpm = 0;
    Serial.println("\n>>> TELEFON CONECTAT!\n");
  }
  void onDisconnect(BLEServer* s) {
    deviceConnected = false;
    Serial.println("\n>>> TELEFON DECONECTAT!\n");
  }
};

// ===================== SAMPLING STATE =====================
uint16_t      sampleBuffer[SAMPLES_PER_PKT];
int           sampleIndex    = 0;
unsigned long lastSampleTime = 0;
bool          leadOff        = false;
unsigned long lastStatusSend = 0;
unsigned long packetCount    = 0;

// ============================================================
void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=====================================================");
  Serial.println("=== SmartLink ECG v4 — ECG + DS18B20 + DHT22 + BPM ===");
  Serial.println("=====================================================\n");

  // ECG pins
  pinMode(LO_PLUS_PIN,  INPUT);
  pinMode(LO_MINUS_PIN, INPUT);
  pinMode(LED_PIN,      OUTPUT);
  digitalWrite(LED_PIN, LOW);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  // I2C + pulse sensor auto-detect (same as v3)
  Wire.begin();
  g_hasPulseSensor = detectPulseSensor();
  if (g_hasPulseSensor) {
    Serial.println("[OK] Senzor puls I2C detectat la 0x" + String(PULSE_I2C_ADDR, HEX));
  } else {
    Serial.println("[INFO] Niciun senzor puls I2C — BPM din semnalul ECG (fallback)");
  }

  // ---- DS18B20 init ----                                    [NEW in v4]
  ds18b20.begin();
  ds18b20.setWaitForConversion(false);   // CRITICAL: never block the loop 750ms
  if (ds18b20.getAddress(dsAddr, 0)) {
    g_hasDS18B20 = true;
    ds18b20.setResolution(dsAddr, 12);   // 0.0625°C resolution
    ds18b20.requestTemperatures();       // kick off first conversion now
    dsConversionPending = true;
    dsRequestMs = millis();
    Serial.println("[OK] DS18B20 detectat pe GPIO" + String(DS18B20_PIN) + " (contact temp)");
  } else {
    Serial.println("[WARN] DS18B20 NU a fost gasit pe GPIO" + String(DS18B20_PIN) +
                   "! Verifica firele si rezistenta pull-up 4.7k. \"temp\" va lipsi din JSON.");
  }

  // DHT22 init — first read deferred to loop() (WDT workaround, same as v3)
  dht.begin();
  Serial.println("[OK] DHT22 init pe GPIO" + String(DHT_PIN) + " (umiditate; prima citire dupa 2s)");

  // BLE init (identical to v3)
  Serial.println("[..] Pornire BLE...");
  BLEDevice::init("SmartLink-ECG");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  pEcgChar = pService->createCharacteristic(
    ECG_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY
  );
  pEcgChar->addDescriptor(new BLE2902());

  pStatusChar = pService->createCharacteristic(
    STATUS_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pStatusChar->addDescriptor(new BLE2902());

  pService->start();

  BLEAdvertising* pAdv = BLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);
  pAdv->setScanResponse(true);
  pAdv->setMinPreferred(0x06);
  BLEDevice::startAdvertising();

  Serial.println("[OK] BLE pornit: SmartLink-ECG");
  Serial.println("[OK] Format status: {leadOff, rate, temp=CONTACT, hum, bpm}");
  Serial.println("[OK] Astept conexiune Android...\n");

  lastSampleTime = micros();
  lastStatusSend = millis();
  lastDhtReadMs  = millis();
}

// ============================================================
void loop() {

  unsigned long nowMs = millis();

  // ===================== DS18B20 STATE MACHINE =====================  [NEW in v4]
  if (g_hasDS18B20) {
    if (dsConversionPending && nowMs - dsRequestMs >= DS_CONVERSION_MS) {
      // Conversion finished — read result (fast scratchpad read, ~6ms)
      float t = ds18b20.getTempC(dsAddr);
      dsConversionPending = false;
      // -127 = DEVICE_DISCONNECTED_C, 85.0 = power-on default (bad read)
      if (t > -55.0 && t < 125.0 && t != 85.0) {
        currentContactTemp = t;
      } else {
        Serial.println("[DS18B20] Citire invalida (" + String(t, 1) + ") — verifica firele");
      }
    }
    if (!dsConversionPending && nowMs - dsRequestMs >= DS_READ_INTERVAL_MS) {
      ds18b20.requestTemperatures();   // returns immediately (async mode)
      dsRequestMs = nowMs;
      dsConversionPending = true;
    }
  }

  // ===================== DHT22 READ (every 2 seconds) =====================
  // v4: temperature stored in currentAmbientTemp but NOT sent over BLE.
  //     Humidity is still sent as "hum".
  if (nowMs - lastDhtReadMs >= DHT_READ_INTERVAL_MS) {
    lastDhtReadMs = nowMs;
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) currentAmbientTemp = t;
    if (!isnan(h)) currentHum         = h;
    if (isnan(t) || isnan(h)) {
      Serial.println("[DHT] Eroare citire — NaN! Verifica firele si pin-ul GPIO" + String(DHT_PIN));
    } else {
      Serial.printf("[DHT] ambient %.1f°C  %.1f%%  |  [DS18B20] contact %.1f°C\n",
                    currentAmbientTemp, currentHum,
                    isnan(currentContactTemp) ? 0.0f : currentContactTemp);
    }
  }

  // ===================== ECG SAMPLING (100 Hz) — identical to v3 =====================
  unsigned long nowUs = micros();
  if (nowUs - lastSampleTime >= SAMPLE_INTERVAL_US) {
    lastSampleTime = nowUs;
    nowMs = millis();

    bool loPlus  = digitalRead(LO_PLUS_PIN);
    bool loMinus = digitalRead(LO_MINUS_PIN);
    leadOff = (loPlus || loMinus);

    uint16_t raw      = leadOff ? 0 : analogRead(ECG_PIN);
    uint16_t filtered = movingAvg(raw);

    if (!leadOff) {
      if (filtered > HEARTBEAT_THRESHOLD && !wasAboveThresh) {
        if (nowMs - lastHeartbeatMs > HEARTBEAT_REFRACTORY) {
          lastHeartbeatMs = nowMs;
          recordBeat(nowMs);
          digitalWrite(LED_PIN, HIGH);
          ledOffMs = nowMs + LED_FLASH_MS;
          ledOn    = true;
        }
        wasAboveThresh = true;
      } else if (filtered <= HEARTBEAT_THRESHOLD) {
        wasAboveThresh = false;
      }
    } else {
      wasAboveThresh = false;
      currentBpm     = 0;
      beatCount      = 0;
      beatHead       = 0;
    }

    if (ledOn && nowMs >= ledOffMs) {
      digitalWrite(LED_PIN, LOW);
      ledOn = false;
    }

    // Serial Plotter output at ~33 Hz
    static uint8_t plotterTick = 0;
    if (++plotterTick >= 3) {
      plotterTick = 0;
      Serial.print("raw:");       Serial.print(raw);
      Serial.print(",filtered:"); Serial.print(filtered);
      Serial.print(",bpm:");      Serial.println(currentBpm);
    }

    sampleBuffer[sampleIndex++] = filtered;

    if (sampleIndex >= SAMPLES_PER_PKT) {
      if (deviceConnected) {
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
  if (deviceConnected && millis() - lastStatusSend >= 5000) {
    lastStatusSend = millis();

    String status = "{\"leadOff\":"  + String(leadOff ? "true" : "false") +
                    ",\"rate\":"     + String(SAMPLE_RATE);

    // "temp" = DS18B20 CONTACT temperature                    [CHANGED in v4]
    // Omitted if the sensor is missing or has no valid reading yet —
    // the Android app uses optDouble() so a missing key is safe.
    if (!isnan(currentContactTemp)) {
      char tbuf[8];
      snprintf(tbuf, sizeof(tbuf), "%.1f", currentContactTemp);
      status += String(",\"temp\":") + tbuf;
    }

    // "hum" = DHT22 humidity (unchanged)
    if (!isnan(currentHum)) {
      char hbuf[8];
      snprintf(hbuf, sizeof(hbuf), "%.1f", currentHum);
      status += String(",\"hum\":") + hbuf;
    }

    // FUTURE: ambient temperature as its own field.
    // Uncomment when the Android app supports "ambTemp":
    // if (!isnan(currentAmbientTemp)) {
    //   char abuf[8];
    //   snprintf(abuf, sizeof(abuf), "%.1f", currentAmbientTemp);
    //   status += String(",\"ambTemp\":") + abuf;
    // }

    // BPM source selection (same as v3)
    int bpmToSend;
    if (g_hasPulseSensor) {
      int s = readPulseSensorBpm();
      bpmToSend = (s > 0) ? s : g_lastValidBpm;
    } else {
      bpmToSend = currentBpm;
    }
    if (bpmToSend > 0) g_lastValidBpm = bpmToSend;

    if (bpmToSend > 0) {
      status += String(",\"bpm\":") + String(bpmToSend);
    }

    status += "}";

    pStatusChar->setValue(status.c_str());
    pStatusChar->notify();

    Serial.printf("[Status] %s\n", status.c_str());
  }

  // ===================== RE-ADVERTISING AFTER DISCONNECT =====================
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
