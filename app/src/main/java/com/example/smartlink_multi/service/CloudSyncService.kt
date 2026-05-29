package com.example.smartlink_multi.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.example.smartlink_multi.R
import com.example.smartlink_multi.data.SensorBuffer
import com.example.smartlink_multi.data.network.ApiClient
import com.example.smartlink_multi.data.prefs.SessionManager
import com.example.smartlink_multi.data.repository.SensorRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class CloudSyncService : Service() {

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private lateinit var repo: SensorRepository

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        // ServiceCompat gestionează corect tipul pe toate versiunile (API 26–34+)
        ServiceCompat.startForeground(
            this, NOTIF_ID, buildNotification(),
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
                ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC
            else 0
        )
        repo = SensorRepository(ApiClient.create(SessionManager(this)))
        startSyncLoop()
    }

    private fun startSyncLoop() {
        scope.launch {
            while (isActive) {
                delay(30_000)
                val batch = SensorBuffer.drain()
                if (batch.isNotEmpty()) {
                    val result = repo.postBatch(batch)
                    Log.d(TAG, "Sync batch ${batch.size} → ${if (result.isSuccess) "OK" else "FAIL: ${result.exceptionOrNull()?.message}"}")
                }
            }
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "SmartLink Sync",
                NotificationManager.IMPORTANCE_LOW
            ).apply { description = "Monitorizare activă în fundal" }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun buildNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
        .setContentTitle("SmartLink")
        .setContentText("Monitorizare activă")
        .setSmallIcon(android.R.drawable.ic_menu_upload)
        .setOngoing(true)
        .build()

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val NOTIF_ID = 1001
        const val CHANNEL_ID = "smartlink_sync"
        private const val TAG = "CloudSyncService"
    }
}
