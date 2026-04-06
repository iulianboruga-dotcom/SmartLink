// ============================================================
// senzor_puls.ino — Simple analog pulse sensor BPM (Serial only)
//
// Purpose: test a basic analog finger pulse sensor connected to
// an ADC pin. Computes BPM from a rolling average of RR intervals.
//
// Wiring:
//   Sensor signal → GPIO1 (analog)
//   Sensor VCC    → 3.3V
//   Sensor GND    → GND
//
// How it works:
//   - Reads ADC at ~100Hz (delay 10ms)
//   - Detects pulse by threshold crossing (falling edge below 'prag')
//   - Stores last 10 inter-beat intervals
//   - BPM = 60000 / (average interval in ms)
//
// Tuning:
//   - Adjust 'prag' (threshold) to match your sensor's signal amplitude
//   - Place finger gently — pressing hard distorts the signal
//   - Wait 10–15 seconds for the rolling buffer to stabilize
// ============================================================

const int pinPuls = 1;  // ADC pin connected to sensor signal output

int valoare          = 0;
int valoareAnterioara = 0;
int prag             = 2200;  // Threshold for beat detection (0–4095). Tune this.
bool inBataie        = false;
unsigned long timpUltimaBataie = 0;
int bpm              = 0;

// Rolling buffer of last 10 inter-beat intervals (ms)
int intervaluri[10];
int indexInterval = 0;
bool bufferPlin   = false;

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);  // 12-bit: 0–4095
  delay(2000);
  Serial.println("Pune degetul usor pe senzor. Asteapta 10-15 secunde...");
}

void loop() {
  valoare = analogRead(pinPuls);

  // Detect falling edge through threshold = pulse beat
  if (valoare < prag && valoareAnterioara >= prag && !inBataie) {
    inBataie = true;

    unsigned long acum    = millis();
    unsigned long interval = acum - timpUltimaBataie;

    // Accept only physiologically plausible intervals: 300ms–2000ms (30–200 BPM)
    if (interval > 300 && interval < 2000 && timpUltimaBataie > 0) {
      intervaluri[indexInterval] = interval;
      indexInterval++;
      if (indexInterval >= 10) {
        indexInterval = 0;
        bufferPlin    = true;
      }

      // BPM = 60000 / average_interval
      int cateIntervale = bufferPlin ? 10 : indexInterval;
      long suma = 0;
      for (int i = 0; i < cateIntervale; i++) suma += intervaluri[i];
      bpm = 60000 / (suma / cateIntervale);
    }

    timpUltimaBataie = acum;
  }

  // Reset beat state once signal rises back above threshold + hysteresis
  if (valoare > prag + 50) inBataie = false;

  valoareAnterioara = valoare;

  // Print reading every 500ms to avoid Serial flooding
  static unsigned long ultimAfisaj = 0;
  if (millis() - ultimAfisaj >= 500) {
    ultimAfisaj = millis();
    Serial.print("Brut: "); Serial.print(valoare);
    Serial.print("  |  BPM: ");
    Serial.println(bpm > 0 ? String(bpm) : "---");
  }

  delay(10);  // ~100Hz sampling
}
