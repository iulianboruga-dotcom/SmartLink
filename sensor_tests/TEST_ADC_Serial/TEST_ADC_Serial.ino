// ============================================================
// TEST_ADC_Serial.ino — Minimal ADC + lead-off test (no BLE)
//
// Purpose: the most basic diagnostic sketch. Reads the ADC pin
// and both lead-off pins, prints everything to Serial Monitor.
// Use this first when debugging hardware issues.
//
// Wiring: same as production firmware
//   AD8232 OUTPUT → GPIO4
//   AD8232 LO+    → GPIO5
//   AD8232 LO-    → GPIO6
//
// Expected output (electrodes attached):
//   2048 | LO+ 0  LO- 0 | OK
//
// Expected output (electrodes detached):
//   0 | LO+ 1  LO- 1 | ELECTROZI DECONECTATI!
// ============================================================

#define ECG_PIN       4
#define LO_PLUS_PIN   5
#define LO_MINUS_PIN  6

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n================================");
  Serial.println("=== TEST ADC - Serial Only ===");
  Serial.println("================================\n");

  pinMode(LO_PLUS_PIN, INPUT);
  pinMode(LO_MINUS_PIN, INPUT);

  // 12-bit ADC (0–4095), full 3.3V range
  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  Serial.println("Pin ECG: GPIO" + String(ECG_PIN));
  Serial.println("Pin LO+: GPIO" + String(LO_PLUS_PIN));
  Serial.println("Pin LO-: GPIO" + String(LO_MINUS_PIN));
  Serial.println("\nFormat: ADC_VALUE | LO+  LO- | STATUS");
  Serial.println("----------------------------------------");
}

void loop() {
  bool loPlus  = digitalRead(LO_PLUS_PIN);
  bool loMinus = digitalRead(LO_MINUS_PIN);
  uint16_t adcValue = analogRead(ECG_PIN);

  Serial.print(adcValue);
  Serial.print(" | LO+ "); Serial.print(loPlus);
  Serial.print("  LO- "); Serial.print(loMinus);

  if (loPlus || loMinus) {
    Serial.println(" | ELECTROZI DECONECTATI!");
  } else {
    Serial.println(" | OK");
  }

  // 10 readings/second — easy to read in Serial Monitor
  delay(100);
}
