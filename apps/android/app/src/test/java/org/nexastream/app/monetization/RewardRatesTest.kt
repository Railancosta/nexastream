package org.nexastream.app.monetization

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * The client-side rate mirror must not drift from the server's published
 * values: these assertions are the tripwire that catches a silent divergence.
 * The canonical values live in services/core/monetization.js.
 */
class RewardRatesTest {

    @Test
    fun `rates match the server rate table`() {
        assertEquals(0.0100, RewardRates.VALID_VIEW_NST, 1e-9)
        assertEquals(0.0200, RewardRates.COMPLETION_NST, 1e-9)
        assertEquals(0.0050, RewardRates.LIKE_NST, 1e-9)
        assertEquals(0.0500, RewardRates.SUBSCRIBE_NST, 1e-9)
        assertEquals(0.0020, RewardRates.VIEWER_VIEW_NST, 1e-9)
        assertEquals(50, RewardRates.VIEWER_DAILY_VIEW_CAP)
    }

    @Test
    fun `split is fifty fifty and sums to one`() {
        assertEquals(0.50, RewardRates.CREATOR_SPLIT, 1e-9)
        assertEquals(0.50, RewardRates.PLATFORM_SPLIT, 1e-9)
        assertEquals(1.0, RewardRates.CREATOR_SPLIT + RewardRates.PLATFORM_SPLIT, 1e-9)
    }

    @Test
    fun `anti-fraud and payout thresholds match the server config`() {
        assertEquals(10, RewardRates.MIN_WATCH_SECONDS)
        assertEquals(0.85, RewardRates.COMPLETION_RATIO, 1e-9)
        assertEquals(0.70, RewardRates.FRAUD_REJECT_THRESHOLD, 1e-9)
        assertEquals(100.0, RewardRates.MIN_PAYOUT_NST, 1e-9)
        assertEquals(10_000.0, RewardRates.HIGH_VALUE_TIMELOCK_NST, 1e-9)
        assertEquals(24, RewardRates.TIMELOCK_HOURS)
    }

    @Test
    fun `creator share of a valid view matches the documented split`() {
        // 0.01 NST gross at a 50% creator split = 0.005 NST to the creator.
        val grossMicro = (RewardRates.VALID_VIEW_NST * RewardRates.MICRO_PER_NST).toLong()
        val creatorMicro = (grossMicro * RewardRates.CREATOR_SPLIT).toLong()
        assertEquals(5_000L, creatorMicro)
        assertEquals(0.005, creatorMicro.toDouble() / RewardRates.MICRO_PER_NST, 1e-9)
    }
}

class FormatNstTest {

    @Test
    fun `formats sub-unit rewards without collapsing to zero`() {
        assertEquals("0.005 NST", formatNst(0.005))
        assertEquals("0.002 NST", formatNst(0.002))
        assertEquals("0.015 NST", formatNst(0.015))
    }

    @Test
    fun `formats whole and large amounts`() {
        assertEquals("1 NST", formatNst(1.0))
        assertEquals("1.5 NST", formatNst(1.5))
        assertEquals("1000 NST", formatNst(1000.0))
    }

    @Test
    fun `zero and invalid input are handled`() {
        assertEquals("0 NST", formatNst(0.0))
        assertEquals("0 NST", formatNst(Double.NaN))
        assertEquals("0 NST", formatNst(Double.POSITIVE_INFINITY))
    }

    @Test
    fun `negative values keep their sign`() {
        assertTrue(formatNst(-1.5).startsWith("-"))
    }
}
