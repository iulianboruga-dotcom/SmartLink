package com.example.smartlink_multi.data

object EcgBuffer {
    private val buffer = ArrayList<Int>()
    private val lock = Any()

    fun addAll(samples: List<Int>) {
        synchronized(lock) {
            buffer.addAll(samples)
            // Păstrăm maxim 3000 eșantioane (~12s la 250Hz) — evităm creștere nelimitată
            if (buffer.size > 3000) {
                val excess = buffer.size - 3000
                repeat(excess) { buffer.removeAt(0) }
            }
        }
    }

    fun drainLast(count: Int): List<Int> {
        synchronized(lock) {
            if (buffer.size < 250) return emptyList() // minim ~1s de date
            val snapshot = buffer.takeLast(minOf(count, buffer.size)).toList()
            buffer.clear()
            return snapshot
        }
    }

    fun size(): Int = synchronized(lock) { buffer.size }
}
