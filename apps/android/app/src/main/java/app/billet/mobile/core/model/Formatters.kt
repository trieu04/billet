package app.billet.mobile.core.model

import java.text.NumberFormat
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Currency
import java.util.Locale

private val vietnamese = Locale.forLanguageTag("vi-VN")

fun formatMoney(amountMinor: String, currencyCode: String = "VND"): String {
    val amount = amountMinor.toLongOrNull() ?: return "$amountMinor $currencyCode"
    return NumberFormat.getCurrencyInstance(vietnamese).apply {
        currency = Currency.getInstance(currencyCode)
        maximumFractionDigits = if (currencyCode == "VND") 0 else 2
    }.format(amount)
}

fun parseInstant(value: String): Instant? = runCatching { Instant.parse(value) }.getOrNull()

fun formatExpenseTime(value: String, zoneId: ZoneId = ZoneId.systemDefault()): String =
    parseInstant(value)?.atZone(zoneId)?.format(DateTimeFormatter.ofPattern("HH:mm", vietnamese)).orEmpty()

fun formatExpenseDateTime(value: String, zoneId: ZoneId = ZoneId.systemDefault()): String =
    parseInstant(value)?.atZone(zoneId)?.format(
        DateTimeFormatter.ofLocalizedDateTime(FormatStyle.FULL, FormatStyle.SHORT).withLocale(vietnamese),
    ) ?: value

data class ExpenseGroup(val date: LocalDate, val expenses: List<Expense>, val totalMinor: String)

fun groupExpenses(expenses: List<Expense>, zoneId: ZoneId = ZoneId.systemDefault()): List<ExpenseGroup> =
    expenses
        .mapNotNull { expense -> parseInstant(expense.occurredAt)?.atZone(zoneId)?.toLocalDate()?.let { it to expense } }
        .groupBy({ it.first }, { it.second })
        .map { (date, values) ->
            ExpenseGroup(
                date = date,
                expenses = values.sortedByDescending(Expense::occurredAt),
                totalMinor = values.sumOf { it.amountMinor.toLongOrNull() ?: 0L }.toString(),
            )
        }
        .sortedByDescending(ExpenseGroup::date)
