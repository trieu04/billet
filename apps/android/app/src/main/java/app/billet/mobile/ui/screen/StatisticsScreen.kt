package app.billet.mobile.ui.screen

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.billet.mobile.core.model.SpendingReport
import app.billet.mobile.core.model.formatMoney
import app.billet.mobile.core.network.BilletRepository
import java.time.LocalDate
import java.time.ZoneId
import java.time.temporal.TemporalAdjusters
import kotlinx.coroutines.delay

private enum class StatisticsPeriod(val label: String, val summary: String) {
    Today("Hôm nay", "Đã chi hôm nay"),
    Week("Tuần", "Tuần này"),
    Month("Tháng", "Tháng này"),
    Year("Năm", "Năm nay"),
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StatisticsScreen(repository: BilletRepository, contentPadding: PaddingValues) {
    var period by remember { mutableStateOf(StatisticsPeriod.Today) }
    var report by remember { mutableStateOf<SpendingReport?>(null) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    LaunchedEffect(period, retry) {
        loading = true
        error = null
        val range = periodRange(period)
        runCatching { repository.spending(range.first, range.second, if (period == StatisticsPeriod.Year) "month" else "day") }
            .onSuccess { report = it }
            .onFailure { error = it.message ?: "Không thể tải thống kê."; report = null }
        loading = false
    }

    Scaffold(
        modifier = Modifier.padding(bottom = contentPadding.calculateBottomPadding()),
        topBar = { TopAppBar(title = { Text("Thống kê", fontWeight = FontWeight.Bold) }) },
    ) { padding ->
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            SingleChoiceSegmentedButtonRow(Modifier.fillMaxWidth()) {
                StatisticsPeriod.entries.forEachIndexed { index, value ->
                    SegmentedButton(
                        selected = period == value,
                        onClick = { period = value },
                        shape = SegmentedButtonDefaults.itemShape(index, StatisticsPeriod.entries.size),
                    ) { Text(value.label) }
                }
            }
            Text(period.summary, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Text(
                if (loading) "…" else formatMoney(report?.totalMinor ?: "0", report?.currency ?: "VND"),
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold,
            )
            Text(deltaText(report), color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
            when {
                report != null -> StatisticsContent(requireNotNull(report))
                error != null -> LoadState(requireNotNull(error), { retry++ }, Modifier.fillMaxWidth().padding(vertical = 48.dp))
                else -> CircularProgressIndicator()
            }
        }
    }
}

@Composable
private fun StatisticsContent(report: SpendingReport) {
    ElevatedCard {
        val values = report.series.map { it.totalMinor.toFloatOrNull() ?: 0f }
        val barColor = MaterialTheme.colorScheme.primary
        Canvas(
            Modifier.fillMaxWidth().height(190.dp).padding(20.dp).semantics {
                contentDescription = "Biểu đồ chi tiêu gồm ${values.size} cột"
            },
        ) {
            val max = values.maxOrNull()?.coerceAtLeast(1f) ?: 1f
            val gap = 8.dp.toPx()
            val width = ((size.width - gap * (values.size - 1).coerceAtLeast(0)) / values.size.coerceAtLeast(1)).coerceAtLeast(4.dp.toPx())
            values.forEachIndexed { index, value ->
                val height = size.height * value / max
                drawRoundRect(
                    color = barColor,
                    topLeft = Offset(index * (width + gap), size.height - height),
                    size = Size(width, height),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(6.dp.toPx()),
                )
            }
        }
    }
    ElevatedCard {
        Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("Theo danh mục", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            report.categories.take(5).forEach { category ->
                val share = ((category.sharePercent ?: 0.0) / 100.0).toFloat().coerceIn(0f, 1f)
                Column {
                    Row(Modifier.fillMaxWidth()) {
                        Text(category.name)
                        Spacer(Modifier.weight(1f))
                        Text("${(category.sharePercent ?: 0.0).toInt()}%")
                    }
                    LinearProgressIndicator(progress = { share }, modifier = Modifier.fillMaxWidth().padding(top = 6.dp))
                }
            }
        }
    }
    Column(
        Modifier.fillMaxWidth().padding(18.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Text("INSIGHT", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
        val insight = report.insights.firstOrNull()
        Text(
            if (insight == null) "Chưa đủ dữ liệu để tạo insight cho kỳ này."
            else "Ngày chi nhiều nhất là ${insight.date}, với ${formatMoney(insight.amountMinor, report.currency)}.",
        )
        if (report.count > 0) {
            Text("Trung bình mỗi khoản là ${formatMoney(((report.totalMinor.toLongOrNull() ?: 0L) / report.count).toString(), report.currency)}.")
        }
    }
}

private fun deltaText(report: SpendingReport?): String {
    val value = report?.comparison?.changePercent ?: return "— so với kỳ trước"
    return "${if (value <= 0) "↓" else "↑"} ${kotlin.math.abs(value).toInt()}% so với kỳ trước"
}

private fun periodRange(period: StatisticsPeriod): Pair<java.time.Instant, java.time.Instant> {
    val zone = ZoneId.systemDefault()
    val today = LocalDate.now(zone)
    val from = when (period) {
        StatisticsPeriod.Today -> today
        StatisticsPeriod.Week -> today.minusDays(6)
        StatisticsPeriod.Month -> today.withDayOfMonth(1)
        StatisticsPeriod.Year -> today.with(TemporalAdjusters.firstDayOfYear())
    }
    return from.atStartOfDay(zone).toInstant() to today.plusDays(1).atStartOfDay(zone).minusNanos(1).toInstant()
}
