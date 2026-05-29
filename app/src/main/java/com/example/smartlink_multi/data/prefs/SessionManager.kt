package com.example.smartlink_multi.data.prefs

import android.content.Context
import android.content.SharedPreferences

class SessionManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences("smartlink_prefs", Context.MODE_PRIVATE)

    fun saveSession(
        token: String,
        userId: Int,
        patientId: Int,
        firstName: String,
        lastName: String
    ) {
        prefs.edit()
            .putString("smartlink_token", token)
            .putInt("smartlink_user_id", userId)
            .putInt("smartlink_patient_id", patientId)
            .putString("smartlink_first_name", firstName)
            .putString("smartlink_last_name", lastName)
            .apply()
    }

    fun getToken(): String? = prefs.getString("smartlink_token", null)

    fun getPatientId(): Int = prefs.getInt("smartlink_patient_id", -1)

    fun getDisplayName(): String {
        val first = prefs.getString("smartlink_first_name", "") ?: ""
        val last = prefs.getString("smartlink_last_name", "") ?: ""
        return "$first $last".trim()
    }

    fun clearSession() {
        prefs.edit().clear().apply()
    }

    fun isLoggedIn(): Boolean = getToken() != null
}
