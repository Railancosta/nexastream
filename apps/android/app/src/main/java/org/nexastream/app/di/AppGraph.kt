package org.nexastream.app.di

import android.content.Context
import org.nexastream.app.BuildConfig
import org.nexastream.app.data.SessionStore
import org.nexastream.app.net.ApiClient
import org.nexastream.app.net.NexaStreamApi

/**
 * Process-wide service locator.
 *
 * A hand-rolled locator is enough at this size and keeps the build free of a
 * DI code-generation dependency. Everything is constructed lazily so app
 * startup does not touch the Keystore or the network.
 */
object AppGraph {

    @Volatile
    private var session: SessionStore? = null

    @Volatile
    private var api: NexaStreamApi? = null

    @Volatile
    private var client: ApiClient? = null

    fun install(context: Context) {
        val app = context.applicationContext
        if (session == null) session = SessionStore(app)
    }

    fun session(): SessionStore = session
        ?: error("AppGraph.install() must be called from Application.onCreate")

    /**
     * The effective API base URL: a user-configured override (set in Settings,
     * e.g. pointing at a self-hosted node) wins over the build-time default.
     */
    fun apiBaseUrl(): String =
        session().apiBaseUrl?.takeIf { it.isNotBlank() } ?: BuildConfig.API_BASE_URL

    @Synchronized
    fun api(): NexaStreamApi {
        val currentBase = apiBaseUrl()
        val existing = api
        if (existing != null && client?.baseUrl == currentBase) return existing
        val c = ApiClient(currentBase) { session().token }
        client = c
        return NexaStreamApi(c).also { api = it }
    }

    /** Called after the base URL changes so the next call rebuilds the client. */
    @Synchronized
    fun invalidateApi() {
        api = null
        client = null
    }
}
