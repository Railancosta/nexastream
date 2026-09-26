package org.nexastream.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// NexaStream is a fixed dark theme on every platform (see apps/web globals.css),
// so the Android client intentionally does not follow the system light setting.
val NsBackground = Color(0xFF0B0B12)
val NsSurface = Color(0xFF14141F)
val NsSurfaceHigh = Color(0xFF1E1E2C)
val NsPrimary = Color(0xFF7C5CFF)
val NsAccent = Color(0xFF22D3EE)
val NsOnSurface = Color(0xFFF5F5FA)
val NsMuted = Color(0xFF9A9AB0)
val NsDanger = Color(0xFFFF5C7A)
val NsSuccess = Color(0xFF3DDC97)

private val NsColors = darkColorScheme(
    primary = NsPrimary,
    onPrimary = Color.White,
    secondary = NsAccent,
    onSecondary = Color(0xFF00202A),
    tertiary = NsSuccess,
    background = NsBackground,
    onBackground = NsOnSurface,
    surface = NsSurface,
    onSurface = NsOnSurface,
    surfaceVariant = NsSurfaceHigh,
    onSurfaceVariant = NsMuted,
    error = NsDanger,
    onError = Color.White,
)

@Composable
fun NexaStreamTheme(content: @Composable () -> Unit) {
    // isSystemInDarkTheme() is read only to keep the composable reactive to
    // configuration changes; the palette itself is always dark.
    @Suppress("UNUSED_EXPRESSION")
    isSystemInDarkTheme()
    MaterialTheme(colorScheme = NsColors, content = content)
}
