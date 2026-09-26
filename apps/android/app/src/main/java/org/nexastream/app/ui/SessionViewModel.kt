package org.nexastream.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.nexastream.app.di.AppGraph
import org.nexastream.app.data.User
import org.nexastream.app.net.ApiException

/** Standard async UI state. Covariant so `Load<Nothing>` (Idle/Loading/Failed)
 *  is usable wherever a `Load<T>` is expected. */
sealed interface Load<out T> {
    data object Idle : Load<Nothing>
    data object Loading : Load<Nothing>
    data class Ready<T>(val value: T) : Load<T>
    data class Failed(val message: String) : Load<Nothing>
}

fun Throwable.readable(): String = when (this) {
    is ApiException -> when (status) {
        401 -> "Please sign in to continue."
        403 -> "You do not have access to this action."
        404 -> "Not found."
        429 -> "Too many requests — please slow down."
        else -> message ?: "Request failed ($status)"
    }
    else -> message ?: "Something went wrong."
}

/**
 * Owns authentication state for the whole app.
 *
 * The session token lives in [org.nexastream.app.data.SessionStore]; this
 * ViewModel exposes it as observable state and performs the login/register
 * round-trips.
 */
class SessionViewModel : ViewModel() {

    private val store = AppGraph.session()
    private val api get() = AppGraph.api()

    private val _user = MutableStateFlow<User?>(store.user)
    val user: StateFlow<User?> = _user.asStateFlow()

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    val isLoggedIn: Boolean get() = store.isLoggedIn

    val viewerId: String get() = store.viewerId

    fun clearError() { _error.value = null }

    fun login(email: String, password: String, onSuccess: () -> Unit) {
        if (email.isBlank() || password.isBlank()) {
            _error.value = "Email and password are required."
            return
        }
        viewModelScope.launch {
            _busy.value = true
            _error.value = null
            runCatching { api.login(email.trim(), password) }
                .onSuccess { (u, token) ->
                    store.token = token
                    store.user = u
                    _user.value = u
                    onSuccess()
                }
                .onFailure { _error.value = it.readable() }
            _busy.value = false
        }
    }

    fun register(username: String, email: String, password: String, onSuccess: () -> Unit) {
        if (username.isBlank() || email.isBlank() || password.isBlank()) {
            _error.value = "All fields are required."
            return
        }
        if (password.length < 8) {
            _error.value = "Password must be at least 8 characters."
            return
        }
        viewModelScope.launch {
            _busy.value = true
            _error.value = null
            runCatching { api.register(email.trim(), password, username.trim()) }
                .onSuccess { (u, token) ->
                    store.token = token
                    store.user = u
                    _user.value = u
                    onSuccess()
                }
                .onFailure { _error.value = it.readable() }
            _busy.value = false
        }
    }

    /** Refreshes the cached profile; a 401 means the token is dead. */
    fun refresh() {
        if (!store.isLoggedIn) return
        viewModelScope.launch {
            runCatching { api.me() }
                .onSuccess { store.user = it; _user.value = it }
                .onFailure { if (it is ApiException && it.status == 401) logout() }
        }
    }

    fun logout() {
        store.clearSession()
        _user.value = null
    }

    fun updateApiBase(url: String) {
        store.apiBaseUrl = url.trim().trimEnd('/').ifEmpty { null }
        AppGraph.invalidateApi()
    }

    fun currentApiBase(): String = AppGraph.apiBaseUrl()
}
