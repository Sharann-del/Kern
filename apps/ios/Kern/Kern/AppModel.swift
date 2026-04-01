import AuthenticationServices
import Foundation
import Observation
import Supabase
import SwiftUI
import UIKit

@Observable
@MainActor
final class AppModel {
    var authLoading = true
    var session: Session?
    var profile: KernProfile?
    var collections: [KernCollection] = []
    var collectionsLoading = false
    var sidebarCollapsed = true
    var activeCollectionSlug: String?
    var commandSearchPresented = false

    private(set) var supabase: SupabaseClient!
    private(set) var data: DataService!

    init() {
        let urlStr = Self.plistString("SUPABASE_URL")
        let key = Self.plistString("SUPABASE_ANON_KEY")
        let url = URL(string: urlStr) ?? URL(string: "https://example.supabase.co")!
        let redirect = URL(string: "kern://auth-callback")!
        supabase = SupabaseClient(
            supabaseURL: url,
            supabaseKey: key,
            options: SupabaseClientOptions(
                auth: SupabaseClientOptions.AuthOptions(
                    storage: UserDefaultsAuthStorage(suiteName: "group.sharann.kern"),
                    redirectToURL: redirect,
                    emitLocalSessionAsInitialSession: true
                )
            )
        )
        data = DataService(client: supabase)
        sidebarCollapsed = true
        Task { await listenAuth() }
    }

    var isConfigured: Bool {
        let u = Self.plistString("SUPABASE_URL")
        let k = Self.plistString("SUPABASE_ANON_KEY")
        return !u.isEmpty && !k.isEmpty && URL(string: u) != nil
    }

    /// Info.plist values can accidentally include wrapping `"` from xcconfig; strip so JWT / URLs stay valid.
    private static func plistString(_ key: String) -> String {
        var s = (Bundle.main.object(forInfoDictionaryKey: key) as? String ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        if s.count >= 2, s.first == "\"", s.last == "\"" {
            s.removeFirst()
            s.removeLast()
            s = s.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return s
    }

    var isLightTheme: Bool {
        profile?.preferences.theme == "light"
    }

    func listenAuth() async {
        for await (event, sess) in supabase.auth.authStateChanges {
            if Task.isCancelled { break }
            switch event {
            case .initialSession, .signedIn, .tokenRefreshed:
                // With emitLocalSessionAsInitialSession, initial session may be expired; refresh runs async.
                if event == .initialSession, let s = sess, s.isExpired {
                    session = nil
                    profile = nil
                    collections = []
                    Task { try? await supabase.auth.refreshSession() }
                    break
                }
                session = sess
                if let s = sess {
                    let uid = s.user.id.uuidString
                    do {
                        profile = try await data.fetchProfile(userId: uid)
                        sidebarCollapsed = profile?.preferences.sidebar_collapsed ?? false
                    } catch {
                        profile = nil
                    }
                    await refreshCollections()
                } else {
                    profile = nil
                    collections = []
                }
            case .signedOut:
                session = nil
                profile = nil
                collections = []
            default:
                break
            }
            authLoading = false
        }
    }

    func refreshCollections() async {
        guard session != nil else { return }
        collectionsLoading = true
        defer { collectionsLoading = false }
        do {
            collections = try await data.fetchCollections()
        } catch {
            collections = []
        }
    }

    func signIn(email: String, password: String) async throws {
        _ = try await supabase.auth.signIn(email: email, password: password)
    }

    func signUp(email: String, password: String, fullName: String?) async throws -> Bool {
        var meta: [String: AnyJSON]?
        if let fullName, !fullName.isEmpty {
            meta = ["full_name": .string(fullName)]
        }
        let res = try await supabase.auth.signUp(email: email, password: password, data: meta)
        return res.session == nil
    }

    func signOut() async throws {
        try await supabase.auth.signOut()
    }

    func signInWithOAuth(provider: Provider) async throws {
        let redirect = URL(string: "kern://auth-callback")!
        _ = try await supabase.auth.signInWithOAuth(provider: provider, redirectTo: redirect) { session in
            session.presentationContextProvider = WebAuthContext.shared
        }
    }

    func handleAuthCallback(url: URL) async {
        do {
            _ = try await supabase.auth.session(from: url)
        } catch {}
    }

    func updateTheme(_ light: Bool) async throws {
        guard var p = profile, let uid = session?.user.id.uuidString else { return }
        p.preferences.theme = light ? "light" : "dark"
        try await data.updateProfile(userId: uid, fullName: nil, preferences: p.preferences)
        profile = try await data.fetchProfile(userId: uid)
    }

    func updateSidebarCollapsed(_ collapsed: Bool) async throws {
        guard var p = profile, let uid = session?.user.id.uuidString else { return }
        p.preferences.sidebar_collapsed = collapsed
        try await data.updateProfile(userId: uid, fullName: nil, preferences: p.preferences)
        profile = try await data.fetchProfile(userId: uid)
    }

    func toggleSidebar() {
        sidebarCollapsed.toggle()
        Task {
            try? await updateSidebarCollapsed(sidebarCollapsed)
        }
    }

    func setActiveCollection(slug: String?) {
        activeCollectionSlug = slug
    }
}

final class WebAuthContext: NSObject, ASWebAuthenticationPresentationContextProviding {
    static let shared = WebAuthContext()

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let ordered = scenes.sorted {
            sceneSortRank($0.activationState) < sceneSortRank($1.activationState)
        }
        for scene in ordered {
            if let win = scene.windows.first(where: { $0.isKeyWindow }) { return win }
            if let win = scene.windows.first { return win }
        }
        return scenes.flatMap(\.windows).first { $0.isKeyWindow }
            ?? scenes.flatMap(\.windows).first
            ?? ASPresentationAnchor()
    }

    private func sceneSortRank(_ state: UIScene.ActivationState) -> Int {
        switch state {
        case .foregroundActive: 0
        case .foregroundInactive: 1
        case .background: 2
        case .unattached: 3
        @unknown default: 9
        }
    }
}
