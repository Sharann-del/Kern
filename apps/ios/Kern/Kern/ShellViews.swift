import SwiftUI

enum MainContent: Equatable {
    case dashboard
    case calendar
    case settings
    case collection(slug: String)
    case commandSearch
}

private let sidebarW: CGFloat = 290
private let sidebarAnim: Animation = .spring(response: 0.45, dampingFraction: 0.88)

/// Smoothstep from 0→1 as `t` moves through the window [lo, hi].
private func sstep(_ t: CGFloat, lo: CGFloat, hi: CGFloat) -> CGFloat {
    let x = max(0, min(1, (t - lo) / max(hi - lo, 0.001)))
    return x * x * (3 - 2 * x)
}

// MARK: - App Shell

struct AppShellView: View {
    @Bindable var app: AppModel
    @Environment(\.kernTheme) private var theme
    @State private var mainContent: MainContent = .dashboard
    @State private var rowEditor: RowEditorRoute?
    @State private var createCollectionPresented = false
    @State private var dragOffsetX: CGFloat = 0

    struct RowEditorRoute: Identifiable {
        let id = UUID()
        let collectionId: String
        let slug: String
        let row: KernRow?
        let fields: [KernField]
    }

    /// Live x-offset of the main content panel (0 = closed, sidebarW = fully open).
    private var contentX: CGFloat {
        let base: CGFloat = app.sidebarCollapsed ? 0 : sidebarW
        return max(0, min(sidebarW, base + dragOffsetX))
    }

    /// 0 = fully hidden, 1 = fully revealed — drives all sidebar animations.
    private var revealProgress: CGFloat { contentX / sidebarW }

    var body: some View {
        ZStack(alignment: .leading) {
            // Sidebar — always behind the main content panel
            SidebarView(
                app: app,
                mainContent: $mainContent,
                createCollectionPresented: $createCollectionPresented,
                revealProgress: revealProgress
            )
            .frame(width: sidebarW)
            .background(theme.bg1) // Lighter sidebar background
            .allowsHitTesting(revealProgress > 0.15)

            // Main content panel — slides right to reveal sidebar
            ZStack(alignment: .topLeading) {
                contentView
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(theme.bg0) // Content background



                // Scrim + tap-to-close while sidebar is exposed
                if contentX > 0 {
                    Color.black
                        .opacity(Double(revealProgress) * 0.15)
                        .ignoresSafeArea()
                        .allowsHitTesting(revealProgress > 0.15)
                        .onTapGesture { closeSidebar() }
                }
            }
            .offset(x: contentX)
            .gesture(
                DragGesture(minimumDistance: 12, coordinateSpace: .local)
                    .onChanged { v in
                        let startX = v.startLocation.x
                        let dx = v.translation.width
                        if app.sidebarCollapsed {
                            if startX < 40, dx > 0 { dragOffsetX = dx }
                        } else {
                            if dx < 0 { dragOffsetX = dx }
                        }
                    }
                    .onEnded { v in
                        guard dragOffsetX != 0 else { return }
                        let dx = v.translation.width
                        let predicted = v.predictedEndTranslation.width
                        let shouldOpen  = dx > sidebarW * 0.25 || predicted > sidebarW * 0.40
                        let shouldClose = dx < -(sidebarW * 0.25) || predicted < -(sidebarW * 0.40)
                        withAnimation(sidebarAnim) {
                            dragOffsetX = 0
                            if app.sidebarCollapsed && shouldOpen  { app.toggleSidebar() }
                            else if !app.sidebarCollapsed && shouldClose { app.toggleSidebar() }
                        }
                    }
            )
        }
        .background(theme.bg0.ignoresSafeArea()) // Fix safe area leaks
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

    private func closeSidebar() {
        withAnimation(sidebarAnim) {
            dragOffsetX = 0
            if !app.sidebarCollapsed { app.toggleSidebar() }
        }
    }

    @ViewBuilder
    private var contentView: some View {
        switch mainContent {
        case .dashboard:
            DashboardView(app: app, mainContent: $mainContent)
        case .calendar:
            CalendarView(onMenuTap: {
                withAnimation(.spring(response: 0.45, dampingFraction: 0.88)) { app.toggleSidebar() }
            })
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
}

// MARK: - Sidebar

private struct NavEntry {
    let title: String
    let icon: String
    let target: MainContent
}

private let navEntries: [NavEntry] = [
    .init(title: "Dashboard", icon: "rectangle.grid.2x2",  target: .dashboard),
    .init(title: "Calendar",  icon: "calendar",           target: .calendar),
    .init(title: "Search",    icon: "magnifyingglass",    target: .commandSearch)
]

struct SidebarView: View {
    @Bindable var app: AppModel
    @Binding var mainContent: MainContent
    @Binding var createCollectionPresented: Bool
    /// 0 = hidden, 1 = fully revealed. Drives all cascaded animations.
    let revealProgress: CGFloat
    @Environment(\.kernTheme) private var theme

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            
            HStack {
                // ── Title ────────────────────────────────────────────
                let titleP = sstep(revealProgress, lo: 0.00, hi: 0.45)
                Text("Kern")
                    .font(KernFont.display(34))
                    .foregroundStyle(theme.text)
                    .opacity(titleP)
                    .offset(x: (1 - titleP) * -20)
                
                Spacer()
            }
            .padding(.horizontal, 20)
            .padding(.top, 60)
            .padding(.bottom, 24)

            // ── Nav rows ─────────────────────────────────────────
            ScrollView {
                VStack(alignment: .leading, spacing: 4) {

                    ForEach(Array(navEntries.enumerated()), id: \.offset) { idx, entry in
                        let p = sstep(revealProgress,
                                      lo: 0.08 + CGFloat(idx) * 0.04,
                                      hi: 0.45 + CGFloat(idx) * 0.03)
                        let isActive = mainContent == entry.target
                        
                        navRow(title: entry.title, systemImage: entry.icon, isActive: isActive) {
                            navigate(entry.target)
                        }
                        .opacity(p)
                        .offset(x: (1 - p) * -16)
                    }

                    // ── Collections header ────────────────────────
                    let hdrP = sstep(revealProgress, lo: 0.30, hi: 0.65)
                    HStack(alignment: .center) {
                        Text("Collections")
                            .font(KernFont.label(12))
                            .foregroundStyle(theme.text3)
                            .textCase(.uppercase)
                            .tracking(1.1)
                        Spacer()
                        Button {
                            createCollectionPresented = true
                        } label: {
                            Image(systemName: "plus")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundStyle(theme.accent)
                                .frame(width: 24, height: 24)
                                .background(theme.bg2)
                        }
                        .buttonStyle(.plain)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 32)
                    .padding(.bottom, 8)
                    .opacity(hdrP)
                    .offset(x: (1 - hdrP) * -12)

                    // ── Collection rows ───────────────────────────
                    if app.collectionsLoading {
                        let lp = sstep(revealProgress, lo: 0.40, hi: 0.75)
                        ProgressView()
                            .tint(theme.text3)
                            .padding(.horizontal, 20)
                            .padding(.vertical, 10)
                            .opacity(lp)
                    } else {
                        ForEach(Array(app.collections.enumerated()), id: \.element.id) { idx, c in
                            let capped = min(idx, 8)
                            let p = sstep(revealProgress,
                                          lo: 0.38 + CGFloat(capped) * 0.03,
                                          hi: 0.70 + CGFloat(capped) * 0.02)
                            let isActive = mainContent == .collection(slug: c.slug)
                            
                            Button {
                                navigate(.collection(slug: c.slug))
                            } label: {
                                HStack(spacing: 12) {
                                    collectionIcon(c, isActive: isActive).frame(width: 20)
                                    Text(c.name)
                                        .font(KernFont.body(15))
                                        .foregroundStyle(isActive ? theme.text : theme.text2)
                                        .lineLimit(1)
                                    Spacer()
                                }
                                .padding(.vertical, 10)
                                .padding(.horizontal, 12)
                                .background(isActive ? theme.bg2 : .clear)
                            }
                            .buttonStyle(.plain)
                            .padding(.horizontal, 8)
                            .opacity(p)
                            .offset(x: (1 - p) * -10)
                        }
                    }
                }
            }
            .kernNoOverscroll([.vertical])
            .clipped()

            Spacer(minLength: 0)

            // ── User row ──────────────────────────────────────────
            let userP = sstep(revealProgress, lo: 0.50, hi: 0.85)

            Button { navigate(.settings) } label: {
                HStack(spacing: 12) {
                    ZStack {
                        Rectangle().fill(theme.bg2)
                        Text(userInitial)
                            .font(KernFont.label(15))
                            .foregroundStyle(theme.accent)
                    }
                    .frame(width: 36, height: 36)

                    VStack(alignment: .leading, spacing: 1) {
                        Text(app.profile?.full_name ?? "User")
                            .font(KernFont.label(14))
                            .foregroundStyle(theme.text)
                        Text(app.session?.user.email ?? "Account")
                            .font(KernFont.body(11))
                            .foregroundStyle(theme.text3)
                    }
                    .lineLimit(1)

                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(theme.text3.opacity(0.5))
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(theme.bg2)
                .padding(.horizontal, 12)
                .padding(.bottom, 24)
            }
            .buttonStyle(.plain)
            .opacity(userP)
            .offset(y: (1 - userP) * 12)
        }
        .clipped()
    }

    private var userInitial: String {
        let name = app.profile?.full_name ?? app.session?.user.email ?? "?"
        return String(name.prefix(1)).uppercased()
    }

    private func navigate(_ content: MainContent) {
        withAnimation(sidebarAnim) {
            mainContent = content
            if case .collection(let slug) = content { app.setActiveCollection(slug: slug) }
            else { app.setActiveCollection(slug: nil) }
        }
    }

    @ViewBuilder
    private func navRow(title: String, systemImage: String, isActive: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 14) {
                Image(systemName: systemImage)
                    .font(.system(size: 17, weight: isActive ? .semibold : .regular))
                    .foregroundStyle(isActive ? theme.accent : theme.text3)
                    .frame(width: 24)
                Text(title)
                    .font(KernFont.ui(16, weight: isActive ? .medium : .regular))
                    .foregroundStyle(isActive ? theme.text : theme.text2)
                Spacer()
            }
            .padding(.vertical, 11)
            .padding(.horizontal, 12)
            .background(isActive ? theme.bg2 : .clear)
        }
        .buttonStyle(.plain)
        .padding(.horizontal, 8)
    }

    @ViewBuilder
    private func collectionIcon(_ c: KernCollection, isActive: Bool) -> some View {
        if let icon = c.icon, icon.hasPrefix("lucide:") {
            Image(systemName: "folder.fill")
                .font(.system(size: 14))
                .foregroundStyle(isActive ? theme.accent : theme.text3)
        } else if let icon = c.icon, !icon.isEmpty {
            Text(icon).font(.system(size: 16))
        } else {
            Image(systemName: "folder.fill")
                .font(.system(size: 14))
                .foregroundStyle(isActive ? theme.accent : theme.text3)
        }
    }
}

// MARK: - Create Collection Sheet

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
