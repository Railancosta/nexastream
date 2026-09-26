package org.nexastream.app.ui

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.SmartDisplay
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextOverflow
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import org.nexastream.app.ui.screens.AuthScreen
import org.nexastream.app.ui.screens.ChannelScreen
import org.nexastream.app.ui.screens.FeedScreen
import org.nexastream.app.ui.screens.SearchScreen
import org.nexastream.app.ui.screens.ShortsScreen
import org.nexastream.app.ui.screens.StudioScreen
import org.nexastream.app.ui.screens.UploadScreen
import org.nexastream.app.ui.screens.WalletScreen
import org.nexastream.app.ui.screens.WatchScreen
import org.nexastream.app.ui.theme.NsMuted
import org.nexastream.app.ui.theme.NsPrimary
import java.net.URLDecoder
import java.net.URLEncoder

object Routes {
    const val FEED = "feed"
    const val SHORTS = "shorts"
    const val SEARCH = "search"
    const val UPLOAD = "upload"
    const val WALLET = "wallet"
    const val STUDIO = "studio"
    const val AUTH = "auth"
    const val WATCH = "watch"
    const val CHANNEL = "channel"

    fun watch(id: String) = "$WATCH/${URLEncoder.encode(id, "UTF-8")}"
    fun channel(handle: String) = "$CHANNEL/${URLEncoder.encode(handle, "UTF-8")}"
}

private data class Tab(val route: String, val label: String, val icon: ImageVector)

private val TABS = listOf(
    Tab(Routes.FEED, "Home", Icons.Filled.Home),
    Tab(Routes.SHORTS, "Shorts", Icons.Filled.SmartDisplay),
    Tab(Routes.UPLOAD, "Upload", Icons.Filled.Add),
    Tab(Routes.SEARCH, "Search", Icons.Filled.Search),
    Tab(Routes.WALLET, "Wallet", Icons.Filled.AccountCircle),
)

@Composable
fun NexaStreamNavHost(navController: NavHostController = rememberNavController()) {
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    // Shorts and the watch screen are immersive: the bottom bar would cover
    // playback controls and vertical video.
    val showBottomBar = currentRoute?.substringBefore('/') !in setOf(Routes.WATCH, Routes.SHORTS)

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                    TABS.forEach { tab ->
                        val selected = backStackEntry?.destination?.hierarchy
                            ?.any { it.route?.substringBefore('/') == tab.route } == true
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                if (currentRoute?.substringBefore('/') == tab.route) return@NavigationBarItem
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.findStartDestination().id) {
                                        saveState = true
                                    }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = tab.label) },
                            label = {
                                Text(
                                    text = tab.label,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = NsPrimary,
                                selectedTextColor = NsPrimary,
                                unselectedIconColor = NsMuted,
                                unselectedTextColor = NsMuted,
                                indicatorColor = NsPrimary.copy(alpha = 0.15f),
                            ),
                        )
                    }
                }
            }
        },
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = Routes.FEED,
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
        ) {
            composable(Routes.FEED) {
                FeedScreen(
                    onOpenVideo = { navController.navigate(Routes.watch(it)) },
                )
            }
            composable(Routes.SHORTS) {
                ShortsScreen()
            }
            composable(Routes.SEARCH) {
                SearchScreen(
                    onOpenVideo = { navController.navigate(Routes.watch(it)) },
                )
            }
            composable(Routes.UPLOAD) {
                UploadScreen(onSignIn = { navController.navigate(Routes.AUTH) })
            }
            composable(Routes.WALLET) {
                WalletScreen(
                    onOpenStudio = { navController.navigate(Routes.STUDIO) },
                    onSignIn = { navController.navigate(Routes.AUTH) },
                )
            }
            composable(Routes.STUDIO) {
                StudioScreen(onOpenVideo = { navController.navigate(Routes.watch(it)) })
            }
            composable(Routes.AUTH) {
                AuthScreen(onAuthenticated = { navController.popBackStack() })
            }
            composable("${Routes.WATCH}/{videoId}") { entry ->
                val id = entry.arguments?.getString("videoId").orEmpty().let {
                    URLDecoder.decode(it, "UTF-8")
                }
                WatchScreen(
                    videoId = id,
                    onOpenVideo = { navController.navigate(Routes.watch(it)) },
                    onOpenChannel = { navController.navigate(Routes.channel(it)) },
                )
            }
            composable("${Routes.CHANNEL}/{handle}") { entry ->
                val handle = entry.arguments?.getString("handle").orEmpty().let {
                    URLDecoder.decode(it, "UTF-8")
                }
                ChannelScreen(
                    handle = handle,
                    onOpenVideo = { navController.navigate(Routes.watch(it)) },
                )
            }
        }
    }
}
