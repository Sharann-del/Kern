import EventKit
import SwiftUI
import UIKit

struct SettingsView: View {
    @Bindable var app: AppModel
    @Environment(\.kernTheme) private var theme
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var scenePhase
    @State private var mcpResult: String?
    @State private var mcpError: String?
    @State private var testing = false
    @State private var tokenVisible = false
    @State private var accessToken: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Text("Settings")
                    .font(KernFont.ui(22, weight: .semibold))
                    .foregroundStyle(theme.text)
                    .padding(.top, 16)

                sectionTitle("Appearance")
                Toggle(isOn: Binding(
                    get: { app.isLightTheme },
                    set: { v in Task { try? await app.updateTheme(v) } }
                )) {
                    Text("Light theme")
                        .font(KernFont.body(15))
                        .foregroundStyle(theme.text)
                }
                .tint(theme.accent)
                .padding(16)
                .background(theme.bg1)
                .overlay(Rectangle().stroke(theme.border, lineWidth: 1))

                sectionTitle("Calendar Live Activities")
                Text("Shows Live Activities on the Lock Screen and Dynamic Island for Apple Calendar events that are happening now. Open Kern (or return to the app) after a meeting starts so it can start the activity. Up to eight overlapping events at once.")
                    .font(KernFont.body(14))
                    .foregroundStyle(theme.text2)

                Toggle(isOn: Binding(
                    get: { KernCalendarLiveActivityPreferences.isLiveActivitiesEnabled },
                    set: { v in
                        KernCalendarLiveActivityPreferences.isLiveActivitiesEnabled = v
                        Task {
                            if v {
                                _ = await CalendarLiveActivityManager.shared.requestCalendarAccess()
                                await CalendarLiveActivityManager.shared.syncWithCalendar()
                            } else {
                                await CalendarLiveActivityManager.shared.disableAndEndAll()
                            }
                        }
                    }
                )) {
                    Text("Show Live Activities for current events")
                        .font(KernFont.body(15))
                        .foregroundStyle(theme.text)
                }
                .tint(theme.accent)
                .padding(16)
                .background(theme.bg1)
                .overlay(Rectangle().stroke(theme.border, lineWidth: 1))

                Text(calendarAuthorizationLabel)
                    .font(KernFont.body(13))
                    .foregroundStyle(theme.text2)

                HStack(spacing: 12) {
                    KernButton(title: "Allow calendar access", variant: .secondary) {
                        Task {
                            _ = await CalendarLiveActivityManager.shared.requestCalendarAccess()
                            await CalendarLiveActivityManager.shared.syncWithCalendar()
                        }
                    }
                    KernButton(title: "Open Settings", variant: .ghost) {
                        if let u = URL(string: UIApplication.openSettingsURLString) {
                            openURL(u)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                sectionTitle("Claude MCP integration")
                Text("Test the kern-mcp Edge function with your session (same flow as the web app).")
                    .font(KernFont.body(14))
                    .foregroundStyle(theme.text2)

                KernButton(title: testing ? "Testing…" : "Test MCP connection", variant: .secondary, loading: testing) {
                    Task { await testMcp() }
                }
                .frame(maxWidth: 280)

                if let mcpError {
                    Text(mcpError)
                        .font(KernFont.body(13))
                        .foregroundStyle(theme.danger)
                }
                if let mcpResult {
                    ScrollView(.horizontal, showsIndicators: false) {
                        Text(mcpResult)
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundStyle(theme.text2)
                    }
                    .kernNoOverscroll([.horizontal])
                    .padding(12)
                    .frame(maxHeight: 200)
                    .background(theme.bg1)
                    .overlay(Rectangle().stroke(theme.border, lineWidth: 1))
                }

                sectionTitle("Session")
                KernButton(title: tokenVisible ? "Hide access token" : "Reveal access token", variant: .ghost) {
                    Task {
                        if !tokenVisible {
                            if let s = try? await app.supabase.auth.session {
                                accessToken = s.accessToken
                            }
                        }
                        tokenVisible.toggle()
                    }
                }
                if tokenVisible, let t = accessToken {
                    Text(t)
                        .font(.system(size: 10, design: .monospaced))
                        .foregroundStyle(theme.text3)
                        .textSelection(.enabled)
                }

                KernButton(title: "Sign out", variant: .danger) {
                    Task { try? await app.signOut() }
                }
                .frame(maxWidth: 200)
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 40)
        }
        .kernNoOverscroll([.vertical])
        .background(theme.bg0)
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                calendarAuthRefreshTrigger &+= 1
            }
        }
    }

    @State private var calendarAuthRefreshTrigger = 0

    private var calendarAuthorizationLabel: String {
        _ = calendarAuthRefreshTrigger
        switch EKEventStore.authorizationStatus(for: .event) {
        case .notDetermined:
            return "Calendar access: not requested yet."
        case .restricted:
            return "Calendar access: restricted on this device."
        case .denied:
            return "Calendar access: denied. Use Open Settings to allow full access."
        case .fullAccess:
            return "Calendar access: full — in‑progress events can appear as Live Activities when enabled above."
        case .writeOnly:
            return "Calendar access: write only. Kern needs full access to read your events — use Open Settings."
        @unknown default:
            return "Calendar access: unknown status."
        }
    }

    private func sectionTitle(_ s: String) -> some View {
        Text(s)
            .font(KernFont.label(13))
            .foregroundStyle(theme.text3)
    }

    private func testMcp() async {
        mcpError = nil
        mcpResult = nil
        testing = true
        defer { testing = false }
        do {
            try await app.supabase.auth.refreshSession()
            guard let token = try? await app.supabase.auth.session.accessToken else {
                mcpError = "No access token"
                return
            }
            let json = try await app.data.invokeKernMcpToolsList(accessToken: token)
            mcpResult = json
        } catch {
            mcpError = error.localizedDescription
        }
    }
}
