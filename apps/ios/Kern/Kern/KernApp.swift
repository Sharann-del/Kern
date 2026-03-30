import SwiftUI

@main
struct KernApp: App {
    @State private var appModel = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView(app: appModel)
                .environment(\.kernTheme, KernThemeColors.palette(isLight: appModel.isLightTheme))
                .onOpenURL { url in
                    Task { await appModel.handleAuthCallback(url: url) }
                }
        }
    }
}

struct RootView: View {
    @Bindable var app: AppModel
    @Environment(\.kernTheme) private var theme
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        Group {
            if !app.isConfigured {
                missingConfigView
            } else if app.authLoading {
                ZStack {
                    theme.bg0.ignoresSafeArea()
                    ProgressView()
                        .tint(theme.accent)
                }
            } else if app.session != nil {
                AppShellView(app: app)
            } else {
                NavigationStack {
                    AuthFlowView(app: app)
                }
            }
        }
        .environment(\.kernTheme, KernThemeColors.palette(isLight: app.session != nil ? app.isLightTheme : false))
        .onAppear {
            Task { await CalendarLiveActivityManager.shared.syncWithCalendar() }
        }
        .onChange(of: scenePhase) { _, phase in
            guard phase == .active else { return }
            Task { await CalendarLiveActivityManager.shared.syncWithCalendar() }
        }
    }

    private var missingConfigView: some View {
        VStack(spacing: 16) {
            Text("Configure Supabase")
                .font(.title2.weight(.semibold))
            Text("Add apps/ios/Kern/Configuration/Secrets.xcconfig (see Secrets.xcconfig.example). For SUPABASE_URL, use https:/$()/your-ref.supabase.co — a literal https:// is cut off in .xcconfig because // starts a comment. Same anon key as VITE_SUPABASE_ANON_KEY. Clean build, then run.")
                .font(.body)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(hex: 0x1A1A18))
        .foregroundStyle(Color(hex: 0xF5F4F0))
    }
}

private extension Color {
    init(hex: UInt32) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: 1
        )
    }
}
