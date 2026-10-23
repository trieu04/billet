package app.billet.mobile.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

val Peach = Color(0xFFF4B89C)
val PeachDark = Color(0xFFC97858)
val PeachSoft = Color(0xFFF8D9C8)
val Lavender = Color(0xFFDAD3EE)
val Sage = Color(0xFFCFE0C8)
val Butter = Color(0xFFF3E6B8)

private val LightColors = lightColorScheme(
    primary = Color(0xFF8A4A2E),
    onPrimary = Color.White,
    primaryContainer = PeachSoft,
    onPrimaryContainer = Color(0xFF351007),
    secondary = Color(0xFF6F665D),
    background = Color(0xFFF5F0E8),
    surface = Color(0xFFFFFDF9),
    surfaceVariant = Color(0xFFEFE8DE),
    outline = Color(0xFFE6DFD4),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFFF4B89C),
    onPrimary = Color(0xFF51210E),
    primaryContainer = Color(0xFF54382D),
    onPrimaryContainer = Color(0xFFFFDBCC),
    secondary = Color(0xFFB8AEA5),
    background = Color(0xFF171513),
    surface = Color(0xFF25211E),
    surfaceVariant = Color(0xFF332E2A),
    outline = Color(0xFF3D3833),
)

@Composable
fun BilletTheme(content: @Composable () -> Unit) {
    val dark = isSystemInDarkTheme()
    val colors = if (dark) DarkColors else LightColors
    val view = LocalView.current
    if (!view.isInEditMode) {
        val window = (view.context as Activity).window
        WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !dark
    }
    MaterialTheme(colorScheme = colors, content = content)
}
