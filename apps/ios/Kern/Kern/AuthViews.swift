import AuthenticationServices
import SwiftUI
import Supabase

private let webAuthenticationSessionErrorDomain = "com.apple.AuthenticationServices.WebAuthenticationSession"

private func oauthUserMessage(_ error: Error) -> String {
    let ns = error as NSError
    if ns.domain == webAuthenticationSessionErrorDomain, ns.code == 1 {
        return "Sign-in didn’t finish. If you didn’t cancel, add kern://auth-callback to Supabase → Authentication → Redirect URLs, then try again."
    }
    return error.localizedDescription
}

// MARK: - Chrome

struct AuthContainerView<Content: View>: View {
    @ViewBuilder var content: () -> Content
    @Environment(\.kernTheme) private var theme

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [theme.bg0, theme.bg1.opacity(0.8), theme.bg0],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            GeometryReader { geo in
                ScrollView {
                    VStack(spacing: 16) {
                        Text("kern")
                            .font(KernFont.display(48))
                            .foregroundStyle(theme.text)
                            .tracking(-0.5)
                        VStack(alignment: .leading, spacing: 0) {
                            content()
                        }
                        .frame(maxWidth: 400)
                        .padding(32)
                        .background(theme.bg1)
                        .overlay(Rectangle().stroke(theme.border, lineWidth: 1))
                    }
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: geo.size.height, alignment: .center)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 24)
                }
                .kernNoOverscroll([.vertical])
            }
        }
    }
}

// MARK: - OAuth (stacked rows + divider, like web `OAuthAuthSection`)

private struct AuthOAuthDivider: View {
    @Environment(\.kernTheme) private var theme
    var body: some View {
        HStack(spacing: 8) {
            Rectangle()
                .fill(theme.border)
                .frame(height: 1)
            Text("Or continue with")
                .font(KernFont.ui(10, weight: .medium))
                .textCase(.uppercase)
                .tracking(0.85)
                .foregroundStyle(theme.text3)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .fixedSize(horizontal: true, vertical: false)
            Rectangle()
                .fill(theme.border)
                .frame(height: 1)
        }
    }
}

private struct AuthOAuthSection: View {
    @Binding var loading: AuthOAuthProvider?
    @Environment(\.kernTheme) private var theme
    var onGoogle: () -> Void
    var onGitHub: () -> Void
    var error: String?

    var body: some View {
        VStack(spacing: 16) {
            AuthOAuthDivider()
            VStack(spacing: 8) {
                oauthRow(
                    title: loading == .google ? "Redirecting…" : "Continue with Google",
                    icon: { OAuthGoogleGlyph() },
                    disabled: loading != nil,
                    action: onGoogle
                )
                oauthRow(
                    title: loading == .github ? "Redirecting…" : "Continue with GitHub",
                    icon: { OAuthGitHubGlyph() },
                    disabled: loading != nil,
                    action: onGitHub
                )
            }
            if let error {
                Text(error)
                    .font(KernFont.ui(13))
                    .foregroundStyle(theme.danger)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private func oauthRow(
        title: String,
        @ViewBuilder icon: () -> some View,
        disabled: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Spacer(minLength: 0)
                icon()
                Text(title)
                    .font(KernFont.ui(14, weight: .medium))
                    .foregroundStyle(theme.text)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity)
            .background(theme.bg2)
            .overlay(Rectangle().stroke(theme.border, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .disabled(disabled)
    }
}

private enum AuthOAuthProvider {
    case google, github
}

// MARK: - Main flow

private enum AuthFlowMode: Equatable {
    case login
    case signup
    case verifyEmail(String)
}

struct AuthFlowView: View {
    @Bindable var app: AppModel
    @Environment(\.kernTheme) private var theme
    @State private var mode: AuthFlowMode = .login

    @State private var loginEmail = ""
    @State private var loginPassword = ""
    @State private var loginError: String?
    @State private var loginLoading = false

    @State private var suFullName = ""
    @State private var suEmail = ""
    @State private var suPassword = ""
    @State private var suError: String?
    @State private var suLoading = false

    @State private var oauthLoading: AuthOAuthProvider?
    @State private var oauthError: String?

    var body: some View {
        AuthContainerView {
            Group {
                switch mode {
                case .login:
                    loginBlock
                case .signup:
                    signupBlock
                case .verifyEmail(let emailed):
                    verifyBlock(email: emailed)
                }
            }
        }
        .animation(.easeInOut(duration: 0.2), value: mode)
    }

    private var loginBlock: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Sign in")
                .font(KernFont.authHeading(20))
                .foregroundStyle(theme.text)
                .tracking(-0.3)
            Text("Enter your email and password to continue.")
                .font(KernFont.authCaption(14))
                .foregroundStyle(theme.text2)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 6)

            VStack(spacing: 16) {
                KernTextField(
                    title: "Email",
                    text: $loginEmail,
                    placeholder: "you@company.com",
                    keyboard: .emailAddress
                )
                KernTextField(title: "Password", text: $loginPassword, placeholder: "••••••••", isSecure: true)
                if let loginError {
                    Text(loginError)
                        .font(KernFont.ui(13))
                        .foregroundStyle(theme.danger)
                }
                KernButton(title: "Sign in", variant: .primary, minHeight: 42, loading: loginLoading) {
                    Task { await submitLogin() }
                }
            }
            .padding(.top, 32)

            AuthOAuthSection(
                loading: $oauthLoading,
                onGoogle: { Task { await runOAuth(.google) } },
                onGitHub: { Task { await runOAuth(.github) } },
                error: oauthError
            )
            .padding(.top, 32)

            authFooterTopRule
            HStack(spacing: 0) {
                Text("Don’t have an account? ")
                    .font(KernFont.authCaption(14))
                    .foregroundStyle(theme.text2)
                Button("Sign up") {
                    oauthError = nil
                    suError = nil
                    mode = .signup
                }
                .font(KernFont.ui(14, weight: .medium))
                .foregroundStyle(theme.accent)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 24)
        }
    }

    private var signupBlock: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Create account")
                .font(KernFont.authHeading(20))
                .foregroundStyle(theme.text)
                .tracking(-0.3)

            VStack(spacing: 16) {
                KernTextField(title: "Full name", text: $suFullName, placeholder: "John Doe")
                KernTextField(
                    title: "Email",
                    text: $suEmail,
                    placeholder: "you@company.com",
                    keyboard: .emailAddress
                )
                KernTextField(
                    title: "Password",
                    text: $suPassword,
                    placeholder: "Choose a password",
                    isSecure: true
                )
                if let suError {
                    Text(suError)
                        .font(KernFont.ui(13))
                        .foregroundStyle(theme.danger)
                }
                Text("By continuing you agree to receive account email from kern (sign-in, security, and product updates you can turn off later).")
                    .font(KernFont.ui(11))
                    .foregroundStyle(theme.text2)
                    .fixedSize(horizontal: false, vertical: true)
                KernButton(title: "Sign up", variant: .primary, minHeight: 42, loading: suLoading) {
                    Task { await submitSignup() }
                }
            }
            .padding(.top, 32)

            AuthOAuthSection(
                loading: $oauthLoading,
                onGoogle: { Task { await runOAuth(.google) } },
                onGitHub: { Task { await runOAuth(.github) } },
                error: oauthError
            )
            .padding(.top, 32)

            authFooterTopRule
            HStack(spacing: 0) {
                Text("Already have an account? ")
                    .font(KernFont.authCaption(14))
                    .foregroundStyle(theme.text2)
                Button("Sign in") {
                    oauthError = nil
                    suError = nil
                    mode = .login
                }
                .font(KernFont.ui(14, weight: .medium))
                .foregroundStyle(theme.accent)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 24)
        }
    }

    private func verifyBlock(email: String) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Verify your email")
                .font(KernFont.authHeading(20))
                .foregroundStyle(theme.text)
            Text("We sent a confirmation link to finish setting up your account.")
                .font(KernFont.authCaption(14))
                .foregroundStyle(theme.text2)
                .padding(.top, 6)
            Text("We emailed \(email). Open the link in that message to confirm your address — you’ll be signed in automatically.")
                .font(KernFont.authCaption(14))
                .foregroundStyle(theme.text2)
                .padding(.top, 20)
            Text("If nothing arrives in a few minutes, check your spam or promotions folder.")
                .font(KernFont.authCaption(14))
                .foregroundStyle(theme.text2)
                .padding(.top, 12)
            authFooterTopRule
            HStack(spacing: 4) {
                Text("Wrong inbox?")
                    .font(KernFont.authCaption(14))
                    .foregroundStyle(theme.text2)
                Button("Start over with another email") {
                    mode = .signup
                    suError = nil
                }
                .font(KernFont.ui(14, weight: .medium))
                .foregroundStyle(theme.accent)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 24)
        }
    }

    private var authFooterTopRule: some View {
        Rectangle()
            .fill(theme.border)
            .frame(height: 1)
            .padding(.top, 40)
    }

    private func submitLogin() async {
        loginError = nil
        oauthError = nil
        let e = loginEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !e.isEmpty else { loginError = "Enter your email."; return }
        guard e.contains("@") else { loginError = "Enter a valid email."; return }
        guard !loginPassword.isEmpty else { loginError = "Enter your password."; return }
        loginLoading = true
        defer { loginLoading = false }
        do {
            try await app.signIn(email: e, password: loginPassword)
        } catch {
            loginError = (error as NSError).localizedDescription
        }
    }

    private func submitSignup() async {
        suError = nil
        oauthError = nil
        guard !suFullName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            suError = "Enter your full name."
            return
        }
        let e = suEmail.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !e.isEmpty else { suError = "Enter your email."; return }
        guard e.contains("@") else { suError = "Enter a valid email."; return }
        guard suPassword.count >= 6 else { suError = "Password must be at least 6 characters."; return }
        suLoading = true
        defer { suLoading = false }
        do {
            let needs = try await app.signUp(
                email: e,
                password: suPassword,
                fullName: suFullName.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            if needs {
                mode = .verifyEmail(e)
            }
        } catch {
            suError = (error as NSError).localizedDescription
        }
    }

    private func runOAuth(_ p: Provider) async {
        oauthError = nil
        oauthLoading = p == .google ? .google : .github
        defer { oauthLoading = nil }
        do {
            try await app.signInWithOAuth(provider: p)
        } catch {
            oauthError = oauthUserMessage(error)
        }
    }
}
