package app.billet.mobile.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Book
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import app.billet.mobile.core.session.SessionState
import app.billet.mobile.core.session.SessionViewModel
import app.billet.mobile.ui.screen.CalendarScreen
import app.billet.mobile.ui.screen.CaptureScreen
import app.billet.mobile.ui.screen.ExpenseDetailScreen
import app.billet.mobile.ui.screen.JournalScreen
import app.billet.mobile.ui.screen.LoginScreen
import app.billet.mobile.ui.screen.ProfileScreen
import app.billet.mobile.ui.screen.StatisticsScreen

private data class Tab(val route: String, val label: String, val icon: androidx.compose.ui.graphics.vector.ImageVector)
private val tabs = listOf(
    Tab("journal", "Journal", Icons.Outlined.Book),
    Tab("statistics", "Thống kê", Icons.Outlined.BarChart),
    Tab("profile", "Hồ sơ", Icons.Outlined.Person),
)

@Composable
fun BilletApp(session: SessionViewModel = viewModel()) {
    when (val state = session.state.collectAsStateWithLifecycle().value) {
        SessionState.Restoring -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        SessionState.SignedOut -> LoginScreen(onLogin = session::login)
        is SessionState.SignedIn -> SignedInApp(session = session, fallbackName = state.user?.displayName)
    }
}

@Composable
private fun SignedInApp(session: SessionViewModel, fallbackName: String?) {
    val navController = rememberNavController()
    val backStack by navController.currentBackStackEntryAsState()
    val destination = backStack?.destination
    val showTabs = tabs.any { tab -> destination?.hierarchy?.any { it.route == tab.route } == true }
    var journalRevision by remember { mutableIntStateOf(0) }

    Scaffold(
        bottomBar = {
            if (showTabs) {
                NavigationBar {
                    tabs.forEach { tab ->
                        val selected = destination?.hierarchy?.any { it.route == tab.route } == true
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                navController.navigate(tab.route) {
                                    popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                    launchSingleTop = true
                                    restoreState = true
                                }
                            },
                            icon = { Icon(tab.icon, contentDescription = null) },
                            label = { Text(tab.label) },
                        )
                    }
                }
            }
        },
    ) { padding ->
        NavHost(navController = navController, startDestination = "journal") {
            composable("journal") {
                JournalScreen(
                    repository = session.repository,
                    contentPadding = padding,
                    refreshKey = journalRevision,
                    onCalendar = { navController.navigate("calendar") },
                    onCapture = { navController.navigate("capture") },
                    onExpense = { navController.navigate("expense/$it") },
                )
            }
            composable("statistics") {
                StatisticsScreen(repository = session.repository, contentPadding = padding)
            }
            composable("profile") {
                ProfileScreen(
                    repository = session.repository,
                    fallbackName = fallbackName,
                    contentPadding = padding,
                    onLogout = session::logout,
                )
            }
            composable("calendar") {
                CalendarScreen(repository = session.repository, onBack = navController::popBackStack)
            }
            composable("capture") {
                CaptureScreen(
                    repository = session.repository,
                    onClose = navController::popBackStack,
                    onSaved = {
                        journalRevision += 1
                        navController.popBackStack("journal", inclusive = false)
                    },
                )
            }
            composable("expense/{id}") { entry ->
                ExpenseDetailScreen(
                    expenseId = requireNotNull(entry.arguments?.getString("id")),
                    repository = session.repository,
                    onBack = navController::popBackStack,
                    onDeleted = {
                        journalRevision += 1
                        navController.popBackStack()
                    },
                )
            }
        }
    }
}
