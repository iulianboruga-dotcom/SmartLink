package com.example.smartlink_multi.data.network

import com.example.smartlink_multi.data.network.dto.AlarmDto
import com.example.smartlink_multi.data.network.dto.LoginRequest
import com.example.smartlink_multi.data.network.dto.LoginResponse
import com.example.smartlink_multi.data.network.dto.EcgUploadRequest
import com.example.smartlink_multi.data.network.dto.SensorDataDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Query

interface ApiService {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("sensors")
    suspend fun postSensorData(@Body data: SensorDataDto): Response<Unit>

    @POST("sensors/ecg")
    suspend fun postEcg(@Body body: EcgUploadRequest): Response<Unit>

    @GET("alarms/history")
    suspend fun getAlarmsHistory(@Query("patientId") patientId: Int): Response<List<AlarmDto>>
}
