package org.nexastream.app.net

import org.json.JSONObject
import org.nexastream.app.data.AccrualResult
import org.nexastream.app.data.Channel
import org.nexastream.app.data.ChannelPage
import org.nexastream.app.data.RewardConfig
import org.nexastream.app.data.Studio
import org.nexastream.app.data.User
import org.nexastream.app.data.Video
import org.nexastream.app.data.Wallet

/**
 * Typed facade over the NexaStream REST API.
 *
 * Endpoint coverage mirrors the platform contract documented in docs/API.md:
 * auth, feed, video detail, search, channels, social, monetization and upload.
 */
class NexaStreamApi(private val client: ApiClient) {

    val baseUrl: String get() = client.baseUrl

    // --- auth ---------------------------------------------------------------

    suspend fun register(email: String, password: String, username: String): Pair<User, String> {
        val res = client.post(
            "/api/auth/register",
            JSONObject().put("email", email).put("password", password).put("username", username),
        )
        return User.from(res.getJSONObject("user")) to res.getString("token")
    }

    suspend fun login(email: String, password: String): Pair<User, String> {
        val res = client.post(
            "/api/auth/login",
            JSONObject().put("email", email).put("password", password),
        )
        return User.from(res.getJSONObject("user")) to res.getString("token")
    }

    suspend fun me(): User = User.from(client.get("/api/auth/me").getJSONObject("user"))

    // --- feed & catalogue ---------------------------------------------------

    suspend fun feed(tab: String, viewerId: String): FeedPage {
        val res = client.get("/api/feed", mapOf("tab" to tab, "viewer" to viewerId))
        return FeedPage(
            shorts = Video.listFrom(res, "shorts", client.baseUrl),
            videos = Video.listFrom(res, "videos", client.baseUrl),
            algorithm = res.optString("algorithm"),
        )
    }

    suspend fun video(id: String): Video =
        Video.from(client.get("/api/videos/$id").getJSONObject("video"), client.baseUrl)

    suspend fun related(id: String): List<Video> =
        Video.listFrom(client.get("/api/videos/$id/related"), "videos", client.baseUrl)

    suspend fun search(
        query: String,
        category: String? = null,
        type: String? = null,
        sort: String? = null,
    ): List<Video> {
        val params = HashMap<String, String>()
        params["q"] = query
        category?.let { params["category"] = it }
        type?.let { params["type"] = it }
        sort?.let { params["sort"] = it }
        return Video.listFrom(client.get("/api/search", params), "videos", client.baseUrl)
    }

    suspend fun channel(handle: String): ChannelPage {
        val res = client.get("/api/channels/$handle")
        return ChannelPage(
            channel = Channel.from(res.getJSONObject("channel")),
            videos = Video.listFrom(res, "videos", client.baseUrl),
        )
    }

    // --- engagement (feeds the recommendation ranking) ----------------------

    suspend fun like(videoId: String): Long =
        client.post("/api/videos/$videoId/like").optLong("likes", 0)

    suspend fun watch(videoId: String, seconds: Double, completed: Boolean) {
        client.post(
            "/api/videos/$videoId/watch",
            JSONObject().put("seconds", seconds).put("completed", completed),
        )
    }

    // --- monetization -------------------------------------------------------

    suspend fun rewardConfig(): RewardConfig =
        RewardConfig.from(client.get("/api/monetization/config"))

    /**
     * Reports a validated watch. The server decides whether to credit; the
     * client never assumes success (Item 21: rewards come from verifiable
     * metrics, and Item 22: anti-fraud runs server-side).
     */
    suspend fun accrue(
        videoId: String,
        viewerId: String,
        seconds: Double,
        completed: Boolean,
        deviceId: String,
    ): AccrualResult = AccrualResult.from(
        client.post(
            "/api/monetization/accrue",
            JSONObject()
                .put("videoId", videoId)
                .put("viewerId", viewerId)
                .put("seconds", seconds)
                .put("completed", completed)
                .put("deviceId", deviceId),
        ),
    )

    suspend fun rewardEngagement(kind: String, videoId: String, viewerId: String): AccrualResult =
        AccrualResult.from(
            client.post(
                "/api/monetization/reward/$kind",
                JSONObject().put("videoId", videoId).put("viewerId", viewerId),
            ),
        )

    suspend fun wallet(): Wallet = Wallet.from(client.get("/api/monetization/wallet"))

    suspend fun studio(): Studio = Studio.from(client.get("/api/monetization/studio"))

    suspend fun validateAddress(address: String, network: String): JSONObject =
        client.get("/api/monetization/validate-address", mapOf("address" to address, "network" to network))

    suspend fun requestPayout(
        amountNst: Double,
        destAddress: String,
        destNetwork: String,
        destMemo: String?,
    ): JSONObject {
        val body = JSONObject()
            .put("amountNst", amountNst)
            .put("destAddress", destAddress)
            .put("destNetwork", destNetwork)
        destMemo?.takeIf { it.isNotEmpty() }?.let { body.put("destMemo", it) }
        return client.post("/api/monetization/payout", body)
    }

    // --- upload -------------------------------------------------------------

    /**
     * Uploads a local file to the core service.
     *
     * The core reads the raw request body, classifies Shorts via ffprobe and
     * transcodes asynchronously, so the returned id is immediately playable in
     * `processing` state rather than `ready`.
     */
    suspend fun upload(
        bytes: ByteArray,
        title: String,
        description: String,
        isShort: Boolean,
        onProgress: ((Long, Long) -> Unit)? = null,
    ): String {
        val res = client.uploadBytes(
            method = "PUT",
            path = "/api/videos/upload",
            query = mapOf(
                "title" to title,
                "description" to description,
                "type" to if (isShort) "short" else "video",
            ),
            bytes = bytes,
            onProgress = onProgress,
        )
        return res.optString("videoId")
    }

    suspend fun health(): JSONObject = client.get("/api/health")
}

data class FeedPage(val shorts: List<Video>, val videos: List<Video>, val algorithm: String)
