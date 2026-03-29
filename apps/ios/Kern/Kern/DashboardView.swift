import SwiftUI

struct DashboardView: View {
    @Bindable var app: AppModel
    @Binding var mainContent: MainContent
    @Environment(\.kernTheme) private var theme
    @State private var widgets: [DashboardWidget] = []
    @State private var loading = true
    @State private var addPresented = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    Text("Dashboard")
                        .font(KernFont.ui(22, weight: .semibold))
                        .foregroundStyle(theme.text)
                    Spacer()
                    Button {
                        addPresented = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(theme.accent)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)

                if loading {
                    ProgressView()
                        .tint(theme.text3)
                        .frame(maxWidth: .infinity)
                        .padding(40)
                } else if widgets.isEmpty {
                    VStack(spacing: 12) {
                        Text("No widgets yet")
                            .font(KernFont.body(15))
                            .foregroundStyle(theme.text2)
                        KernButton(title: "Add widget", variant: .secondary) {
                            addPresented = true
                        }
                        .frame(maxWidth: 220)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(40)
                } else {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 160), spacing: 12)], spacing: 12) {
                        ForEach(widgets) { w in
                            widgetCard(w)
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
            .padding(.bottom, 24)
        }
        .kernNoOverscroll([.vertical])
        .task { await load() }
        .sheet(isPresented: $addPresented) {
            AddWidgetSheet(app: app, isPresented: $addPresented, onAdded: { Task { await load() } })
        }
    }

    private func widgetCard(_ w: DashboardWidget) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(w.title ?? w.type.rawValue.replacingOccurrences(of: "_", with: " ").capitalized)
                    .font(KernFont.label(14))
                    .foregroundStyle(theme.text)
                Spacer()
                Menu {
                    Button("Remove", role: .destructive) {
                        Task {
                            try? await app.data.deleteWidget(id: w.id)
                            await load()
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .foregroundStyle(theme.text3)
                }
            }
            Text(widgetBody(w))
                .font(KernFont.body(13))
                .foregroundStyle(theme.text2)
        }
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 100, alignment: .topLeading)
        .background(theme.bg1)
        .overlay(
            RoundedRectangle(cornerRadius: 0)
                .stroke(theme.border, lineWidth: 1)
        )
    }

    private func widgetBody(_ w: DashboardWidget) -> String {
        switch w.type {
        case .collection_stats:
            return "Collection statistics"
        case .recent_rows:
            return "Recent activity"
        case .view_embed:
            return "Embedded view"
        case .live_source_status:
            return "Live source status"
        case .quick_add:
            return "Quick add row"
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            widgets = try await app.data.fetchWidgets()
        } catch {
            widgets = []
        }
    }
}

struct AddWidgetSheet: View {
    @Bindable var app: AppModel
    @Binding var isPresented: Bool
    var onAdded: () -> Void
    @Environment(\.kernTheme) private var theme

    var body: some View {
        NavigationStack {
            List {
                ForEach(
                    [
                        DashboardWidgetType.collection_stats,
                        .recent_rows,
                        .quick_add,
                        .live_source_status,
                        .view_embed,
                    ],
                    id: \.self
                ) { t in
                    Button(t.label) {
                        Task {
                            guard let uid = app.session?.user.id.uuidString else { return }
                            let y = (try? await app.data.fetchWidgets().map(\.position_y).max()) ?? 0
                            try? await app.data.createWidget(
                                userId: uid,
                                type: t,
                                title: t.label,
                                x: 0,
                                y: y + 1,
                                w: 2,
                                h: 2
                            )
                            isPresented = false
                            onAdded()
                        }
                    }
                }
            }
            .navigationTitle("Add widget")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { isPresented = false }
                }
            }
        }
    }
}

private extension DashboardWidgetType {
    var label: String {
        switch self {
        case .collection_stats: return "Collection stats"
        case .recent_rows: return "Recent rows"
        case .view_embed: return "View embed"
        case .live_source_status: return "Live source status"
        case .quick_add: return "Quick add"
        }
    }
}
