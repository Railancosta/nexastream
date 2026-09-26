package org.nexastream.app.data

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import java.util.UUID

/**
 * Persists the session token, viewer identity and API base URL.
 *
 * The JWT is stored in [EncryptedSharedPreferences] (AES-256-GCM, key held in
 * the Android Keystore) rather than plain prefs, so a device backup or a
 * rooted-filesystem read does not hand over the account (Item 17: key
 * protection, local encryption).
 */
class SessionStore(context: Context) {

    private val prefs = runCatching {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context,
            "nexastream_session",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        ) as android.content.SharedPreferences
    }.getOrElse {
        // Keystore can be unavailable on some emulators/older devices. Falling
        // back keeps the app usable; the token is still not world-readable.
        context.getSharedPreferences("nexastream_session_fallback", Context.MODE_PRIVATE)
    }

    var token: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(value) {
            prefs.edit().apply {
                if (value == null) remove(KEY_TOKEN) else putString(KEY_TOKEN, value)
            }.apply()
        }

    var user: User?
        get() {
            val raw = prefs.getString(KEY_USER, null) ?: return null
            return runCatching {
                val o = org.json.JSONObject(raw)
                User(o.optString("id"), o.optString("email"), o.optString("username"))
            }.getOrNull()
        }
        set(value) {
            prefs.edit().apply {
                if (value == null) remove(KEY_USER)
                else putString(
                    KEY_USER,
                    org.json.JSONObject()
                        .put("id", value.id).put("email", value.email).put("username", value.username)
                        .toString(),
                )
            }.apply()
        }

    /**
     * A stable per-install identifier used for (a) deterministic feed
     * exploration and (b) server-side anti-fraud device clustering. It is a
     * random UUID, not a hardware identifier, so it carries no PII.
     */
    val viewerId: String
        get() {
            val existing = prefs.getString(KEY_VIEWER, null)
            if (existing != null) return existing
            val fresh = "android-" + UUID.randomUUID().toString()
            prefs.edit().putString(KEY_VIEWER, fresh).apply()
            return fresh
        }

    var apiBaseUrl: String?
        get() = prefs.getString(KEY_API_BASE, null)
        set(value) {
            prefs.edit().apply {
                if (value.isNullOrEmpty()) remove(KEY_API_BASE) else putString(KEY_API_BASE, value)
            }.apply()
        }

    val isLoggedIn: Boolean get() = !token.isNullOrEmpty()

    fun clearSession() {
        prefs.edit().remove(KEY_TOKEN).remove(KEY_USER).apply()
    }

    private companion object {
        const val KEY_TOKEN = "jwt"
        const val KEY_USER = "user"
        const val KEY_VIEWER = "viewer_id"
        const val KEY_API_BASE = "api_base"
    }
}
