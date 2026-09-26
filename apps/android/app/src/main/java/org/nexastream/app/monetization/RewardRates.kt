package org.nexastream.app.monetization

/**
 * Client-side mirror of the server reward rate table (services/core/monetization.js).
 *
 * The server is the single source of truth: this table is only used to render
 * expected earnings before a round-trip completes and is overwritten by
 * `/api/monetization/config` as soon as it loads. Never credit a balance from
 * these numbers — only from a server response.
 */
object RewardRates {
    const val VERSION = "2026-09-01"

    /** 1 NST = 1_000_000 micro-NST. All balances are integers in micro-NST. */
    const val MICRO_PER_NST = 1_000_000L

    // Creator-side rates, in NST per qualifying event.
    const val VALID_VIEW_NST = 0.0100
    const val COMPLETION_NST = 0.0200
    const val LIKE_NST = 0.0050
    const val SUBSCRIBE_NST = 0.0500

    // Viewer-side watch-to-earn rate.
    const val VIEWER_VIEW_NST = 0.0020
    const val VIEWER_DAILY_VIEW_CAP = 50

    const val CREATOR_SPLIT = 0.50
    const val PLATFORM_SPLIT = 0.50

    const val MIN_WATCH_SECONDS = 10
    const val COMPLETION_RATIO = 0.85
    const val MIN_PAYOUT_NST = 100.0
    const val HIGH_VALUE_TIMELOCK_NST = 10_000.0
    const val TIMELOCK_HOURS = 24
    const val FRAUD_REJECT_THRESHOLD = 0.70
}

/** Formats an NST amount with enough precision to show sub-cent rewards. */
fun formatNst(value: Double): String {
    if (value.isNaN() || value.isInfinite()) return "0 NST"
    val abs = kotlin.math.abs(value)
    val decimals = when {
        abs >= 1000 -> 2
        abs >= 1 -> 4
        else -> 6
    }
    return "${trimZeros(value, decimals)} NST"
}

/** Rounds to [decimals] places and drops trailing zeros so 1.0 renders as "1". */
private fun trimZeros(v: Double, decimals: Int): String {
    var factor = 1.0
    repeat(decimals) { factor *= 10.0 }
    val rounded = kotlin.math.round(v * factor) / factor
    val text = String.format(java.util.Locale.US, "%.${decimals}f", rounded)
    val trimmed = text.trimEnd('0').trimEnd('.')
    return if (trimmed.isEmpty() || trimmed == "-") "0" else trimmed
}
