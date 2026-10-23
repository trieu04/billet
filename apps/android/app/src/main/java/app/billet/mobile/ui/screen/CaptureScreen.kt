package app.billet.mobile.ui.screen

import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import app.billet.mobile.core.model.Category
import app.billet.mobile.core.network.BilletRepository
import java.io.File
import java.time.Instant
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CaptureScreen(repository: BilletRepository, onClose: () -> Unit, onSaved: () -> Unit) {
    val context = LocalContext.current
    var reviewing by remember { mutableStateOf(false) }
    var imageBytes by remember { mutableStateOf<ByteArray?>(null) }
    var capturedAt by remember { mutableStateOf(Instant.now()) }
    var pendingUri by remember { mutableStateOf<Uri?>(null) }
    var showDiscard by remember { mutableStateOf(false) }
    var saving by remember { mutableStateOf(false) }

    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { success ->
        if (success) {
            imageBytes = pendingUri?.let { context.contentResolver.openInputStream(it)?.use { stream -> stream.readBytes() } }
            capturedAt = Instant.now()
            reviewing = imageBytes != null
        }
    }
    fun launchCamera() {
        val directory = File(context.cacheDir, "captures").apply { mkdirs() }
        val file = File.createTempFile("billet-", ".jpg", directory)
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
        pendingUri = uri
        camera.launch(uri)
    }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri != null) {
            imageBytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            capturedAt = Instant.now()
            reviewing = imageBytes != null
        }
    }
    fun requestClose() {
        if (reviewing && !saving) showDiscard = true else if (!saving) onClose()
    }
    BackHandler { requestClose() }

    if (reviewing) {
        CaptureReview(
            repository = repository,
            imageBytes = imageBytes,
            capturedAt = capturedAt,
            saving = saving,
            onSavingChange = { saving = it },
            onCancel = ::requestClose,
            onRetake = ::launchCamera,
            onSaved = onSaved,
        )
    } else {
        Scaffold(
            containerColor = Color.Black,
            topBar = {
                TopAppBar(
                    title = {},
                    navigationIcon = { IconButton(onClick = onClose) { Icon(Icons.Outlined.Close, "Đóng", tint = Color.White) } },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color.Black),
                )
            },
        ) { padding ->
            Column(
                Modifier.fillMaxSize().padding(padding).padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Spacer(Modifier.weight(1f))
                Icon(Icons.Outlined.CameraAlt, null, Modifier.size(76.dp), tint = Color(0xFFF4B89C))
                Text("Thêm chi tiêu", style = MaterialTheme.typography.headlineLarge, fontWeight = FontWeight.Bold, color = Color.White)
                Text("Chụp hóa đơn hoặc khoảnh khắc chi tiêu", color = Color.White.copy(alpha = .72f))
                Spacer(Modifier.weight(1f))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                    CaptureAction("Thư viện", Icons.Outlined.PhotoLibrary) {
                        picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                    }
                    CaptureAction("Chụp ảnh", Icons.Outlined.CameraAlt, ::launchCamera)
                    CaptureAction("Nhập tay", Icons.Outlined.Edit) {
                        imageBytes = null
                        capturedAt = Instant.now()
                        reviewing = true
                    }
                }
            }
        }
    }

    if (showDiscard) {
        AlertDialog(
            onDismissRequest = { showDiscard = false },
            title = { Text("Bỏ khoản chi này?") },
            text = { Text("Ảnh và nội dung chưa lưu sẽ bị bỏ.") },
            confirmButton = { TextButton(onClick = onClose) { Text("Bỏ khoản chi") } },
            dismissButton = { TextButton(onClick = { showDiscard = false }) { Text("Tiếp tục sửa") } },
        )
    }
}

@Composable
private fun CaptureAction(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        IconButton(
            onClick = onClick,
            modifier = Modifier.size(64.dp).clip(CircleShape).background(Color.White.copy(alpha = .14f)).semantics { role = Role.Button },
        ) { Icon(icon, label, tint = Color.White) }
        Text(label, color = Color.White)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CaptureReview(
    repository: BilletRepository,
    imageBytes: ByteArray?,
    capturedAt: Instant,
    saving: Boolean,
    onSavingChange: (Boolean) -> Unit,
    onCancel: () -> Unit,
    onRetake: () -> Unit,
    onSaved: () -> Unit,
) {
    var amount by remember { mutableStateOf("") }
    var caption by remember { mutableStateOf("") }
    var categories by remember { mutableStateOf<List<Category>>(emptyList()) }
    var categoryId by remember { mutableStateOf<String?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var stage by remember { mutableStateOf("Đang lưu…") }
    val scope = rememberCoroutineScope()
    val haptics = LocalHapticFeedback.current
    LaunchedEffect(Unit) {
        runCatching { repository.categories() }
            .onSuccess { categories = it; categoryId = it.firstOrNull()?.id }
            .onFailure { error = it.message ?: "Không thể tải danh mục." }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Chỉnh sửa chi tiêu") },
                navigationIcon = { TextButton(onClick = onCancel, enabled = !saving) { Text("Hủy") } },
                actions = { TextButton(onClick = onRetake, enabled = !saving) { Text(if (imageBytes == null) "Chụp ảnh" else "Chụp lại") } },
            )
        },
    ) { padding ->
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).imePadding().padding(padding).padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            imageBytes?.let {
                val bitmap = remember(it) { BitmapFactory.decodeByteArray(it, 0, it.size) }
                bitmap?.let { value ->
                    Image(value.asImageBitmap(), "Ảnh khoản chi", Modifier.fillMaxWidth().height(280.dp).clip(MaterialTheme.shapes.large), contentScale = ContentScale.Crop)
                }
            }
            OutlinedTextField(
                value = amount,
                onValueChange = { value -> amount = value.filter(Char::isDigit).trimStart('0') },
                label = { Text("Số tiền (₫)") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                textStyle = MaterialTheme.typography.headlineLarge.copy(fontWeight = FontWeight.Bold),
                modifier = Modifier.fillMaxWidth(),
            )
            Text("Danh mục", style = MaterialTheme.typography.labelLarge)
            if (categories.isEmpty()) CircularProgressIndicator() else FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                categories.forEach { category ->
                    FilterChip(
                        selected = categoryId == category.id,
                        onClick = { categoryId = category.id },
                        label = { Text(category.name) },
                    )
                }
            }
            OutlinedTextField(
                value = caption,
                onValueChange = { caption = it },
                label = { Text("Hôm nay có gì đáng nhớ?") },
                minLines = 2,
                modifier = Modifier.fillMaxWidth(),
            )
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = {
                    val selectedCategory = categoryId
                    if (amount.isBlank() || selectedCategory == null) {
                        error = "Nhập số tiền lớn hơn 0 và chọn danh mục."
                        return@Button
                    }
                    onSavingChange(true)
                    error = null
                    stage = if (imageBytes == null) "Đang lưu chi tiêu…" else "Đang tải ảnh…"
                    scope.launch {
                        runCatching {
                            repository.createExpense(amount, selectedCategory, caption, capturedAt, imageBytes)
                        }.onSuccess {
                            haptics.performHapticFeedback(androidx.compose.ui.hapticfeedback.HapticFeedbackType.Confirm)
                            onSaved()
                        }.onFailure {
                            error = it.message ?: "Không thể lưu chi tiêu."
                            onSavingChange(false)
                        }
                    }
                },
                enabled = !saving,
                contentPadding = PaddingValues(16.dp),
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (saving) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp) else Text("Lưu vào Journal")
                if (saving) Text(stage, Modifier.padding(start = 8.dp))
            }
            OutlinedButton(onClick = onCancel, enabled = !saving, modifier = Modifier.fillMaxWidth()) { Text("Đóng") }
        }
    }
}
