package com.example.smartlink_multi

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.viewModelScope
import com.example.smartlink_multi.data.network.ApiClient
import com.example.smartlink_multi.data.network.dto.UserDto
import com.example.smartlink_multi.data.prefs.SessionManager
import com.example.smartlink_multi.data.repository.AuthRepository
import kotlinx.coroutines.launch

sealed class LoginState {
    object Idle : LoginState()
    object Loading : LoginState()
    data class Success(val user: UserDto) : LoginState()
    data class Error(val message: String) : LoginState()
}

class SessionViewModel(app: Application) : AndroidViewModel(app) {

    val session = SessionManager(app)
    private val repo = AuthRepository(ApiClient.create(session), session)

    val loginState = MutableLiveData<LoginState>(LoginState.Idle)

    fun login(email: String, password: String) {
        loginState.value = LoginState.Loading
        viewModelScope.launch {
            val result = repo.login(email, password)
            loginState.value = if (result.isSuccess) {
                LoginState.Success(result.getOrNull()!!)
            } else {
                LoginState.Error(result.exceptionOrNull()?.message ?: "Eroare necunoscută")
            }
        }
    }

    fun logout() {
        session.clearSession()
        loginState.value = LoginState.Idle
    }
}
