package com.example.smartlink_multi.data.network.dto

data class SensorDataDto(
    val patientId: Int,
    val pulse: Int,
    val temperature: Float,
    val humidity: Float
)
