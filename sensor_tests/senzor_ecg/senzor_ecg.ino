// ============================================================
// senzor_ecg.ino — Minimal AD8232 ECG test (Serial only, no BLE)
//
// Purpose: verify the AD8232 wiring and ADC readings before
// integrating into the full BLE firmware.
//
// Wiring:
//   AD8232 OUTPUT → GPIO4
//   AD8232 LO-    → GPIO5
//   AD8232 LO+    → GPIO6
//   AD8232 VCC    → 3.3V
//   AD8232 GND    → GND
//
// Usage: open Arduino Serial Plotter at 9600 baud and attach
// the electrodes. You should see the ECG waveform in the plotter.
//
// Expected values: 0–4095 (12-bit ADC), resting signal ~1800–2500
// Lead-off: both LO pins go HIGH when electrodes are detached.
// ============================================================

const int pinECG     = 4;  // Analog output from AD8232
const int pinLOminus = 5;  // Lead-off detection negative
const int pinLOplus  = 6;  // Lead-off detection positive

void setup() {
  Serial.begin(9600);
  analogReadResolution(12);  // 12-bit: values 0–4095

  pinMode(pinLOminus, INPUT);
  pinMode(pinLOplus,  INPUT);

  delay(2000);
  Serial.println("AD8232 ECG pornit. Pune electrozii pe piele.");
}

void loop() {
  // Check if electrodes are in contact before reading
  if (digitalRead(pinLOminus) == 1 || digitalRead(pinLOplus) == 1) {
    Serial.println("! Electrozi deconectati");
    delay(200);
    return;
  }

  // Read the ECG signal and print for Serial Plotter
  int valoare = analogRead(pinECG);
  Serial.println(valoare);

  // ~15 samples/second — sufficient to visualize the ECG waveform
  // For full 100Hz sampling, use the BLE firmware instead
  delay(64);
}
