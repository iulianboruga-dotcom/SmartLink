// ============================================================
// senzor_puls_complicat.ino — Advanced HRV analysis (Serial only)
//
// Ported from: paulvangentcom/heartrate_analysis_Arduino (GPL V3)
// Modifications for ESP32-S3:
//   - Replaced AVR timer ISR with millis() polling loop
//     (analogRead is not ISR-safe on ESP32)
//   - ADC set to 10-bit (0–1023) to match the original algorithm's
//     amplitude assumptions
//
// Outputs the following HRV metrics after 20 beats are collected:
//   BPM    — heart rate
//   IBI    — inter-beat interval (ms)
//   SDNN   — std deviation of NN intervals (HRV)
//   SDSD   — std deviation of successive differences
//   RMSSD  — root mean square of successive differences
//   pNN20  — proportion of NN intervals > 20ms
//   pNN50  — proportion of NN intervals > 50ms
//
// Wiring:
//   Pulse sensor signal → A0 (GPIO26 on most ESP32-S3 boards)
//   Sensor VCC          → 3.3V
//   Sensor GND          → GND
//
// Set Verbose = 1 for labelled output, Verbose = 0 for CSV.
// ============================================================

#include <math.h>

// -------------------- User Settings --------------------
const int     hrpin       = A0;
const int     LED         = LED_BUILTIN;
const int16_t SAMPLE_RATE = 100;    // Hz
float         max_bpm     = 180.0;
float         min_bpm     = 45.0;
int8_t        Verbose     = 1;      // 1 = labelled output, 0 = CSV

// -------------------- Derived Constants --------------------
const int16_t ROIRange      = SAMPLE_RATE * 0.6;   // Region of interest: 60 samples
const int16_t RR_multiplier = 1000 / SAMPLE_RATE;  // Converts sample count to ms
const int16_t max_RR        = (60.0 / min_bpm)  * 1000.0;
const int16_t min_RR        = (60.0 / max_bpm)  * 1000.0;

// -------------------- Working Data Struct --------------------
// All algorithm state is encapsulated in a single struct to avoid
// polluting global scope and to make the algorithm self-contained.
struct WorkingData {
  long    absoluteCount  = 0;

  // Signal buffers — circular, size = SAMPLE_RATE (1 second of data)
  int16_t curVal         = 0;
  int16_t hrData[100]    = {0};   // raw signal
  int16_t hrMovAvg[100]  = {0};   // moving average (baseline reference)
  int16_t buffPos        = 0;
  int16_t oldestValuePos = 1;
  long    movAvgSum      = 0;
  int16_t windowSize     = SAMPLE_RATE * 0.6;  // 60-sample moving average window

  // Adaptive amplitude scaling (refreshes every 2 seconds)
  int16_t rangeLow       = 0,    rangeLowNext  = 1024;
  int16_t rangeHigh      = 1023, rangeHighNext = 1;
  int16_t rangeCounter   = 0,    rangeRange    = 2 * SAMPLE_RATE;

  // Peak detection
  int16_t ROI[60]        = {0};   // Region of interest buffer for current beat
  int16_t ROIPos         = 0;
  int8_t  peakFlag       = 0;
  int8_t  ROI_overflow   = 0;
  long    curPeak        = 0, curPeakEnd = 0, lastPeak = 0;

  // RR interval history (last 20 intervals for HRV metrics)
  int8_t  initFlag        = 0;
  int16_t lastRR          = 0, curRR = 0;
  int16_t recent_RR[20]  = {0};
  int16_t RRDiff[19]     = {0};
  long    RRSqDiff[19]   = {0};
  int16_t RR_mean        = 0, RR_sum = 0;
  int8_t  RR_pos         = 0;
  int16_t lower_threshold = 0, upper_threshold = 1;

  // Output measures
  float bpm=0, ibi=0, sdnn=0, sdsd=0, rmssd=0, pnn20=0, pnn50=0;
  int16_t nn20=0, nn50=0;
};

WorkingData wd;

// -------------------- Helper Functions --------------------

/** Maps x from [lo..hi] to [1..1023] range (matches original AVR code). */
long mapl(long x, long lo, long hi) {
  if (hi == lo) return 512;
  return (x - lo) * 1023 / (hi - lo) + 1;
}

/** Updates the adaptive amplitude range every 2 seconds. */
void establish_range(WorkingData &w) {
  if (w.rangeCounter <= w.rangeRange) {
    if (w.curVal < w.rangeLowNext)  w.rangeLowNext  = w.curVal;
    if (w.curVal > w.rangeHighNext) w.rangeHighNext = w.curVal;
    w.rangeCounter++;
  } else {
    if ((w.rangeHighNext - w.rangeLowNext) > 50) {
      w.rangeLow  = w.rangeLowNext;  w.rangeLowNext  = 1024;
      w.rangeHigh = w.rangeHighNext; w.rangeHighNext = 1;
    } else {
      // Signal too flat — use full range to avoid divide-by-zero
      w.rangeLow = 0; w.rangeHigh = 1024;
    }
    w.rangeCounter = 0;
  }
}

/** Finds the exact peak sample in the ROI buffer, handling flat-top (clipped) peaks. */
int findMax(int16_t arr[], int16_t len, WorkingData &w) {
  int lv=0, lp=0, cc=0, cf=0, cs=0, ce=0, lval=0;
  for (int i = 0; i < len; i++) {
    if (abs(lval - arr[i]) <= 3 && arr[i] > 1020) {
      if (!cf) { cf=1; cs=i; } else cc++;
    } else { if (cf) ce=i; }
    lval = arr[i];
    if (arr[i] > lv) { lv=arr[i]; lp=i; }
    if (cc > 3) lp = (cs + (ce - cs)) / 2;
  }
  return w.curPeakEnd - (len - lp);
}

float getMeanFloat(int16_t d[], int n) {
  float s=0; for(int i=0;i<n;i++) s+=d[i]; return s/n;
}
float getMeanFloatL(long d[], int n) {
  float s=0; for(int i=0;i<n;i++) s+=d[i]; return s/n;
}
float getStdFloat(int16_t d[], int n) {
  float m=getMeanFloat(d,n), s=0;
  for(int i=0;i<n;i++){float x=d[i]-m; s+=x*x;}
  return sqrt(s/n);
}

void getMeanRR(WorkingData &w) {
  w.RR_sum=0;
  for(int i=0;i<20;i++) w.RR_sum += w.recent_RR[i];
  w.RR_mean = w.RR_sum/20;
}

// -------------------- Core Pipeline --------------------

void readSensors(WorkingData &w) {
  w.curVal = analogRead(hrpin);
  establish_range(w);
  w.curVal = mapl(w.curVal, w.rangeLow, w.rangeHigh);
  if (w.curVal < 0) w.curVal = 0;

  // Update moving average baseline
  w.movAvgSum += w.curVal;
  w.movAvgSum -= w.hrData[w.oldestValuePos];
  w.hrMovAvg[w.buffPos] = w.movAvgSum / w.windowSize;
  w.hrData[w.buffPos]   = w.curVal;
}

void calcMeasures(WorkingData &w) {
  // Compute RR differences and squared differences for HRV metrics
  for (int i = 0; i < 19; i++) {
    int8_t p = w.RR_pos+i, pn = w.RR_pos+i+1;
    if (p  >= 20) p  -= 20;
    if (pn >= 20) pn -= 20;
    long d = abs(w.recent_RR[pn] - w.recent_RR[p]);
    w.RRDiff[i] = d; w.RRSqDiff[i] = d*d;
  }
  float rrMean = getMeanFloat(w.recent_RR, 20);
  w.nn20=0; w.nn50=0;
  for (int i=0;i<19;i++){
    if(w.RRDiff[i]>=20) w.nn20++;
    if(w.RRDiff[i]>=50) w.nn50++;
  }
  w.bpm   = 60000.0 / rrMean;
  w.ibi   = rrMean;
  w.sdnn  = getStdFloat(w.recent_RR, 20);
  w.sdsd  = getStdFloat(w.RRDiff, 19);
  w.rmssd = sqrt(getMeanFloatL(w.RRSqDiff, 19));
  w.pnn20 = (float)w.nn20 / 20.0;
  w.pnn50 = (float)w.nn50 / 20.0;

  if (w.initFlag != 1) return;  // Don't print until 20 beats collected

  if (Verbose) {
    Serial.print("BPM: ");   Serial.println(w.bpm, 1);
    Serial.print("IBI: ");   Serial.print(w.ibi, 1); Serial.println("ms");
    Serial.print("SDNN: ");  Serial.println(w.sdnn, 1);
    Serial.print("SDSD: ");  Serial.println(w.sdsd, 1);
    Serial.print("RMSSD: "); Serial.println(w.rmssd, 1);
    Serial.print("pNN20: "); Serial.println(w.pnn20, 3);
    Serial.print("pNN50: "); Serial.println(w.pnn50, 3);
    Serial.println("---");
  } else {
    // CSV format: bpm,ibi,sdnn,sdsd,rmssd,pnn20,pnn50
    Serial.print(w.bpm,1);   Serial.print(",");
    Serial.print(w.ibi,1);   Serial.print(",");
    Serial.print(w.sdnn,1);  Serial.print(",");
    Serial.print(w.sdsd,1);  Serial.print(",");
    Serial.print(w.rmssd,1); Serial.print(",");
    Serial.print(w.pnn20,3); Serial.print(",");
    Serial.println(w.pnn50,3);
  }
}

void updatePeak(WorkingData &w) {
  w.recent_RR[w.RR_pos] = w.curRR;
  w.RR_pos++;
  if (w.RR_pos >= 20) { w.RR_pos=0; w.initFlag=1; }  // Buffer full after 20 beats
  digitalWrite(LED, HIGH);
  calcMeasures(w);
  digitalWrite(LED, LOW);
}

void validatePeak(WorkingData &w) {
  getMeanRR(w);
  int16_t margin = (w.RR_mean * 0.3 <= 300) ? 300 : (int16_t)(w.RR_mean * 0.3);
  w.lower_threshold = w.RR_mean - margin;
  w.upper_threshold = w.RR_mean + margin;
  // Accept if successive RR change < 500ms (same criterion as original algorithm)
  if (abs(w.curRR - w.lastRR) < 500) updatePeak(w);
}

void checkForPeak(WorkingData &w) {
  if (w.hrData[w.buffPos] >= w.hrMovAvg[w.buffPos]) {
    if (w.ROIPos >= ROIRange) { w.ROI_overflow=1; return; }
    w.peakFlag=1; w.ROI[w.ROIPos++]=w.curVal; w.ROI_overflow=0;
    return;
  }
  if (w.hrData[w.buffPos] <= w.hrMovAvg[w.buffPos] && w.peakFlag==1) {
    if (!w.ROI_overflow) {
      w.lastRR     = w.curRR;
      w.curPeakEnd = w.absoluteCount;
      w.lastPeak   = w.curPeak;
      w.curPeak    = findMax(w.ROI, w.ROIPos, w);
      w.curRR      = (w.curPeak - w.lastPeak) * RR_multiplier;
    }
    w.peakFlag=0; w.ROIPos=0; w.ROI_overflow=0;

    if (w.curRR > max_RR || w.curRR < min_RR) return;
    if (w.initFlag != 0) validatePeak(w);
    else                 updatePeak(w);
  }
}

void tick() {
  readSensors(wd);
  checkForPeak(wd);
  if (++wd.buffPos        >= SAMPLE_RATE) wd.buffPos        = 0;
  if (++wd.oldestValuePos >= SAMPLE_RATE) wd.oldestValuePos = 0;
  wd.absoluteCount++;
}

// -------------------- Setup / Loop --------------------
void setup() {
  Serial.begin(115200);
  pinMode(LED, OUTPUT);
  analogReadResolution(10);  // 10-bit (0–1023) to match original algorithm range
  Serial.println("Collecting 20 beats before reporting — place finger on sensor.");
}

void loop() {
  static unsigned long last = 0;
  unsigned long now = millis();
  // Sample at exactly SAMPLE_RATE Hz using millis() polling
  if (now - last >= (1000 / SAMPLE_RATE)) {
    last = now;
    tick();
  }
}
