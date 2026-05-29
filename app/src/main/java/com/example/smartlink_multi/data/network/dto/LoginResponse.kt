package com.example.smartlink_multi.data.network.dto

data class LoginResponse(
    val token: String,
    val user: UserDto
)
