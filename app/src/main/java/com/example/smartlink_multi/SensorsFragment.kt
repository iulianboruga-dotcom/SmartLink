package com.example.smartlink_multi

/**
 * SensorsFragment.kt — SmartLink Multi
 *
 * The second tab (position 1) in the ViewPager2.
 * Displays real-time readings from all sensors connected to the ESP32:
 *   - DHT22: temperature (°C) and relative humidity (%)
 *   - MAX30102 / analog pulse sensor: heart rate (BPM)
 *   - AD8232 / ADS1115: lead-off status + ECG ADC min/max
 *
 * Each sensor value is color-coded by clinical range:
 *   Green  (#00FF00) = normal / optimal range
 *   Yellow (#FFFF00) = borderline / attention
 *   Blue   (#4FC3F7) = low (hypothermia / bradycardia / dry air)
 *   Red    (#FF4444) = high (fever / tachycardia / humid)
 *
 * An alert banner (tvAlerts) is shown at the top when any value exceeds
 * the configured thresholds stored in BleViewModel.
 *
 * Min/Max values for the session are shown below each reading.
 * A "no data" overlay is shown when the device is not connected.
 *
 * All data is observed from BleViewModel — this fragment is purely display.
 */

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels

class SensorsFragment : Fragment() {

    // Shared ViewModel
    private val vm: BleViewModel by activityViewModels()

    // --- Temperature views ---
    private lateinit var tvTemp:        TextView  // "36.5°C" — large display value
    private lateinit var tvTempLabel:   TextView  // "NORMAL" / "FEBRA" / "HIPOTERMIE" / "ATENTIE"
    private lateinit var tvTempMinMax:  TextView  // "↓ 36.1°C   ↑ 37.2°C"

    // --- Humidity views ---
    private lateinit var tvHum:         TextView  // "55.0%"
    private lateinit var tvHumLabel:    TextView  // "OPTIM" / "PREA UMEDA" / "PREA USCATA" / "ACCEPTABIL"
    private lateinit var tvHumMinMax:   TextView  // "↓ 40.0%   ↑ 65.0%"

    // --- Pulse / BPM views ---
    private lateinit var tvBpm:         TextView  // "72 BPM"
    private lateinit var tvBpmHeart:    TextView  // Heart symbol "♥" or "❤" (color-coded)
    private lateinit var tvBpmZone:     TextView  // "NORMAL" / "TAHICARDIE" / "BRADICARDIE" / "RIDICAT" / "SCAZUT"
    private lateinit var tvBpmMinMax:   TextView  // "↓ 60 BPM   ↑ 95 BPM"

    // --- ECG / electrode status ---
    private lateinit var tvLeadStatus:  TextView  // Lead-off indicator
    private lateinit var tvEcgMinMax:   TextView  // Session ECG ADC range

    // --- Alert banner ---
    private lateinit var tvAlerts:      TextView  // Shown only when thresholds are exceeded

    // --- No-data overlay ---
    private lateinit var tvNoData:      TextView  // "Connect device to see readings"

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_sensors, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        // Bind views
        tvTemp       = view.findViewById(R.id.tvTemp)
        tvTempLabel  = view.findViewById(R.id.tvTempLabel)
        tvTempMinMax = view.findViewById(R.id.tvTempMinMax)
        tvHum        = view.findViewById(R.id.tvHum)
        tvHumLabel   = view.findViewById(R.id.tvHumLabel)
        tvHumMinMax  = view.findViewById(R.id.tvHumMinMax)
        tvBpm        = view.findViewById(R.id.tvBpm)
        tvBpmHeart   = view.findViewById(R.id.tvBpmHeart)
        tvBpmZone    = view.findViewById(R.id.tvBpmZone)
        tvBpmMinMax  = view.findViewById(R.id.tvBpmMinMax)
        tvLeadStatus = view.findViewById(R.id.tvSensLeadStatus)
        tvAlerts     = view.findViewById(R.id.tvAlerts)
        tvEcgMinMax  = view.findViewById(R.id.tvSensEcgMinMax)
        tvNoData     = view.findViewById(R.id.tvNoData)

        // Show/hide the "no data" overlay based on connection state
        vm.isConnected.observe(viewLifecycleOwner) { connected ->
            tvNoData.visibility = if (connected) View.GONE else View.VISIBLE
        }

        // --- Temperature observer ---
        // Color thresholds based on WHO/medical reference ranges:
        //   ≥ alertTempHigh (38°C default) → FEVER → red
        //   ≤ alertTempLow  (35°C default) → HYPOTHERMIA → blue
        //   36.1–37.2°C                    → NORMAL → green
        //   otherwise                      → CAUTION → yellow
        vm.temperature.observe(viewLifecycleOwner) { t ->
            if (t == null) {
                tvTemp.text = "--"
                tvTempLabel.setTextColor(Color.parseColor("#888888"))
                return@observe
            }
            tvTemp.text = "${"%.1f".format(t)}°C"
            val (color, label) = when {
                t >= (vm.alertTempHigh.value ?: 38f) -> "#FF4444" to "FEBRA"
                t <= (vm.alertTempLow.value  ?: 35f) -> "#4FC3F7" to "HIPOTERMIE"
                t in 36.1f..37.2f                    -> "#00FF00" to "NORMAL"
                else                                  -> "#FFFF00" to "ATENTIE"
            }
            tvTemp.setTextColor(Color.parseColor(color))
            tvTempLabel.text = label
            tvTempLabel.setTextColor(Color.parseColor(color))
        }
        // Refresh the min/max line whenever either bound changes
        vm.tempMin.observe(viewLifecycleOwner) { refreshTempMinMax() }
        vm.tempMax.observe(viewLifecycleOwner) { refreshTempMinMax() }

        // --- Humidity observer ---
        // Reference ranges for comfortable indoor/medical environment:
        //   > alertHumHigh (80%) → too humid → red
        //   < alertHumLow  (20%) → too dry   → blue
        //   40–60%               → optimal   → green
        //   otherwise            → acceptable → yellow
        vm.humidity.observe(viewLifecycleOwner) { h ->
            if (h == null) {
                tvHum.text = "--"
                tvHumLabel.setTextColor(Color.parseColor("#888888"))
                return@observe
            }
            tvHum.text = "${"%.1f".format(h)}%"
            val (color, label) = when {
                h > (vm.alertHumHigh.value ?: 80f) -> "#FF4444" to "PREA UMEDA"
                h < (vm.alertHumLow.value  ?: 20f) -> "#4FC3F7" to "PREA USCATA"
                h in 40f..60f                       -> "#00FF00" to "OPTIM"
                else                                -> "#FFFF00" to "ACCEPTABIL"
            }
            tvHum.setTextColor(Color.parseColor(color))
            tvHumLabel.text = label
            tvHumLabel.setTextColor(Color.parseColor(color))
        }
        vm.humMin.observe(viewLifecycleOwner) { refreshHumMinMax() }
        vm.humMax.observe(viewLifecycleOwner) { refreshHumMinMax() }

        // --- BPM observer ---
        // Clinical reference:
        //   ≥ alertBpmHigh (120) → TACHYCARDIA → red + filled heart ❤
        //   ≤ alertBpmLow  (40)  → BRADYCARDIA → blue + filled heart ❤
        //   60–100               → NORMAL      → green + outline ♥
        //   101–119              → ELEVATED    → yellow + outline ♥
        //   otherwise            → LOW         → yellow + outline ♥
        vm.bpm.observe(viewLifecycleOwner) { b ->
            if (b == null) {
                tvBpm.text  = "--"
                tvBpmHeart.setTextColor(Color.parseColor("#888888"))
                tvBpmZone.text = "fara date"
                return@observe
            }
            tvBpm.text = "$b BPM"
            val (color, zone, heart) = when {
                b >= (vm.alertBpmHigh.value ?: 120) -> Triple("#FF4444", "TAHICARDIE",  "❤")
                b <= (vm.alertBpmLow.value  ?: 40)  -> Triple("#4FC3F7", "BRADICARDIE", "❤")
                b in 60..100                         -> Triple("#00FF00", "NORMAL",      "♥")
                b in 101..119                        -> Triple("#FFFF00", "RIDICAT",     "♥")
                else                                 -> Triple("#FFFF00", "SCAZUT",      "♥")
            }
            tvBpm.setTextColor(Color.parseColor(color))
            tvBpmHeart.text = heart
            tvBpmHeart.setTextColor(Color.parseColor(color))
            tvBpmZone.text = zone
            tvBpmZone.setTextColor(Color.parseColor(color))
        }
        vm.bpmMin.observe(viewLifecycleOwner) { refreshBpmMinMax() }
        vm.bpmMax.observe(viewLifecycleOwner) { refreshBpmMinMax() }

        // --- Lead-off status ---
        // When leadOff = true the ECG electrodes are not contacting the skin.
        // The ECG signal is invalid and the user should be warned clearly.
        vm.leadOff.observe(viewLifecycleOwner) { off ->
            tvLeadStatus.text = if (off) "⚠  Electrozi deconectati — semnal ECG invalid"
                                else     "✓  Electrozi conectati"
            tvLeadStatus.setTextColor(
                if (off) Color.parseColor("#FF4444") else Color.parseColor("#00CC00")
            )
        }

        // --- Active alerts banner ---
        // Shown only when at least one threshold is exceeded.
        // All active alerts are concatenated on a single scrolling line.
        vm.activeAlerts.observe(viewLifecycleOwner) { alerts ->
            if (alerts.isEmpty()) {
                tvAlerts.visibility = View.GONE
            } else {
                tvAlerts.visibility = View.VISIBLE
                tvAlerts.text = "⚠  " + alerts.joinToString("   |   ")
            }
        }

        // --- ECG ADC range (from the session min/max in BleViewModel) ---
        vm.ecgMin.observe(viewLifecycleOwner) { refreshEcgMinMax() }
        vm.ecgMax.observe(viewLifecycleOwner) { refreshEcgMinMax() }
    }

    // ---- Min/max refresh helpers ----
    // Each helper reads the current pair of values from the ViewModel and
    // formats them into the corresponding TextView. Called whenever either
    // bound changes via its LiveData observer.

    private fun refreshTempMinMax() {
        val mn = vm.tempMin.value; val mx = vm.tempMax.value
        tvTempMinMax.text =
            "↓ ${mn?.let { "${"%.1f".format(it)}°C" } ?: "--"}   ↑ ${mx?.let { "${"%.1f".format(it)}°C" } ?: "--"}"
    }

    private fun refreshHumMinMax() {
        val mn = vm.humMin.value; val mx = vm.humMax.value
        tvHumMinMax.text =
            "↓ ${mn?.let { "${"%.1f".format(it)}%" } ?: "--"}   ↑ ${mx?.let { "${"%.1f".format(it)}%" } ?: "--"}"
    }

    private fun refreshBpmMinMax() {
        val mn = vm.bpmMin.value; val mx = vm.bpmMax.value
        tvBpmMinMax.text =
            "↓ ${mn?.let { "$it BPM" } ?: "--"}   ↑ ${mx?.let { "$it BPM" } ?: "--"}"
    }

    private fun refreshEcgMinMax() {
        // Sentinel check: Int.MAX_VALUE / Int.MIN_VALUE means no data received yet
        val mn = vm.ecgMin.value?.takeIf { it != Int.MAX_VALUE }
        val mx = vm.ecgMax.value?.takeIf { it != Int.MIN_VALUE }
        tvEcgMinMax.text =
            "Semnal ECG (ADC 12-bit)   ↓ ${mn ?: "--"}   ↑ ${mx ?: "--"}"
    }
}
