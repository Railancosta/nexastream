package org.nexastream.app.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import org.nexastream.app.ui.components.ErrorState
import org.nexastream.app.ui.Load
import org.nexastream.app.ui.WatchViewModel
import org.nexastream.app.ui.components.CenteredLoading
import org.nexastream.app.ui.components.VideoRow
import org.nexastream.app.ui.components.VideoSurface
import org.nexastream.app.ui.theme.NsAccent
import org.nexastream.app.ui.theme.NsMuted
import org.nexastream.app.ui.theme.NsPrimary
import org.nexastream.app.util.TimeFormat

@Composable
fun WatchScreen(
    videoId: String,
    onOpenVideo: (String) -> Unit,
    onOpenChannel: (String) -> Unit,
    viewModel: WatchViewModel = viewModel(
        key = "watch-$videoId",
        factory = WatchViewModel.factory(videoId),
    ),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val video by viewModel.video.collectAsStateWithLifecycle()
    val related by viewModel.related.collectAsStateWithLifecycle()
    val rewardNotice by viewModel.rewardNotice.collectAsStateWithLifecycle()

    when (val s = state) {
        is Load.Loading -> CenteredLoading()
        is Load.Failed -> ErrorState(s.message, onRetry = { viewModel.load() })
        else -> {
            val v = video ?: return
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 24.dp),
            ) {
                item {
                    if (v.videoUrl.isNotEmpty()) {
                        VideoSurface(
                            video = v,
                            autoPlay = true,
                            onProgress = { seconds, completed ->
                                viewModel.reportPlayback(seconds, completed)
                            },
                        )
                    }
                    Column(modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp)) {
                        Text(
                            text = v.title,
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = "${TimeFormat.compact(v.views)} views · ${TimeFormat.relative(v.createdAt)}",
                            style = MaterialTheme.typography.bodySmall,
                            color = NsMuted,
                            modifier = Modifier.padding(top = 4.dp),
                        )

                        Row(
                            modifier = Modifier.padding(top = 12.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            OutlinedButton(onClick = { viewModel.like() }) {
                                Icon(
                                    imageVector = if (v.likes > 0) Icons.Filled.Favorite
                                    else Icons.Outlined.FavoriteBorder,
                                    contentDescription = null,
                                )
                                Text(
                                    text = "  ${TimeFormat.compact(v.likes)}",
                                )
                            }
                            Button(onClick = { onOpenChannel(v.channelHandle.ifEmpty { v.channelId }) }) {
                                Text(v.channelName)
                            }
                        }

                        // Monetization transparency: show the viewer what the
                        // creator earned from their view, or why it did not count.
                        if (rewardNotice != null) {
                            Text(
                                text = rewardNotice!!,
                                style = MaterialTheme.typography.bodySmall,
                                color = NsAccent,
                                modifier = Modifier.padding(top = 12.dp),
                            )
                        }

                        if (v.description.isNotBlank()) {
                            Text(
                                text = v.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(top = 14.dp),
                            )
                        }

                        if (v.sources.size > 1) {
                            Text(
                                text = "Quality: " + v.sources.joinToString(", ") { it.label },
                                style = MaterialTheme.typography.labelSmall,
                                color = NsMuted,
                                modifier = Modifier.padding(top = 14.dp),
                            )
                        }

                        Text(
                            text = "Monetized · creator receives 50% of net revenue from eligible views",
                            style = MaterialTheme.typography.labelSmall,
                            color = NsPrimary,
                            modifier = Modifier.padding(top = 14.dp),
                        )

                        HorizontalDivider(modifier = Modifier.padding(vertical = 16.dp))
                        Text(
                            text = "Related",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
                items(related, key = { it.id }) { r ->
                    VideoRow(
                        video = r,
                        onClick = { onOpenVideo(r.id) },
                        modifier = Modifier.padding(horizontal = 14.dp),
                    )
                }
            }
        }
    }
}
