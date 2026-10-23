package app.billet.mobile.core.session

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import app.billet.mobile.core.model.User
import app.billet.mobile.core.network.ApiClient
import app.billet.mobile.core.network.ApiException
import app.billet.mobile.core.network.BilletRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface SessionState {
    data object Restoring : SessionState
    data object SignedOut : SessionState
    data class SignedIn(val user: User?) : SessionState
}

class SessionViewModel(application: Application) : AndroidViewModel(application) {
    private val tokenStore = TokenStore(application)
    private var token: String? = null
    private val api = ApiClient(tokenProvider = { token })
    val repository = BilletRepository(api)

    private val mutableState = MutableStateFlow<SessionState>(SessionState.Restoring)
    val state: StateFlow<SessionState> = mutableState.asStateFlow()

    init {
        restore()
    }

    private fun restore() = viewModelScope.launch {
        val saved = tokenStore.read()
        if (saved == null) {
            mutableState.value = SessionState.SignedOut
            return@launch
        }
        token = saved
        try {
            mutableState.value = SessionState.SignedIn(repository.me())
        } catch (error: ApiException) {
            if (error.statusCode == 401) {
                logout()
            } else {
                mutableState.value = SessionState.SignedIn(null)
            }
        } catch (_: Exception) {
            mutableState.value = SessionState.SignedIn(null)
        }
    }

    suspend fun login(identifier: String, password: String) {
        val response = repository.login(identifier, password)
        if (response.requiresMfa) throw ApiException("Tài khoản cần xác thực hai bước, chưa được hỗ trợ.", 409)
        tokenStore.write(response.accessToken)
        token = response.accessToken
        mutableState.value = SessionState.SignedIn(response.user)
    }

    fun logout() {
        tokenStore.clear()
        token = null
        mutableState.value = SessionState.SignedOut
    }
}
