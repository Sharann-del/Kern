import SwiftUI

struct KernTextField: View {
    let title: String
    @Binding var text: String
    var placeholder: String = ""
    var isSecure: Bool = false
    var keyboard: UIKeyboardType = .default

    @Environment(\.kernTheme) private var theme
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(KernFont.ui(14, weight: .medium))
                .foregroundStyle(theme.text2)
            Group {
                if isSecure {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                        .keyboardType(keyboard)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
            }
            .font(KernFont.ui(14))
            .foregroundStyle(theme.text)
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(theme.bg2)
            .overlay(
                RoundedRectangle(cornerRadius: 0)
                    .stroke(focused ? theme.borderStrong : theme.border, lineWidth: 1)
            )
            .focused($focused)
        }
    }
}
