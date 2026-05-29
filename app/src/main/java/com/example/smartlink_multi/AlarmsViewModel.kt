package com.example.smartlink_multi

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import com.example.smartlink_multi.data.network.ApiClient
import com.example.smartlink_multi.data.network.dto.AlarmDto
import com.example.smartlink_multi.data.prefs.SessionManager
import com.example.smartlink_multi.data.repository.AlarmRepository

class AlarmsViewModel(app: Application) : AndroidViewModel(app) {

    val alarms = MutableLiveData<List<AlarmDto>>(emptyList())
    val error  = MutableLiveData<String?>(null)

    private val session = SessionManager(app)

    private fun buildRepo(): AlarmRepository {
        return AlarmRepository(ApiClient.create(session))
    }

    suspend fun fetchAlarms() {
        val pid = session.getPatientId()
        if (pid == -1) return
        val result = buildRepo().getAlarms(pid)
        if (result.isSuccess) {
            // cele mai recente primele
            alarms.postValue(result.getOrNull()!!.sortedByDescending { it.triggeredAt })
            error.postValue(null)
        } else {
            error.postValue(result.exceptionOrNull()?.message)
        }
    }
}
