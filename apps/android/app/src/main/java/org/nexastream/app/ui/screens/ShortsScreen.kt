package org.nexastream.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import org.nexastream.app.data.Video
import org.nexastream.app.ui.components.ErrorState
import org.nexastream.app.ui.FeedViewModel
import org.nexastream.app.ui.Load
import org.nexastream.app.ui.components.CenteredLoading
import org.nexastream.app.ui.components.EmptyState
import org.nexastream.app.ui.components.VideoSurface
import org.nexastream.app.ui.theme.NsMuted
import org.nexastream.app.util.TimeFormat

/**
 * Full-screen vertical Shorts pager.
 *
 * Only the page at the vertical centre is playing, which is what keeps watch
 * telemetry honest: a page the viewer swiped past contributes no playback
 * seconds and therefore no reward.
 */
@Composable
fun ShortsScreen(
    viewModel: FeedViewModel = viewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val shorts by viewModel.shorts.collectAsStateWithLifecycle()
    val listState = rememberLazyListState()
    val flingBehavior = rememberSnapFlingBehavior(lazyListState = listState)

    val centeredIndex by remember {
        derivedStateOf {
            val layout = listState.layoutInfo
            val center = (layout.viewportStartOffset + layout.viewportEndOffset) / 2
            layout.visibleItemsInfo
                .minByOrNull { kotlin.math.abs((it.offset + it.size / 2) - center) }
                ?.index ?: 0
        }
    }

    LaunchedEffect(Unit) { viewModel.load() }

    when (val s = state) {
        is Load.Loading -> CenteredLoading()
        is Load.Failed -> ErrorState(s.message, onRetry = { viewModel.load() })
        else -> {
            if (shorts.isEmpty()) {
                EmptyState("No Shorts yet", "Vertical videos under 60s land here automatically.")
                return
            }
            LazyColumn(
                state = listState,
                flingBehavior = flingBehavior,
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black),
            ) {
                itemsIndexed(shorts, key = { _, v -> v.id }) { index, video ->
                    ShortsPage(
                        video = video,
                        active = index == centeredIndex,
                        onLike = { viewModel.like(video) },
                    )
                }
            }
        }
    }
}

@Composable
private fun ShortsPage(video: Video, active: Boolean, onLike: () -> Unit) {
    Box(modifier = Modifier.fillMaxSize()) {
        if (video.videoUrl.isNotEmpty()) {
            VideoSurface(
                video = video,
                autoPlay = active,
                loop = true,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(0.dp),
            )
        } else {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Filled.PlayArrow,
                    contentDescription = null,
                    tint = NsMuted,
                    modifier = Modifier.size(56.dp),
                )
            }
        }

        // Bottom scrim so metadata stays legible over bright frames.
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Color(0xE6000000)),
                    ),
                )
                .padding(start = 16.dp, end = 76.dp, top = 60.dp, bottom = 22.dp),
        ) {
            Column {
                Text(
                    text = "@${video.channelHandle.ifEmpty { video.channelName }}",
                    style = MaterialTheme.typography.titleSmall,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = video.title,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 6.dp),
                )
                Text(
                    text = "${TimeFormat.compact(video.views)} views",
                    style = MaterialTheme.typography.labelSmall,
                    color = NsMuted,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 12.dp, bottom = 28.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            IconButton(onClick = onLike) {
                Icon(
                    imageVector = if (video.likes > 0) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                    contentDescription = "Like",
                    tint = if (video.likes > 0) MaterialTheme.colorScheme.error else Color.White,
                )
            }
            Text(
                text = TimeFormat.compact(video.likes),
                style = MaterialTheme.typography.labelSmall,
                color = Color.White,
            )
        }
    }
}

/** Row-level reels entry point used from the Videos tab. */
@Composable
fun ShortsTeaser(onOpenShorts: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "Watch Shorts",
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )
        androidx.compose.material3.TextButton(onClick = onOpenShorts) {
            Text("Open", color = MaterialTheme.colorScheme.secondary)
        }
    }
}
