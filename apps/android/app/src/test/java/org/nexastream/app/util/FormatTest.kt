package org.nexastream.app.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class TimeFormatTest {

    @Test
    fun `parses sqlite datetime as UTC`() {
        val millis = TimeFormat.parse("2026-09-01 10:00:00")
        assertEquals(1788256800000L, millis)
    }

    @Test
    fun `parses iso8601 with and without zone`() {
        assertEquals(TimeFormat.parse("2026-09-01 10:00:00"), TimeFormat.parse("2026-09-01T10:00:00Z"))
        assertEquals(TimeFormat.parse("2026-09-01 10:00:00"), TimeFormat.parse("2026-09-01T10:00:00"))
    }

    @Test
    fun `rejects blank and unparseable input`() {
        assertNull(TimeFormat.parse(""))
        assertNull(TimeFormat.parse("   "))
        assertNull(TimeFormat.parse("not-a-date"))
    }

    @Test
    fun `compact counts match the web client`() {
        assertEquals("0", TimeFormat.compact(0))
        assertEquals("999", TimeFormat.compact(999))
        assertEquals("1K", TimeFormat.compact(1000))
        assertEquals("1.5K", TimeFormat.compact(1500))
        assertEquals("1M", TimeFormat.compact(1_000_000))
        assertEquals("2.5M", TimeFormat.compact(2_500_000))
        assertEquals("1B", TimeFormat.compact(1_000_000_000))
    }

    @Test
    fun `relative time is empty for bad input`() {
        assertEquals("", TimeFormat.relative(""))
        assertEquals("", TimeFormat.relative("nonsense"))
    }

    @Test
    fun `relative time renders a past timestamp`() {
        val twoHoursAgo = System.currentTimeMillis() - 2 * 3_600_000
        val stamp = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss", java.util.Locale.US)
            .apply { timeZone = java.util.TimeZone.getTimeZone("UTC") }
            .format(java.util.Date(twoHoursAgo))
        assertTrue(TimeFormat.relative(stamp).endsWith("h ago"))
    }
}

class SizeFormatTest {

    @Test
    fun `formats byte sizes`() {
        assertEquals("512 B", SizeFormat.human(512))
        assertEquals("1.0 KB", SizeFormat.human(1024))
        assertEquals("1.0 MB", SizeFormat.human(1024L * 1024))
        assertEquals("1.5 GB", SizeFormat.human((1.5 * 1024 * 1024 * 1024).toLong()))
    }
}
