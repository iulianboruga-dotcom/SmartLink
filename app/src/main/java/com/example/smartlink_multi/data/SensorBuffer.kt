package com.example.smartlink_multi.data

import com.example.smartlink_multi.data.network.dto.SensorDataDto

object SensorBuffer {
    private val buffer = mutableListOf<SensorDataDto>()
    private val lock = Any()

    fun add(reading: SensorDataDto) {
        synchronized(lock) { buffer.add(reading) }
    }

    fun drain(): List<SensorDataDto> {
        synchronized(lock) {
            val snapshot = buffer.toList()
            buffer.clear()
            return snapshot
        }
    }

    fun size(): Int = synchronized(lock) { buffer.size }
}
