package app.billet.mobile.ui.screen

import android.graphics.BitmapFactory
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ReceiptLong
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import app.billet.mobile.core.network.BilletRepository

@Composable
fun LoadState(message: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Chưa thể tải dữ liệu", style = MaterialTheme.typography.titleMedium)
        Text(message, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 12.dp))
        Button(onClick = onRetry) { Text("Thử lại") }
    }
}

@Composable
fun AuthenticatedImage(
    mediaId: String?,
    repository: BilletRepository,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
) {
    var bytes by remember(mediaId) { mutableStateOf<ByteArray?>(null) }
    var failed by remember(mediaId) { mutableStateOf(false) }
    LaunchedEffect(mediaId) {
        if (mediaId != null) runCatching { repository.media(mediaId) }
            .onSuccess { bytes = it }
            .onFailure { failed = true }
    }
    Box(modifier.background(MaterialTheme.colorScheme.primaryContainer), contentAlignment = Alignment.Center) {
        val bitmap = bytes?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }
        when {
            bitmap != null -> Image(bitmap.asImageBitmap(), "Ảnh khoản chi", Modifier.fillMaxSize(), contentScale = contentScale)
            mediaId != null && !failed -> CircularProgressIndicator()
            else -> Icon(Icons.AutoMirrored.Outlined.ReceiptLong, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
