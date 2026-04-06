package com.example.smartlink_multi

/**
 * SettingsFragment.kt — SmartLink Multi
 *
 * The third tab (position 2) in the ViewPager2.
 * Provides three sections:
 *
 * 1. LOCAL LOGIN
 *    A simple username/password system backed by SharedPreferences.
 *    This is a placeholder for the future cloud authentication that
 *    colleagues will implement with the web backend.
 *    - If the username doesn't exist yet → account is auto-created.
 *    - If it exists and the password matches → user is logged in.
 *    - Credentials are stored in plaintext — this is intentional for
 *      a prototype and MUST be replaced with proper auth (JWT, OAuth)
 *      when the backend is integrated.
 *
 * 2. SESSION STATISTICS
 *    - Live session duration (updated every second via tickRunnable)
 *    - Total BLE packets and ADC values received
 *    - Per-session min/max for ECG, temperature, humidity, and BPM
 *    - "Reset Session" button clears all stats in BleViewModel
 *
 * 3. ALERT THRESHOLDS + DEVICE NAME
 *    - Editable fields for all six alert thresholds
 *    - Editable BLE target device name (must match the ESP32 BLE name)
 *    - "Save" persists values to SharedPreferences AND pushes them to BleViewModel
 *    - Values are loaded from SharedPreferences on fragment creation so they
 *      survive app restarts.
 *
 * SharedPreferences key conventions:
 *   "logged_user"    → currently logged-in username (absent = not logged in)
 *   "pass_<user>"    → stored password for <user>
 *   "th_temp_high"   → temperature high threshold (float)
 *   "th_temp_low"    → temperature low threshold (float)
 *   "th_hum_high"    → humidity high threshold (float)
 *   "th_hum_low"     → humidity low threshold (float)
 *   "th_bpm_high"    → BPM high threshold (int)
 *   "th_bpm_low"     → BPM low threshold (int)
 *   "device_name"    → BLE device name to scan for (string)
 */

import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.*
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels

class SettingsFragment : Fragment() {

    // Shared ViewModel
    private val vm: BleViewModel by activityViewModels()

    // Handler for the 1-second session duration tick
    private val tickHandler = Handler(Looper.getMainLooper())

    // --- Session stats views ---
    private lateinit var tvSessionDuration: TextView  // "00:04:32"
    private lateinit var tvStatsPackets:    TextView  // "Pachete: 1200 | Valori totale: 12000"
    private lateinit var tvStatsEcg:        TextView  // ECG ADC min/max
    private lateinit var tvStatsTemp:       TextView  // Temperature min/max
    private lateinit var tvStatsHum:        TextView  // Humidity min/max
    private lateinit var tvStatsBpm:        TextView  // BPM min/max

    // --- Login views ---
    private lateinit var tvLoggedInAs: TextView  // Username displayed when logged in
    private lateinit var loginCard:    View      // Shown when not logged in
    private lateinit var profileCard:  View      // Shown when logged in

    /**
     * Runnable that updates the session duration display every second.
     * Scheduled in onResume(), cancelled in onPause() to avoid leaks
     * when the fragment is not visible.
     */
    private val tickRunnable = object : Runnable {
        override fun run() {
            refreshDuration()
            tickHandler.postDelayed(this, 1000)
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_settings, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        // SharedPreferences file — used for login credentials and alert thresholds.
        // MODE_PRIVATE means only this app can read/write these values.
        val prefs = requireContext().getSharedPreferences("smartlink_prefs", Context.MODE_PRIVATE)

        // ========== SECTION 1: LOCAL LOGIN ==========

        val etUser    = view.findViewById<EditText>(R.id.etUsername)
        val etPass    = view.findViewById<EditText>(R.id.etPassword)
        val btnLogin  = view.findViewById<Button>(R.id.btnLogin)
        val btnLogout = view.findViewById<Button>(R.id.btnLogout)
        loginCard     = view.findViewById(R.id.loginCard)
        profileCard   = view.findViewById(R.id.profileCard)
        tvLoggedInAs  = view.findViewById(R.id.tvLoggedInAs)

        /**
         * Refreshes the login UI based on the currently stored "logged_user" pref.
         * If a user is logged in: show the profile card with their name.
         * If not: show the login form.
         */
        fun refreshLogin() {
            val user = prefs.getString("logged_user", null)
            if (user != null) {
                loginCard.visibility   = View.GONE
                profileCard.visibility = View.VISIBLE
                tvLoggedInAs.text      = user
            } else {
                loginCard.visibility   = View.VISIBLE
                profileCard.visibility = View.GONE
            }
        }
        refreshLogin()

        btnLogin.setOnClickListener {
            val user = etUser.text.toString().trim()
            val pass = etPass.text.toString()
            if (user.isEmpty() || pass.isEmpty()) {
                Toast.makeText(requireContext(), "Completati toate campurile", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            val saved = prefs.getString("pass_$user", null)
            when {
                // New user — auto-register and log in
                saved == null -> {
                    prefs.edit().putString("pass_$user", pass).putString("logged_user", user).apply()
                    Toast.makeText(requireContext(), "Cont creat — bun venit, $user!", Toast.LENGTH_SHORT).show()
                }
                // Existing user, correct password — log in
                saved == pass -> {
                    prefs.edit().putString("logged_user", user).apply()
                    Toast.makeText(requireContext(), "Bun venit, $user!", Toast.LENGTH_SHORT).show()
                }
                // Wrong password — reject without any state change
                else -> {
                    Toast.makeText(requireContext(), "Parola incorecta!", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
            }
            etUser.text.clear(); etPass.text.clear()
            refreshLogin()
        }

        btnLogout.setOnClickListener {
            // Remove the logged_user key — credentials remain stored for next login
            prefs.edit().remove("logged_user").apply()
            refreshLogin()
        }

        // ========== SECTION 2: SESSION STATISTICS ==========

        tvSessionDuration = view.findViewById(R.id.tvSessionDuration)
        tvStatsPackets    = view.findViewById(R.id.tvStatsPackets)
        tvStatsEcg        = view.findViewById(R.id.tvStatsEcg)
        tvStatsTemp       = view.findViewById(R.id.tvStatsTemp)
        tvStatsHum        = view.findViewById(R.id.tvStatsHum)
        tvStatsBpm        = view.findViewById(R.id.tvStatsBpm)

        // Reset all session counters and sensor readings in the ViewModel
        view.findViewById<Button>(R.id.btnResetSession).setOnClickListener {
            vm.resetSession()
            Toast.makeText(requireContext(), "Sesiune resetata!", Toast.LENGTH_SHORT).show()
        }

        // Live-update stats as new packets arrive
        vm.packetCount.observe(viewLifecycleOwner) {
            tvStatsPackets.text = "Pachete: $it   |   Valori totale: ${vm.totalValues.value ?: 0}"
        }
        // Observe each min/max pair — update the combined stat line when either changes
        vm.ecgMin.observe(viewLifecycleOwner)  { refreshEcgStats() }
        vm.ecgMax.observe(viewLifecycleOwner)  { refreshEcgStats() }
        vm.tempMin.observe(viewLifecycleOwner) { refreshTempStats() }
        vm.tempMax.observe(viewLifecycleOwner) { refreshTempStats() }
        vm.humMin.observe(viewLifecycleOwner)  { refreshHumStats() }
        vm.humMax.observe(viewLifecycleOwner)  { refreshHumStats() }
        vm.bpmMin.observe(viewLifecycleOwner)  { refreshBpmStats() }
        vm.bpmMax.observe(viewLifecycleOwner)  { refreshBpmStats() }

        // ========== SECTION 3: ALERT THRESHOLDS + DEVICE NAME ==========

        val etTempHigh = view.findViewById<EditText>(R.id.etTempHigh)
        val etTempLow  = view.findViewById<EditText>(R.id.etTempLow)
        val etHumHigh  = view.findViewById<EditText>(R.id.etHumHigh)
        val etHumLow   = view.findViewById<EditText>(R.id.etHumLow)
        val etBpmHigh  = view.findViewById<EditText>(R.id.etBpmHigh)
        val etBpmLow   = view.findViewById<EditText>(R.id.etBpmLow)
        val etDevice   = view.findViewById<EditText>(R.id.etDeviceName)
        val btnSave    = view.findViewById<Button>(R.id.btnSaveSettings)

        // Populate fields from previously saved SharedPreferences (or defaults)
        etTempHigh.setText(prefs.getFloat("th_temp_high", 38f).toString())
        etTempLow.setText(prefs.getFloat("th_temp_low",  35f).toString())
        etHumHigh.setText(prefs.getFloat("th_hum_high",  80f).toString())
        etHumLow.setText(prefs.getFloat("th_hum_low",   20f).toString())
        etBpmHigh.setText(prefs.getInt("th_bpm_high",  120).toString())
        etBpmLow.setText(prefs.getInt("th_bpm_low",    40).toString())
        etDevice.setText(prefs.getString("device_name", "SmartLink-ECG"))

        // Also push saved thresholds into ViewModel immediately on creation,
        // so that alert evaluation uses the persisted values from the first packet onward.
        vm.alertTempHigh.value = prefs.getFloat("th_temp_high", 38f)
        vm.alertTempLow.value  = prefs.getFloat("th_temp_low",  35f)
        vm.alertHumHigh.value  = prefs.getFloat("th_hum_high",  80f)
        vm.alertHumLow.value   = prefs.getFloat("th_hum_low",   20f)
        vm.alertBpmHigh.value  = prefs.getInt("th_bpm_high",  120)
        vm.alertBpmLow.value   = prefs.getInt("th_bpm_low",    40)
        vm.deviceName.value    = prefs.getString("device_name", "SmartLink-ECG")

        // Save button: parse all fields, persist to SharedPreferences, push to ViewModel.
        // NumberFormatException is caught to show a user-friendly error instead of crashing.
        btnSave.setOnClickListener {
            try {
                val th = etTempHigh.text.toString().toFloat()
                val tl = etTempLow.text.toString().toFloat()
                val hh = etHumHigh.text.toString().toFloat()
                val hl = etHumLow.text.toString().toFloat()
                val bh = etBpmHigh.text.toString().toInt()
                val bl = etBpmLow.text.toString().toInt()
                // Fall back to default name if the device name field is left blank
                val dn = etDevice.text.toString().trim().ifEmpty { "SmartLink-ECG" }

                // Persist to SharedPreferences so values survive app restart
                prefs.edit()
                    .putFloat("th_temp_high", th).putFloat("th_temp_low", tl)
                    .putFloat("th_hum_high",  hh).putFloat("th_hum_low",  hl)
                    .putInt("th_bpm_high",    bh).putInt("th_bpm_low",    bl)
                    .putString("device_name", dn)
                    .apply()

                // Push into ViewModel so SensorsFragment alert evaluation updates immediately
                vm.alertTempHigh.value = th; vm.alertTempLow.value = tl
                vm.alertHumHigh.value  = hh; vm.alertHumLow.value  = hl
                vm.alertBpmHigh.value  = bh; vm.alertBpmLow.value  = bl
                vm.deviceName.value    = dn

                Toast.makeText(requireContext(), "Setari salvate!", Toast.LENGTH_SHORT).show()
            } catch (_: NumberFormatException) {
                Toast.makeText(requireContext(), "Valori invalide!", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onResume() {
        super.onResume()
        // Start ticking the session duration display every second
        tickHandler.post(tickRunnable)
    }

    override fun onPause() {
        super.onPause()
        // Stop ticking when the tab is not visible — avoids unnecessary work and memory leaks
        tickHandler.removeCallbacks(tickRunnable)
    }

    /**
     * Calculates and displays the elapsed session duration in HH:MM:SS format.
     * If no session has started (sessionStart == 0), shows "--:--:--".
     */
    private fun refreshDuration() {
        val start = vm.sessionStart.value ?: 0L
        if (start == 0L) { tvSessionDuration.text = "--:--:--"; return }
        val ms = System.currentTimeMillis() - start
        tvSessionDuration.text = "%02d:%02d:%02d".format(
            ms / 3_600_000,
            (ms % 3_600_000) / 60_000,
            (ms % 60_000) / 1_000
        )
    }

    // ---- Stats refresh helpers ----
    // Sentinel values (Int.MAX_VALUE / Int.MIN_VALUE) indicate no data received yet.

    private fun refreshEcgStats() {
        val mn = vm.ecgMin.value?.takeIf { it != Int.MAX_VALUE }
        val mx = vm.ecgMax.value?.takeIf { it != Int.MIN_VALUE }
        tvStatsEcg.text = "ECG (ADC)    min ${mn ?: "--"}    max ${mx ?: "--"}"
    }

    private fun refreshTempStats() {
        val mn = vm.tempMin.value; val mx = vm.tempMax.value
        tvStatsTemp.text = "Temperatura   min ${mn?.let { "${"%.1f".format(it)}°C" } ?: "--"}    max ${mx?.let { "${"%.1f".format(it)}°C" } ?: "--"}"
    }

    private fun refreshHumStats() {
        val mn = vm.humMin.value; val mx = vm.humMax.value
        tvStatsHum.text = "Umiditate     min ${mn?.let { "${"%.1f".format(it)}%" } ?: "--"}    max ${mx?.let { "${"%.1f".format(it)}%" } ?: "--"}"
    }

    private fun refreshBpmStats() {
        val mn = vm.bpmMin.value; val mx = vm.bpmMax.value
        tvStatsBpm.text = "Puls          min ${mn?.let { "$it BPM" } ?: "--"}    max ${mx?.let { "$it BPM" } ?: "--"}"
    }
}
