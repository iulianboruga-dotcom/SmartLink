package com.example.smartlink_multi.data.network.dto

data class EcgUploadRequest(
    val patientId: Int,
    val values: List<Int>
)
