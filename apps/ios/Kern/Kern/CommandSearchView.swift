import SwiftUI

/// Lightweight command palette: jump to dashboard, settings, or a collection by name.
struct CommandSearchView: View {
    @Bindable var app: AppModel
    @Binding var mainContent: MainContent
    @Environment(\.kernTheme) private var theme
    @State private var query = ""

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
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
                .padding(.top, 16)

                VStack(alignment: .leading, spacing: 0) {
                    Button {
                        mainContent = .dashboard
                        app.setActiveCollection(slug: nil)
                    } label: {
                        HStack {
                            Label("Dashboard", systemImage: "rectangle.split.2x1")
                            Spacer()
                        }
                        .padding()
                        .background(theme.bg0)
                        .foregroundStyle(theme.text)
                    }
                    
                    Divider().background(theme.border)

                    Button {
                        mainContent = .settings
                    } label: {
                        HStack {
                            Label("Settings", systemImage: "gearshape")
                            Spacer()
                        }
                        .padding()
                        .background(theme.bg0)
                        .foregroundStyle(theme.text)
                    }

                    Divider().background(theme.border)

                    Section {
                        ForEach(filteredCollections) { c in
                            Button {
                                mainContent = .collection(slug: c.slug)
                                app.setActiveCollection(slug: c.slug)
                            } label: {
                                HStack {
                                    Text(c.name)
                                    Spacer()
                                }
                                .padding()
                                .background(theme.bg0)
                                .foregroundStyle(theme.text)
                            }
                            Divider().background(theme.border)
                        }
                    } header: {
                        Text("Collections")
                            .font(KernFont.label(12))
                            .foregroundStyle(theme.text3)
                            .padding(.horizontal)
                            .padding(.top, 24)
                            .padding(.bottom, 8)
                    }
                }
            }
        }
        .safeAreaInset(edge: .top) {
            VStack(spacing: 0) {
                HStack(spacing: 16) {
                    Button {
                        withAnimation(.spring(response: 0.45, dampingFraction: 0.88)) { app.toggleSidebar() }
                    } label: {
                        Image(systemName: "line.3.horizontal")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(theme.text2)
                            .frame(width: 32, height: 32)
                            .border(theme.border, width: 1)
                    }
                    .buttonStyle(.plain)

                    Text("Search")
                        .font(KernFont.display(34))
                        .foregroundStyle(theme.text)
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(theme.bg0)
                
                Rectangle()
                    .fill(theme.border)
                    .frame(height: 1)
            }
        }
        .background(theme.bg0)
        .kernNoOverscroll([.vertical])
    }

    private var filteredCollections: [KernCollection] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if q.isEmpty { return app.collections }
        return app.collections.filter { $0.name.lowercased().contains(q) || $0.slug.lowercased().contains(q) }
    }
}
