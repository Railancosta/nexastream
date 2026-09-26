package org.nexastream.app.util

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/** Formats ISO/SQL timestamps from the API as compact relative time. */
object TimeFormat {

    fun relative(raw: String): String {
        val millis = parse(raw) ?: return ""
        val diff = (System.currentTimeMillis() - millis).coerceAtLeast(0) / 1000
        return when {
            diff < 60 -> "just now"
            diff < 3_600 -> "${diff / 60}m ago"
            diff < 86_400 -> "${diff / 3_600}h ago"
            diff < 2_592_000 -> "${diff / 86_400}d ago"
            diff < 31_536_000 -> "${diff / 2_592_000}mo ago"
            else -> "${diff / 31_536_000}y ago"
        }
    }

    /**
     * The API returns SQLite `datetime('now')` values ("2026-09-01 12:00:00",
     * UTC) as well as ISO-8601 with a `T` and optional zone. Both are accepted.
     */
    fun parse(raw: String): Long? {
        if (raw.isBlank()) return null
        val normalized = raw.trim().replace(' ', 'T')
        val hasZone = normalized.endsWith("Z") || normalized.contains('+') ||
            Regex("T\\d{2}:\\d{2}:\\d{2}-\\d{2}").containsMatchIn(normalized)
        val candidates = if (hasZone) listOf(normalized) else listOf(normalized + "Z", normalized)
        val patterns = listOf(
            "yyyy-MM-dd'T'HH:mm:ss.SSSXXX",
            "yyyy-MM-dd'T'HH:mm:ssXXX",
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ss",
        )
        for (candidate in candidates) {
            for (p in patterns) {
                runCatching {
                    val fmt = SimpleDateFormat(p, Locale.US).apply { timeZone = TimeZone.getTimeZone("UTC") }
                    return fmt.parse(candidate)?.time
                }
            }
        }
        return null
    }

    /** Compact counts matching the web client (`1.2K`, `3.4M`). */
    fun compact(n: Long): String = when {
        n >= 1_000_000_000 -> trim(n / 1_000_000_000.0) + "B"
        n >= 1_000_000 -> trim(n / 1_000_000.0) + "M"
        n >= 1_000 -> trim(n / 1_000.0) + "K"
        else -> n.toString()
    }

    private fun trim(v: Double): String {
        val rounded = Math.round(v * 10.0) / 10.0
        return if (rounded % 1.0 == 0.0) rounded.toLong().toString() else rounded.toString()
    }
}

/** Byte-size formatting for the upload screen. */
object SizeFormat {
    fun human(bytes: Long): String = when {
        bytes >= 1L shl 30 -> "${round(bytes.toDouble() / (1L shl 30))} GB"
        bytes >= 1L shl 20 -> "${round(bytes.toDouble() / (1L shl 20))} MB"
        bytes >= 1L shl 10 -> "${round(bytes.toDouble() / (1L shl 10))} KB"
        else -> "$bytes B"
    }

    private fun round(v: Double) = Math.round(v * 10.0) / 10.0
}
