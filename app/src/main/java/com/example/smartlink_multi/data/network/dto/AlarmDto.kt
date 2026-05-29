package com.example.smartlink_multi.data.network.dto

import com.google.gson.annotations.SerializedName

data class AlarmDto(
    val id: Int,
    @SerializedName("alarm_type") val alarmType: String,
    @SerializedName("measured_value") val measuredValue: Float,
    @SerializedName("threshold_value") val thresholdValue: Float,
    @SerializedName("triggered_at") val triggeredAt: String,
    val acknowledged: Boolean
)
