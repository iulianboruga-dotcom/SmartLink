# SmartLink — ESP32 Firmware

> All sketches are written for **Arduino IDE** targeting **ESP32-S3**.

---

## Repository structure

```
esp32-firmware/
├── SmartLink_ECG_BLE_v3/          ← MAIN FIRMWARE — use this
│   └── SmartLink_ECG_BLE_v3.ino
├── SmartLink_ECG_BLE_v2/          ← Previous version (reference)
│   └── SmartLink_ECG_BLE_v2.ino
├── SmartLink_ECG_BLE_Debug/       ← Debug version (ECG-only, verbose Serial)
│   └── SmartLink_ECG_BLE_Debug.ino
└── sensor_tests/                  ← Individual sensor test sketches
    ├── TEST_ADC_Serial/            ← Start here: raw ADC + lead-off test
    ├── senzor_ecg/                 ← AD8232 Serial Plotter test
    ├── senzor_dht22/               ← DHT22 temperature + humidity test
    ├── senzor_puls/                ← Simple analog pulse sensor BPM
    ├── senzor_puls_complicat/      ← Advanced HRV analysis (BPM + SDNN + RMSSD)
    └── testing_live_graph/         ← First working BLE prototype (historical)
```

---

## Main firmware: SmartLink_ECG_BLE_v3

### What it does

Reads three sensors simultaneously and streams data to the SmartLink Android app over **Bluetooth Low Energy (BLE)**:

| Sensor | Output | Pin |
|---|---|---|
| AD8232 ECG module | 12-bit ADC signal (0–4095) | GPIO4 (signal), GPIO5 (LO+), GPIO6 (LO-) |
| DHT22 | Temperature (°C) + Humidity (%) | GPIO1 |
| (derived from ECG) | Heart rate BPM | computed via R-peak detection |

### BLE protocol

```
Service UUID:          0000FFE0-0000-1000-8000-00805F9B34FB

ECG characteristic:    0000FFE2-...  (notify)
  Payload: comma-separated 12-bit ADC values, 10 samples per packet
  Rate:    100 Hz → 10 packets/second
  Example: "2048,2060,2055,2043,2070,2080,2055,2040,2065,2058"

Status characteristic: 0000FFE1-...  (notify + read)
  Payload: JSON, sent every 5 seconds
  Example: {"leadOff":false,"rate":100,"temp":36.5,"hum":55.2,"bpm":72}
  Fields:
    leadOff (bool)   — true if electrodes are not in contact
    rate    (int)    — ECG sample rate in Hz
    temp    (float)  — temperature in °C (omitted if DHT22 not connected)
    hum     (float)  — relative humidity % (omitted if DHT22 not connected)
    bpm     (int)    — heart rate (omitted if not yet computed)
```

The Android app requests **MTU 100** after connecting, which allows 97-byte BLE payloads — sufficient for 10-sample ECG packets (~49 chars max).

### Hardware wiring

```
ESP32-S3          AD8232 ECG Module
GPIO4      ←——   OUTPUT
GPIO5      ←——   LO+
GPIO6      ←——   LO-
3.3V       ——→   VCC
GND        ——→   GND

ESP32-S3          DHT22
GPIO1      ←——   DATA  (with 10kΩ pull-up to 3.3V)
3.3V       ——→   VCC
GND        ——→   GND

GPIO2              Built-in LED (flashes on each detected heartbeat)
```

### Required libraries

Install via **Arduino IDE → Tools → Manage Libraries**:

| Library | Author | Purpose |
|---|---|---|
| DHT sensor library | Adafruit | DHT22 temperature/humidity |
| Adafruit Unified Sensor | Adafruit | Dependency of DHT lib |
| ESP32 BLE Arduino | — | BLE stack (included in ESP32 board package) |

### Flash instructions

1. Open `SmartLink_ECG_BLE_v3/SmartLink_ECG_BLE_v3.ino` in Arduino IDE
2. **Tools → Board** → `ESP32S3 Dev Module`
3. **Tools → Port** → select the USB port
4. Click **Upload**
5. If stuck on "Connecting...": hold the **BOOT** button on the ESP32, wait for upload to start, then release
6. Open **Serial Monitor** at **115200 baud** to see status messages

### Tuning parameters

| Constant | Default | Description |
|---|---|---|
| `SAMPLE_RATE` | 100 Hz | ECG sampling rate |
| `SAMPLES_PER_PKT` | 10 | ADC values per BLE packet |
| `HEARTBEAT_THRESHOLD` | 2700 | ADC threshold for R-peak detection — adjust to match your signal |
| `HEARTBEAT_REFRACTORY` | 300 ms | Minimum time between two valid beats (~200 BPM max) |
| `MA_SIZE` | 2 | Moving average filter size — keep at 2, higher values flatten QRS peaks |
| `BPM_WINDOW` | 8 beats | Rolling BPM average window |
| `DHT_READ_INTERVAL_MS` | 2000 ms | DHT22 read interval (minimum 2000ms) |

---

## Firmware history

| Version | Changes |
|---|---|
| **v3** (current) | + DHT22 temp/hum, + BPM rolling average (8 beats), + DHT WDT workaround |
| **v2** | + DHT22 (GPIO19), no BPM, 2500ms DHT interval |
| **Debug** | ECG-only, no filters, verbose Serial, good for initial BLE testing |
| **testing_live_graph** | First working prototype, 250Hz, TEST_MODE defines for incremental testing |

---

## Sensor tests

Use these to verify each sensor independently before flashing the full firmware:

| Sketch | What to test |
|---|---|
| `TEST_ADC_Serial` | Start here — verify GPIO pins and ADC values |
| `senzor_ecg` | AD8232 waveform in Serial Plotter |
| `senzor_dht22` | DHT22 temperature and humidity readings |
| `senzor_puls` | Simple pulse sensor BPM |
| `senzor_puls_complicat` | Advanced HRV metrics (BPM, SDNN, RMSSD, etc.) |

---

## System context

This firmware is part of the **SmartLink** Software Engineering project:
- **This repo** — ESP32 firmware (BLE peripheral)
- **Android app** — [`android-app` branch](../../tree/android-app) — BLE client, real-time display
- **Web app + backend** — [`main` branch](../../tree/main) — cloud dashboard (in development)

---

*Draft firmware authored as part of Inginerie Software — SmartLink project.*
