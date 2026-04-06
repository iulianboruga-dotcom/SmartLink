// ============================================================
// SmartLink_ECG_BLE_Debug.ino
//
// Debug/diagnostic version of the firmware.
// ECG-only (no DHT22, no BPM) with verbose Serial output.
//
// Use this when:
//   - Verifying BLE connection works before integrating sensors
//   - Checking raw ADC values via Serial Monitor
//   - Debugging packet loss or notification issues
//   - Testing with a new phone or Android build
//
// No moving average filter — sends raw ADC values so you can
// compare the unfiltered signal in the Android app log.
//
// Required libraries:
//   "ESP32 BLE Arduino" (included in esp32 board package)
// ============================================================

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// AD8232 ECG module pins
#define ECG_PIN       4
#define LO_PLUS_PIN   5
#define LO_MINUS_PIN  6

// BLE UUIDs — must match Android app
#define SERVICE_UUID     "0000ffe0-0000-1000-8000-00805f9b34fb"
#define ECG_CHAR_UUID    "0000ffe2-0000-1000-8000-00805f9b34fb"
#define STATUS_CHAR_UUID "0000ffe1-0000-1000-8000-00805f9b34fb"

// Lower sample rate for easier debug readout
#define SAMPLE_RATE      100
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
unsigned long packetCount = 0;

class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* s) {
    deviceConnected = true;
    Serial.println("\n>>> TELEFON CONECTAT! Incep trimiterea datelor...\n");
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
  Serial.println("=== SmartLink ECG - ADC + BLE COMPLET ===");
  Serial.println("==========================================\n");

  pinMode(LO_PLUS_PIN, INPUT);
  pinMode(LO_MINUS_PIN, INPUT);
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);
  Serial.println("[OK] Senzor configurat: ECG=GPIO4, LO+=GPIO5, LO-=GPIO6");

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

  Serial.println("[OK] BLE pornit! Nume: SmartLink-ECG");
  Serial.println("[OK] Astept conexiune de la telefon...");
  Serial.println("Cand telefonul se conecteaza, vei vedea pachetele aici.");
  Serial.println("=========================================\n");

  lastSampleTime = micros();
  lastStatusSend = millis();
}

void loop() {
  // Sampling only when phone is connected (debug mode — saves Serial bandwidth)
  if (deviceConnected) {
    unsigned long now = micros();

    if (now - lastSampleTime >= SAMPLE_INTERVAL_US) {
      lastSampleTime = now;

      bool loPlus  = digitalRead(LO_PLUS_PIN);
      bool loMinus = digitalRead(LO_MINUS_PIN);
      leadOff = (loPlus || loMinus);

      // Raw ADC value — no filter, useful for comparing with filtered v3 output
      uint16_t val = leadOff ? 0 : analogRead(ECG_PIN);
      sampleBuffer[sampleIndex++] = val;

      if (sampleIndex >= SAMPLES_PER_PKT) {
        String pkt = "";
        for (int i = 0; i < SAMPLES_PER_PKT; i++) {
          if (i > 0) pkt += ",";
          pkt += String(sampleBuffer[i]);
        }
        pEcgChar->setValue(pkt.c_str());
        pEcgChar->notify();
        packetCount++;

        // Print every 10th packet to Serial (approx 1 per second at 100Hz/10spp)
        if (packetCount % 10 == 0) {
          Serial.print("[PKT #"); Serial.print(packetCount); Serial.print("] ");
          Serial.println(pkt);
        }
        sampleIndex = 0;
      }
    }

    // Status every 5 seconds — minimal JSON for debug (no sensors)
    if (millis() - lastStatusSend >= 5000) {
      String status = "{\"leadOff\":" + String(leadOff ? "true" : "false") +
                      ",\"rate\":" + String(SAMPLE_RATE) +
                      ",\"pktSize\":" + String(SAMPLES_PER_PKT) + "}";
      pStatusChar->setValue(status.c_str());
      pStatusChar->notify();
      Serial.print("[STATUS] "); Serial.print(status);
      Serial.print(" | Total pachete trimise: "); Serial.println(packetCount);
      lastStatusSend = millis();
    }
  } else {
    sampleIndex = 0;  // Reset buffer when disconnected
  }

  // Re-advertise after disconnect
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("[BLE] Re-advertising...");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  delay(1);  // Anti-watchdog yield
}
