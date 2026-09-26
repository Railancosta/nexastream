package org.nexastream.app.net

import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/** Thrown for any non-2xx response; [status] lets callers branch on 401/429. */
class ApiException(val status: Int, message: String) : Exception(message)

/**
 * Minimal JSON-over-HTTP client built on [HttpURLConnection].
 *
 * Deliberately dependency-free: the platform HTTP stack is enough for the
 * platform's REST surface, and avoiding a bundled OkHttp keeps the APK small
 * and the dependency surface auditable (Item 30: dependency scanning).
 * All calls run on [Dispatchers.IO]; nothing here touches the main thread.
 */
class ApiClient(
    @Volatile var baseUrl: String,
    private val tokenProvider: () -> String?,
) {
    /** Hard timeouts so a dead backend cannot hang a screen forever. */
    private val connectTimeoutMs = 15_000
    private val readTimeoutMs = 30_000

    suspend fun get(path: String, query: Map<String, String> = emptyMap()): JSONObject =
        request("GET", path, query, null)

    suspend fun post(path: String, body: JSONObject? = null, query: Map<String, String> = emptyMap()): JSONObject =
        request("POST", path, query, body)

    suspend fun put(path: String, body: JSONObject? = null, query: Map<String, String> = emptyMap()): JSONObject =
        request("PUT", path, query, body)

    private suspend fun request(
        method: String,
        path: String,
        query: Map<String, String>,
        body: JSONObject?,
    ): JSONObject = withContext(Dispatchers.IO) {
        val url = buildUrl(path, query)
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = connectTimeoutMs
            readTimeout = readTimeoutMs
            setRequestProperty("Accept", "application/json")
            tokenProvider()?.takeIf { it.isNotEmpty() }?.let {
                setRequestProperty("Authorization", "Bearer $it")
            }
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
            }
        }

        try {
            if (body != null) {
                conn.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            val status = conn.responseCode
            val stream = if (status in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.let { s ->
                BufferedReader(InputStreamReader(s, Charsets.UTF_8)).use { it.readText() }
            }.orEmpty()

            val json = if (text.isBlank()) JSONObject() else runCatching { JSONObject(text) }.getOrElse {
                JSONObject().put("raw", text)
            }

            if (status !in 200..299) {
                throw ApiException(status, json.optString("error").ifEmpty { "HTTP $status" })
            }
            json
        } finally {
            conn.disconnect()
        }
    }

    private fun buildUrl(path: String, query: Map<String, String>): String {
        val base = baseUrl.trimEnd('/')
        val normalized = if (path.startsWith("/")) path else "/$path"
        if (query.isEmpty()) return base + normalized
        val qs = query.entries
            .filter { it.value.isNotEmpty() }
            .joinToString("&") { "${enc(it.key)}=${enc(it.value)}" }
        return if (qs.isEmpty()) base + normalized else "$base$normalized?$qs"
    }

    private fun enc(s: String) = URLEncoder.encode(s, "UTF-8")

    /**
     * Streams raw bytes with [method]. Used for video upload, where the core
     * service consumes the request body directly rather than JSON.
     *
     * [onProgress] is invoked with (bytesSent, totalBytes) as chunks flush.
     */
    suspend fun uploadBytes(
        method: String,
        path: String,
        query: Map<String, String>,
        bytes: ByteArray,
        contentType: String = "video/mp4",
        onProgress: ((Long, Long) -> Unit)? = null,
    ): JSONObject = withContext(Dispatchers.IO) {
        val conn = (URL(buildUrl(path, query)).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = connectTimeoutMs
            readTimeout = 120_000
            doOutput = true
            setRequestProperty("Content-Type", contentType)
            setRequestProperty("Accept", "application/json")
            setFixedLengthStreamingMode(bytes.size)
            tokenProvider()?.takeIf { it.isNotEmpty() }?.let {
                setRequestProperty("Authorization", "Bearer $it")
            }
        }
        try {
            val total = bytes.size.toLong()
            conn.outputStream.use { out ->
                var sent = 0L
                val chunk = 64 * 1024
                while (sent < total) {
                    val len = minOf(chunk.toLong(), total - sent).toInt()
                    out.write(bytes, sent.toInt(), len)
                    sent += len
                    onProgress?.invoke(sent, total)
                }
                out.flush()
            }
            val status = conn.responseCode
            val stream = if (status in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.let { s ->
                BufferedReader(InputStreamReader(s, Charsets.UTF_8)).use { it.readText() }
            }.orEmpty()
            val json = if (text.isBlank()) JSONObject() else runCatching { JSONObject(text) }.getOrElse {
                JSONObject().put("raw", text)
            }
            if (status !in 200..299) {
                throw ApiException(status, json.optString("error").ifEmpty { "HTTP $status" })
            }
            json
        } finally {
            conn.disconnect()
        }
    }
}
