package com.example.smartlink_multi.notif

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.example.smartlink_multi.data.network.dto.AlarmDto

object AlarmNotificationHelper {

    const val CHANNEL_ID = "smartlink_alarms"
    private val notifiedIds = mutableSetOf<Int>()

    fun setup(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Alarme medicale",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notificări pentru valori critice"
                enableVibration(true)
            }
            context.getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }

    fun notifyIfNew(context: Context, alarm: AlarmDto) {
        if (alarm.id in notifiedIds) return
        notifiedIds.add(alarm.id)

        val label = alarmLabel(alarm.alarmType)
        val unit  = alarmUnit(alarm.alarmType)

        val notif = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("⚠ Alarmă SmartLink: $label")
            .setContentText("Valoare: ${alarm.measuredValue}$unit (prag: ${alarm.thresholdValue}$unit)")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(alarm.id, notif)
        } catch (_: SecurityException) {
            // POST_NOTIFICATIONS neacordat pe Android 13+ — ignorăm silențios
        }
    }

    private fun alarmLabel(type: String) = when (type) {
        "pulse_high"  -> "Puls ridicat"
        "pulse_low"   -> "Puls scăzut"
        "temp_high"   -> "Temperatură ridicată"
        "temp_low"    -> "Temperatură scăzută"
        "hum_high"    -> "Umiditate ridicată"
        "hum_low"     -> "Umiditate scăzută"
        else          -> type
    }

    private fun alarmUnit(type: String) = when {
        type.startsWith("pulse") -> " BPM"
        type.startsWith("temp")  -> "°C"
        type.startsWith("hum")   -> "%"
        else                     -> ""
    }
}
