import SwiftUI

struct KernButton: View {
    enum Variant { case primary, secondary, ghost, danger }
    enum Size { case sm, md, lg }

    let title: String
    var variant: Variant = .secondary
    var size: Size = .md
    /// When set, overrides size-based min height (e.g. auth primary `42`).
    var minHeight: CGFloat? = nil
    var loading: Bool = false
    var action: () -> Void

    @Environment(\.kernTheme) private var theme

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if loading {
                    ProgressView()
                        .scaleEffect(0.85)
                        .tint(foreground)
                }
                Text(title)
                    .font(KernFont.label(size == .sm ? 13 : 14))
            }
            .frame(minHeight: minHeight ?? height)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, horizontalPadding)
            .foregroundStyle(foreground)
            .background(background)
            .overlay(
                RoundedRectangle(cornerRadius: 0)
                    .stroke(borderColor, lineWidth: borderWidth)
            )
        }
        .buttonStyle(.plain)
        .disabled(loading)
        .opacity(loading ? 0.85 : 1)
    }

    private var height: CGFloat {
        switch size {
        case .sm: return 28
        case .md: return 32
        case .lg: return 36
        }
    }

    private var horizontalPadding: CGFloat {
        switch size {
        case .sm: return 10
        case .md: return 12
        case .lg: return 14
        }
    }

    private var foreground: Color {
        switch variant {
        case .primary: return theme.onAccent
        case .secondary, .ghost: return theme.text
        case .danger: return .white
        }
    }

    private var background: Color {
        switch variant {
        case .primary: return theme.accent
        case .secondary: return theme.bg2
        case .ghost: return .clear
        case .danger: return theme.danger
        }
    }

    private var borderColor: Color {
        switch variant {
        case .primary: return .clear
        case .secondary: return theme.border
        case .ghost: return .clear
        case .danger: return theme.danger
        }
    }

    private var borderWidth: CGFloat {
        switch variant {
        case .secondary, .danger: return 1
        default: return 0
        }
    }
}
