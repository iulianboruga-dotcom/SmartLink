package com.example.smartlink_multi

/**
 * EcgFragment.kt — SmartLink Multi
 *
 * The first tab (position 0) in the ViewPager2.
 * Displays the real-time ECG waveform and BLE connection controls.
 *
 * UI elements:
 *   - Status label (connection state, color-coded)
 *   - MTU / sample rate info line
 *   - Lead-off warning (⚠ when electrodes are detached)
 *   - Packet statistics (packet count, total values, last packet size)
 *   - Last raw packet string (for debugging the BLE payload format)
 *   - EcgView — custom View that draws the live waveform
 *   - Connect / Disconnect button
 *   - Scrollable diagnostic log (timestamped BLE events)
 *
 * This fragment does NOT manage BLE directly — it delegates all connect/disconnect
 * actions to MainActivity via the activity reference, and observes all data
 * from BleViewModel which is shared across all fragments.
 *
 * The activityViewModels() delegate ensures this fragment shares the same
 * ViewModel instance as SensorsFragment, SettingsFragment, and MainActivity.
 */

import android.graphics.Color
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ScrollView
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels

class EcgFragment : Fragment() {

    // Shared ViewModel — same instance across the whole app
    private val vm: BleViewModel by activityViewModels()

    // View references — assigned in onViewCreated to avoid null access
    private lateinit var tvStatus:     TextView   // Connection status text (color-coded)
    private lateinit var tvMtu:        TextView   // "MTU: 100 | Rata: 250Hz"
    private lateinit var tvLeadOff:    TextView   // Electrode contact warning
    private lateinit var tvPackets:    TextView   // Packet / value counters
    private lateinit var tvLastPacket: TextView   // Raw content of last BLE packet
    private lateinit var tvLog:        TextView   // Diagnostic log text
    private lateinit var scrollView:   ScrollView // Auto-scrolls the log to the bottom
    private lateinit var ecgView:      EcgView    // Custom waveform rendering view
    private lateinit var btnConnect:   Button     // Connect / Disconnect toggle button

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View = inflater.inflate(R.layout.fragment_ecg, container, false)

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        // Bind all view references
        tvStatus     = view.findViewById(R.id.tvEcgStatus)
        tvMtu        = view.findViewById(R.id.tvEcgMtu)
        tvLeadOff    = view.findViewById(R.id.tvEcgLeadOff)
        tvPackets    = view.findViewById(R.id.tvEcgPackets)
        tvLastPacket = view.findViewById(R.id.tvEcgLastPacket)
        tvLog        = view.findViewById(R.id.tvEcgLog)
        scrollView   = view.findViewById(R.id.ecgScrollView)
        ecgView      = view.findViewById(R.id.ecgView)
        btnConnect   = view.findViewById(R.id.btnEcgConnect)

        // Connect button — toggles BLE connection via MainActivity.
        // We cast to MainActivity because the BLE logic lives there, not in a service.
        // Future refactor: move BLE to a foreground Service or repository layer.
        btnConnect.setOnClickListener {
            val act = activity as? MainActivity ?: return@setOnClickListener
            if (act.isConnected()) act.requestDisconnect() else act.requestConnect()
        }

        // --- Observe connection state ---

        // Update status text label
        vm.connectionStatus.observe(viewLifecycleOwner) { tvStatus.text = it }

        // Update status text color (red = disconnected, yellow = connecting, green = connected)
        vm.connectionColor.observe(viewLifecycleOwner)  { tvStatus.setTextColor(Color.parseColor(it)) }

        // Update button label and clear the waveform on disconnect
        vm.isConnected.observe(viewLifecycleOwner) { connected ->
            btnConnect.text = if (connected) "Deconecteaza" else "Scaneaza si Conecteaza"
            if (!connected) ecgView.clearData()
        }

        // --- Observe MTU and sample rate (displayed on a single line) ---
        // Both are updated independently, so we use a helper to keep them in sync.
        fun updateMtu() {
            val mtu  = vm.negotiatedMtu.value ?: 0
            val rate = vm.sampleRate.value ?: 0
            tvMtu.text = "MTU: ${if (mtu > 0) mtu else "--"} | Rata: ${if (rate > 0) "${rate}Hz" else "--"}"
        }
        vm.negotiatedMtu.observe(viewLifecycleOwner) { updateMtu() }
        vm.sampleRate.observe(viewLifecycleOwner)    { updateMtu() }

        // --- Observe lead-off status ---
        // The ADS1115/AD8232 chip on the ESP32 reports if electrodes are lifted.
        // We display a prominent warning so the user knows the signal is invalid.
        vm.leadOff.observe(viewLifecycleOwner) { off ->
            tvLeadOff.text = if (off) "⚠ ELECTROZI DECONECTATI" else "✓ Electrozi OK"
            tvLeadOff.setTextColor(if (off) Color.parseColor("#FF4444") else Color.parseColor("#00FF00"))
        }

        // --- Observe packet statistics ---
        // Updated on every received ECG BLE notification
        vm.packetCount.observe(viewLifecycleOwner) {
            tvPackets.text =
                "Pkts: $it | Tot: ${vm.totalValues.value ?: 0} | Ultim: ${vm.lastPacketSize.value ?: "--"} val"
        }

        // Show the raw comma-separated string from the last ECG BLE packet
        vm.lastPacketRaw.observe(viewLifecycleOwner) { tvLastPacket.text = it }

        // --- Observe ECG samples → feed directly into EcgView ---
        vm.ecgSamples.observe(viewLifecycleOwner) { ecgView.addSamples(it) }

        // --- Observe diagnostic log ---
        // Auto-scroll to bottom each time a new line is appended.
        // scrollView.post{} defers the scroll until after the text has been laid out.
        vm.logText.observe(viewLifecycleOwner) {
            tvLog.text = it
            scrollView.post { scrollView.fullScroll(ScrollView.FOCUS_DOWN) }
        }
    }
}
