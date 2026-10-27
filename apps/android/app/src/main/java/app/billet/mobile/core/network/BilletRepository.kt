package app.billet.mobile.core.network

import app.billet.mobile.core.model.AuthResponse
import app.billet.mobile.core.model.Budget
import app.billet.mobile.core.model.CalendarHistory
import app.billet.mobile.core.model.Category
import app.billet.mobile.core.model.Expense
import app.billet.mobile.core.model.ExpenseList
import app.billet.mobile.core.model.MediaReservation
import app.billet.mobile.core.model.Profile
import app.billet.mobile.core.model.RefreshTokenBody
import app.billet.mobile.core.model.SpendingReport
import app.billet.mobile.core.model.SuccessResponse
import app.billet.mobile.core.model.User
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId
import java.util.UUID
import kotlinx.serialization.Serializable

class BilletRepository(private val api: ApiClient) {
    @Serializable private data class LoginBody(val identifier: String, val password: String)
    @Serializable private data class MediaBody(val mimeType: String, val sizeBytes: Int)
    @Serializable
    private data class ExpenseBody(
        val amountMinor: String,
        val currency: String,
        val occurredAt: String,
        val occurredTimezone: String,
        val categoryId: String,
        val mediaAssetId: String?,
        val caption: String?,
        val idempotencyKey: String,
    )
    @Serializable private data class ExpensePatch(val version: Int, val caption: String?, val categoryId: String)

    suspend fun login(identifier: String, password: String): AuthResponse =
        api.request("/auth/login", "POST", LoginBody(identifier, password))

    suspend fun refresh(refreshToken: String): AuthResponse =
        api.request("/auth/refresh", "POST", RefreshTokenBody(refreshToken))

    suspend fun logout(refreshToken: String) {
        api.request<RefreshTokenBody, SuccessResponse>(
            "/auth/logout",
            "POST",
            RefreshTokenBody(refreshToken),
        )
    }

    suspend fun me(): User = api.request("/auth/me")
    suspend fun categories(): List<Category> = api.request("/categories")
    suspend fun expense(id: String): Expense = api.request("/expenses/$id")
    suspend fun profile(): Profile = api.request("/profile")
    suspend fun media(id: String): ByteArray = api.bytes("/media/$id/content")

    suspend fun recentExpenses(): List<Expense> {
        val from = LocalDate.now().minusDays(13).atStartOfDay(ZoneId.systemDefault()).toInstant().toString()
        val all = mutableListOf<Expense>()
        var cursor: String? = null
        do {
            val cursorQuery = cursor?.let { "&cursor=${ApiClient.encode(it)}" }.orEmpty()
            val page: ExpenseList = api.request("/expenses?from=${ApiClient.encode(from)}&limit=100$cursorQuery")
            all += page.data
            cursor = page.nextCursor
        } while (cursor != null)
        return all
    }

    suspend fun calendar(): CalendarHistory {
        val month = LocalDate.now().toString().take(7)
        val timezone = ApiClient.encode(ZoneId.systemDefault().id)
        return api.request("/expenses/calendar/history?throughMonth=$month&currency=VND&timezone=$timezone")
    }

    suspend fun spending(from: Instant, to: Instant, granularity: String): SpendingReport {
        val timezone = ApiClient.encode(ZoneId.systemDefault().id)
        return api.request(
            "/reports/spending?from=${ApiClient.encode(from.toString())}&to=${ApiClient.encode(to.toString())}" +
                "&currency=VND&timezone=$timezone&granularity=$granularity",
        )
    }

    suspend fun budget(currency: String): Budget =
        api.request("/budgets?month=${LocalDate.now().toString().take(7)}&currency=$currency")

    suspend fun createExpense(
        amountMinor: String,
        categoryId: String,
        caption: String,
        capturedAt: Instant,
        image: ByteArray?,
    ): Expense {
        val mediaId = image?.let {
            val reservation: MediaReservation = api.request(
                "/media",
                "POST",
                MediaBody(mimeType = "image/jpeg", sizeBytes = it.size),
            )
            api.upload(reservation.uploadUrl, it, "image/jpeg")
            reservation.id
        }
        return api.request(
            "/expenses",
            "POST",
            ExpenseBody(
                amountMinor = amountMinor,
                currency = "VND",
                occurredAt = capturedAt.toString(),
                occurredTimezone = ZoneId.systemDefault().id,
                categoryId = categoryId,
                mediaAssetId = mediaId,
                caption = caption.trim().ifEmpty { null },
                idempotencyKey = "android-${UUID.randomUUID().toString().lowercase()}",
            ),
        )
    }

    suspend fun updateExpense(expense: Expense, categoryId: String, caption: String): Expense =
        api.request(
            "/expenses/${expense.id}",
            "PATCH",
            ExpensePatch(expense.version, caption.trim().ifEmpty { null }, categoryId),
        )

    suspend fun deleteExpense(id: String) = api.send("/expenses/$id", "DELETE")
}
