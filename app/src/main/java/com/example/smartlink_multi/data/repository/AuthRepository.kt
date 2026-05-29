package com.example.smartlink_multi.data.repository

import com.example.smartlink_multi.data.network.ApiService
import com.example.smartlink_multi.data.network.dto.LoginRequest
import com.example.smartlink_multi.data.network.dto.UserDto
import com.example.smartlink_multi.data.prefs.SessionManager

class AuthRepository(private val api: ApiService, private val session: SessionManager) {
    suspend fun login(email: String, password: String): Result<UserDto> {
        return try {
            val response = api.login(LoginRequest(email, password))
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                session.saveSession(
                    token = body.token,
                    userId = body.user.id,
                    patientId = body.user.patientId ?: -1,
                    firstName = body.user.firstName,
                    lastName = body.user.lastName
                )
                Result.success(body.user)
            } else {
                Result.failure(Exception("Login eșuat: ${response.code()}"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
