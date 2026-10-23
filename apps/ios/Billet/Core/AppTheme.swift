import SwiftUI

enum AppTheme {
    static let accent = Color(light: 0x8A4A2E, dark: 0xF4B89C)
    static let canvas = Color(light: 0xF5F0E8, dark: 0x171513)
    static let card = Color(light: 0xFFFDF9, dark: 0x25211E)
    static let secondaryText = Color(light: 0x6F665D, dark: 0xB8AEA5)
    static let peach = Color(light: 0xF4B89C, dark: 0xC97858)
    static let peachSoft = Color(light: 0xF8D9C8, dark: 0x54382D)
    static let sage = Color(light: 0xCFE0C8, dark: 0x31452F)
    static let lavender = Color(light: 0xDAD3EE, dark: 0x3E3850)
    static let butter = Color(light: 0xF3E6B8, dark: 0x51482D)
    static let line = Color(light: 0xE6DFD4, dark: 0x3D3833)

    static func cardStyle<S: Shape>(_ shape: S) -> some View {
        shape
            .fill(card)
            .shadow(color: .black.opacity(0.07), radius: 18, y: 6)
    }
}
extension Color {
    init(light: UInt32, dark: UInt32) {
        self.init(uiColor: UIColor { traits in
            UIColor(rgb: traits.userInterfaceStyle == .dark ? dark : light)
        })
    }
}
private extension UIColor {
    convenience init(rgb: UInt32) {
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: 1
        )
    }
}
