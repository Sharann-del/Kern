import SwiftUI

enum MainContent: Equatable {
    case dashboard
    case settings
    case collection(slug: String)
    case commandSearch
}

private let topbarH: CGFloat = 54
private let sidebarW: CGFloat = 220
private let sidebarAnim: Animation = .timingCurve(0.33, 1, 0.68, 1, duration: 0.48)

private struct AccountSharpMenu: View {
    let theme: KernThemeColors
    var onSettings: () -> Void
    var onSignOut: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button(action: onSettings) {
                Text("Settings")
                    .font(KernFont.body(14))
                    .foregroundStyle(theme.text)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
            }
            .buttonStyle(.plain)
            Rectangle()
                .fill(theme.border)
                .frame(height: 1)
            Button(action: onSignOut) {
                Text("Sign out")
                    .font(KernFont.body(14))
                    .foregroundStyle(theme.danger)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .contentShape(Rectangle())
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
            }
            .buttonStyle(.plain)
        }
        .frame(width: 148)
        .fixedSize(horizontal: true, vertical: false)
        .background(theme.bg1)
        .overlay(Rectangle().stroke(theme.border, lineWidth: 1))
    }
}

struct AppShellView: View {
    @Bindable var app: AppModel
    @Environment(\.kernTheme) private var theme
    @State private var mainContent: MainContent = .dashboard
    @State private var rowEditor: RowEditorRoute?
    @State private var createCollectionPresented = false
    @State private var accountMenuOpen = false

    struct RowEditorRoute: Identifiable {
        let id = UUID()
        let collectionId: String
        let slug: String
        let row: KernRow?
        let fields: [KernField]
    }

    var body: some View {
        ZStack(alignment: .leading) {
            HStack(spacing: 0) {
                if !app.sidebarCollapsed {
                    SidebarView(app: app, mainContent: $mainContent, createCollectionPresented: $createCollectionPresented)
                        .frame(width: sidebarW)
                        .background(theme.bg1)
                        .overlay(alignment: .trailing) {
                            Rectangle()
                                .fill(theme.border.opacity(0.6))
                                .frame(width: 1)
                        }
                        .transition(.move(edge: .leading).combined(with: .opacity))
                }
                VStack(spacing: 0) {
                    TopbarView(
                        app: app,
                        mainContent: $mainContent,
                        accountMenuOpen: $accountMenuOpen
                    )
                    .frame(height: topbarH)
                    .background(theme.topbarBg)
                    .overlay(alignment: .bottom) {
                        Rectangle()
                            .fill(theme.topbarBorder)
                            .frame(height: 1)
                    }
                    ZStack {
                        Group {
                            switch mainContent {
                            case .dashboard:
                                DashboardView(app: app, mainContent: $mainContent)
                            case .settings:
                                SettingsView(app: app)
                            case .collection(let slug):
                                CollectionDetailView(
                                    app: app,
                                    slug: slug,
                                    mainContent: $mainContent,
                                    onOpenRow: { cid, row, fields in
                                        rowEditor = RowEditorRoute(collectionId: cid, slug: slug, row: row, fields: fields)
                                    }
                                )
                            case .commandSearch:
                                CommandSearchView(app: app, mainContent: $mainContent)
                            }
                        }
                        .frame(maxWidth: .infinity, maxHeight: .infinity)

                        if accountMenuOpen {
                            theme.bg0.opacity(0.35)
                                .ignoresSafeArea(edges: .bottom)
                                .onTapGesture {
                                    accountMenuOpen = false
                                }
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(theme.bg0)
                }
                .overlay(alignment: .topTrailing) {
                    if accountMenuOpen {
                        AccountSharpMenu(
                            theme: theme,
                            onSettings: {
                                accountMenuOpen = false
                                mainContent = .settings
                            },
                            onSignOut: {
                                accountMenuOpen = false
                                Task { try? await app.signOut() }
                            }
                        )
                        .padding(.top, topbarH + 6)
                        .padding(.trailing, 12)
                    }
                }
            }
            .animation(sidebarAnim, value: app.sidebarCollapsed)
        }
        .onChange(of: mainContent) { _, _ in
            accountMenuOpen = false
        }
        .preferredColorScheme(app.isLightTheme ? .light : .dark)
        .sheet(item: $rowEditor) { route in
            RowEditorSheet(
                app: app,
                collectionId: route.collectionId,
                collectionSlug: route.slug,
                row: route.row,
                fields: route.fields,
                onDismiss: { rowEditor = nil }
            )
            .kernSharpSheetChrome(theme)
        }
        .sheet(isPresented: $createCollectionPresented) {
            CreateCollectionSheet(app: app, isPresented: $createCollectionPresented, mainContent: $mainContent)
                .kernSharpSheetChrome(theme)
        }
    }
}

struct TopbarView: View {
    @Bindable var app: AppModel
    @Binding var mainContent: MainContent
    @Binding var accountMenuOpen: Bool
    @Environment(\.kernTheme) private var theme

    var body: some View {
        HStack(spacing: 8) {
            Button {
                app.toggleSidebar()
            } label: {
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(theme.menuIcon)
                    .frame(width: 28, height: 28)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)

            Text("kern")
                .font(KernFont.display(17))
                .foregroundStyle(theme.text)
                .padding(.leading, 2)

            if case .collection(let slug) = mainContent {
                Text("/")
                    .font(.system(size: 13))
                    .foregroundStyle(theme.menuIcon)
                Text(breadcrumb(slug))
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(theme.text3)
                    .lineLimit(1)
            }
            Spacer()
            Button {
                accountMenuOpen.toggle()
            } label: {
                Image(systemName: "ellipsis")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(theme.text2)
                    .frame(width: 32, height: 32)
                    .background(theme.bg2)
                    .overlay(Rectangle().stroke(theme.border, lineWidth: 1))
            }
            .buttonStyle(.plain)
            .padding(.trailing, 4)
        }
        .padding(.horizontal, 12)
    }

    private func breadcrumb(_ slug: String) -> String {
        slug.split(separator: "-")
            .filter { !$0.isEmpty }
            .map { $0.capitalized }
            .joined(separator: " ")
    }
}

struct SidebarView: View {
    @Bindable var app: AppModel
    @Binding var mainContent: MainContent
    @Binding var createCollectionPresented: Bool
    @Environment(\.kernTheme) private var theme

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 4) {
                sidebarRow(title: "Dashboard", systemImage: "rectangle.split.2x1") {
                    mainContent = .dashboard
                    app.setActiveCollection(slug: nil)
                }
                sidebarRow(title: "Search…", systemImage: "magnifyingglass") {
                    mainContent = .commandSearch
                }
                sidebarRow(title: "Settings", systemImage: "gearshape") {
                    mainContent = .settings
                }

                HStack {
                    Text("Collections")
                        .font(KernFont.label(12))
                        .foregroundStyle(theme.text3)
                    Spacer()
                    Button {
                        createCollectionPresented = true
                    } label: {
                        Image(systemName: "plus")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(theme.accent)
                    }
                    .buttonStyle(.plain)
                }
                .padding(.top, 16)
                .padding(.horizontal, 12)

                if app.collectionsLoading {
                    ProgressView()
                        .tint(theme.text3)
                        .padding()
                } else {
                    ForEach(app.collections) { c in
                        Button {
                            mainContent = .collection(slug: c.slug)
                            app.setActiveCollection(slug: c.slug)
                        } label: {
                            HStack(spacing: 8) {
                                collectionIcon(c)
                                Text(c.name)
                                    .font(KernFont.body(14))
                                    .foregroundStyle(theme.text)
                                    .lineLimit(1)
                                Spacer()
                            }
                            .padding(.vertical, 8)
                            .padding(.horizontal, 12)
                            .background(mainContent == .collection(slug: c.slug) ? theme.bg2.opacity(0.6) : .clear)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.vertical, 12)
        }
        .kernNoOverscroll([.vertical])
    }

    private func sidebarRow(title: String, systemImage: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: systemImage)
                    .font(.system(size: 15))
                    .foregroundStyle(theme.text3)
                    .frame(width: 20)
                Text(title)
                    .font(KernFont.body(14))
                    .foregroundStyle(theme.text)
                Spacer()
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private func collectionIcon(_ c: KernCollection) -> some View {
        if let icon = c.icon, icon.hasPrefix("lucide:") {
            Image(systemName: "folder")
                .foregroundStyle(theme.accent)
        } else if let icon = c.icon, !icon.isEmpty {
            Text(icon)
                .font(.system(size: 16))
        } else {
            Image(systemName: "folder")
                .foregroundStyle(theme.text3)
        }
    }
}

struct CreateCollectionSheet: View {
    @Bindable var app: AppModel
    @Binding var isPresented: Bool
    @Binding var mainContent: MainContent
    @Environment(\.kernTheme) private var theme
    @State private var name = ""
    @State private var loading = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                KernTextField(title: "Name", text: $name, placeholder: "My collection")
                if let error {
                    Text(error).foregroundStyle(theme.danger).font(KernFont.body(13))
                }
                KernButton(title: "Create", variant: .primary, loading: loading) {
                    Task { await create() }
                }
                Spacer()
            }
            .padding(20)
            .background(theme.bg0)
            .navigationTitle("New collection")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { isPresented = false }
                }
            }
        }
        .kernTheme(theme)
    }

    private func create() async {
        error = nil
        let n = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !n.isEmpty else { error = "Enter a name."; return }
        guard let uid = app.session?.user.id.uuidString else { return }
        loading = true
        defer { loading = false }
        let slug = KernSlugify.slugify(n)
        guard !slug.isEmpty else { error = "Invalid name."; return }
        do {
            let s = try await app.data.createCollection(userId: uid, name: n, slug: slug, icon: nil, color: nil, description: nil)
            await app.refreshCollections()
            isPresented = false
            mainContent = .collection(slug: s)
            app.setActiveCollection(slug: s)
        } catch {
            self.error = error.localizedDescription
        }
    }
}
