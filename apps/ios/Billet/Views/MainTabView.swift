import SwiftUI

struct MainTabView: View {
    private enum Tab: Hashable { case journal, statistics, profile }

    @State private var selection: Tab

    init() {
        let initialTab = switch ProcessInfo.processInfo.environment["BILLET_UI_TEST_TAB"] {
        case "statistics": Tab.statistics
        case "profile": Tab.profile
        default: Tab.journal
        }
        _selection = State(initialValue: initialTab)
    }

    var body: some View {
        TabView(selection: $selection) {
            JournalView()
                .tabItem {
                    Label("Journal", systemImage: "book.pages")
                        .accessibilityIdentifier("tab.journal")
                }
                .tag(Tab.journal)
            StatisticsView()
                .tabItem {
                    Label("Thống kê", systemImage: "chart.bar.xaxis")
                        .accessibilityIdentifier("tab.statistics")
                }
                .tag(Tab.statistics)
            ProfileView()
                .tabItem {
                    Label("Hồ sơ", systemImage: "person.crop.circle")
                        .accessibilityIdentifier("tab.profile")
                }
                .tag(Tab.profile)
        }
    }
}
