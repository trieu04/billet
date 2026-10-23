import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            JournalView()
                .tabItem { Label("Journal", systemImage: "book.pages") }
            StatisticsView()
                .tabItem { Label("Thống kê", systemImage: "chart.bar.xaxis") }
            ProfileView()
                .tabItem { Label("Hồ sơ", systemImage: "person.crop.circle") }
        }
    }
}
