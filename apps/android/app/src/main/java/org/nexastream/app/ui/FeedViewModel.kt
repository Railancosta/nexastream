package org.nexastream.app.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import org.nexastream.app.data.Channel
import org.nexastream.app.data.Video
import org.nexastream.app.di.AppGraph

/** Feed tabs supported by `GET /api/feed`. */
enum class FeedTab(val apiValue: String, val label: String) {
    ALL("all", "For you"),
    SHORTS("shorts", "Shorts"),
    VIDEOS("videos", "Videos"),
}

class FeedViewModel : ViewModel() {

    private val api get() = AppGraph.api()
    private val viewerId = AppGraph.session().viewerId

    private val _tab = MutableStateFlow(FeedTab.ALL)
    val tab: StateFlow<FeedTab> = _tab.asStateFlow()

    private val _shorts = MutableStateFlow<List<Video>>(emptyList())
    val shorts: StateFlow<List<Video>> = _shorts.asStateFlow()

    private val _videos = MutableStateFlow<List<Video>>(emptyList())
    val videos: StateFlow<List<Video>> = _videos.asStateFlow()

    private val _state = MutableStateFlow<Load<Unit>>(Load.Idle)
    val state: StateFlow<Load<Unit>> = _state.asStateFlow()

    private val _algorithm = MutableStateFlow("")
    val algorithm: StateFlow<String> = _algorithm.asStateFlow()

    fun selectTab(tab: FeedTab) {
        _tab.value = tab
        load()
    }

    fun load() {
        viewModelScope.launch {
            _state.value = Load.Loading
            runCatching { api.feed("all", viewerId) }
                .onSuccess { page ->
                    _shorts.value = page.shorts
                    _videos.value = page.videos
                    _algorithm.value = page.algorithm
                    _state.value = Load.Ready(Unit)
                }
                .onFailure { _state.value = Load.Failed(it.readable()) }
        }
    }

    /** Optimistic like; the server response is the authority on the count. */
    fun like(video: Video) {
        viewModelScope.launch {
            runCatching {
                val count = api.like(video.id)
                // Monetization is a separate, server-validated concern: a failed
                // reward must never roll back the visible like.
                runCatching { api.rewardEngagement("like", video.id, viewerId) }
                count
            }.onSuccess { count ->
                _videos.value = _videos.value.map { if (it.id == video.id) it.copy(likes = count) else it }
                _shorts.value = _shorts.value.map { if (it.id == video.id) it.copy(likes = count) else it }
            }
        }
    }
}

class SearchViewModel : ViewModel() {

    private val api get() = AppGraph.api()

    private val _query = MutableStateFlow("")
    val query: StateFlow<String> = _query.asStateFlow()

    private val _results = MutableStateFlow<List<Video>>(emptyList())
    val results: StateFlow<List<Video>> = _results.asStateFlow()

    private val _state = MutableStateFlow<Load<Unit>>(Load.Idle)
    val state: StateFlow<Load<Unit>> = _state.asStateFlow()

    private val _type = MutableStateFlow<String?>(null)
    val type: StateFlow<String?> = _type.asStateFlow()

    private val _sort = MutableStateFlow<String?>(null)
    val sort: StateFlow<String?> = _sort.asStateFlow()

    fun onQueryChange(value: String) { _query.value = value }

    fun setType(value: String?) { _type.value = value; if (_query.value.isNotBlank()) search() }

    fun setSort(value: String?) { _sort.value = value; if (_query.value.isNotBlank()) search() }

    fun search() {
        val q = _query.value.trim()
        if (q.isEmpty()) {
            _results.value = emptyList()
            _state.value = Load.Idle
            return
        }
        viewModelScope.launch {
            _state.value = Load.Loading
            runCatching { api.search(q, type = _type.value, sort = _sort.value) }
                .onSuccess { _results.value = it; _state.value = Load.Ready(Unit) }
                .onFailure { _state.value = Load.Failed(it.readable()) }
        }
    }
}

class ChannelViewModel(private val handle: String) : ViewModel() {

    private val api get() = AppGraph.api()

    private val _channel = MutableStateFlow<Channel?>(null)
    val channel: StateFlow<Channel?> = _channel.asStateFlow()

    private val _videos = MutableStateFlow<List<Video>>(emptyList())
    val videos: StateFlow<List<Video>> = _videos.asStateFlow()

    private val _state = MutableStateFlow<Load<Unit>>(Load.Idle)
    val state: StateFlow<Load<Unit>> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.value = Load.Loading
            runCatching { api.channel(handle) }
                .onSuccess { page ->
                    _channel.value = page.channel
                    _videos.value = page.videos
                    _state.value = Load.Ready(Unit)
                }
                .onFailure { _state.value = Load.Failed(it.readable()) }
        }
    }

    companion object {
        /** Factory so navigation can pass the channel handle into the ViewModel. */
        fun factory(handle: String): androidx.lifecycle.ViewModelProvider.Factory =
            object : androidx.lifecycle.ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T =
                    ChannelViewModel(handle) as T
            }
    }
}
