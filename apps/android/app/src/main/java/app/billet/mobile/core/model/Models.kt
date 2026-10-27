package app.billet.mobile.core.model

import kotlinx.serialization.Serializable

@Serializable
data class User(
    val id: String,
    val username: String,
    val email: String,
    val displayName: String,
)

@Serializable
data class AuthResponse(
    val accessToken: String,
    val refreshToken: String? = null,
    val expiresIn: Int,
    val user: User,
    val requiresMfa: Boolean,
)

@Serializable data class RefreshTokenBody(val refreshToken: String)
@Serializable data class SuccessResponse(val success: Boolean)

@Serializable
data class Category(
    val id: String,
    val code: String,
    val name: String,
    val color: String,
    val icon: String,
    val sortOrder: Int,
)

@Serializable
data class Expense(
    val id: String,
    val amountMinor: String,
    val currency: String,
    val occurredAt: String,
    val occurredTimezone: String,
    val categoryId: String,
    val mediaAssetId: String? = null,
    val recognitionJobId: String? = null,
    val caption: String? = null,
    val merchant: String? = null,
    val location: String? = null,
    val version: Int,
    val createdAt: String,
    val updatedAt: String,
)

@Serializable
data class ExpenseList(
    val data: List<Expense>,
    val nextCursor: String? = null,
    val totals: List<ExpenseTotal> = emptyList(),
)

@Serializable data class ExpenseTotal(val currency: String, val totalMinor: String, val count: Int)

@Serializable data class CalendarHistory(val months: List<ExpenseCalendar>)

@Serializable
data class ExpenseCalendar(
    val month: String,
    val currency: String,
    val totalMinor: String,
    val count: Int,
    val days: List<ExpenseCalendarDay>,
)

@Serializable
data class ExpenseCalendarDay(
    val date: String,
    val totalMinor: String,
    val count: Int,
    val representativeMediaId: String? = null,
    val mediaAssetIds: List<String> = emptyList(),
)

@Serializable
data class SpendingReport(
    val currency: String,
    val totalMinor: String,
    val count: Int,
    val comparison: SpendingComparison,
    val series: List<SpendingPoint>,
    val categories: List<SpendingCategory>,
    val insights: List<SpendingInsight>,
)

@Serializable data class SpendingComparison(val changePercent: Double? = null)
@Serializable data class SpendingPoint(val bucket: String, val totalMinor: String, val count: Int)

@Serializable
data class SpendingCategory(
    val categoryId: String,
    val code: String,
    val name: String,
    val totalMinor: String,
    val count: Int,
    val sharePercent: Double? = null,
)

@Serializable data class SpendingInsight(val type: String, val date: String, val amountMinor: String)

@Serializable
data class Settings(
    val id: String,
    val defaultCurrency: String,
    val timezone: String,
    val locale: String,
    val appearance: String,
    val reminderEnabled: Boolean,
    val reminderTime: String? = null,
)

@Serializable
data class Profile(
    val id: String,
    val username: String,
    val email: String,
    val displayName: String,
    val expenseCount: Int,
    val settings: Settings,
)

@Serializable
data class Budget(
    val month: String,
    val currency: String,
    val isSet: Boolean,
    val limitMinor: String? = null,
    val spentMinor: String,
    val remainingMinor: String? = null,
)

@Serializable
data class MediaReservation(
    val id: String,
    val mimeType: String,
    val sizeBytes: String,
    val status: String,
    val uploadUrl: String,
)
