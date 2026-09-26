package org.nexastream.app.ui.components

import android.view.ViewGroup
import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import org.nexastream.app.data.Video

/**
 * ExoPlayer-backed video surface.
 *
 * [onProgress] is invoked once per playback session with the total seconds
 * watched and whether the video reached [completionRatio]. Reporting is tied
 * to real playback state rather than wall-clock time, so the numbers sent to
 * the monetization gateway reflect what was actually watched (Item 21:
 * distributions come from verifiable metrics).
 */
@OptIn(UnstableApi::class)
@Composable
fun VideoSurface(
    video: Video,
    modifier: Modifier = Modifier,
    autoPlay: Boolean = true,
    loop: Boolean = false,
    completionRatio: Double = 0.85,
    onProgress: (seconds: Double, completed: Boolean) -> Unit = { _, _ -> },
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val currentOnProgress by rememberUpdatedState(onProgress)

    var watchedMillis by remember(video.id) { mutableLongStateOf(0L) }
    var reported by remember(video.id) { mutableStateOf(false) }

    val player = remember(video.id, video.videoUrl) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(video.videoUrl))
            repeatMode = if (loop) Player.REPEAT_MODE_ONE else Player.REPEAT_MODE_OFF
            playWhenReady = autoPlay
            prepare()
        }
    }

    // Scoped to this composable: each surface owns exactly one PlayerView, so
    // the progress ticker and teardown always act on the right view.
    val viewHolder = remember(video.id) { PlayerViewHolder() }

    DisposableEffect(player) {
        var lastPosition = 0L

        fun snapshot() {
            val duration = player.duration.coerceAtLeast(0L)
            val ratio = if (duration > 0) watchedMillis.toDouble() / duration.toDouble() else 0.0
            currentOnProgress(watchedMillis / 1000.0, ratio >= completionRatio)
        }

        val listener = object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                if (isPlaying) lastPosition = player.currentPosition
            }

            override fun onPlaybackStateChanged(playbackState: Int) {
                if (playbackState == Player.STATE_ENDED && !reported) {
                    reported = true
                    snapshot()
                }
            }
        }

        val ticker = object : Runnable {
            override fun run() {
                if (player.isPlaying) {
                    val now = player.currentPosition
                    val delta = now - lastPosition
                    // Ignore backward or implausible jumps caused by seeks.
                    if (delta in 0..2_000) watchedMillis += delta
                    lastPosition = now
                }
                viewHolder.view?.postDelayed(this, 500L)
            }
        }

        player.addListener(listener)
        viewHolder.view?.postDelayed(ticker, 500L)

        onDispose {
            player.removeListener(listener)
            viewHolder.view?.removeCallbacks(ticker)
            if (!reported && watchedMillis > 0) snapshot()
            player.release()
        }
    }

    // Pause when the app leaves the foreground so a backgrounded process cannot
    // keep accruing watch time (an obvious reward-farming vector).
    DisposableEffect(lifecycleOwner, player) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_STOP -> player.pause()
                Lifecycle.Event.ON_START -> if (autoPlay) player.play()
                else -> Unit
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(video.videoUrl, autoPlay) {
        if (video.videoUrl.isNotEmpty()) player.playWhenReady = autoPlay
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .then(
                if (video.isShort) Modifier.aspectRatio(9f / 16f)
                else Modifier.aspectRatio(16f / 9f)
            )
            .background(Color.Black),
        contentAlignment = Alignment.Center,
    ) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    layoutParams = ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    )
                    this.player = player
                    useController = true
                    resizeMode = if (video.isShort) AspectRatioFrameLayout.RESIZE_MODE_ZOOM
                    else AspectRatioFrameLayout.RESIZE_MODE_FIT
                    setShowBuffering(PlayerView.SHOW_BUFFERING_WHEN_PLAYING)
                }.also { viewHolder.view = it }
            },
            modifier = Modifier.fillMaxSize(),
        )
    }
}

/** Mutable holder so the ticker can schedule/cancel against the live view. */
private class PlayerViewHolder {
    var view: PlayerView? = null
}
