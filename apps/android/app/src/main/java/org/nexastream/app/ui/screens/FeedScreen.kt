package org.nexastream.app.ui.screens

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import org.nexastream.app.data.Video
import org.nexastream.app.ui.components.ErrorState
import org.nexastream.app.ui.FeedTab
import org.nexastream.app.ui.FeedViewModel
import org.nexastream.app.ui.Load
import org.nexastream.app.ui.SearchViewModel
import org.nexastream.app.ui.components.EmptyState
import org.nexastream.app.ui.components.LoadingList
import org.nexastream.app.ui.components.VideoCard
import org.nexastream.app.ui.components.VideoRow
import org.nexastream.app.ui.components.VideoThumbnail
import org.nexastream.app.ui.theme.NsMuted
import org.nexastream.app.ui.theme.NsPrimary
import org.nexastream.app.util.TimeFormat

@Composable
fun FeedScreen(
    onOpenVideo: (String) -> Unit,
    viewModel: FeedViewModel = viewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val tab by viewModel.tab.collectAsStateWithLifecycle()
    val shorts by viewModel.shorts.collectAsStateWithLifecycle()
    val videos by viewModel.videos.collectAsStateWithLifecycle()

    Column(modifier = Modifier.fillMaxSize()) {
        FeedTabs(selected = tab, onSelect = { viewModel.selectTab(it) })
        when (val s = state) {
            is Load.Loading -> LoadingList(modifier = Modifier.padding(horizontal = 14.dp))
            is Load.Failed -> ErrorState(s.message, onRetry = { viewModel.load() })
            else -> {
                val visible = when (tab) {
                    FeedTab.SHORTS -> shorts
                    FeedTab.VIDEOS -> videos
                    FeedTab.ALL -> videos + shorts
                }
                if (visible.isEmpty()) {
                    EmptyState(
                        title = "No videos yet",
                        subtitle = "Upload the first one — it appears here as soon as it is processed.",
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 12.dp),
                    ) {
                        if (shorts.isNotEmpty() && tab == FeedTab.ALL) {
                            item {
                                Column {
                                    SectionTitle("Shorts")
                                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                        items(shorts, key = { it.id }) { video ->
                                            ShortsRailCard(video) { onOpenVideo(video.id) }
                                        }
                                    }
                                    SectionTitle("Videos", topPadding = 18.dp)
                                }
                            }
                        }
                        items(visible, key = { it.id }) { video ->
                            VideoCard(video = video, onClick = { onOpenVideo(video.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionTitle(text: String, topPadding: androidx.compose.ui.unit.Dp = 0.dp) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(top = topPadding, bottom = 8.dp),
    )
}

@Composable
private fun FeedTabs(selected: FeedTab, onSelect: (FeedTab) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(FeedTab.entries.toList()) { tab ->
            FilterChip(
                selected = tab == selected,
                onClick = { onSelect(tab) },
                label = { Text(tab.label) },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = NsPrimary,
                    selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                    labelColor = NsMuted,
                ),
            )
        }
    }
}

/** 9:16 tile for the Shorts rail on the home feed. */
@Composable
private fun ShortsRailCard(video: Video, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .width(120.dp)
            .clickable(onClick = onClick),
    ) {
        VideoThumbnail(
            video = video,
            showDuration = false,
            modifier = Modifier
                .width(120.dp)
                .height(213.dp),
        )
        Text(
            text = video.title,
            style = MaterialTheme.typography.bodySmall,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 6.dp),
        )
        Text(
            text = "${TimeFormat.compact(video.views)} views",
            style = MaterialTheme.typography.labelSmall,
            color = NsMuted,
        )
    }
}

@Composable
fun SearchScreen(
    onOpenVideo: (String) -> Unit,
    viewModel: SearchViewModel = viewModel(),
) {
    val query by viewModel.query.collectAsStateWithLifecycle()
    val results by viewModel.results.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()
    val type by viewModel.type.collectAsStateWithLifecycle()

    Column(modifier = Modifier.fillMaxSize()) {
        OutlinedTextField(
            value = query,
            onValueChange = {
                viewModel.onQueryChange(it)
                viewModel.search()
            },
            label = { Text("Search videos") },
            leadingIcon = { Icon(Icons.Filled.Search, contentDescription = null) },
            singleLine = true,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 14.dp, vertical = 10.dp),
        )

        LazyRow(
            contentPadding = PaddingValues(horizontal = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(SEARCH_FILTERS) { (value, label) ->
                FilterChip(
                    selected = type == value,
                    onClick = { viewModel.setType(value) },
                    label = { Text(label) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = NsPrimary,
                        selectedLabelColor = MaterialTheme.colorScheme.onPrimary,
                        labelColor = NsMuted,
                    ),
                )
            }
        }

        when (val s = state) {
            is Load.Loading -> LoadingList(modifier = Modifier.padding(horizontal = 14.dp))
            is Load.Failed -> ErrorState(s.message, onRetry = { viewModel.search() })
            else -> when {
                results.isEmpty() && query.isBlank() -> EmptyState(
                    "Search NexaStream",
                    "Find videos, Shorts and channels across the network.",
                )
                results.isEmpty() -> EmptyState("No results", "Try a different search term.")
                else -> LazyColumn(
                    contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
                ) {
                    items(results, key = { it.id }) { video ->
                        VideoRow(video = video, onClick = { onOpenVideo(video.id) })
                    }
                }
            }
        }
    }
}

private val SEARCH_FILTERS: List<Pair<String?, String>> =
    listOf(null to "All", "video" to "Videos", "short" to "Shorts")

@Composable
fun ChannelScreen(
    handle: String,
    onOpenVideo: (String) -> Unit,
    viewModel: org.nexastream.app.ui.ChannelViewModel =
        viewModel(key = "channel-$handle", factory = org.nexastream.app.ui.ChannelViewModel.factory(handle)),
) {
    val channel by viewModel.channel.collectAsStateWithLifecycle()
    val videos by viewModel.videos.collectAsStateWithLifecycle()
    val state by viewModel.state.collectAsStateWithLifecycle()

    when (val s = state) {
        is Load.Loading -> LoadingList(modifier = Modifier.padding(horizontal = 14.dp))
        is Load.Failed -> ErrorState(s.message, onRetry = { viewModel.load() })
        else -> {
            val ch = channel ?: return
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(horizontal = 14.dp, vertical = 16.dp),
            ) {
                item {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Text(
                            text = ch.name,
                            style = MaterialTheme.typography.headlineSmall,
                            fontWeight = FontWeight.Bold,
                        )
                        Text(
                            text = "@${ch.handle}",
                            style = MaterialTheme.typography.bodyMedium,
                            color = NsMuted,
                        )
                        Row(
                            modifier = Modifier.padding(top = 10.dp),
                            horizontalArrangement = Arrangement.spacedBy(18.dp),
                        ) {
                            Stat("Videos", ch.videoCount.toString())
                            Stat("Views", TimeFormat.compact(ch.views))
                            Stat("Likes", TimeFormat.compact(ch.likes))
                            Stat("Watch h", ch.watchHours.toString())
                        }
                        if (ch.lifetimeEarnedNst > 0) {
                            Text(
                                text = "Creator earnings: ${
                                    org.nexastream.app.monetization.formatNst(ch.lifetimeEarnedNst)
                                }",
                                style = MaterialTheme.typography.bodySmall,
                                color = NsPrimary,
                                modifier = Modifier.padding(top = 10.dp),
                            )
                        }
                    }
                }
                items(videos, key = { it.id }) { video ->
                    VideoRow(video = video, onClick = { onOpenVideo(video.id) })
                }
            }
        }
    }
}

@Composable
private fun Stat(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        Text(text = label, style = MaterialTheme.typography.labelSmall, color = NsMuted)
    }
}
