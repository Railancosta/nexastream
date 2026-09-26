package org.nexastream.app.data

import org.json.JSONArray
import org.json.JSONObject

/** A single playable rendition of a video (e.g. `360p`, `1080p`). */
data class VideoSource(val label: String, val url: String)

data class Video(
    val id: String,
    val title: String,
    val description: String,
    val channelId: String,
    val channelName: String,
    val channelHandle: String,
    val thumbnailUrl: String,
    val videoUrl: String,
    val durationSeconds: Int,
    val views: Long,
    val likes: Long,
    val isShort: Boolean,
    val createdAt: String,
    val sources: List<VideoSource>,
) {
    /** Human-readable `m:ss` (or `h:mm:ss` for long-form). */
    fun durationLabel(): String {
        if (durationSeconds <= 0) return ""
        val h = durationSeconds / 3600
        val m = (durationSeconds % 3600) / 60
        val s = durationSeconds % 60
        return if (h > 0) "$h:${pad(m)}:${pad(s)}" else "$m:${pad(s)}"
    }

    private fun pad(v: Int) = v.toString().padStart(2, '0')

    companion object {
        /**
         * Parses a video object as returned by the core API. Fields are read
         * defensively: the web app tolerates both the legacy `video_path` and
         * the R2-backed `video_url`, and the Android client must match.
         */
        fun from(o: JSONObject, apiBase: String): Video {
            val id = o.optString("id")
            val sources = ArrayList<VideoSource>()
            o.optJSONArray("qualities")?.let { arr ->
                for (i in 0 until arr.length()) {
                    when (val entry = arr.opt(i)) {
                        is JSONObject -> {
                            val label = entry.optString("label")
                            val url = entry.optString("url")
                            if (label.isNotEmpty() && url.isNotEmpty()) {
                                sources += VideoSource(label, absolute(apiBase, url))
                            }
                        }
                        is String -> sources += VideoSource(entry, absolute(apiBase, "/storage/videos/${id}_$entry.mp4"))
                    }
                }
            }
            val direct = o.optString("video_url")
            val legacy = o.optString("video_path")
            val playable = when {
                direct.isNotEmpty() -> absolute(apiBase, direct)
                legacy.isNotEmpty() -> absolute(apiBase, legacy)
                sources.isNotEmpty() -> sources.first().url
                else -> ""
            }
            return Video(
                id = id,
                title = o.optString("title").ifEmpty { "Untitled" },
                description = o.optString("description"),
                channelId = o.optString("channel_id"),
                channelName = o.optString("channel_name").ifEmpty { "NexaStream" },
                channelHandle = o.optString("channel_handle"),
                thumbnailUrl = thumbnail(o, apiBase),
                videoUrl = playable,
                durationSeconds = o.optInt("duration", 0),
                views = o.optLong("views", 0),
                likes = o.optLong("likes", 0),
                isShort = o.optInt("is_short", 0) == 1,
                createdAt = o.optString("created_at"),
                sources = sources,
            )
        }

        private fun thumbnail(o: JSONObject, apiBase: String): String {
            val r2 = o.optString("thumbnail_url")
            if (r2.isNotEmpty()) return absolute(apiBase, r2)
            val legacy = o.optString("thumbnail_path")
            if (legacy.isNotEmpty()) return absolute(apiBase, legacy)
            return "$apiBase/storage/thumbs/${o.optString("id")}.jpg"
        }

        fun absolute(apiBase: String, url: String): String =
            if (url.startsWith("http://") || url.startsWith("https://")) url
            else apiBase.trimEnd('/') + "/" + url.trimStart('/')

        fun listFrom(json: JSONObject, key: String, apiBase: String): List<Video> {
            val arr = json.optJSONArray(key) ?: JSONArray()
            return (0 until arr.length()).mapNotNull { i ->
                arr.optJSONObject(i)?.let { from(it, apiBase) }
            }
        }
    }
}

data class Channel(
    val id: String,
    val name: String,
    val handle: String,
    val videoCount: Int,
    val views: Long,
    val likes: Long,
    val watchHours: Double,
    val lifetimeEarnedNst: Double,
) {
    companion object {
        fun from(o: JSONObject) = Channel(
            id = o.optString("id"),
            name = o.optString("name").ifEmpty { "NexaStream" },
            handle = o.optString("handle"),
            videoCount = o.optInt("videoCount", 0),
            views = o.optLong("views", 0),
            likes = o.optLong("likes", 0),
            watchHours = o.optDouble("watchHours", 0.0),
            lifetimeEarnedNst = o.optDouble("lifetimeEarnedNst", 0.0),
        )
    }
}

data class ChannelPage(val channel: Channel, val videos: List<Video>)

data class User(val id: String, val email: String, val username: String) {
    companion object {
        fun from(o: JSONObject) = User(
            id = o.optString("id"),
            email = o.optString("email"),
            username = o.optString("username"),
        )
    }
}

/** One credited (or rejected) reward line from the server ledger. */
data class LedgerEntry(
    val kind: String,
    val role: String,
    val nst: Double,
    val status: String,
    val videoId: String,
    val createdAt: String,
)

data class PayoutRecord(
    val id: String,
    val amountNst: Double,
    val destAddress: String,
    val destNetwork: String,
    val status: String,
    val timelockUntil: String?,
    val createdAt: String,
)

data class EarningsByKind(val kind: String, val nst: Double, val events: Int)

/** Reward configuration published by the server (`/api/monetization/config`). */
data class RewardConfig(
    val ratesVersion: String,
    val creatorSplit: Double,
    val platformSplit: Double,
    val minPayoutNst: Double,
    val minWatchSeconds: Int,
    val completionRatio: Double,
    val fraudRejectThreshold: Double,
    val timelockHours: Int,
    val networks: List<String>,
    val memoNetworks: List<String>,
) {
    companion object {
        fun from(o: JSONObject): RewardConfig {
            val split = o.optJSONObject("split") ?: JSONObject()
            return RewardConfig(
                ratesVersion = o.optString("ratesVersion", "unknown"),
                creatorSplit = split.optDouble("creator", 0.5),
                platformSplit = split.optDouble("platform", 0.5),
                minPayoutNst = o.optDouble("minPayoutNst", 100.0),
                minWatchSeconds = o.optInt("minWatchSeconds", 10),
                completionRatio = o.optDouble("completionRatio", 0.85),
                fraudRejectThreshold = o.optDouble("fraudRejectThreshold", 0.7),
                timelockHours = o.optInt("timelockHours", 24),
                networks = o.optJSONArray("networks").toStringList(),
                memoNetworks = o.optJSONArray("memoNetworks").toStringList(),
            )
        }

        private fun JSONArray?.toStringList(): List<String> {
            if (this == null) return emptyList()
            return (0 until length()).map { optString(it) }.filter { it.isNotEmpty() }
        }
    }
}

/** Wallet snapshot including the ledger and payout history. */
data class Wallet(
    val balanceNst: Double,
    val lifetimeCreatorNst: Double,
    val lifetimeViewerNst: Double,
    val lifetimePaidNst: Double,
    val platformNst: Double,
    val earningsByKind: List<EarningsByKind>,
    val recentLedger: List<LedgerEntry>,
    val payouts: List<PayoutRecord>,
) {
    companion object {
        fun from(o: JSONObject): Wallet {
            val kinds = ArrayList<EarningsByKind>()
            o.optJSONArray("earningsByKind")?.let { arr ->
                for (i in 0 until arr.length()) {
                    arr.optJSONObject(i)?.let {
                        kinds += EarningsByKind(
                            kind = it.optString("kind"),
                            nst = it.optDouble("nst", 0.0),
                            events = it.optInt("events", 0),
                        )
                    }
                }
            }
            val ledger = ArrayList<LedgerEntry>()
            o.optJSONArray("recentLedger")?.let { arr ->
                for (i in 0 until arr.length()) {
                    arr.optJSONObject(i)?.let {
                        ledger += LedgerEntry(
                            kind = it.optString("kind"),
                            role = it.optString("role"),
                            nst = it.optDouble("nst", 0.0),
                            status = it.optString("status"),
                            videoId = it.optString("videoId"),
                            createdAt = it.optString("createdAt"),
                        )
                    }
                }
            }
            val payouts = ArrayList<PayoutRecord>()
            o.optJSONArray("payouts")?.let { arr ->
                for (i in 0 until arr.length()) {
                    arr.optJSONObject(i)?.let {
                        payouts += PayoutRecord(
                            id = it.optString("id"),
                            amountNst = it.optDouble("amountNst", 0.0),
                            destAddress = it.optString("destAddress"),
                            destNetwork = it.optString("destNetwork"),
                            status = it.optString("status"),
                            timelockUntil = it.optString("timelockUntil").ifEmpty { null },
                            createdAt = it.optString("createdAt"),
                        )
                    }
                }
            }
            return Wallet(
                balanceNst = o.optDouble("balanceNst", 0.0),
                lifetimeCreatorNst = o.optDouble("lifetimeCreatorNst", 0.0),
                lifetimeViewerNst = o.optDouble("lifetimeViewerNst", 0.0),
                lifetimePaidNst = o.optDouble("lifetimePaidNst", 0.0),
                platformNst = o.optDouble("platformNst", 0.0),
                earningsByKind = kinds,
                recentLedger = ledger,
                payouts = payouts,
            )
        }
    }
}

/** Per-video economics shown in Creator Studio. */
data class StudioVideo(
    val id: String,
    val title: String,
    val views: Long,
    val likes: Long,
    val completions: Long,
    val watchSeconds: Long,
    val isShort: Boolean,
    val earnedNst: Double,
)

data class StudioTotals(
    val videos: Int,
    val views: Long,
    val likes: Long,
    val completions: Long,
    val watchHours: Double,
    val earnedNst: Double,
    val revenuePerThousandViewsNst: Double,
    val revenuePerViewNst: Double,
    val completionRate: Double,
)

data class Studio(val videos: List<StudioVideo>, val totals: StudioTotals) {
    companion object {
        fun from(o: JSONObject): Studio {
            val list = ArrayList<StudioVideo>()
            o.optJSONArray("videos")?.let { arr ->
                for (i in 0 until arr.length()) {
                    arr.optJSONObject(i)?.let {
                        list += StudioVideo(
                            id = it.optString("id"),
                            title = it.optString("title").ifEmpty { "Untitled" },
                            views = it.optLong("views", 0),
                            likes = it.optLong("likes", 0),
                            completions = it.optLong("completions", 0),
                            watchSeconds = it.optLong("watchSeconds", 0),
                            isShort = it.optBoolean("isShort", false),
                            earnedNst = it.optDouble("earnedNst", 0.0),
                        )
                    }
                }
            }
            val t = o.optJSONObject("totals") ?: JSONObject()
            return Studio(
                videos = list,
                totals = StudioTotals(
                    videos = t.optInt("videos", 0),
                    views = t.optLong("views", 0),
                    likes = t.optLong("likes", 0),
                    completions = t.optLong("completions", 0),
                    watchHours = t.optDouble("watchHours", 0.0),
                    earnedNst = t.optDouble("earnedNst", 0.0),
                    revenuePerThousandViewsNst = t.optDouble("revenuePerThousandViewsNst", 0.0),
                    revenuePerViewNst = t.optDouble("revenuePerViewNst", 0.0),
                    completionRate = t.optDouble("completionRate", 0.0),
                ),
            )
        }
    }
}

/** Result of a reward accrual call. */
data class AccrualResult(
    val credited: Boolean,
    val fraudScore: Double,
    val creatorNst: Double,
    val reason: String?,
    val signals: List<String>,
) {
    companion object {
        fun from(o: JSONObject): AccrualResult {
            val signals = ArrayList<String>()
            o.optJSONArray("signals")?.let { arr ->
                for (i in 0 until arr.length()) {
                    arr.optJSONObject(i)?.optString("signal")?.let { if (it.isNotEmpty()) signals += it }
                }
            }
            return AccrualResult(
                credited = o.optBoolean("credited", false),
                fraudScore = o.optDouble("fraudScore", 0.0),
                creatorNst = o.optDouble("creatorNst", 0.0),
                reason = o.optString("reason").ifEmpty { null },
                signals = signals,
            )
        }
    }
}
