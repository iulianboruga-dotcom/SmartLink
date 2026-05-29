package com.example.smartlink_multi.data.repository

import com.example.smartlink_multi.data.network.ApiService
import com.example.smartlink_multi.data.network.dto.AlarmDto

class AlarmRepository(private val api: ApiService) {
    suspend fun getAlarms(patientId: Int): Result<List<AlarmDto>> {
        return try {
            val response = api.getAlarmsHistory(patientId)
            if (response.isSuccessful) Result.success(response.body() ?: emptyList())
            else Result.failure(Exception("HTTP ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
