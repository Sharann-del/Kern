import SwiftUI

/// Lightweight command palette: jump to dashboard, settings, or a collection by name.
struct CommandSearchView: View {
    @Bindable var app: AppModel
    @Binding var mainContent: MainContent
    @Environment(\.kernTheme) private var theme
    @State private var query = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Go to")
                .font(KernFont.ui(20, weight: .semibold))
                .foregroundStyle(theme.text)
                .padding(.horizontal, 16)
                .padding(.top, 16)

            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(theme.text3)
                TextField("Filter collections…", text: $query)
                    .font(KernFont.body(15))
                    .foregroundStyle(theme.text)
            }
            .padding(12)
            .background(theme.bg1)
            .overlay(Rectangle().stroke(theme.border, lineWidth: 1))
            .padding(.horizontal, 16)

            List {
                Button {
                    mainContent = .dashboard
                    app.setActiveCollection(slug: nil)
                } label: {
                    Label("Dashboard", systemImage: "rectangle.split.2x1")
                        .foregroundStyle(theme.text)
                }
                .listRowBackground(theme.bg0)

                Button {
                    mainContent = .settings
                } label: {
                    Label("Settings", systemImage: "gearshape")
                        .foregroundStyle(theme.text)
                }
                .listRowBackground(theme.bg0)

                Section {
                    ForEach(filteredCollections) { c in
                        Button {
                            mainContent = .collection(slug: c.slug)
                            app.setActiveCollection(slug: c.slug)
                        } label: {
                            Text(c.name)
                                .foregroundStyle(theme.text)
                        }
                        .listRowBackground(theme.bg0)
                    }
                } header: {
                    Text("Collections")
                        .foregroundStyle(theme.text3)
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .kernNoOverscroll([.vertical])
        }
        .background(theme.bg0)
    }

    private var filteredCollections: [KernCollection] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if q.isEmpty { return app.collections }
        return app.collections.filter { $0.name.lowercased().contains(q) || $0.slug.lowercased().contains(q) }
    }
}
