package com.example.smartlink_multi.data.network.dto

import com.google.gson.annotations.SerializedName

data class SensorDataDto(
    @SerializedName("patientId") val patientId: Int,
    val pulse: Float,
    val temperature: Float,
    val humidity: Float,
    @SerializedName("ecgValue") val ecgValue: Float,
    val timestamp: Long
)
