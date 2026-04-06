package com.example.smartlink_multi

/**
 * BleViewModel.kt — SmartLink Multi
 *
 * Shared ViewModel for the entire app. Survives configuration changes (screen rotation)
 * and acts as the single source of truth for all BLE data, sensor readings, and UI state.
 *
 * All three fragments (EcgFragment, SensorsFragment, SettingsFragment) observe this
 * ViewModel via LiveData — they never talk to MainActivity directly except through the
 * requestConnect() / requestDisconnect() public methods.
 *
 * Data flow:
 *   ESP32 (BLE) → MainActivity (GATT callback) → BleViewModel → Fragment observers → UI
 *
 * Threading note:
 *   onEcgPacket() and onStatus() MUST be called from the main thread (MainActivity uses
 *   handler.post{} for this). addLog() is safe to call from any thread.
 */

import android.os.Handler
import android.os.Looper
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import java.text.SimpleDateFormat
import java.util.*

class BleViewModel : ViewModel() {

    // ---- Connection state ----
    // Displayed in EcgFragment's status bar. Color encodes state:
    //   "#FF4444" (red)   = disconnected / error
    //   "#FFFF00" (yellow) = connecting / scanning
    //   "#00FF00" (green)  = connected and receiving data
    val connectionStatus  = MutableLiveData("Deconectat")
    val connectionColor   = MutableLiveData("#FF4444")
    val isConnected       = MutableLiveData(false)

    // MTU negotiated with the ESP32. Updated by MainActivity after onMtuChanged().
    // Determines the maximum payload size per BLE notification packet.
    val negotiatedMtu     = MutableLiveData(0)

    // Target BLE device name used for scan filtering.
    // Default "SmartLink-ECG" matches the name configured in the ESP32 firmware.
    // Can be changed by the user in SettingsFragment.
    val deviceName        = MutableLiveData("SmartLink-ECG")

    // ---- ECG data ----
    // Latest batch of ADC samples received from the ECG characteristic.
    // EcgView.addSamples() is called each time this updates.
    val ecgSamples        = MutableLiveData<List<Int>>()

    // Running count of BLE packets received during the session.
    val packetCount       = MutableLiveData(0)

    // Total number of individual ADC values received (packetCount × avg samples per packet).
    val totalValues       = MutableLiveData(0)

    // The raw string content of the last received ECG packet (for debugging in EcgFragment).
    val lastPacketRaw     = MutableLiveData("--")

    // Number of samples in the last ECG packet.
    val lastPacketSize    = MutableLiveData(0)

    // ---- Lead-off detection & sample rate ----
    // leadOff = true means the ECG electrodes are not in contact with the skin.
    // The signal is invalid when lead-off is detected.
    val leadOff           = MutableLiveData(false)

    // ECG sampling rate reported by the ESP32 in the status JSON (e.g. 250 Hz).
    val sampleRate        = MutableLiveData(0)

    // ---- DHT22 environmental sensor ----
    // Temperature in degrees Celsius. Null when no data has been received yet.
    val temperature       = MutableLiveData<Float?>(null)

    // Relative humidity percentage. Null until first reading.
    val humidity          = MutableLiveData<Float?>(null)

    // ---- MAX30102 pulse oximeter ----
    // Heart rate in beats per minute. Null until first valid reading.
    // The ESP32 computes BPM from the IR signal peak detection algorithm.
    val bpm               = MutableLiveData<Int?>(null)

    // ---- Session tracking ----
    // Unix timestamp (ms) when the first data packet was received.
    // Used by SettingsFragment to calculate and display session duration.
    val sessionStart      = MutableLiveData(0L)

    // ---- Per-session min/max statistics ----
    // These are reset when the user presses "Reset Session" in SettingsFragment.
    val ecgMax            = MutableLiveData(Int.MIN_VALUE)
    val ecgMin            = MutableLiveData(Int.MAX_VALUE)
    val tempMax           = MutableLiveData<Float?>(null)
    val tempMin           = MutableLiveData<Float?>(null)
    val humMax            = MutableLiveData<Float?>(null)
    val humMin            = MutableLiveData<Float?>(null)
    val bpmMax            = MutableLiveData<Int?>(null)
    val bpmMin            = MutableLiveData<Int?>(null)

    // ---- Configurable alert thresholds ----
    // Defaults reflect typical medical reference ranges.
    // The user can override these in SettingsFragment; values are persisted in SharedPreferences.
    val alertTempHigh     = MutableLiveData(38.0f)   // °C — fever threshold
    val alertTempLow      = MutableLiveData(35.0f)   // °C — hypothermia threshold
    val alertHumHigh      = MutableLiveData(80.0f)   // % — high humidity warning
    val alertHumLow       = MutableLiveData(20.0f)   // % — low humidity warning
    val alertBpmHigh      = MutableLiveData(120)      // BPM — tachycardia threshold
    val alertBpmLow       = MutableLiveData(40)       // BPM — bradycardia threshold

    // List of currently active alert messages shown as a banner in SensorsFragment.
    // Empty list = no alerts → banner is hidden.
    val activeAlerts      = MutableLiveData<List<String>>(emptyList())

    // ---- Diagnostic log ----
    // Rolling log of timestamped messages (max 60 lines).
    // Displayed in EcgFragment as a scrollable text view for debugging.
    private val _logLines = mutableListOf<String>()
    val logText           = MutableLiveData("")

    /**
     * Appends a timestamped line to the diagnostic log.
     * Safe to call from any thread — posts to the main thread internally.
     * Keeps only the last 60 lines to prevent unbounded memory growth.
     */
    fun addLog(msg: String) {
        Handler(Looper.getMainLooper()).post {
            val ts = SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault()).format(Date())
            _logLines.add("[$ts] $msg")
            if (_logLines.size > 60) _logLines.removeAt(0)
            logText.value = _logLines.joinToString("\n")
        }
    }

    /**
     * Processes a new ECG data packet.
     * MUST be called on the main thread.
     *
     * Updates packet/value counters, exposes samples for EcgView rendering,
     * and tracks per-session ADC min/max values.
     *
     * @param raw     The original comma-separated string (for debug display).
     * @param samples Parsed list of 12-bit ADC values (0–4095).
     */
    fun onEcgPacket(raw: String, samples: List<Int>) {
        lastPacketRaw.value  = raw
        lastPacketSize.value = samples.size
        packetCount.value    = (packetCount.value ?: 0) + 1
        totalValues.value    = (totalValues.value ?: 0) + samples.size
        ecgSamples.value     = samples

        // Start session timer on the first received packet
        if ((sessionStart.value ?: 0L) == 0L) sessionStart.value = System.currentTimeMillis()

        // Update global min/max for this session
        var curMax = ecgMax.value ?: Int.MIN_VALUE
        var curMin = ecgMin.value ?: Int.MAX_VALUE
        for (v in samples) { if (v > curMax) curMax = v; if (v < curMin) curMin = v }
        ecgMax.value = curMax
        ecgMin.value = curMin
    }

    /**
     * Processes a new sensor status update from the ESP32.
     * MUST be called on the main thread.
     *
     * Updates lead-off, sample rate, temperature, humidity, and BPM readings.
     * Also updates per-session min/max and re-evaluates active alerts.
     *
     * @param lo    Lead-off status — true if electrodes are detached.
     * @param rate  ECG sample rate in Hz as reported by the ESP32.
     * @param temp  Body/ambient temperature in °C, or null if sensor absent.
     * @param hum   Relative humidity percentage, or null if sensor absent.
     * @param pulse Heart rate in BPM, or null if not yet computed.
     */
    fun onStatus(lo: Boolean, rate: Int, temp: Float?, hum: Float?, pulse: Int?) {
        leadOff.value    = lo
        sampleRate.value = rate

        // Start session timer on the first status packet if ECG hasn't started yet
        if ((sessionStart.value ?: 0L) == 0L) sessionStart.value = System.currentTimeMillis()

        temp?.let { t ->
            temperature.value = t
            tempMax.value = maxOf(tempMax.value ?: t, t)
            tempMin.value = minOf(tempMin.value ?: t, t)
        }
        hum?.let { h ->
            humidity.value = h
            humMax.value = maxOf(humMax.value ?: h, h)
            humMin.value = minOf(humMin.value ?: h, h)
        }
        pulse?.let { p ->
            bpm.value = p
            bpmMax.value = maxOf(bpmMax.value ?: p, p)
            bpmMin.value = minOf(bpmMin.value ?: p, p)
        }

        // Re-evaluate and update the active alerts list after each status update
        checkAlerts(temp, hum, pulse)
    }

    /**
     * Evaluates sensor readings against configured thresholds and updates activeAlerts.
     * Each alert is a short human-readable string shown in the SensorsFragment banner.
     * An empty list means all readings are within normal range.
     */
    private fun checkAlerts(temp: Float?, hum: Float?, pulse: Int?) {
        val alerts = mutableListOf<String>()
        temp?.let {
            if (it > (alertTempHigh.value ?: 38f)) alerts.add("Temp RIDICATA: ${"%.1f".format(it)}°C")
            if (it < (alertTempLow.value  ?: 35f)) alerts.add("Temp SCAZUTA: ${"%.1f".format(it)}°C")
        }
        hum?.let {
            if (it > (alertHumHigh.value ?: 80f)) alerts.add("Umid. RIDICATA: ${"%.1f".format(it)}%")
            if (it < (alertHumLow.value  ?: 20f)) alerts.add("Umid. SCAZUTA: ${"%.1f".format(it)}%")
        }
        pulse?.let {
            if (it > (alertBpmHigh.value ?: 120)) alerts.add("Puls RIDICAT: $it BPM")
            if (it < (alertBpmLow.value  ?: 40))  alerts.add("Puls SCAZUT: $it BPM")
        }
        activeAlerts.value = alerts
    }

    /**
     * Resets all session data: counters, min/max stats, sensor readings, and the log.
     * Called when the user presses "Reset Session" in SettingsFragment.
     * Does NOT reset thresholds or the device name.
     */
    fun resetSession() {
        packetCount.value   = 0
        totalValues.value   = 0
        lastPacketRaw.value  = "--"
        leadOff.value       = false
        temperature.value   = null
        humidity.value      = null
        bpm.value           = null
        sessionStart.value  = 0L
        ecgMax.value        = Int.MIN_VALUE
        ecgMin.value        = Int.MAX_VALUE
        tempMax.value = null; tempMin.value = null
        humMax.value  = null; humMin.value  = null
        bpmMax.value  = null; bpmMin.value  = null
        activeAlerts.value  = emptyList()
        _logLines.clear()
        logText.value = ""
    }
}
