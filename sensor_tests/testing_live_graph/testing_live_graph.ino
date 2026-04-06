// ============================================================
// testing_live_graph.ino — Early BLE live graph prototype
//
// This was the first working prototype that successfully streamed
// ECG data to the Android app. Superseded by the v2/v3 firmware.
// Kept as historical reference.
//
// Differences vs production firmware:
//   - 250 Hz sample rate (v3 uses 100 Hz for DHT22 compatibility)
//   - TEST_MODE defines for incremental debugging:
//       TEST_MODE_1: BLE only (no sampling) — verify connection
//       TEST_MODE_2: BLE + sampling (no send) — verify ADC timing
//       TEST_MODE_3: BLE + sampling + send — full pipeline
//   - No moving average filter
//   - No DHT22
//   - No BPM
//
// Usage: uncomment the desired TEST_MODE define in the
// CONFIGURARE section and flash to the ESP32.
// ============================================================

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ===== CONFIGURARE: uncomment one test mode =====
//#define TEST_MODE_1   // BLE only, no sampling
//#define TEST_MODE_2   // BLE + sampling, no send
#define TEST_MODE_3     // BLE + sampling + send (full pipeline)

#define ECG_PIN       4
#define LO_PLUS_PIN   5
#define LO_MINUS_PIN  6

#define SERVICE_UUID     "0000ffe0-0000-1000-8000-00805f9b34fb"
#define ECG_CHAR_UUID    "0000ffe2-0000-1000-8000-00805f9b34fb"
#define STATUS_CHAR_UUID "0000ffe1-0000-1000-8000-00805f9b34fb"

// 250 Hz was the original target rate.
// Reduced to 100 Hz in v3 to accommodate DHT22 non-blocking reads.
#define SAMPLE_RATE      250
#define SAMPLES_PER_PKT  10
#define SAMPLE_INTERVAL_US (1000000 / SAMPLE_RATE)

BLEServer* pServer = NULL;
BLECharacteristic* pEcgChar = NULL;
BLECharacteristic* pStatusChar = NULL;
bool deviceConnected    = false;
bool oldDeviceConnected = false;

uint16_t sampleBuffer[SAMPLES_PER_PKT];
int sampleIndex = 0;
unsigned long lastSampleTime = 0;
bool leadOff = false;
unsigned long lastStatusSend = 0;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* s)    { deviceConnected = true;  Serial.println("[BLE] Client conectat!"); }
  void onDisconnect(BLEServer* s) { deviceConnected = false; Serial.println("[BLE] Client deconectat!"); }
};

uint16_t readEcgSample() {
  bool loPlus  = digitalRead(LO_PLUS_PIN);
  bool loMinus = digitalRead(LO_MINUS_PIN);
  leadOff = (loPlus == HIGH || loMinus == HIGH);
  if (leadOff) return 0;
  uint16_t raw = analogRead(ECG_PIN);
  static int debugCounter = 0;
  if (debugCounter++ >= 100) { debugCounter = 0; Serial.print("[ECG] Sample: "); Serial.println(raw); }
  return raw;
}

void sendEcgPacket() {
  String pkt = "";
  for (int i = 0; i < SAMPLES_PER_PKT; i++) {
    if (i > 0) pkt += ",";
    pkt += String(sampleBuffer[i]);
  }
  pEcgChar->setValue(pkt.c_str());
  pEcgChar->notify();
  Serial.print("[BLE] Trimis pachet cu "); Serial.print(SAMPLES_PER_PKT); Serial.println(" samples");
}

void sendStatus() {
  String status = "{\"leadOff\":" + String(leadOff ? "true" : "false") +
                  ",\"rate\":" + String(SAMPLE_RATE) +
                  ",\"pktSize\":" + String(SAMPLES_PER_PKT) + "}";
  pStatusChar->setValue(status.c_str());
  pStatusChar->notify();
  Serial.println("[STATUS] " + status);
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n=========================================");
  Serial.println("=== SmartLink ECG - MOD TEST ===");
  #ifdef TEST_MODE_1
    Serial.println("=== TEST 1: Doar BLE (fara sampling) ===");
  #elif defined(TEST_MODE_2)
    Serial.println("=== TEST 2: BLE + sampling (fara trimitere) ===");
  #elif defined(TEST_MODE_3)
    Serial.println("=== TEST 3: BLE + sampling + trimitere ===");
  #endif
  Serial.println("=========================================\n");

  #if defined(TEST_MODE_2) || defined(TEST_MODE_3)
    pinMode(LO_PLUS_PIN, INPUT);
    pinMode(LO_MINUS_PIN, INPUT);
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);
  #endif

  BLEDevice::init("SmartLink-ECG");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);
  pEcgChar = pService->createCharacteristic(ECG_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  pEcgChar->addDescriptor(new BLE2902());
  pStatusChar = pService->createCharacteristic(STATUS_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  pStatusChar->addDescriptor(new BLE2902());
  pService->start();

  BLEAdvertising* pAdv = BLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);
  pAdv->setScanResponse(true);
  pAdv->setMinPreferred(0x06);
  BLEDevice::startAdvertising();
  Serial.println("[SETUP] BLE pornit! Astept conexiune...\n");

  #if defined(TEST_MODE_2) || defined(TEST_MODE_3)
    lastSampleTime = micros();
    lastStatusSend = millis();
    sampleIndex = 0;
  #endif
}

void loop() {
  delay(1);  // Watchdog yield — CRITICAL: remove this and ESP32 resets in seconds

  #ifdef TEST_MODE_1
    if (deviceConnected && !oldDeviceConnected) { Serial.println("[MAIN] Telefon conectat!"); oldDeviceConnected = deviceConnected; }
    if (!deviceConnected && oldDeviceConnected) { Serial.println("[MAIN] Telefon deconectat!"); oldDeviceConnected = deviceConnected; }
    return;
  #endif

  #ifdef TEST_MODE_2
    if (deviceConnected) {
      if (micros() - lastSampleTime >= SAMPLE_INTERVAL_US) {
        lastSampleTime = micros();
        readEcgSample();  // Read but don't send
      }
      if (millis() - lastStatusSend >= 5000) { sendStatus(); lastStatusSend = millis(); }
    }
    if (!deviceConnected && oldDeviceConnected) { delay(500); pServer->startAdvertising(); oldDeviceConnected = deviceConnected; }
    if (deviceConnected && !oldDeviceConnected) { oldDeviceConnected = deviceConnected; }
    return;
  #endif

  #ifdef TEST_MODE_3
    if (deviceConnected) {
      if (micros() - lastSampleTime >= SAMPLE_INTERVAL_US) {
        lastSampleTime = micros();
        sampleBuffer[sampleIndex] = readEcgSample();
        if (++sampleIndex >= SAMPLES_PER_PKT) { sendEcgPacket(); sampleIndex = 0; }
      }
      if (millis() - lastStatusSend >= 5000) { sendStatus(); lastStatusSend = millis(); }
    } else {
      sampleIndex = 0;
    }
    if (!deviceConnected && oldDeviceConnected) { delay(500); pServer->startAdvertising(); Serial.println("[BLE] Re-advertising..."); oldDeviceConnected = deviceConnected; }
    if (deviceConnected && !oldDeviceConnected) { oldDeviceConnected = deviceConnected; }
  #endif
}
