package app.billet.mobile.ui.screen

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.billet.mobile.core.model.Expense
import app.billet.mobile.core.model.ExpenseGroup
import app.billet.mobile.core.model.formatExpenseTime
import app.billet.mobile.core.model.formatMoney
import app.billet.mobile.core.model.groupExpenses
import app.billet.mobile.core.network.BilletRepository
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun JournalScreen(
    repository: BilletRepository,
    contentPadding: PaddingValues,
    refreshKey: Int,
    onCalendar: () -> Unit,
    onCapture: () -> Unit,
    onExpense: (String) -> Unit,
) {
    var expenses by remember { mutableStateOf<List<Expense>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    LaunchedEffect(refreshKey, retry) {
        loading = true
        error = null
        runCatching { repository.recentExpenses() }
            .onSuccess { expenses = it }
            .onFailure { error = it.message ?: "Không thể tải nhật ký." }
        loading = false
    }

    Scaffold(
        modifier = Modifier.padding(bottom = contentPadding.calculateBottomPadding()),
        topBar = {
            TopAppBar(
                title = { Text("Nhật ký", fontWeight = FontWeight.Bold) },
                navigationIcon = {
                    IconButton(onClick = onCalendar) { Icon(Icons.Outlined.CalendarMonth, "Xem lịch") }
                },
                actions = {
                    IconButton(onClick = { retry++ }) { Icon(Icons.Outlined.Refresh, "Tải lại") }
                    IconButton(onClick = onCapture) { Icon(Icons.Outlined.CameraAlt, "Thêm chi tiêu") }
                },
            )
        },
    ) { inner ->
        when {
            loading && expenses.isEmpty() -> Column(
                Modifier.fillMaxSize().padding(inner),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) { CircularProgressIndicator(); Text("Đang mở nhật ký…", Modifier.padding(top = 12.dp)) }
            error != null && expenses.isEmpty() -> LoadState(
                message = requireNotNull(error),
                onRetry = { retry++ },
                modifier = Modifier.fillMaxSize().padding(inner).padding(24.dp),
            )
            expenses.isEmpty() -> Column(
                Modifier.fillMaxSize().padding(inner).padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(Icons.Outlined.CameraAlt, null, Modifier.size(54.dp))
                Text("Chưa có khoản chi", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(top = 16.dp))
                Text("Chụp khoảnh khắc đầu tiên để bắt đầu nhật ký.", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            else -> LazyColumn(
                contentPadding = PaddingValues(top = inner.calculateTopPadding(), bottom = 24.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                items(groupExpenses(expenses), key = { it.date.toString() }) { group ->
                    ExpenseGroupRow(group, repository, onExpense)
                }
            }
        }
    }
}

@Composable
private fun ExpenseGroupRow(group: ExpenseGroup, repository: BilletRepository, onExpense: (String) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 20.dp),
            verticalAlignment = Alignment.Bottom,
        ) {
            Column {
                Text(dayTitle(group.date), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text("${group.expenses.size} khoảnh khắc", color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Spacer(Modifier.weight(1f))
            Text(formatMoney(group.totalMinor), fontWeight = FontWeight.SemiBold)
        }
        LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(group.expenses, key = Expense::id) { expense ->
                ElevatedCard(
                    Modifier.width(220.dp).clickable { onExpense(expense.id) },
                ) {
                    AuthenticatedImage(expense.mediaAssetId, repository, Modifier.fillMaxWidth().height(145.dp))
                    Column(Modifier.padding(14.dp)) {
                        Text(
                            expense.merchant ?: expense.caption ?: "Khoảnh khắc chi tiêu",
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Row(Modifier.fillMaxWidth().padding(top = 6.dp)) {
                            Text(formatExpenseTime(expense.occurredAt), color = MaterialTheme.colorScheme.onSurfaceVariant)
                            Spacer(Modifier.weight(1f))
                            Text(formatMoney(expense.amountMinor, expense.currency), fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
        }
    }
}

private fun dayTitle(date: LocalDate): String = when (date) {
    LocalDate.now() -> "Hôm nay"
    LocalDate.now().minusDays(1) -> "Hôm qua"
    else -> date.format(DateTimeFormatter.ofPattern("EEEE, d 'tháng' M", Locale.forLanguageTag("vi-VN"))).replaceFirstChar(Char::uppercase)
}
