import SwiftUI

struct CollectionDetailView: View {
    @Bindable var app: AppModel
    let slug: String
    @Binding var mainContent: MainContent
    var onOpenRow: (String, KernRow?, [KernField]) -> Void
    @Environment(\.kernTheme) private var theme

    @State private var collection: KernCollection?
    @State private var fields: [KernField] = []
    @State private var views: [KernView] = []
    @State private var rows: [KernRow] = []
    @State private var activeViewId: String?
    @State private var search = ""
    @State private var loading = true
    @State private var error: String?
    @State private var bulkSelected = Set<String>()
    @State private var addFieldPresented = false
    @State private var newFieldName = ""
    @State private var newFieldType: FieldType = .text

    private typealias VType = KernViewType

    var body: some View {
        Group {
            if loading {
                ProgressView()
                    .tint(theme.text3)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error {
                Text(error)
                    .foregroundStyle(theme.danger)
                    .padding()
            } else if collection == nil {
                Text("Collection not found")
                    .foregroundStyle(theme.text2)
            } else {
                content
            }
        }
        .task(id: slug) { await loadAll() }
    }

    private var activeView: KernView? {
        guard let id = activeViewId else { return views.first }
        return views.first { $0.id == id } ?? views.first
    }

    @ViewBuilder
    private var content: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            viewTabs
            searchBar
            if let v = activeView, let c = collection {
                viewBody(view: v, collection: c)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .sheet(isPresented: $addFieldPresented) {
            addFieldSheet
                .kernSharpSheetChrome(theme)
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(collection?.name ?? "")
                    .font(KernFont.ui(20, weight: .semibold))
                    .foregroundStyle(theme.text)
                if let d = collection?.description, !d.isEmpty {
                    Text(d)
                        .font(KernFont.body(13))
                        .foregroundStyle(theme.text3)
                }
            }
            Spacer()
            Menu {
                Button("Add field") {
                    newFieldName = ""
                    addFieldPresented = true
                }
                Button("Add row (quick)") {
                    Task { await createEmptyRow() }
                }
                Button("New row…") {
                    guard let col = collection else { return }
                    onOpenRow(col.id, nil, fields)
                }
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(theme.accent)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private var viewTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 0) {
                ForEach(views) { v in
                    Button {
                        activeViewId = v.id
                    } label: {
                        Text(v.name)
                            .font(KernFont.ui(13, weight: .medium))
                            .foregroundStyle(activeViewId == v.id || (activeViewId == nil && v.id == views.first?.id) ? theme.text : theme.text3)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(
                                (activeViewId == v.id || (activeViewId == nil && v.id == views.first?.id))
                                    ? theme.bg2 : Color.clear
                            )
                            .overlay(alignment: .bottom) {
                                if activeViewId == v.id || (activeViewId == nil && v.id == views.first?.id) {
                                    Rectangle()
                                        .fill(theme.accent)
                                        .frame(height: 2)
                                }
                            }
                    }
                    .buttonStyle(.plain)
                }
                Menu {
                    ForEach(
                        [VType.table, .list, .kanban, .calendar, .gallery, .custom],
                        id: \.self
                    ) { t in
                        Button(defaultName(t)) {
                            Task { await addView(type: t) }
                        }
                    }
                } label: {
                    Image(systemName: "plus")
                        .padding(.horizontal, 12)
                        .foregroundStyle(theme.text3)
                }
            }
        }
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(theme.border)
                .frame(height: 1)
        }
        .kernNoOverscroll([.horizontal])
    }

    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(theme.text3)
            TextField("Search rows", text: $search)
                .font(KernFont.body(14))
                .foregroundStyle(theme.text)
        }
        .padding(10)
        .background(theme.bg1)
        .overlay(
            RoundedRectangle(cornerRadius: 0)
                .stroke(theme.border, lineWidth: 1)
        )
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    @ViewBuilder
    private func viewBody(view: KernView, collection: KernCollection) -> some View {
        let visible = fields.filter { f in !view.config.hidden_fields.contains(f.slug) }
        let filtered = RowFilterSort.applyFilters(rows, filters: view.config.filters, fields: fields)
        let sorted = RowFilterSort.applySorts(filtered, sorts: view.config.sorts, fields: fields)
        let q = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let displayRows: [KernRow] = q.isEmpty
            ? sorted
            : sorted.filter { RowFilterSort.primarySearchText($0, fields: fields).lowercased().contains(q) }

        VStack(spacing: 0) {
            if !bulkSelected.isEmpty {
                HStack {
                    Text("\(bulkSelected.count) selected")
                        .font(KernFont.label(13))
                        .foregroundStyle(theme.text2)
                    Spacer()
                    Button("Delete") {
                        Task { await deleteBulk() }
                    }
                    .foregroundStyle(theme.danger)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(theme.bg1)
            }

            switch view.type {
            case .table:
                TableRowsView(
                    rows: displayRows,
                    fields: visible,
                    theme: theme,
                    selection: $bulkSelected,
                    onTap: { onOpenRow(collection.id, $0, fields) }
                )
            case .list:
                ListRowsView(
                    rows: displayRows,
                    fields: visible,
                    theme: theme,
                    onTap: { onOpenRow(collection.id, $0, fields) }
                )
            case .kanban:
                KanbanRowsView(
                    rows: displayRows,
                    fields: visible,
                    groupField: resolvedGroupField(view: view, fields: visible),
                    theme: theme,
                    onTap: { onOpenRow(collection.id, $0, fields) },
                    onMove: { row, optionId in
                        Task { await updateRowGroup(row, optionId: optionId, view: view, fields: fields) }
                    }
                )
            case .calendar:
                CalendarRowsView(rows: displayRows, fields: visible, dateSlug: view.config.calendar_date_field, theme: theme) {
                    onOpenRow(collection.id, $0, fields)
                }
            case .gallery:
                GalleryRowsView(rows: displayRows, fields: visible, coverSlug: view.config.gallery_cover_field, theme: theme) {
                    onOpenRow(collection.id, $0, fields)
                }
            case .custom:
                CustomViewPlaceholder(theme: theme)
            }
        }
    }

    private var addFieldSheet: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                KernTextField(title: "Field name", text: $newFieldName, placeholder: "Status")
                Picker("Type", selection: $newFieldType) {
                    ForEach(FieldType.allCases, id: \.self) { t in
                        Text(t.rawValue.replacingOccurrences(of: "_", with: " ")).tag(t)
                    }
                }
                .pickerStyle(.menu)
                KernButton(title: "Add field", variant: .primary) {
                    Task { await createField() }
                }
                Spacer()
            }
            .padding(20)
            .background(theme.bg0)
            .navigationTitle("New field")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { addFieldPresented = false }
                }
            }
        }
    }

    private func loadAll() async {
        loading = true
        error = nil
        defer { loading = false }
        do {
            guard let c = try await app.data.fetchCollection(slug: slug) else {
                collection = nil
                return
            }
            collection = c
            fields = try await app.data.fetchFields(collectionId: c.id)
            var v = try await app.data.fetchViews(collectionId: c.id)
            if v.isEmpty, let uid = app.session?.user.id.uuidString {
                try await app.data.createView(userId: uid, collectionId: c.id, type: .table, name: "Table")
                v = try await app.data.fetchViews(collectionId: c.id)
            }
            views = v
            activeViewId = v.first?.id
            rows = try await app.data.fetchRows(collectionId: c.id, fields: fields)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func createEmptyRow() async {
        guard let c = collection, let uid = app.session?.user.id.uuidString else { return }
        do {
            try await app.data.createRow(userId: uid, collectionId: c.id, data: [:])
            rows = try await app.data.fetchRows(collectionId: c.id, fields: fields)
        } catch {}
    }

    private func createField() async {
        guard let c = collection, let uid = app.session?.user.id.uuidString else { return }
        let n = newFieldName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !n.isEmpty else { return }
        do {
            try await app.data.createField(userId: uid, collectionId: c.id, name: n, type: newFieldType)
            addFieldPresented = false
            fields = try await app.data.fetchFields(collectionId: c.id)
        } catch {}
    }

    private func addView(type: KernViewType) async {
        guard let c = collection, let uid = app.session?.user.id.uuidString else { return }
        do {
            try await app.data.createView(userId: uid, collectionId: c.id, type: type, name: defaultName(type))
            views = try await app.data.fetchViews(collectionId: c.id)
            activeViewId = views.last?.id
        } catch {}
    }

    private func defaultName(_ t: KernViewType) -> String {
        switch t {
        case .table: return "Table"
        case .kanban: return "Kanban"
        case .calendar: return "Calendar"
        case .gallery: return "Gallery"
        case .list: return "List"
        case .custom: return "Custom"
        }
    }

    private func deleteBulk() async {
        guard let c = collection else { return }
        let ids = Array(bulkSelected)
        guard !ids.isEmpty else { return }
        do {
            try await app.data.deleteRows(ids: ids)
            bulkSelected.removeAll()
            rows = try await app.data.fetchRows(collectionId: c.id, fields: fields)
        } catch {}
    }

    private func resolvedGroupField(view: KernView, fields: [KernField]) -> KernField? {
        if let slug = view.config.group_by_field,
           let f = fields.first(where: { $0.slug == slug }),
           f.type == .select || f.type == .multi_select {
            return f
        }
        return fields.first(where: { $0.type == .select })
            ?? fields.first(where: { $0.type == .multi_select })
    }

    private func updateRowGroup(_ row: KernRow, optionId: String?, view: KernView, fields allFields: [KernField]) async {
        let groupField = resolvedGroupField(view: view, fields: allFields)
        guard let slug = groupField?.slug else { return }
        let merge: [String: AnyCodableValue]
        switch groupField?.type {
        case .multi_select:
            if let optionId {
                merge = [slug: .array([.string(optionId)])]
            } else {
                merge = [slug: .array([])]
            }
        default:
            if let optionId {
                merge = [slug: .string(optionId)]
            } else {
                merge = [slug: .null]
            }
        }
        do {
            try await app.data.updateRow(id: row.id, mergeData: merge)
            if let c = collection {
                rows = try await app.data.fetchRows(collectionId: c.id, fields: fields)
            }
            var next = view.config
            if next.group_by_field == nil, let f = groupField {
                next.group_by_field = f.slug
            }
            try await app.data.updateViewConfig(viewId: view.id, mergedConfig: next)
        } catch {}
    }
}
