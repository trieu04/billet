package app.billet.mobile.ui.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ExposedDropdownMenuBox
import androidx.compose.material3.ExposedDropdownMenuAnchorType
import androidx.compose.material3.ExposedDropdownMenuDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import app.billet.mobile.core.model.Category
import app.billet.mobile.core.model.Expense
import app.billet.mobile.core.model.formatExpenseDateTime
import app.billet.mobile.core.model.formatMoney
import app.billet.mobile.core.network.BilletRepository
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExpenseDetailScreen(
    expenseId: String,
    repository: BilletRepository,
    onBack: () -> Unit,
    onDeleted: () -> Unit,
) {
    var expense by remember { mutableStateOf<Expense?>(null) }
    var categories by remember { mutableStateOf<List<Category>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var retry by remember { mutableIntStateOf(0) }
    var menuOpen by remember { mutableStateOf(false) }
    var editing by remember { mutableStateOf(false) }
    var confirmingDelete by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    LaunchedEffect(expenseId, retry) {
        error = null
        runCatching {
            coroutineScope {
                val expenseCall = async { repository.expense(expenseId) }
                val categoryCall = async { repository.categories() }
                expenseCall.await() to categoryCall.await()
            }
        }.onSuccess { (loadedExpense, loadedCategories) ->
            expense = loadedExpense
            categories = loadedCategories
        }.onFailure { error = it.message ?: "Không thể mở khoản chi." }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Chi tiết") },
                navigationIcon = { IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Quay lại") } },
                actions = {
                    if (expense != null) {
                        IconButton(onClick = { menuOpen = true }) { Text("•••") }
                        DropdownMenu(expanded = menuOpen, onDismissRequest = { menuOpen = false }) {
                            DropdownMenuItem(
                                text = { Text("Chỉnh sửa") },
                                leadingIcon = { Icon(Icons.Outlined.Edit, null) },
                                onClick = { menuOpen = false; editing = true },
                            )
                            DropdownMenuItem(
                                text = { Text("Xóa khoản chi") },
                                leadingIcon = { Icon(Icons.Outlined.Delete, null) },
                                onClick = { menuOpen = false; confirmingDelete = true },
                            )
                        }
                    }
                },
            )
        },
    ) { padding ->
        val item = expense
        when {
            item != null -> Column(
                Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(padding).padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                AuthenticatedImage(item.mediaAssetId, repository, Modifier.fillMaxWidth().height(390.dp))
                ElevatedCard {
                    Column(Modifier.fillMaxWidth().padding(18.dp)) {
                        Text("Số tiền", color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Text(formatMoney(item.amountMinor, item.currency), style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold)
                        Text(formatExpenseDateTime(item.occurredAt), color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
                ElevatedCard {
                    DetailRow("Danh mục", categories.firstOrNull { it.id == item.categoryId }?.name ?: "Khác")
                    DetailRow("Cửa hàng", item.merchant ?: "Chưa thêm")
                    DetailRow("Địa điểm", item.location ?: "Chưa thêm")
                }
                item.caption?.takeIf(String::isNotBlank)?.let { caption ->
                    ElevatedCard { Text(caption, Modifier.fillMaxWidth().padding(18.dp)) }
                }
                error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }
            error != null -> LoadState(requireNotNull(error), { retry++ }, Modifier.fillMaxSize().padding(padding).padding(24.dp))
            else -> Column(
                Modifier.fillMaxSize().padding(padding),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) { CircularProgressIndicator(); Text("Đang mở khoảnh khắc…") }
        }
    }

    if (editing && expense != null) {
        ExpenseEditor(
            expense = requireNotNull(expense),
            categories = categories,
            repository = repository,
            onDismiss = { editing = false },
            onSaved = { expense = it; editing = false },
        )
    }
    if (confirmingDelete) {
        AlertDialog(
            onDismissRequest = { confirmingDelete = false },
            title = { Text("Xóa khoản chi?") },
            text = { Text("Khoản chi này sẽ bị xóa khỏi Journal.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmingDelete = false
                    scope.launch {
                        runCatching { repository.deleteExpense(expenseId) }
                            .onSuccess { onDeleted() }
                            .onFailure { error = it.message ?: "Không thể xóa khoản chi." }
                    }
                }) { Text("Xóa") }
            },
            dismissButton = { TextButton(onClick = { confirmingDelete = false }) { Text("Hủy") } },
        )
    }
}

@Composable
private fun DetailRow(label: String, value: String) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 18.dp)) {
        Text(label)
        Spacer(Modifier.weight(1f))
        Text(value, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 1, overflow = TextOverflow.Ellipsis)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ExpenseEditor(
    expense: Expense,
    categories: List<Category>,
    repository: BilletRepository,
    onDismiss: () -> Unit,
    onSaved: (Expense) -> Unit,
) {
    var categoryId by remember { mutableStateOf(expense.categoryId) }
    var caption by remember { mutableStateOf(expense.caption.orEmpty()) }
    var categoryMenu by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    ModalBottomSheet(onDismissRequest = { if (!saving) onDismiss() }) {
        Column(Modifier.fillMaxWidth().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text("Chỉnh sửa", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
            ExposedDropdownMenuBox(expanded = categoryMenu, onExpandedChange = { categoryMenu = it }) {
                OutlinedTextField(
                    value = categories.firstOrNull { it.id == categoryId }?.name ?: "Khác",
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Danh mục") },
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(categoryMenu) },
                    modifier = Modifier.fillMaxWidth().menuAnchor(ExposedDropdownMenuAnchorType.PrimaryNotEditable),
                )
                ExposedDropdownMenu(expanded = categoryMenu, onDismissRequest = { categoryMenu = false }) {
                    categories.forEach { category ->
                        DropdownMenuItem(
                            text = { Text(category.name) },
                            onClick = { categoryId = category.id; categoryMenu = false },
                        )
                    }
                }
            }
            OutlinedTextField(caption, { caption = it }, label = { Text("Ghi chú") }, minLines = 3, modifier = Modifier.fillMaxWidth())
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = {
                    saving = true
                    scope.launch {
                        runCatching { repository.updateExpense(expense, categoryId, caption) }
                            .onSuccess(onSaved)
                            .onFailure { error = it.message ?: "Không thể lưu thay đổi."; saving = false }
                    }
                },
                enabled = !saving,
                modifier = Modifier.fillMaxWidth(),
            ) { if (saving) CircularProgressIndicator() else Text("Lưu") }
            Spacer(Modifier.height(12.dp))
        }
    }
}
