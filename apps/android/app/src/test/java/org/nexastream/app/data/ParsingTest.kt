package org.nexastream.app.data

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Parsing is the boundary where a backend change becomes a crash, so it gets
 * the most test coverage. Every shape the core service can actually emit is
 * exercised here.
 */
class VideoParsingTest {

    private val base = "https://api.example.test"

    @Test
    fun `parses qualities array of objects`() {
        val json = JSONObject()
            .put("id", "v1")
            .put("title", "Demo")
            .put("duration", 95)
            .put("views", 1234)
            .put("is_short", 0)
            .put(
                "qualities",
                JSONArray()
                    .put(JSONObject().put("label", "360p").put("url", "/storage/videos/v1_360p.mp4"))
                    .put(JSONObject().put("label", "720p").put("url", "https://cdn.example/v1_720p.mp4")),
            )

        val v = Video.from(json, base)

        assertEquals("v1", v.id)
        assertEquals(2, v.sources.size)
        assertEquals("$base/storage/videos/v1_360p.mp4", v.sources[0].url)
        // Absolute URLs must pass through untouched.
        assertEquals("https://cdn.example/v1_720p.mp4", v.sources[1].url)
        assertEquals("$base/storage/videos/v1_360p.mp4", v.videoUrl)
    }

    @Test
    fun `parses qualities array of plain strings`() {
        val json = JSONObject()
            .put("id", "v2")
            .put("qualities", JSONArray().put("360p").put("1080p"))

        val v = Video.from(json, base)

        assertEquals(2, v.sources.size)
        assertEquals("360p", v.sources[0].label)
        assertEquals("$base/storage/videos/v2_360p.mp4", v.sources[0].url)
    }

    @Test
    fun `prefers video_url then video_path then first quality`() {
        val withUrl = Video.from(
            JSONObject().put("id", "a").put("video_url", "/stream/a.mp4").put("video_path", "/storage/a.mp4"),
            base,
        )
        assertEquals("$base/stream/a.mp4", withUrl.videoUrl)

        val withPath = Video.from(JSONObject().put("id", "b").put("video_path", "/storage/b.mp4"), base)
        assertEquals("$base/storage/b.mp4", withPath.videoUrl)

        val withQuality = Video.from(
            JSONObject().put("id", "c").put("qualities", JSONArray().put("360p")),
            base,
        )
        assertEquals("$base/storage/videos/c_360p.mp4", withQuality.videoUrl)
    }

    @Test
    fun `falls back to conventional thumbnail path`() {
        val v = Video.from(JSONObject().put("id", "v3"), base)
        assertEquals("$base/storage/thumbs/v3.jpg", v.thumbnailUrl)
    }

    @Test
    fun `defaults a missing title instead of rendering blank`() {
        val v = Video.from(JSONObject().put("id", "v4"), base)
        assertEquals("Untitled", v.title)
        assertEquals("NexaStream", v.channelName)
    }

    @Test
    fun `tolerates malformed quality entries`() {
        val json = JSONObject()
            .put("id", "v5")
            .put(
                "qualities",
                JSONArray()
                    .put(JSONObject().put("label", "").put("url", "/x.mp4"))
                    .put(JSONObject().put("label", "720p"))
                    .put("480p"),
            )

        val v = Video.from(json, base)

        // Only the well-formed string entry survives; the rest are skipped
        // rather than producing empty-labelled or URL-less sources.
        assertEquals(1, v.sources.size)
        assertEquals("480p", v.sources[0].label)
    }

    @Test
    fun `duration label handles minutes and hours`() {
        assertEquals("1:35", Video.from(JSONObject().put("duration", 95), base).durationLabel())
        assertEquals("0:07", Video.from(JSONObject().put("duration", 7), base).durationLabel())
        assertEquals("1:02:03", Video.from(JSONObject().put("duration", 3723), base).durationLabel())
        assertEquals("", Video.from(JSONObject(), base).durationLabel())
    }

    @Test
    fun `is_short integer maps to boolean`() {
        assertTrue(Video.from(JSONObject().put("is_short", 1), base).isShort)
        assertTrue(!Video.from(JSONObject().put("is_short", 0), base).isShort)
        assertTrue(!Video.from(JSONObject(), base).isShort)
    }

    @Test
    fun `listFrom skips non-object entries`() {
        val res = JSONObject().put(
            "videos",
            JSONArray().put(JSONObject().put("id", "one")).put("garbage").put(JSONObject().put("id", "two")),
        )
        val list = Video.listFrom(res, "videos", base)
        assertEquals(listOf("one", "two"), list.map { it.id })
    }

    @Test
    fun `listFrom returns empty when the key is absent`() {
        assertTrue(Video.listFrom(JSONObject(), "videos", base).isEmpty())
    }

    @Test
    fun `absolute does not double up slashes`() {
        assertEquals("$base/x.mp4", Video.absolute("$base/", "/x.mp4"))
        assertEquals("$base/x.mp4", Video.absolute(base, "x.mp4"))
        assertEquals("http://other/y.mp4", Video.absolute(base, "http://other/y.mp4"))
    }
}

class WalletParsingTest {

    @Test
    fun `parses wallet with ledger and payouts`() {
        val json = JSONObject()
            .put("balanceNst", 12.5)
            .put("lifetimeCreatorNst", 20.0)
            .put("lifetimeViewerNst", 0.02)
            .put("lifetimePaidNst", 7.5)
            .put("platformNst", 20.0)
            .put(
                "earningsByKind",
                JSONArray().put(
                    JSONObject().put("kind", "valid_view").put("nst", 10.0).put("events", 1000),
                ),
            )
            .put(
                "recentLedger",
                JSONArray().put(
                    JSONObject()
                        .put("kind", "valid_view").put("role", "creator")
                        .put("nst", 0.005).put("status", "credited")
                        .put("videoId", "v1").put("createdAt", "2026-09-01 10:00:00"),
                ),
            )
            .put(
                "payouts",
                JSONArray().put(
                    JSONObject()
                        .put("id", "p1").put("amountNst", 100.0)
                        .put("destAddress", "nano_abc").put("destNetwork", "NANO")
                        .put("status", "approved").put("createdAt", "2026-09-01 11:00:00"),
                ),
            )

        val w = Wallet.from(json)

        assertEquals(12.5, w.balanceNst, 1e-9)
        assertEquals(1, w.earningsByKind.size)
        assertEquals(1000, w.earningsByKind[0].events)
        assertEquals(1, w.recentLedger.size)
        assertEquals("credited", w.recentLedger[0].status)
        assertEquals(1, w.payouts.size)
        assertEquals("NANO", w.payouts[0].destNetwork)
        // A missing timelock must stay null rather than becoming "".
        assertEquals(null, w.payouts[0].timelockUntil)
    }

    @Test
    fun `missing collections become empty lists not nulls`() {
        val w = Wallet.from(JSONObject())
        assertEquals(0.0, w.balanceNst, 1e-9)
        assertTrue(w.earningsByKind.isEmpty())
        assertTrue(w.recentLedger.isEmpty())
        assertTrue(w.payouts.isEmpty())
    }
}

class RewardConfigTest {

    @Test
    fun `parses published rate table`() {
        val json = JSONObject()
            .put("ratesVersion", "2026-09-01")
            .put("split", JSONObject().put("creator", 0.5).put("platform", 0.5))
            .put("minPayoutNst", 100)
            .put("minWatchSeconds", 10)
            .put("networks", JSONArray().put("NANO").put("BTC"))
            .put("memoNetworks", JSONArray().put("XRP"))

        val c = RewardConfig.from(json)

        assertEquals("2026-09-01", c.ratesVersion)
        assertEquals(0.5, c.creatorSplit, 1e-9)
        assertEquals(listOf("NANO", "BTC"), c.networks)
        assertEquals(listOf("XRP"), c.memoNetworks)
    }

    @Test
    fun `defaults are safe when the server omits fields`() {
        val c = RewardConfig.from(JSONObject())
        assertEquals(0.5, c.creatorSplit, 1e-9)
        assertEquals(100.0, c.minPayoutNst, 1e-9)
        assertEquals(10, c.minWatchSeconds)
        assertTrue(c.networks.isEmpty())
    }
}

class StudioParsingTest {

    @Test
    fun `parses totals and per video rows`() {
        val json = JSONObject()
            .put(
                "videos",
                JSONArray().put(
                    JSONObject().put("id", "v1").put("title", "A").put("views", 10)
                        .put("earnedNst", 0.15).put("isShort", true),
                ),
            )
            .put(
                "totals",
                JSONObject().put("videos", 1).put("views", 10)
                    .put("earnedNst", 0.15).put("revenuePerThousandViewsNst", 15.0),
            )

        val s = Studio.from(json)

        assertEquals(1, s.videos.size)
        assertTrue(s.videos[0].isShort)
        assertEquals(15.0, s.totals.revenuePerThousandViewsNst, 1e-9)
    }
}

class AccrualResultTest {

    @Test
    fun `parses credited accrual with signals`() {
        val json = JSONObject()
            .put("credited", true)
            .put("fraudScore", 0.12)
            .put("creatorNst", 0.015)
            .put(
                "signals",
                JSONArray().put(JSONObject().put("signal", "new_viewer").put("weight", 0)),
            )

        val r = AccrualResult.from(json)

        assertTrue(r.credited)
        assertEquals(0.015, r.creatorNst, 1e-9)
        assertEquals(listOf("new_viewer"), r.signals)
        assertEquals(null, r.reason)
    }

    @Test
    fun `parses rejection with reason`() {
        val json = JSONObject()
            .put("credited", false)
            .put("fraudScore", 0.65)
            .put("reason", "playback 0.4s is below the 10s minimum for a valid view")

        val r = AccrualResult.from(json)

        assertTrue(!r.credited)
        assertTrue(r.reason!!.contains("10s minimum"))
    }
}
