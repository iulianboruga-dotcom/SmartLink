package com.example.smartlink_multi.data.network.dto

import com.google.gson.annotations.SerializedName

data class UserDto(
    val id: Int,
    val email: String,
    val role: String,
    @SerializedName("first_name") val firstName: String,
    @SerializedName("last_name") val lastName: String,
    @SerializedName("patient_id") val patientId: Int?
)
