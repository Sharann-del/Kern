import SwiftUI
import UniformTypeIdentifiers

struct RowEditorSheet: View {
    @Bindable var app: AppModel
    let collectionId: String
    let collectionSlug: String
    let row: KernRow?
    let fields: [KernField]
    var onDismiss: () -> Void
    @Environment(\.kernTheme) private var theme
    @State private var draft: [String: AnyCodableValue] = [:]
    @State private var saving = false
    @State private var relations: [String: [(relationId: String, row: KernRow)]] = [:]
    @State private var relationPicker: RelationPickerState?
    @State private var fileImportFieldSlug: String?

    struct RelationPickerState: Identifiable {
        let id = UUID()
        let field: KernField
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    ForEach(fields) { field in
                        fieldEditor(field)
                    }
                }
                .padding(20)
            }
            .kernNoOverscroll([.vertical])
            .background(theme.bg0)
            .navigationTitle(row == nil ? "New row" : "Edit row")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { onDismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if saving {
                        ProgressView()
                    } else {
                        Button("Save") {
                            Task { await save() }
                        }
                        .foregroundStyle(theme.accent)
                    }
                }
            }
            .onAppear {
                if let row {
                    draft = row.data
                } else {
                    draft = [:]
                }
                Task { await loadRelations() }
            }
            .fileImporter(
                isPresented: Binding(
                    get: { fileImportFieldSlug != nil },
                    set: { if !$0 { fileImportFieldSlug = nil } }
                ),
                allowedContentTypes: [.image, .pdf],
                allowsMultipleSelection: false
            ) { result in
                Task {
                    guard let slug = fileImportFieldSlug else { return }
                    defer { fileImportFieldSlug = nil }
                    guard case .success(let urls) = result, let url = urls.first else { return }
                    guard url.startAccessingSecurityScopedResource() else { return }
                    defer { url.stopAccessingSecurityScopedResource() }
                    guard let data = try? Data(contentsOf: url) else { return }
                    let ext = url.pathExtension.lowercased()
                    let mime = ext == "pdf" ? "application/pdf" : "image/jpeg"
                    await uploadRaw(data, fieldSlug: slug, contentType: mime)
                }
            }
            .sheet(item: $relationPicker) { state in
                RelationPickerSheet(
                    app: app,
                    field: state.field,
                    collectionId: collectionId,
                    onPick: { targetId in
                        Task { await addRelation(field: state.field, targetRowId: targetId) }
                        relationPicker = nil
                    },
                    onCancel: { relationPicker = nil }
                )
            }
        }
    }

    @ViewBuilder
    private func fieldEditor(_ field: KernField) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(field.name)
                .font(KernFont.label(13))
                .foregroundStyle(theme.text2)
            switch field.type {
            case .text, .email, .url, .phone:
                TextField("", text: bindingString(field.slug), axis: .vertical)
                    .font(KernFont.body(14))
                    .foregroundStyle(theme.text)
                    .padding(10)
                    .background(theme.bg2)
                    .overlay(Rectangle().stroke(theme.border, lineWidth: 1))
            case .number:
                TextField("", text: bindingNumberString(field.slug))
                    .keyboardType(.decimalPad)
                    .font(KernFont.body(14))
                    .foregroundStyle(theme.text)
                    .padding(10)
                    .background(theme.bg2)
                    .overlay(Rectangle().stroke(theme.border, lineWidth: 1))
            case .boolean:
                Toggle(isOn: bindingBool(field.slug)) {
                    EmptyView()
                }
                .tint(theme.accent)
            case .date, .datetime:
                TextField("ISO date", text: bindingString(field.slug))
                    .font(KernFont.body(14))
                    .foregroundStyle(theme.text)
                    .padding(10)
                    .background(theme.bg2)
                    .overlay(Rectangle().stroke(theme.border, lineWidth: 1))
            case .select:
                Picker("", selection: bindingStringEnum(field.slug)) {
                    Text("—").tag("")
                    ForEach(FieldValueFormatter.selectOptions(field)) { o in
                        Text(o.label).tag(o.id)
                    }
                }
                .pickerStyle(.menu)
                .tint(theme.text)
            case .multi_select:
                multiSelect(field)
            case .rich_text:
                TextField("", text: bindingString(field.slug), axis: .vertical)
                    .lineLimit(4 ... 12)
                    .font(KernFont.body(14))
                    .foregroundStyle(theme.text)
                    .padding(10)
                    .background(theme.bg2)
                    .overlay(Rectangle().stroke(theme.border, lineWidth: 1))
            case .relation:
                relationBlock(field)
            case .file:
                fileBlock(field)
            }
        }
    }

    private func multiSelect(_ field: KernField) -> some View {
        let items = FieldValueFormatter.selectOptions(field)
        let selected = Set(draft[field.slug].flatMap { v -> [String] in
            if case .array(let a) = v { return a.map(\.stringValue) }
            return []
        } ?? [])
        return VStack(alignment: .leading, spacing: 8) {
            ForEach(items, id: \.id) { o in
                Toggle(o.label, isOn: Binding(
                    get: { selected.contains(o.id) },
                    set: { on in
                        var next = selected
                        if on { next.insert(o.id) } else { next.remove(o.id) }
                        draft[field.slug] = .array(next.sorted().map { .string($0) })
                    }
                ))
                .tint(theme.accent)
            }
        }
    }

    @ViewBuilder
    private func relationBlock(_ field: KernField) -> some View {
        let rels = relations[field.id] ?? []
        if row == nil {
            Text("Save the row first, then open it again to add relations.")
                .font(KernFont.body(13))
                .foregroundStyle(theme.text3)
        } else {
            VStack(alignment: .leading, spacing: 8) {
            ForEach(rels, id: \.relationId) { entry in
                HStack {
                    Text(FieldValueFormatter.string(row: entry.row, field: primaryNameField(for: entry.row)))
                        .font(KernFont.body(13))
                        .foregroundStyle(theme.text)
                    Spacer()
                    Button("Remove") {
                        Task { try? await app.data.removeRelation(id: entry.relationId); await loadRelations() }
                    }
                    .font(KernFont.label(12))
                    .foregroundStyle(theme.danger)
                }
                .padding(8)
                .background(theme.bg1)
                .overlay(Rectangle().stroke(theme.border, lineWidth: 1))
            }
            Button("Add link") {
                relationPicker = RelationPickerState(field: field)
            }
            .font(KernFont.label(13))
            .foregroundStyle(theme.accent)
            }
        }
    }

    private func primaryNameField(for row: KernRow) -> KernField {
        KernField(
            id: "", collection_id: row.collection_id, user_id: row.user_id,
            name: "Name", slug: "name", type: .text, optionsJSON: nil,
            is_required: false, is_primary: true, is_hidden_by_default: false,
            sort_order: 0, created_at: row.created_at
        )
    }

    private func fileBlock(_ field: KernField) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(draft[field.slug]?.stringValue.isEmpty == false ? draft[field.slug]!.stringValue : "No file")
                .font(KernFont.body(13))
                .foregroundStyle(theme.text2)
            Button("Choose file…") {
                fileImportFieldSlug = field.slug
            }
            .font(KernFont.label(13))
            .foregroundStyle(theme.accent)
        }
    }

    private func bindingString(_ slug: String) -> Binding<String> {
        Binding(
            get: { draft[slug]?.stringValue ?? "" },
            set: { draft[slug] = $0.isEmpty ? .null : .string($0) }
        )
    }

    private func bindingNumberString(_ slug: String) -> Binding<String> {
        Binding(
            get: {
                guard let v = draft[slug] else { return "" }
                switch v {
                case .double(let d): return String(d)
                case .int(let i): return String(i)
                default: return v.stringValue
                }
            },
            set: {
                if $0.isEmpty { draft[slug] = .null; return }
                if let d = Double($0) { draft[slug] = .double(d) }
                else { draft[slug] = .string($0) }
            }
        )
    }

    private func bindingBool(_ slug: String) -> Binding<Bool> {
        Binding(
            get: {
                if case .bool(let b) = draft[slug] { return b }
                return false
            },
            set: { draft[slug] = .bool($0) }
        )
    }

    private func bindingStringEnum(_ slug: String) -> Binding<String> {
        Binding(
            get: { draft[slug]?.stringValue ?? "" },
            set: { draft[slug] = $0.isEmpty ? .null : .string($0) }
        )
    }

    private func loadRelations() async {
        guard let rid = row?.id else { return }
        do {
            relations = try await app.data.fetchRelationsForRow(rowId: rid)
        } catch {
            relations = [:]
        }
    }

    private func addRelation(field: KernField, targetRowId: String) async {
        guard let uid = app.session?.user.id.uuidString, let sid = row?.id else { return }
        try? await app.data.addRelation(userId: uid, sourceRowId: sid, targetRowId: targetRowId, fieldId: field.id)
        await loadRelations()
    }

    private func uploadRaw(_ data: Data, fieldSlug: String, contentType: String) async {
        guard let uid = app.session?.user.id.uuidString else { return }
        let ext = contentType.contains("pdf") ? "pdf" : "jpg"
        let name = UUID().uuidString + ".\(ext)"
        let path = "\(uid)/\(name)"
        do {
            try await app.data.uploadFile(bucket: "kern-files", path: path, data: data, contentType: contentType)
            draft[fieldSlug] = .string(path)
        } catch {}
    }

    private func save() async {
        guard let uid = app.session?.user.id.uuidString else { return }
        saving = true
        defer { saving = false }
        do {
            if let row {
                try await app.data.updateRow(id: row.id, mergeData: draft)
            } else {
                try await app.data.createRow(userId: uid, collectionId: collectionId, data: draft)
            }
            onDismiss()
        } catch {}
    }
}

struct RelationPickerSheet: View {
    @Bindable var app: AppModel
    let field: KernField
    let collectionId: String
    var onPick: (String) -> Void
    var onCancel: () -> Void
    @Environment(\.kernTheme) private var theme
    @State private var targets: [KernRow] = []
    @State private var targetFields: [KernField] = []
    @State private var loading = true

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView().tint(theme.text3)
                } else {
                    List(targets) { r in
                        Button {
                            onPick(r.id)
                        } label: {
                            Text(FieldValueFormatter.string(row: r, field: targetFields.first { $0.is_primary } ?? nameField))
                                .foregroundStyle(theme.text)
                        }
                        .listRowBackground(theme.bg0)
                    }
                    .listStyle(.plain)
                    .scrollContentBackground(.hidden)
                }
            }
            .background(theme.bg0)
            .navigationTitle("Link row")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { onCancel() }
                }
            }
            .task { await load() }
        }
    }

    private var nameField: KernField {
        KernField(
            id: "", collection_id: collectionId, user_id: "", name: "name", slug: "name", type: .text,
            optionsJSON: nil, is_required: false, is_primary: true, is_hidden_by_default: false,
            sort_order: 0, created_at: ""
        )
    }

    private func load() async {
        loading = true
        defer { loading = false }
        guard let json = field.optionsJSON,
              let data = json.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let tid = obj["target_collection_id"] as? String else { return }
        guard let col = app.collections.first(where: { $0.id == tid }) else { return }
        do {
            targetFields = try await app.data.fetchFields(collectionId: tid)
            targets = try await app.data.fetchRows(collectionId: col.id, fields: targetFields)
        } catch {}
    }
}
