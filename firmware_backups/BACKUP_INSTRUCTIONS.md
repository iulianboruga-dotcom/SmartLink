# ESP32 Flash Backup — Instructions

Goal: save the exact firmware **currently running on the board** (compiled binary,
not editable) to GitHub before flashing v4. Run these on your PC — the board must
be connected via USB and the Arduino Serial Monitor must be **closed**.

## 1. Dump the flash

```
pip install esptool
esptool --port COM3 read-flash 0 ALL flash-backup-v3_2026-06-12.bin
```

- Replace `COM3` with your port (Arduino IDE → Tools → Port).
- If your esptool is older and `read-flash` fails, use `read_flash` (underscore).
- Takes a few minutes; produces a file the size of the whole flash (8–16 MB).

## 2. Verify the dump (optional but recommended)

```
esptool --port COM3 verify-flash 0 flash-backup-v3_2026-06-12.bin
```

## 3. Upload to GitHub

Suggested professional layout on the `esp32-firmware` branch:

```
esp32-firmware/
└── firmware-backups/
    ├── README.md
    └── flash-backup-v3_2026-06-12.bin
```

Easiest way (no git command line): on GitHub open the `esp32-firmware` branch →
**Add file → Upload files** → drag the `.bin` into a `firmware-backups/` folder.

Suggested `firmware-backups/README.md` content:

> Full flash dumps taken with `esptool read-flash 0 ALL`.
> These are compiled binaries — they cannot be edited, only restored.
> Restore with: `esptool --port COMx write-flash 0 <file>.bin`
>
> | File | Date | Source | Notes |
> |---|---|---|---|
> | flash-backup-v3_2026-06-12.bin | 2026-06-12 | SmartLink_ECG_BLE_v3 | Last known-good before v4 (DS18B20) |

## 4. Restore (if v4 ever breaks the board)

```
esptool --port COM3 write-flash 0 flash-backup-v3_2026-06-12.bin
```

Note: GitHub rejects files over 100 MB and warns over 50 MB — a 8–16 MB flash
dump is fine.
