package com.example.smartlink_multi.data.repository

import com.example.smartlink_multi.data.network.ApiService
import com.example.smartlink_multi.data.network.dto.SensorDataDto

class SensorRepository(private val api: ApiService) {
    suspend fun postBatch(batch: List<SensorDataDto>): Result<Unit> {
        return try {
            val response = api.postSensorDataBatch(batch)
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("HTTP ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
