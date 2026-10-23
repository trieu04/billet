package app.billet.mobile.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.billet.mobile.core.model.CalendarHistory
import app.billet.mobile.core.model.ExpenseCalendar
import app.billet.mobile.core.model.ExpenseCalendarDay
import app.billet.mobile.core.model.formatMoney
import app.billet.mobile.core.network.BilletRepository
import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarScreen(repository: BilletRepository, onBack: () -> Unit) {
    var history by remember { mutableStateOf<CalendarHistory?>(null) }
    var selected by remember { mutableStateOf<ExpenseCalendarDay?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    LaunchedEffect(retry) {
        error = null
        runCatching { repository.calendar() }
            .onSuccess {
                history = it
                selected = it.months.lastOrNull()?.days?.firstOrNull { day -> day.count > 0 }
            }
            .onFailure { error = it.message ?: "Không thể tải lịch." }
    }
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Lịch chi tiêu") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Quay lại") } },
            )
        },
    ) { padding ->
        when {
            history != null -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(
                    start = 16.dp,
                    end = 16.dp,
                    top = padding.calculateTopPadding() + 8.dp,
                    bottom = 24.dp,
                ),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                selected?.let { day ->
                    item {
                        ElevatedCard {
                            Row(Modifier.fillMaxWidth().padding(18.dp)) {
                                Column {
                                    Text(day.date, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("${day.count} khoản", fontWeight = FontWeight.SemiBold)
                                }
                                Spacer(Modifier.weight(1f))
                                Text(formatMoney(day.totalMinor), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
                items(requireNotNull(history).months, key = ExpenseCalendar::month) { month ->
                    MonthCard(month, selected?.date) { selected = it }
                }
            }
            error != null -> LoadState(requireNotNull(error), { retry++ }, Modifier.fillMaxSize().padding(padding).padding(24.dp))
            else -> Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        }
    }
}

@Composable
private fun MonthCard(month: ExpenseCalendar, selectedDate: String?, onSelect: (ExpenseCalendarDay) -> Unit) {
    val yearMonth = runCatching { YearMonth.parse(month.month) }.getOrNull() ?: return
    val entries = month.days.associateBy { LocalDate.parse(it.date).dayOfMonth }
    val leading = yearMonth.atDay(1).dayOfWeek.value - DayOfWeek.MONDAY.value
    val cells = (List(leading) { null } + (1..yearMonth.lengthOfMonth()).map { it }).chunked(7)
    ElevatedCard {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth()) {
                Text("Tháng ${yearMonth.monthValue}/${yearMonth.year}", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.weight(1f))
                Text(formatMoney(month.totalMinor, month.currency))
            }
            Row(Modifier.fillMaxWidth()) {
                listOf("T2", "T3", "T4", "T5", "T6", "T7", "CN").forEach {
                    Text(it, Modifier.weight(1f), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            cells.forEach { week ->
                Row(Modifier.fillMaxWidth()) {
                    (week + List(7 - week.size) { null }).forEach { day ->
                        val entry = day?.let(entries::get)
                        Column(
                            modifier = Modifier.weight(1f).aspectRatio(1f).clip(RoundedCornerShape(12.dp))
                                .background(if (entry?.date == selectedDate) MaterialTheme.colorScheme.primaryContainer else Color.Transparent)
                                .clickable(enabled = entry != null) { entry?.let(onSelect) },
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center,
                        ) {
                            if (day != null) Text(day.toString())
                            Box(Modifier.size(7.dp).clip(CircleShape).background(heatColor(entry?.count ?: 0)))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun heatColor(count: Int): Color = when (count) {
    0 -> MaterialTheme.colorScheme.outline
    1 -> MaterialTheme.colorScheme.primaryContainer
    2 -> Color(0xFFF4B89C)
    3 -> Color(0xFFFF8A4C)
    else -> Color(0xFFE6503E)
}
