package org.nexastream.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.nexastream.app.data.RewardConfig
import org.nexastream.app.data.Studio
import org.nexastream.app.data.Video
import org.nexastream.app.data.Wallet
import org.nexastream.app.di.AppGraph

/**
 * Wallet + Creator Studio state.
 *
 * Every number here comes from the server. The client computes nothing that
 * affects a balance, which is what keeps "instant monetization" auditable
 * (Item 21) and prevents a modified APK from minting rewards (Item 22).
 */
class MonetizationViewModel : ViewModel() {

    private val api get() = AppGraph.api()

    private val _wallet = MutableStateFlow<Wallet?>(null)
    val wallet: StateFlow<Wallet?> = _wallet.asStateFlow()

    private val _studio = MutableStateFlow<Studio?>(null)
    val studio: StateFlow<Studio?> = _studio.asStateFlow()

    private val _config = MutableStateFlow<RewardConfig?>(null)
    val config: StateFlow<RewardConfig?> = _config.asStateFlow()

    private val _state = MutableStateFlow<Load<Unit>>(Load.Idle)
    val state: StateFlow<Load<Unit>> = _state.asStateFlow()

    private val _message = MutableStateFlow<String?>(null)
    val message: StateFlow<String?> = _message.asStateFlow()

    private val _payoutBusy = MutableStateFlow(false)
    val payoutBusy: StateFlow<Boolean> = _payoutBusy.asStateFlow()

    init {
        loadConfig()
        refresh()
    }

    fun clearMessage() { _message.value = null }

    fun loadConfig() {
        viewModelScope.launch {
            runCatching { api.rewardConfig() }.onSuccess { _config.value = it }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _state.value = Load.Loading
            val walletResult = runCatching { api.wallet() }
            val studioResult = runCatching { api.studio() }
            walletResult.onSuccess { _wallet.value = it }
            studioResult.onSuccess { _studio.value = it }
            val failure = walletResult.exceptionOrNull() ?: studioResult.exceptionOrNull()
            _state.value = if (failure != null && _wallet.value == null) {
                Load.Failed(failure.readable())
            } else {
                Load.Ready(Unit)
            }
        }
    }

    fun requestPayout(amountNst: Double, address: String, network: String, memo: String?) {
        if (address.isBlank()) { _message.value = "Destination address is required."; return }
        viewModelScope.launch {
            _payoutBusy.value = true
            runCatching { api.requestPayout(amountNst, address.trim(), network, memo) }
                .onSuccess { res ->
                    _message.value = when {
                        res.has("error") -> res.optString("error")
                        res.optString("status") == "timelocked" ->
                            "Payout queued with a ${res.optInt("timelockHours", 24)}h review window."
                        else -> "Payout request submitted (testnet)."
                    }
                    refresh()
                }
                .onFailure { _message.value = it.readable() }
            _payoutBusy.value = false
        }
    }
}

/** Upload flow state, including byte-level progress. */
class UploadViewModel : ViewModel() {

    private val api get() = AppGraph.api()
    private val session = AppGraph.session()

    private val _progress = MutableStateFlow(0f)
    val progress: StateFlow<Float> = _progress.asStateFlow()

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy.asStateFlow()

    private val _result = MutableStateFlow<String?>(null)
    val result: StateFlow<String?> = _result.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    val isLoggedIn: Boolean get() = session.isLoggedIn

    fun clearError() { _error.value = null }

    fun upload(bytes: ByteArray, title: String, description: String, isShort: Boolean) {
        if (!session.isLoggedIn) {
            _error.value = "Sign in to publish a video."
            return
        }
        if (title.isBlank()) {
            _error.value = "A title is required."
            return
        }
        if (bytes.isEmpty()) {
            _error.value = "The selected file is empty."
            return
        }
        viewModelScope.launch {
            _busy.value = true
            _error.value = null
            _result.value = null
            _progress.value = 0f
            runCatching {
                api.upload(bytes, title.trim(), description.trim(), isShort) { sent, total ->
                    if (total > 0) _progress.value = (sent.toFloat() / total.toFloat()).coerceIn(0f, 1f)
                }
            }
                .onSuccess { videoId ->
                    _result.value = videoId
                    _progress.value = 1f
                }
                .onFailure { _error.value = it.readable() }
            _busy.value = false
        }
    }
}

/** Video detail state used by the watch screen. */
class WatchViewModel(private val videoId: String) : ViewModel() {

    private val api get() = AppGraph.api()
    private val viewerId = AppGraph.session().viewerId

    private val _video = MutableStateFlow<Video?>(null)
    val video: StateFlow<Video?> = _video.asStateFlow()

    private val _related = MutableStateFlow<List<Video>>(emptyList())
    val related: StateFlow<List<Video>> = _related.asStateFlow()

    private val _state = MutableStateFlow<Load<Unit>>(Load.Idle)
    val state: StateFlow<Load<Unit>> = _state.asStateFlow()

    private val _rewardNotice = MutableStateFlow<String?>(null)
    val rewardNotice: StateFlow<String?> = _rewardNotice.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.value = Load.Loading
            runCatching { api.video(videoId) }
                .onSuccess { v ->
                    _video.value = v
                    _state.value = Load.Ready(Unit)
                    runCatching { _related.value = api.related(videoId) }
                }
                .onFailure { _state.value = Load.Failed(it.readable()) }
        }
    }

    fun like() {
        val current = _video.value ?: return
        viewModelScope.launch {
            runCatching { api.like(current.id) }
                .onSuccess { count -> _video.value = current.copy(likes = count) }
            runCatching { api.rewardEngagement("like", current.id, viewerId) }
        }
    }

    /**
     * Reports a finished playback session. Sends both the recommendation
     * telemetry (`/watch`) and the monetization event (`/accrue`), then
     * surfaces the server's decision to the viewer.
     */
    fun reportPlayback(seconds: Double, completed: Boolean) {
        val current = _video.value ?: return
        viewModelScope.launch {
            runCatching { api.watch(current.id, seconds, completed) }
            runCatching {
                api.accrue(current.id, viewerId, seconds, completed, viewerId)
            }.onSuccess { result ->
                _rewardNotice.value = when {
                    result.credited && result.creatorNst > 0 ->
                        "Creator earned ${formatNstLocal(result.creatorNst)} from this view."
                    result.credited -> "View counted."
                    result.reason != null -> "View not counted: ${result.reason}"
                    else -> null
                }
            }
        }
    }

    private fun formatNstLocal(v: Double): String = org.nexastream.app.monetization.formatNst(v)

    companion object {
        /** Factory so navigation can pass the video id into the ViewModel. */
        fun factory(videoId: String): androidx.lifecycle.ViewModelProvider.Factory =
            object : androidx.lifecycle.ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T =
                    WatchViewModel(videoId) as T
            }
    }
}
