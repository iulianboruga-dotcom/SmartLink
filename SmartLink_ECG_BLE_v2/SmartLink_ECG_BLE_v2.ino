// ============================================================
// SmartLink_ECG_BLE_v2.ino
//
// Previous production version — superseded by v3.
// Kept for reference. Main differences vs v3:
//   - No BPM rolling average (status JSON has no "bpm" field)
//   - DHT22 on GPIO19 instead of GPIO1
//   - DHT22 read interval 2500ms instead of 2000ms
//   - No DHT WDT workaround comment (added in v3)
//
// Use v3 for new deployments.
//
// Required libraries:
//   "DHT sensor library" by Adafruit
//   "Adafruit Unified Sensor" by Adafruit
//   "ESP32 BLE Arduino" (included in esp32 board package)
// ============================================================

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "DHT.h"

// AD8232 ECG module pins
#define ECG_PIN       4
#define LO_PLUS_PIN   5
#define LO_MINUS_PIN  6

// DHT22 — note: GPIO19 in v2, changed to GPIO1 in v3
#define DHTPIN  19
#define DHTTYPE DHT22
DHT dht(DHTPIN, DHTTYPE);

// BLE UUIDs — identical to Android app and v3
#define SERVICE_UUID     "0000ffe0-0000-1000-8000-00805f9b34fb"
#define ECG_CHAR_UUID    "0000ffe2-0000-1000-8000-00805f9b34fb"
#define STATUS_CHAR_UUID "0000ffe1-0000-1000-8000-00805f9b34fb"

// Packet format: 10 samples * max 4 chars + 9 commas = 49 chars
// Fits comfortably in MTU 100 (97 bytes payload after BLE overhead)
#define SAMPLE_RATE      100
#define SAMPLES_PER_PKT  10
#define SAMPLE_INTERVAL_US (1000000 / SAMPLE_RATE)

// Moving average filter: MA_SIZE=2
// MA_SIZE=4 was tested but reduced R-peak amplitude by ~75% — signal became flat.
// MA_SIZE=2 smooths ADC noise while preserving QRS peak sharpness.
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

// LED heartbeat on GPIO2 (built-in on most ESP32 boards)
#define LED_PIN               2
#define HEARTBEAT_THRESHOLD   2700  // ADC units — adjust to match your signal amplitude
#define HEARTBEAT_REFRACTORY  300   // ms — prevents double-triggering on T-wave
#define LED_FLASH_MS          80    // ms — LED on duration per beat

unsigned long lastHeartbeatMs = 0;
unsigned long ledOffMs        = 0;
bool          ledOn           = false;
bool          wasAboveThresh  = false;

// BLE handles
BLEServer*          pServer     = NULL;
BLECharacteristic*  pEcgChar    = NULL;
BLECharacteristic*  pStatusChar = NULL;
bool deviceConnected    = false;
bool oldDeviceConnected = false;

// Sampling state
uint16_t sampleBuffer[SAMPLES_PER_PKT];
int      sampleIndex    = 0;
unsigned long lastSampleTime = 0;
bool     leadOff        = false;
unsigned long lastStatusSend = 0;
unsigned long packetCount    = 0;

// DHT22 last valid readings (NaN = not yet received)
float dhtTemp = NAN;
float dhtHum  = NAN;
unsigned long lastDhtRead = 0;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* s) {
    deviceConnected = true;
    // Clear MA buffer on reconnect to avoid artifacts from previous session
    memset(maBuffer, 0, sizeof(maBuffer));
    maSum   = 0;
    maIndex = 0;
    Serial.println("\n>>> TELEFON CONECTAT!\n");
  }
  void onDisconnect(BLEServer* s) {
    deviceConnected = false;
    Serial.println("\n>>> TELEFON DECONECTAT!\n");
  }
};

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n==========================================");
  Serial.println("=== SmartLink ECG v2 - 10 samples/pkt ===");
  Serial.println("==========================================\n");

  pinMode(LO_PLUS_PIN, INPUT);
  pinMode(LO_MINUS_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  Serial.println("[OK] Senzor: ECG=GPIO4, LO+=GPIO5, LO-=GPIO6");
  Serial.println("[OK] Moving average: 2 samples | LED heartbeat: GPIO2");

  dht.begin();
  Serial.println("[OK] DHT22 pe GPIO7");

  Serial.println("[..] Pornire BLE...");
  BLEDevice::init("SmartLink-ECG");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  pEcgChar = pService->createCharacteristic(
    ECG_CHAR_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
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
  Serial.println("[OK] Pachete: 10 samples/pkt (necesita MTU >= 60)");
  Serial.println("[OK] Astept conexiune Android cu requestMtu(100)...\n");

  lastSampleTime = micros();
  lastStatusSend = millis();
}

void loop() {
  // Sampling runs continuously (regardless of BLE state) so Serial Plotter works
  unsigned long now = micros();

  if (now - lastSampleTime >= SAMPLE_INTERVAL_US) {
    lastSampleTime = now;

    bool loPlus  = digitalRead(LO_PLUS_PIN);
    bool loMinus = digitalRead(LO_MINUS_PIN);
    leadOff = (loPlus || loMinus);

    uint16_t raw      = leadOff ? 0 : analogRead(ECG_PIN);
    uint16_t filtered = movingAvg(raw);

    // Heartbeat detection + LED flash (non-blocking)
    unsigned long nowMs = millis();
    if (!leadOff) {
      if (filtered > HEARTBEAT_THRESHOLD && !wasAboveThresh) {
        if (nowMs - lastHeartbeatMs > HEARTBEAT_REFRACTORY) {
          lastHeartbeatMs = nowMs;
          digitalWrite(LED_PIN, HIGH);
          ledOffMs = nowMs + LED_FLASH_MS;
          ledOn    = true;
        }
        wasAboveThresh = true;
      } else if (filtered <= HEARTBEAT_THRESHOLD) {
        wasAboveThresh = false;
      }
    }
    if (ledOn && nowMs >= ledOffMs) {
      digitalWrite(LED_PIN, LOW);
      ledOn = false;
    }

    // Serial Plotter at ~33 Hz (every 3 ticks at 100 Hz)
    // 33 Hz ensures we capture 2-3 samples per QRS complex (~80ms wide)
    static uint8_t plotterTick = 0;
    if (++plotterTick >= 3) {
      plotterTick = 0;
      Serial.print("raw:");
      Serial.print(raw);
      Serial.print(",filtered:");
      Serial.println(filtered);
    }

    sampleBuffer[sampleIndex++] = filtered;

    // When 10 samples are collected, send one BLE notification
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

  // DHT22 read every 2.5 seconds (non-blocking, only updates on valid reading)
  if (millis() - lastDhtRead >= 2500) {
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) dhtTemp = t;
    if (!isnan(h)) dhtHum  = h;
    lastDhtRead = millis();
  }

  // Status JSON every 5 seconds — only when connected
  if (deviceConnected && millis() - lastStatusSend >= 5000) {
    String status = "{\"leadOff\":" + String(leadOff ? "true" : "false") +
                    ",\"rate\":"    + String(SAMPLE_RATE);
    if (!isnan(dhtTemp)) status += ",\"temp\":" + String(dhtTemp, 1);
    if (!isnan(dhtHum))  status += ",\"hum\":"  + String(dhtHum, 1);
    status += "}";
    pStatusChar->setValue(status.c_str());
    pStatusChar->notify();
    lastStatusSend = millis();
  }

  // Re-advertise after disconnect (500ms cooldown for BLE stack cleanup)
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  delay(1);
}
