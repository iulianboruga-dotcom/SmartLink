# SmartLink — Android App (Draft)

> **Status:** Functional prototype. UI is intentionally minimal.
> Colleagues will redesign the interface and connect this app to the web backend.

---

## What this app does

SmartLink is an Android application that connects to an **ESP32 microcontroller** over **Bluetooth Low Energy (BLE)** and receives real-time data from multiple biomedical sensors:

| Sensor | Data |
|---|---|
| AD8232 / ADS1115 | ECG signal (12-bit ADC, ~250 Hz) |
| DHT22 | Temperature (°C) and Humidity (%) |
| MAX30102 / analog pulse sensor | Heart rate (BPM) |

The app displays a live ECG waveform, monitors all sensor values with color-coded health ranges, fires alerts when thresholds are exceeded, and logs all BLE events for debugging.

---

## Architecture

```
ESP32 (BLE peripheral)
    │
    │  BLE notifications (GATT)
    ▼
MainActivity.kt          ← owns BLE connection lifecycle
    │  LiveData updates
    ▼
BleViewModel.kt          ← single source of truth (survives rotation)
    │  observed by
    ├──► EcgFragment.kt       Tab 0 — waveform + log
    ├──► SensorsFragment.kt   Tab 1 — temp / hum / BPM / alerts
    └──► SettingsFragment.kt  Tab 2 — stats / thresholds / login
```

### Key files

| File | Purpose |
|---|---|
| `MainActivity.kt` | BLE scan, connect, GATT callbacks, notification routing |
| `BleViewModel.kt` | All LiveData state, session stats, alert evaluation |
| `EcgView.kt` | Custom View — ring-buffer waveform rendered on Canvas |
| `EcgFragment.kt` | Tab 0 — ECG chart, connection controls, raw log |
| `SensorsFragment.kt` | Tab 1 — sensor cards with color-coded health ranges |
| `SettingsFragment.kt` | Tab 2 — thresholds, device name, session stats, login |
| `ViewPagerAdapter.kt` | FragmentStateAdapter wiring the 3 tabs |

---

## BLE Protocol

The ESP32 exposes one GATT service with two characteristics:

```
Service:         0000FFE0-0000-1000-8000-00805F9B34FB
  │
  ├── ECG char   0000FFE2-0000-1000-8000-00805F9B34FB  (notify)
  │       Payload: comma-separated 12-bit ADC integers
  │       Example: "2048,2060,2055,2043,2070,2080,2055,2040,2065,2058"
  │       ~10 samples per packet, ~250 Hz effective sample rate
  │
  └── Status char 0000FFE1-0000-1000-8000-00805F9B34FB  (notify)
          Payload: JSON object
          Example: {"rate":250,"leadOff":false,"temp":36.5,"hum":55.2,"bpm":72}
          Fields: rate (Hz), leadOff (bool), temp (°C), hum (%), bpm (int)
          All fields except "rate" are optional (omitted if sensor absent)
```

MTU is negotiated to **100 bytes** on connect (default 23 is too small for multi-sample packets).

---

## Alert Thresholds (defaults)

| Parameter | Low threshold | High threshold |
|---|---|---|
| Temperature | 35 °C (hypothermia) | 38 °C (fever) |
| Humidity | 20 % (too dry) | 80 % (too humid) |
| Heart rate | 40 BPM (bradycardia) | 120 BPM (tachycardia) |

All thresholds are configurable in the **Setari** tab and persisted in `SharedPreferences`.

---

## Requirements

- Android **8.0+** (API 26+), tested on Android 13/14
- Bluetooth LE hardware (required, not optional)
- Permissions: `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` (API 31+), `ACCESS_FINE_LOCATION`
- The ESP32 must advertise under the name **`SmartLink-ECG`** (configurable in Settings tab)

---

## Build

```bash
# From the multi_sensor_app/ directory:
./gradlew assembleDebug

# APK output:
app/build/outputs/apk/debug/app-debug.apk
```

Or open in **Android Studio** (Hedgehog or newer) and run on a physical device.
> BLE scanning does **not** work on emulators.

---

## Project structure

```
multi_sensor_app/
├── app/
│   ├── src/main/
│   │   ├── java/com/example/smartlink_multi/
│   │   │   ├── MainActivity.kt
│   │   │   ├── BleViewModel.kt
│   │   │   ├── EcgView.kt
│   │   │   ├── EcgFragment.kt
│   │   │   ├── SensorsFragment.kt
│   │   │   ├── SettingsFragment.kt
│   │   │   └── ViewPagerAdapter.kt
│   │   ├── res/
│   │   │   ├── layout/          ← activity_main, fragment_ecg, fragment_sensors, fragment_settings
│   │   │   └── ...
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
├── build.gradle.kts
└── README.md                    ← this file
```

---

## What's intentionally left out (for colleagues to implement)

- **UI/UX redesign** — current layout is functional but not polished
- **Cloud backend** — session data should be uploaded to the SmartLink web backend
- **Real authentication** — the current local login is a placeholder; replace with JWT/OAuth
- **Data export** — save ECG sessions as CSV or send to the web app
- **Historical view** — display past sessions retrieved from the backend
- **Notifications** — push alerts even when the app is in the background (requires a Foreground Service)

---

## Hardware context

This app was built as part of the **SmartLink** Software Engineering project.
The full system includes:
- This Android app (BLE client)
- An ESP32 board with ECG, temperature, humidity, and pulse sensors
- A web frontend + cloud backend (separate repository: [SmartLink web](https://github.com/iulianboruga-dotcom/SmartLink))

---

*Draft authored as part of Inginerie Software — SmartLink project.*
