package app.billet.mobile.ui.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import app.billet.mobile.core.model.Budget
import app.billet.mobile.core.model.Profile
import app.billet.mobile.core.model.formatMoney
import app.billet.mobile.core.network.BilletRepository
import java.time.LocalDate

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    repository: BilletRepository,
    fallbackName: String?,
    contentPadding: PaddingValues,
    onLogout: () -> Unit,
) {
    var profile by remember { mutableStateOf<Profile?>(null) }
    var budget by remember { mutableStateOf<Budget?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var biometricLock by remember { mutableStateOf(false) }
    var confirmingLogout by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        runCatching {
            repository.profile().also { budget = repository.budget(it.settings.defaultCurrency) }
        }.onSuccess { profile = it }
            .onFailure { error = it.message ?: "Không thể tải hồ sơ." }
    }

    Scaffold(
        modifier = Modifier.padding(bottom = contentPadding.calculateBottomPadding()),
        topBar = { TopAppBar(title = { Text("Hồ sơ", fontWeight = FontWeight.Bold) }) },
    ) { padding ->
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            ElevatedCard {
                Row(Modifier.fillMaxWidth().padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
                    Row(
                        Modifier.size(62.dp).clip(CircleShape),
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            (profile?.displayName ?: fallbackName ?: "…").take(1).uppercase(),
                            style = MaterialTheme.typography.titleLarge,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    Column(Modifier.padding(start = 16.dp)) {
                        Text(profile?.displayName ?: fallbackName ?: "Đang tải…", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text("Đã lưu ${profile?.expenseCount ?: 0} khoảnh khắc", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            ElevatedCard {
                Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("Ngân sách tháng ${LocalDate.now().monthValue}", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text(
                        "${formatMoney(budget?.spentMinor ?: "0", budget?.currency ?: "VND")} / " +
                            (budget?.limitMinor?.let { formatMoney(it, budget?.currency ?: "VND") } ?: "Chưa đặt"),
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                    )
                    LinearProgressIndicator(progress = { budgetProgress(budget) }, modifier = Modifier.fillMaxWidth())
                    Text(
                        budget?.remainingMinor?.let { "Còn ${formatMoney(it, budget?.currency ?: "VND")} trong tháng này" }
                            ?: "Bạn chưa đặt ngân sách tháng này",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            ElevatedCard {
                ProfileRow("Tiền tệ", profile?.settings?.defaultCurrency ?: "…")
                ProfileRow("Nhắc ghi chép", profile?.settings?.let { if (it.reminderEnabled) it.reminderTime ?: "Bật" else "Tắt" } ?: "…")
                ProfileRow("Giao diện", appearanceLabel(profile?.settings?.appearance))
            }
            ElevatedCard {
                Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Khóa bằng sinh trắc học")
                    Spacer(Modifier.weight(1f))
                    Switch(checked = biometricLock, onCheckedChange = { biometricLock = it })
                }
                TextButton(onClick = { confirmingLogout = true }, modifier = Modifier.fillMaxWidth()) { Text("Đăng xuất") }
            }
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            if (profile == null && error == null) CircularProgressIndicator()
        }
    }
    if (confirmingLogout) {
        AlertDialog(
            onDismissRequest = { confirmingLogout = false },
            title = { Text("Đăng xuất khỏi Billet?") },
            confirmButton = { TextButton(onClick = onLogout) { Text("Đăng xuất") } },
            dismissButton = { TextButton(onClick = { confirmingLogout = false }) { Text("Hủy") } },
        )
    }
}

@Composable
private fun ProfileRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 18.dp)) {
        Text(label)
        Spacer(Modifier.weight(1f))
        Text(value, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

private fun appearanceLabel(value: String?): String = when (value) {
    "light" -> "Sáng"
    "dark" -> "Tối"
    else -> "Tự động"
}

private fun budgetProgress(budget: Budget?): Float {
    val limit = budget?.limitMinor?.toFloatOrNull()?.takeIf { it > 0 } ?: return 0f
    return ((budget.spentMinor.toFloatOrNull() ?: 0f) / limit).coerceIn(0f, 1f)
}
