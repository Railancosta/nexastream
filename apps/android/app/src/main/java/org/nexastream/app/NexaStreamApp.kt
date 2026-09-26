package org.nexastream.app

import android.app.Application
import org.nexastream.app.di.AppGraph

/**
 * Application entry point. Container for process-wide singletons created lazily
 * by [org.nexastream.app.di.AppGraph].
 */
class NexaStreamApp : Application() {

    override fun onCreate() {
        super.onCreate()
        AppGraph.install(this)
    }
}
