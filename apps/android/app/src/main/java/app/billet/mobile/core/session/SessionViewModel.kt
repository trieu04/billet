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
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

sealed interface SessionState {
    data object Restoring : SessionState
    data object SignedOut : SessionState
    data class SignedIn(val user: User?) : SessionState
}

class SessionViewModel(application: Application) : AndroidViewModel(application) {
    private val tokenStore = TokenStore(application)
    private var token: String? = null
    private var refreshToken: String? = null
    private val refreshMutex = Mutex()
    private val api = ApiClient(
        tokenProvider = { token },
        tokenRefresher = { failedToken -> refreshAccessToken(failedToken) },
    )
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
        token = saved.accessToken
        refreshToken = saved.refreshToken
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
        val nextRefreshToken = response.refreshToken
            ?: throw ApiException("Máy chủ không trả về refresh token.", 500)
        tokenStore.write(SessionTokens(response.accessToken, nextRefreshToken))
        token = response.accessToken
        refreshToken = nextRefreshToken
        mutableState.value = SessionState.SignedIn(response.user)
    }

    fun logout() {
        val currentRefreshToken = refreshToken
        if (currentRefreshToken != null) {
            viewModelScope.launch {
                runCatching { BilletRepository(ApiClient()).logout(currentRefreshToken) }
            }
        }
        tokenStore.clear()
        token = null
        refreshToken = null
        mutableState.value = SessionState.SignedOut
    }

    private suspend fun refreshAccessToken(failedToken: String?): String? = refreshMutex.withLock {
        if (token != failedToken) return@withLock token
        val current = refreshToken ?: return@withLock null
        try {
            val response = BilletRepository(ApiClient()).refresh(current)
            val next = response.refreshToken ?: return@withLock null
            tokenStore.write(SessionTokens(response.accessToken, next))
            token = response.accessToken
            refreshToken = next
            response.accessToken
        } catch (_: Exception) {
            tokenStore.clear()
            token = null
            refreshToken = null
            mutableState.value = SessionState.SignedOut
            null
        }
    }
}
