package com.example.smartlink_multi.data.repository

import com.example.smartlink_multi.data.network.ApiService
import com.example.smartlink_multi.data.network.dto.EcgUploadRequest
import com.example.smartlink_multi.data.network.dto.SensorDataDto

class SensorRepository(private val api: ApiService) {
    suspend fun postEcg(patientId: Int, values: List<Int>): Result<Unit> {
        return try {
            val response = api.postEcg(EcgUploadRequest(patientId, values))
            if (response.isSuccessful) Result.success(Unit)
            else Result.failure(Exception("HTTP ${response.code()}"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Backend acceptă doar single — trimitem secvențial, nu paralel (menajăm F1 free tier)
    suspend fun postBatch(batch: List<SensorDataDto>): Result<Unit> {
        return try {
            var failCount = 0
            for (item in batch) {
                val response = api.postSensorData(item)
                if (!response.isSuccessful) failCount++
            }
            if (failCount == 0) Result.success(Unit)
            else Result.failure(Exception("$failCount/${batch.size} eșuate"))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
