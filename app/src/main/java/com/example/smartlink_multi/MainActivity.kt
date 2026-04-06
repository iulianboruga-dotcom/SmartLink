package com.example.smartlink_multi

/**
 * MainActivity.kt — SmartLink Multi
 *
 * This is the entry point of the SmartLink Android application.
 * It owns the entire Bluetooth Low Energy (BLE) lifecycle:
 *   - Permission handling (Android 12+ requires BLUETOOTH_SCAN + BLUETOOTH_CONNECT at runtime)
 *   - BLE device scanning (filtered by device name)
 *   - GATT connection, MTU negotiation, service/characteristic discovery
 *   - Receiving and dispatching ECG packets and sensor status notifications
 *
 * The UI is structured as a ViewPager2 with 3 tabs (fragments):
 *   0 - EcgFragment    → real-time ECG waveform + connection log
 *   1 - SensorsFragment → temperature, humidity, BPM, alerts
 *   2 - SettingsFragment → session stats, alert thresholds, device name, local login
 *
 * All live data flows through BleViewModel so fragments can observe
 * independently without coupling to this activity directly.
 *
 * BLE Protocol (ESP32 HM-10 style, service FFE0):
 *   - ECG characteristic  (FFE2): comma-separated ADC-12bit integers, ~10 samples/packet
 *   - Status characteristic (FFE1): JSON string → { rate, leadOff, temp, hum, bpm }
 *
 * NOTE: This is a functional draft. The UI is intentionally minimal —
 * colleagues will redesign it with proper theming and a cloud backend.
 */

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.*
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.viewpager2.widget.ViewPager2
import com.google.android.material.tabs.TabLayout
import com.google.android.material.tabs.TabLayoutMediator
import org.json.JSONObject
import java.util.*

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "SmartLinkMulti"

        // BLE service UUID used by the ESP32 HM-10 module.
        // All characteristics live under this single service.
        private const val SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb"

        // ECG characteristic — the ESP32 sends comma-separated ADC readings here.
        // Example notification value: "2048,2060,2055,2043,2070,..."
        private const val ECG_CHAR_UUID = "0000ffe2-0000-1000-8000-00805f9b34fb"

        // Status characteristic — the ESP32 sends a JSON object here periodically.
        // Example: {"rate":250,"leadOff":false,"temp":36.5,"hum":55.2,"bpm":72}
        private const val STATUS_CHAR_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb"

        // Requested MTU size. Default Android MTU is 23 bytes, which limits packet size.
        // We request 100 bytes so that each BLE packet can carry ~10 ECG samples.
        // The actual negotiated value is reported back in onMtuChanged().
        private const val REQUESTED_MTU = 100
    }

    // ViewModel shared with all fragments — survives configuration changes.
    val viewModel: BleViewModel by viewModels()

    // Handler on the main (UI) thread — used to post delayed actions and UI updates
    // from BLE callbacks (which run on a background thread).
    private val handler = Handler(Looper.getMainLooper())

    // Android Bluetooth adapter — null if Bluetooth is not supported on this device.
    private var bluetoothAdapter: BluetoothAdapter? = null

    // GATT connection handle. Non-null only while a BLE connection is active.
    // Nulled out on disconnect to allow garbage collection.
    private var bluetoothGatt: BluetoothGatt? = null

    // Guard flag to prevent starting a second scan while one is already in progress.
    private var scanning = false

    /** Checked by EcgFragment to determine the correct label for the connect button. */
    fun isConnected() = bluetoothGatt != null

    /** Called by EcgFragment's connect button when not connected. */
    fun requestConnect() { checkPermissionsAndScan() }

    /** Called by EcgFragment's connect button when already connected. */
    fun requestDisconnect() { disconnect() }

    // ==================== LIFECYCLE ====================

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Set up the ViewPager2 + TabLayout.
        // offscreenPageLimit = 2 keeps all 3 fragments alive in memory at the same time,
        // so that their LiveData observers remain active and UI stays up-to-date even
        // when the user is on a different tab.
        val pager = findViewById<ViewPager2>(R.id.viewPager)
        val tabs  = findViewById<TabLayout>(R.id.tabLayout)
        pager.adapter = ViewPagerAdapter(this)
        pager.offscreenPageLimit = 2

        TabLayoutMediator(tabs, pager) { tab, pos ->
            tab.text = when (pos) { 0 -> "ECG"; 1 -> "Senzori"; else -> "Setari" }
        }.attach()

        // Obtain the system Bluetooth adapter. Will be null on devices without BT hardware.
        val btManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
        bluetoothAdapter = btManager.adapter
    }

    override fun onDestroy() {
        super.onDestroy()
        // Always clean up the GATT connection when the activity is destroyed
        // to avoid resource leaks and ghost BLE connections.
        disconnect()
    }

    // ==================== PERMISSIONS ====================

    /**
     * Runtime permission result handler.
     * On Android 12+ (API 31+) we need BLUETOOTH_SCAN and BLUETOOTH_CONNECT.
     * On older versions, only ACCESS_FINE_LOCATION is required for BLE scanning.
     * If all permissions are granted, BLE scanning starts immediately.
     */
    private val permLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { results ->
        if (results.values.all { it }) {
            viewModel.addLog("Permisiuni acordate!")
            startBleScan()
        } else {
            viewModel.addLog("EROARE: Permisiuni refuzate!")
            Toast.makeText(this, "Permisiuni BLE necesare!", Toast.LENGTH_LONG).show()
        }
    }

    /**
     * Checks which BLE permissions are missing and either starts scanning directly
     * (if all granted) or launches the system permission dialog.
     */
    private fun checkPermissionsAndScan() {
        val needed = buildList {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                add(Manifest.permission.BLUETOOTH_SCAN)
                add(Manifest.permission.BLUETOOTH_CONNECT)
            }
            add(Manifest.permission.ACCESS_FINE_LOCATION)
        }.filter { ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED }

        if (needed.isEmpty()) startBleScan()
        else { viewModel.addLog("Cer permisiuni BLE..."); permLauncher.launch(needed.toTypedArray()) }
    }

    // ==================== BLE SCAN ====================

    /**
     * Starts a BLE scan filtered to the configured device name (default "SmartLink-ECG").
     * The scan is limited to 15 seconds; if no device is found within that time,
     * the scan stops and the status updates to "not found".
     *
     * Using SCAN_MODE_LOW_LATENCY for the fastest possible discovery —
     * acceptable because scanning is short-lived and user-triggered.
     */
    @SuppressLint("MissingPermission")
    private fun startBleScan() {
        if (scanning) return  // Prevent duplicate scans
        val scanner = bluetoothAdapter?.bluetoothLeScanner
        if (scanner == null) { viewModel.addLog("EROARE: Bluetooth indisponibil!"); return }

        val target = viewModel.deviceName.value ?: "SmartLink-ECG"
        handler.post {
            viewModel.connectionStatus.value = "Scanare..."
            viewModel.connectionColor.value  = "#FFFF00"
        }
        scanning = true
        viewModel.addLog("Scan BLE pornit (target: $target)...")

        // Auto-stop scan after 15 seconds if no device was found
        handler.postDelayed({
            if (scanning) {
                stopBleScan()
                handler.post {
                    viewModel.connectionStatus.value = "Nu s-a gasit dispozitivul"
                    viewModel.connectionColor.value  = "#FF4444"
                    viewModel.isConnected.value      = false
                }
                viewModel.addLog("Timeout scan — dispozitiv negasit")
            }
        }, 15_000)

        scanner.startScan(
            listOf(ScanFilter.Builder().setDeviceName(target).build()),
            ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build(),
            scanCallback
        )
    }

    @SuppressLint("MissingPermission")
    private fun stopBleScan() {
        scanning = false
        bluetoothAdapter?.bluetoothLeScanner?.stopScan(scanCallback)
    }

    /**
     * BLE scan result callback.
     * When the target device is found by name, scanning stops immediately and
     * connection is initiated. This prevents connecting to the wrong device.
     */
    private val scanCallback = object : ScanCallback() {
        @SuppressLint("MissingPermission")
        override fun onScanResult(callbackType: Int, result: ScanResult) {
            val device = result.device
            val target = viewModel.deviceName.value ?: "SmartLink-ECG"
            if (device.name == target) {
                stopBleScan()
                handler.post {
                    viewModel.connectionStatus.value = "Conectare..."
                    viewModel.connectionColor.value  = "#FFFF00"
                }
                viewModel.addLog("Gasit: ${device.name} — conectare...")
                connectToDevice(device)
            }
        }
        override fun onScanFailed(errorCode: Int) {
            scanning = false
            viewModel.addLog("EROARE scan: cod $errorCode")
            handler.post {
                viewModel.connectionStatus.value = "Eroare scan"
                viewModel.connectionColor.value  = "#FF4444"
                viewModel.isConnected.value      = false
            }
        }
    }

    // ==================== BLE CONNECT ====================

    /**
     * Initiates a GATT connection to the found BLE device.
     * autoConnect = false means we attempt a direct connection immediately,
     * rather than waiting for the device to come into range.
     */
    @SuppressLint("MissingPermission")
    private fun connectToDevice(device: BluetoothDevice) {
        bluetoothGatt = device.connectGatt(this, false, gattCallback)
    }

    /**
     * Disconnects and closes the GATT connection.
     * It is important to call both disconnect() AND close() to properly
     * release the BLE connection and free the Android GATT client slot.
     * Android supports a limited number of simultaneous GATT clients (~7).
     */
    @SuppressLint("MissingPermission")
    fun disconnect() {
        bluetoothGatt?.disconnect()
        bluetoothGatt?.close()
        bluetoothGatt = null
        handler.post {
            viewModel.connectionStatus.value = "Deconectat"
            viewModel.connectionColor.value  = "#FF4444"
            viewModel.isConnected.value      = false
            viewModel.negotiatedMtu.value    = 0
            viewModel.sampleRate.value       = 0
        }
        viewModel.addLog("Deconectat.")
    }

    /**
     * GATT event callback — handles all BLE connection lifecycle events.
     * IMPORTANT: All callbacks run on a GATT background thread.
     * Any UI or LiveData update must be posted to the main thread via handler.post{}.
     */
    private val gattCallback = object : BluetoothGattCallback() {

        @SuppressLint("MissingPermission")
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            when (newState) {
                BluetoothProfile.STATE_CONNECTED -> {
                    // First step after connecting: negotiate a larger MTU.
                    // The default ATT MTU is 23 bytes (20 bytes payload), which is too small
                    // for our multi-sample ECG packets. We request 100 bytes.
                    viewModel.addLog("CONECTAT! Negociez MTU=$REQUESTED_MTU...")
                    handler.post {
                        viewModel.connectionStatus.value = "Conectat, negociez MTU..."
                        viewModel.connectionColor.value  = "#FFFF00"
                    }
                    gatt.requestMtu(REQUESTED_MTU)
                }
                BluetoothProfile.STATE_DISCONNECTED -> {
                    // Unexpected disconnect (e.g. device powered off, out of range).
                    // Reset all connection-related state in the ViewModel.
                    viewModel.addLog("DECONECTAT (status=$status)")
                    bluetoothGatt = null
                    handler.post {
                        viewModel.connectionStatus.value = "Deconectat"
                        viewModel.connectionColor.value  = "#FF4444"
                        viewModel.isConnected.value      = false
                        viewModel.negotiatedMtu.value    = 0
                        viewModel.sampleRate.value       = 0
                    }
                }
            }
        }

        @SuppressLint("MissingPermission")
        override fun onMtuChanged(gatt: BluetoothGatt, mtu: Int, status: Int) {
            // MTU negotiation complete. Regardless of the result, proceed with
            // service discovery. The ESP32 may not always grant the requested MTU.
            viewModel.addLog("MTU: $mtu [${if (status == 0) "OK" else "FAIL"}]")
            handler.post { viewModel.negotiatedMtu.value = mtu }
            gatt.discoverServices()
        }

        @SuppressLint("MissingPermission")
        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            if (status != BluetoothGatt.GATT_SUCCESS) {
                viewModel.addLog("EROARE servicii: $status"); return
            }
            val service = gatt.getService(UUID.fromString(SERVICE_UUID))
            if (service == null) { viewModel.addLog("Serviciu negasit!"); return }

            // Enable notifications on the ECG characteristic.
            // "Notification" means the peripheral pushes data proactively —
            // we don't need to poll. We enable this by writing the CCCD descriptor.
            service.getCharacteristic(UUID.fromString(ECG_CHAR_UUID))?.let { ch ->
                gatt.setCharacteristicNotification(ch, true)
                ch.getDescriptor(UUID.fromString("00002902-0000-1000-8000-00805f9b34fb"))?.let { d ->
                    @Suppress("DEPRECATION")
                    d.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                    @Suppress("DEPRECATION")
                    gatt.writeDescriptor(d)
                    viewModel.addLog("ECG notify ON")
                }
            }

            // Enable notifications on the Status characteristic (JSON sensor data).
            // We delay this by 1500ms because the Android BLE GATT queue can only process
            // one descriptor write at a time. Writing both simultaneously causes the second
            // to be silently dropped. The delay ensures the first write completes first.
            handler.postDelayed({
                service.getCharacteristic(UUID.fromString(STATUS_CHAR_UUID))?.let { ch ->
                    gatt.setCharacteristicNotification(ch, true)
                    ch.getDescriptor(UUID.fromString("00002902-0000-1000-8000-00805f9b34fb"))?.let { d ->
                        @Suppress("DEPRECATION")
                        d.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                        @Suppress("DEPRECATION")
                        gatt.writeDescriptor(d)
                        viewModel.addLog("Status notify ON")
                    }
                }
            }, 1500)

            handler.post {
                viewModel.connectionStatus.value = "Primesc date ECG..."
                viewModel.connectionColor.value  = "#00FF00"
                viewModel.isConnected.value      = true
            }
        }

        // --- Dual override for onCharacteristicChanged ---
        // The single-parameter version is deprecated from API 33 but still required for API < 33.
        // Both overrides delegate to the same handleNotification() function.

        /** Called on Android API < 33 when a characteristic notification arrives. */
        @Suppress("DEPRECATION")
        override fun onCharacteristicChanged(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic
        ) {
            handleNotification(characteristic.uuid.toString(), String(characteristic.value ?: return))
        }

        /** Called on Android API 33+ when a characteristic notification arrives. */
        override fun onCharacteristicChanged(
            gatt: BluetoothGatt,
            characteristic: BluetoothGattCharacteristic,
            value: ByteArray
        ) {
            handleNotification(characteristic.uuid.toString(), String(value))
        }
    }

    /**
     * Routes incoming BLE notifications to the correct handler based on UUID.
     *
     * ECG packets: raw comma-separated integers → parsed into List<Int> and pushed
     *   to the ViewModel for the ECG waveform view.
     *
     * Status packets: JSON string → parsed fields pushed to ViewModel for the
     *   Sensors tab (temperature, humidity, BPM, lead-off, sample rate).
     *
     * Runs on the GATT background thread — UI updates are posted to main thread
     * inside the ViewModel methods.
     */
    private fun handleNotification(uuid: String, raw: String) {
        when (uuid) {
            ECG_CHAR_UUID -> {
                // Parse comma-separated ADC values. Non-numeric tokens are silently skipped.
                val samples = raw.trim().split(",").mapNotNull { it.trim().toIntOrNull() }
                if (samples.isEmpty()) return
                handler.post { viewModel.onEcgPacket(raw.trim(), samples) }
                // Log only every 10th packet to avoid flooding the log view
                val pkt = viewModel.packetCount.value ?: 0
                if (pkt % 10 == 0) viewModel.addLog("ECG #$pkt: ${samples.size} val")
            }
            STATUS_CHAR_UUID -> {
                // Parse JSON status payload from the ESP32.
                // Fields are optional — the ESP32 may omit sensors that are not connected.
                try {
                    val json  = JSONObject(raw)
                    val lo    = json.optBoolean("leadOff", false)
                    val rate  = json.optInt("rate", 0)
                    val temp  = if (json.has("temp")) json.getDouble("temp").toFloat() else null
                    val hum   = if (json.has("hum"))  json.getDouble("hum").toFloat()  else null
                    val pulse = if (json.has("bpm"))  json.getInt("bpm")               else null
                    handler.post { viewModel.onStatus(lo, rate, temp, hum, pulse) }
                    viewModel.addLog("Status: ${rate}Hz lo=$lo temp=$temp hum=$hum bpm=$pulse")
                } catch (e: Exception) {
                    // Malformed JSON — log and ignore. This can happen if BLE packets
                    // are fragmented and reassembly is incomplete.
                    Log.d(TAG, "Status parse error: $raw")
                }
            }
        }
    }
}
