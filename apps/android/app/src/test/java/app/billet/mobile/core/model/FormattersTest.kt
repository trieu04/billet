package app.billet.mobile.core.model

import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class FormattersTest {
    @Test
    fun `groups expenses by local day and totals amounts`() {
        val first = expense("1", "10000", "2026-10-22T01:00:00Z")
        val second = expense("2", "25000", "2026-10-22T02:00:00Z")

        val groups = groupExpenses(listOf(first, second), ZoneId.of("Asia/Ho_Chi_Minh"))

        assertEquals(1, groups.size)
        assertEquals("35000", groups.single().totalMinor)
        assertEquals(listOf("2", "1"), groups.single().expenses.map(Expense::id))
    }

    @Test
    fun `formats Vietnamese dong without fraction digits`() {
        val result = formatMoney("25000", "VND")
        assertTrue(result.contains("25.000"))
        assertTrue(result.contains("₫"))
    }

    private fun expense(id: String, amount: String, occurredAt: String) = Expense(
        id = id,
        amountMinor = amount,
        currency = "VND",
        occurredAt = occurredAt,
        occurredTimezone = "Asia/Ho_Chi_Minh",
        categoryId = "1",
        version = 1,
        createdAt = occurredAt,
        updatedAt = occurredAt,
    )
}
