import SwiftUI
import UIKit

enum KernPalette {
    /// Dark theme (matches `html[data-theme='dark']` in web `index.css`).
    struct Dark {
        static let bg0 = Color(hex: 0x1A1A18)
        static let bg1 = Color(hex: 0x2C2C2A)
        static let bg2 = Color(hex: 0x353431)
        static let borderDefault = Color(hex: 0x3F3D38)
        static let borderStrong = Color(hex: 0x524E45)
        static let textPrimary = Color(hex: 0xF5F4F0)
        static let textSecondary = Color(hex: 0xE8E6E1)
        static let textTertiary = Color(hex: 0x9C9890)
        static let accent = Color(hex: 0xC8A84B)
        static let accentHover = Color(hex: 0xA07E28)
        static let onAccent = Color(hex: 0x1A1A18)
        static let danger = Color(hex: 0xC65A5A)
        static let success = Color(hex: 0x5A9E72)
        static let topbarBg = Color(hex: 0x222220)
        static let topbarBorder = Color(hex: 0x2A2A28)
        static let menuIcon = Color(hex: 0x6B6B64)
        static let menuIconHoverBg = Color(hex: 0x353533)
    }

    struct Light {
        static let bg0 = Color(hex: 0xF5F4F0)
        static let bg1 = Color(hex: 0xEEECE7)
        static let bg2 = Color(hex: 0xFFFFFF)
        static let borderDefault = Color(hex: 0xDDD8CF)
        static let borderStrong = Color(hex: 0xE8D28A)
        static let textPrimary = Color(hex: 0x2C2C2A)
        static let textSecondary = Color(hex: 0x5C5A55)
        static let textTertiary = Color(hex: 0x8A8780)
        static let accent = Color(hex: 0xC8A84B)
        static let accentHover = Color(hex: 0xA07E28)
        static let onAccent = Color(hex: 0x1A1A18)
        static let danger = Color(hex: 0xC65A5A)
        static let success = Color(hex: 0x5A9E72)
        static let topbarBg = Color(hex: 0xEEECE7)
        static let topbarBorder = Color(hex: 0xDDD8CF)
        static let menuIcon = Color(hex: 0x6B6B64)
        static let menuIconHoverBg = Color(hex: 0xE8E6E1)
    }
}

struct KernThemeColors {
    let bg0: Color
    let bg1: Color
    let bg2: Color
    let border: Color
    let borderStrong: Color
    let text: Color
    let text2: Color
    let text3: Color
    let accent: Color
    let accentHover: Color
    let onAccent: Color
    let danger: Color
    let success: Color
    let topbarBg: Color
    let topbarBorder: Color
    let menuIcon: Color
    let menuIconHoverBg: Color

    static func palette(isLight: Bool) -> KernThemeColors {
        if isLight {
            return KernThemeColors(
                bg0: KernPalette.Light.bg0,
                bg1: KernPalette.Light.bg1,
                bg2: KernPalette.Light.bg2,
                border: KernPalette.Light.borderDefault,
                borderStrong: KernPalette.Light.borderStrong,
                text: KernPalette.Light.textPrimary,
                text2: KernPalette.Light.textSecondary,
                text3: KernPalette.Light.textTertiary,
                accent: KernPalette.Light.accent,
                accentHover: KernPalette.Light.accentHover,
                onAccent: KernPalette.Light.onAccent,
                danger: KernPalette.Light.danger,
                success: KernPalette.Light.success,
                topbarBg: KernPalette.Light.topbarBg,
                topbarBorder: KernPalette.Light.topbarBorder,
                menuIcon: KernPalette.Light.menuIcon,
                menuIconHoverBg: KernPalette.Light.menuIconHoverBg
            )
        }
        return KernThemeColors(
            bg0: KernPalette.Dark.bg0,
            bg1: KernPalette.Dark.bg1,
            bg2: KernPalette.Dark.bg2,
            border: KernPalette.Dark.borderDefault,
            borderStrong: KernPalette.Dark.borderStrong,
            text: KernPalette.Dark.textPrimary,
            text2: KernPalette.Dark.textSecondary,
            text3: KernPalette.Dark.textTertiary,
            accent: KernPalette.Dark.accent,
            accentHover: KernPalette.Dark.accentHover,
            onAccent: KernPalette.Dark.onAccent,
            danger: KernPalette.Dark.danger,
            success: KernPalette.Dark.success,
            topbarBg: KernPalette.Dark.topbarBg,
            topbarBorder: KernPalette.Dark.topbarBorder,
            menuIcon: KernPalette.Dark.menuIcon,
            menuIconHoverBg: KernPalette.Dark.menuIconHoverBg
        )
    }
}

private extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        let r = Double((hex >> 16) & 0xFF) / 255
        let g = Double((hex >> 8) & 0xFF) / 255
        let b = Double(hex & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: alpha)
    }
}

private struct KernThemeKey: EnvironmentKey {
    static let defaultValue = KernThemeColors.palette(isLight: false)
}

extension EnvironmentValues {
    var kernTheme: KernThemeColors {
        get { self[KernThemeKey.self] }
        set { self[KernThemeKey.self] = newValue }
    }
}

extension View {
    func kernTheme(_ colors: KernThemeColors) -> some View {
        environment(\.kernTheme, colors)
    }

    /// Reduces rubber-band overscroll (`basedOnSize`). Table view also disables `UIScrollView.bounces` for a tighter stop.
    func kernNoOverscroll(_ axes: Axis.Set = [.vertical, .horizontal]) -> some View {
        scrollBounceBehavior(.basedOnSize, axes: axes)
    }

    /// Square sheet presentation (matches sharp Kern chrome; reduces default iOS sheet rounding).
    func kernSharpSheetChrome(_ theme: KernThemeColors) -> some View {
        presentationCornerRadius(0)
            .presentationDragIndicator(.hidden)
            .presentationBackground(theme.bg0)
    }
}

enum KernFont {
    /// Display wordmark — bundled Canela (trial) when registered, else Georgia (web `kern-display` fallback).
    private static let canelaRegularPS = "CanelaTrial-Regular"

    static func display(_ size: CGFloat) -> Font {
        if UIFont(name: canelaRegularPS, size: size) != nil {
            return Font.custom(canelaRegularPS, size: size)
        }
        return Font.custom("Georgia", size: size)
    }

    /// PostScript names from bundled `DMSansVariable.ttf` (DM Sans, web body font).
    private static func dmSansPostScript(weight: Font.Weight) -> String {
        switch weight {
        case .ultraLight, .thin: return "DMSans-9ptRegular_Thin"
        case .light: return "DMSans-9ptRegular_Light"
        case .medium: return "DMSans-9ptRegular_Medium"
        case .semibold: return "DMSans-9ptRegular_SemiBold"
        case .bold, .heavy, .black: return "DMSans-9ptRegular_Bold"
        default: return "DMSans-9ptRegular_Regular"
        }
    }

    static func ui(_ size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let ps = dmSansPostScript(weight: weight)
        if UIFont(name: ps, size: size) != nil {
            return Font.custom(ps, size: size)
        }
        return .system(size: size, weight: weight, design: .default)
    }

    static func body(_ size: CGFloat = 15) -> Font {
        ui(size, weight: .regular)
    }

    static func label(_ size: CGFloat = 13) -> Font {
        ui(size, weight: .medium)
    }

    static func authHeading(_ size: CGFloat = 20) -> Font {
        ui(size, weight: .semibold)
    }

    static func authCaption(_ size: CGFloat = 14) -> Font {
        ui(size, weight: .regular)
    }
}
