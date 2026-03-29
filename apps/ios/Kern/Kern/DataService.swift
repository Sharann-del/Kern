import Foundation
import Supabase

// MARK: - DTOs (internal)

private struct CollectionRowDTO: Decodable {
    struct RowCount: Decodable { let count: Int? }
    let id: String
    let user_id: String
    let name: String
    let slug: String
    let icon: String?
    let color: String?
    let description: String?
    let is_live_source: Bool?
    let live_source_type: String?
    let sort_order: Int?
    let created_at: String
    let updated_at: String
    let rows: [RowCount]?
}

private struct FieldRowDTO: Decodable {
    let id: String
    let collection_id: String
    let user_id: String
    let name: String
    let slug: String
    let type: String
    let options: AnyCodableValue?
    let is_required: Bool
    let is_primary: Bool
    let is_hidden_by_default: Bool
    let sort_order: Int
    let created_at: String
}

private struct ViewRowDTO: Decodable {
    let id: String
    let collection_id: String
    let user_id: String
    let name: String
    let type: String
    let config: AnyCodableValue?
    let custom_view_id: String?
    let sort_order: Int
    let created_at: String
    let updated_at: String
}

private struct RowDTO: Decodable {
    let id: String
    let collection_id: String
    let user_id: String
    let data: [String: AnyCodableValue]
    let external_id: String?
    let sort_order: Int
    let created_at: String
    let updated_at: String
}

private struct ProfileRowDTO: Decodable {
    let id: String
    let email: String?
    let full_name: String?
    let avatar_url: String?
    let preferences: AnyCodableValue?
    let created_at: String
    let updated_at: String
}

private struct WidgetRowDTO: Decodable {
    let id: String
    let user_id: String
    let type: String
    let title: String?
    let config: AnyCodableValue?
    let position_x: Int
    let position_y: Int
    let width: Int
    let height: Int
    let created_at: String
    let updated_at: String
}

private struct RelationJoinRow: Decodable {
    let field_id: String
    let source_row_id: String
    let target_row: RowDTO?
}

// MARK: - Service

@MainActor
final class DataService {
    let client: SupabaseClient

    init(client: SupabaseClient) {
        self.client = client
    }

    // MARK: Profile

    func fetchProfile(userId: String) async throws -> KernProfile {
        let row: ProfileRowDTO = try await client.from("profiles")
            .select()
            .eq("id", value: userId)
            .single()
            .execute()
            .value
        return mapProfile(row)
    }

    func updateProfile(userId: String, fullName: String?, preferences: UserPreferences?) async throws {
        struct Patch: Encodable {
            var full_name: String?
            var preferences: [String: AnyJSON]?
        }
        var prefJSON: [String: AnyJSON]?
        if let preferences {
            prefJSON = [
                "theme": .string(preferences.theme),
                "sidebar_collapsed": .bool(preferences.sidebar_collapsed),
                "onboarded": preferences.onboarded.map { .bool($0) } ?? .null,
            ]
        }
        let patch = Patch(full_name: fullName, preferences: prefJSON)
        try await client.from("profiles")
            .update(patch)
            .eq("id", value: userId)
            .execute()
    }

    // MARK: Collections

    func fetchCollections() async throws -> [KernCollection] {
        let rows: [CollectionRowDTO] = try await client.from("collections")
            .select("*, rows(count)")
            .order("sort_order", ascending: true)
            .execute()
            .value
        return rows.map(mapCollection)
    }

    func fetchCollection(slug: String) async throws -> KernCollection? {
        do {
            let row: CollectionRowDTO = try await client.from("collections")
                .select("*, rows(count)")
                .eq("slug", value: slug)
                .single()
                .execute()
                .value
            return mapCollection(row)
        } catch {
            if (error as NSError).domain.contains("PGRST") { return nil }
            throw error
        }
    }

    func createCollection(userId: String, name: String, slug: String, icon: String?, color: String?, description: String?) async throws -> String {
        struct MaxSort: Decodable { let sort_order: Int? }
        let maxRows: [MaxSort] = try await client.from("collections")
            .select("sort_order")
            .order("sort_order", ascending: false)
            .limit(1)
            .execute()
            .value
        let nextSort = (maxRows.first?.sort_order ?? -1) + 1

        struct NewCol: Encodable {
            let user_id: String
            let name: String
            let slug: String
            let icon: String?
            let color: String?
            let description: String?
            let is_live_source: Bool
            let sort_order: Int
        }
        struct Created: Decodable { let id: String; let slug: String }
        let created: Created = try await client.from("collections")
            .insert(NewCol(
                user_id: userId,
                name: name,
                slug: slug,
                icon: icon,
                color: color,
                description: description,
                is_live_source: false,
                sort_order: nextSort
            ))
            .select("id, slug")
            .single()
            .execute()
            .value

        struct NewField: Encodable {
            let collection_id: String
            let user_id: String
            let name: String
            let slug: String
            let type: String
            let is_primary: Bool
            let sort_order: Int
        }
        try await client.from("fields").insert(NewField(
            collection_id: created.id,
            user_id: userId,
            name: "Name",
            slug: "name",
            type: "text",
            is_primary: true,
            sort_order: 0
        )).execute()

        return created.slug
    }

    func updateCollection(id: String, name: String, icon: String?, color: String?, description: String?) async throws {
        struct Patch: Encodable {
            let name: String
            let icon: String?
            let color: String?
            let description: String?
        }
        try await client.from("collections")
            .update(Patch(name: name, icon: icon, color: color, description: description))
            .eq("id", value: id)
            .execute()
    }

    func deleteCollection(id: String) async throws {
        try await client.from("collections").delete().eq("id", value: id).execute()
    }

    func reorderCollections(newOrder: [String]) async throws {
        struct SortPatch: Encodable { let sort_order: Int }
        for (idx, id) in newOrder.enumerated() {
            try await client.from("collections")
                .update(SortPatch(sort_order: idx))
                .eq("id", value: id)
                .execute()
        }
    }

    // MARK: Fields

    func fetchFields(collectionId: String) async throws -> [KernField] {
        let rows: [FieldRowDTO] = try await client.from("fields")
            .select()
            .eq("collection_id", value: collectionId)
            .order("sort_order", ascending: true)
            .execute()
            .value
        return rows.map(mapField)
    }

    func createField(userId: String, collectionId: String, name: String, type: FieldType) async throws {
        let slug = try await nextUniqueFieldSlug(collectionId: collectionId, baseName: name)
        struct MaxSort: Decodable { let sort_order: Int? }
        let maxRows: [MaxSort] = try await client.from("fields")
            .select("sort_order")
            .eq("collection_id", value: collectionId)
            .order("sort_order", ascending: false)
            .limit(1)
            .execute()
            .value
        let sort = (maxRows.first?.sort_order ?? -1) + 1
        struct Ins: Encodable {
            let collection_id: String
            let user_id: String
            let name: String
            let slug: String
            let type: String
            let is_required: Bool
            let is_primary: Bool
            let is_hidden_by_default: Bool
            let sort_order: Int
        }
        try await client.from("fields").insert(Ins(
            collection_id: collectionId,
            user_id: userId,
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            slug: slug,
            type: type.rawValue,
            is_required: false,
            is_primary: false,
            is_hidden_by_default: false,
            sort_order: sort
        )).execute()
    }

    func deleteField(id: String, collectionId: String, slug: String) async throws {
        try await client.from("fields").delete().eq("id", value: id).execute()
        struct RpcParams: Encodable {
            let p_collection_id: String
            let p_field_slug: String
        }
        try await client.rpc("remove_field_from_rows", params: RpcParams(
            p_collection_id: collectionId,
            p_field_slug: slug
        )).execute()
    }

    private func nextUniqueFieldSlug(collectionId: String, baseName: String) async throws -> String {
        let base = KernSlugify.slugify(baseName).isEmpty ? "field" : KernSlugify.slugify(baseName)
        struct SlugRow: Decodable { let slug: String }
        let rows: [SlugRow] = try await client.from("fields")
            .select("slug")
            .eq("collection_id", value: collectionId)
            .execute()
            .value
        let taken = Set(rows.map(\.slug))
        if !taken.contains(base) { return base }
        var n = 2
        while taken.contains("\(base)-\(n)") { n += 1 }
        return "\(base)-\(n)"
    }

    // MARK: Views

    func fetchViews(collectionId: String) async throws -> [KernView] {
        let rows: [ViewRowDTO] = try await client.from("views")
            .select()
            .eq("collection_id", value: collectionId)
            .order("sort_order", ascending: true)
            .execute()
            .value
        return rows.map(mapView)
    }

    func createView(userId: String, collectionId: String, type: KernViewType, name: String) async throws {
        struct MaxSort: Decodable { let sort_order: Int? }
        let maxRows: [MaxSort] = try await client.from("views")
            .select("sort_order")
            .eq("collection_id", value: collectionId)
            .order("sort_order", ascending: false)
            .limit(1)
            .execute()
            .value
        let sort = (maxRows.first?.sort_order ?? -1) + 1
        let configAny = try AnyJSON(ViewConfig.default)
        struct Ins: Encodable {
            let collection_id: String
            let user_id: String
            let name: String
            let type: String
            let config: AnyJSON
            let sort_order: Int
        }
        try await client.from("views").insert(Ins(
            collection_id: collectionId,
            user_id: userId,
            name: name,
            type: type.rawValue,
            config: configAny,
            sort_order: sort
        )).execute()
    }

    func updateViewConfig(viewId: String, mergedConfig: ViewConfig) async throws {
        let aj = try AnyJSON(mergedConfig)
        struct Patch: Encodable { let config: AnyJSON }
        try await client.from("views")
            .update(Patch(config: aj))
            .eq("id", value: viewId)
            .execute()
    }

    // MARK: Rows

    func fetchRows(collectionId: String, fields: [KernField]) async throws -> [KernRow] {
        let rowDbs: [RowDTO] = try await client.from("rows")
            .select()
            .eq("collection_id", value: collectionId)
            .order("sort_order", ascending: true)
            .execute()
            .value
        let relFields = fields.filter { $0.type == .relation }
        if relFields.isEmpty || rowDbs.isEmpty {
            return rowDbs.map(mapRow)
        }
        let rowIds = rowDbs.map(\.id)
        let relData: [RelationJoinRow] = try await client.from("row_relations")
            .select("""
                field_id,
                source_row_id,
                target_row:rows!row_relations_target_row_id_fkey (
                    id, collection_id, user_id, data, external_id, sort_order, created_at, updated_at
                )
            """)
            .in("source_row_id", values: rowIds)
            .order("created_at", ascending: true)
            .execute()
            .value

        var fieldIdToSlug: [String: String] = [:]
        for f in fields { fieldIdToSlug[f.id] = f.slug }
        var relBySource: [String: [String: [KernRow]]] = [:]
        for rel in relData {
            guard let target = rel.target_row else { continue }
            guard let slug = fieldIdToSlug[rel.field_id] else { continue }
            let kern = mapRow(target)
            if relBySource[rel.source_row_id] == nil { relBySource[rel.source_row_id] = [:] }
            relBySource[rel.source_row_id]?[slug, default: []].append(kern)
        }
        return rowDbs.map { r in
            var k = mapRow(r)
            if let rels = relBySource[r.id], !rels.isEmpty {
                k.relations = rels
            }
            return k
        }
    }

    func createRow(userId: String, collectionId: String, data: [String: AnyCodableValue]) async throws {
        struct MaxSort: Decodable { let sort_order: Int? }
        let maxRows: [MaxSort] = try await client.from("rows")
            .select("sort_order")
            .eq("collection_id", value: collectionId)
            .order("sort_order", ascending: false)
            .limit(1)
            .execute()
            .value
        let sort = (maxRows.first?.sort_order ?? -1) + 1
        let json = try rowDataToJSON(data)
        struct Ins: Encodable {
            let collection_id: String
            let user_id: String
            let data: AnyJSON
            let sort_order: Int
        }
        try await client.from("rows").insert(Ins(
            collection_id: collectionId,
            user_id: userId,
            data: json,
            sort_order: sort
        )).execute()
    }

    func updateRow(id: String, mergeData: [String: AnyCodableValue]) async throws {
        struct DataOnly: Decodable { let data: [String: AnyCodableValue] }
        let current: DataOnly = try await client.from("rows")
            .select("data")
            .eq("id", value: id)
            .single()
            .execute()
            .value
        var base = current.data
        for (k, v) in mergeData { base[k] = v }
        let json = try rowDataToJSON(base)
        struct Patch: Encodable { let data: AnyJSON }
        try await client.from("rows")
            .update(Patch(data: json))
            .eq("id", value: id)
            .execute()
    }

    func deleteRow(id: String) async throws {
        try await client.from("rows").delete().eq("id", value: id).execute()
    }

    func deleteRows(ids: [String]) async throws {
        guard !ids.isEmpty else { return }
        try await client.from("rows").delete().in("id", values: ids).execute()
    }

    // MARK: Relations

    func addRelation(userId: String, sourceRowId: String, targetRowId: String, fieldId: String) async throws {
        struct Ins: Encodable {
            let source_row_id: String
            let target_row_id: String
            let field_id: String
            let user_id: String
        }
        try await client.from("row_relations").insert(Ins(
            source_row_id: sourceRowId,
            target_row_id: targetRowId,
            field_id: fieldId,
            user_id: userId
        )).execute()
    }

    func removeRelation(id: String) async throws {
        try await client.from("row_relations").delete().eq("id", value: id).execute()
    }

    func fetchRelationsForRow(rowId: String) async throws -> [String: [(relationId: String, row: KernRow)]] {
        struct RelRow: Decodable {
            let id: String
            let field_id: String
            let target_row: RowDTO?
        }
        let rows: [RelRow] = try await client.from("row_relations")
            .select("""
                id,
                field_id,
                target_row:rows!row_relations_target_row_id_fkey (
                    id, collection_id, user_id, data, external_id, sort_order, created_at, updated_at
                )
            """)
            .eq("source_row_id", value: rowId)
            .execute()
            .value
        var out: [String: [(relationId: String, row: KernRow)]] = [:]
        for r in rows {
            guard let t = r.target_row else { continue }
            out[r.field_id, default: []].append((r.id, mapRow(t)))
        }
        return out
    }

    // MARK: Dashboard widgets

    func fetchWidgets() async throws -> [DashboardWidget] {
        let rows: [WidgetRowDTO] = try await client.from("dashboard_widgets")
            .select()
            .order("position_y", ascending: true)
            .order("position_x", ascending: true)
            .execute()
            .value
        return rows.map(mapWidget)
    }

    func createWidget(userId: String, type: DashboardWidgetType, title: String?, x: Int, y: Int, w: Int, h: Int) async throws {
        struct Ins: Encodable {
            let user_id: String
            let type: String
            let title: String?
            let config: AnyJSON
            let position_x: Int
            let position_y: Int
            let width: Int
            let height: Int
        }
        let emptyConfig = AnyJSON.object([:])
        try await client.from("dashboard_widgets").insert(Ins(
            user_id: userId,
            type: type.rawValue,
            title: title,
            config: emptyConfig,
            position_x: x,
            position_y: y,
            width: w,
            height: h
        )).execute()
    }

    func deleteWidget(id: String) async throws {
        try await client.from("dashboard_widgets").delete().eq("id", value: id).execute()
    }

    // MARK: Storage (files)

    func uploadFile(bucket: String, path: String, data: Data, contentType: String) async throws {
        try await client.storage
            .from(bucket)
            .upload(path, data: data, options: FileOptions(contentType: contentType, upsert: true))
    }

    func publicURL(bucket: String, path: String) -> URL? {
        try? client.storage.from(bucket).getPublicURL(path: path)
    }

    // MARK: Edge function (MCP test)

    func invokeKernMcpToolsList(accessToken: String) async throws -> String {
        struct Body: Encodable { let method: String }
        let data = try await client.functions.invoke(
            "kern-mcp",
            options: FunctionInvokeOptions(
                method: .post,
                headers: ["Authorization": "Bearer \(accessToken)"],
                body: Body(method: "tools/list")
            )
        ) { d, _ in d }
        return String(data: data, encoding: .utf8) ?? "{}"
    }
}

// MARK: - Mappers

private func mapCollection(_ row: CollectionRowDTO) -> KernCollection {
    let count = row.rows?.first?.count ?? 0
    return KernCollection(
        id: row.id,
        user_id: row.user_id,
        name: row.name,
        slug: row.slug,
        icon: row.icon,
        color: row.color,
        description: row.description,
        is_live_source: row.is_live_source ?? false,
        live_source_type: row.live_source_type,
        sort_order: row.sort_order ?? 0,
        created_at: row.created_at,
        updated_at: row.updated_at,
        row_count: count
    )
}

private func mapField(_ row: FieldRowDTO) -> KernField {
    let type = FieldType(rawValue: row.type) ?? .text
    var optStr: String?
    if let o = row.options, o != .null {
        if let data = try? JSONEncoder().encode(AnyCodableWrapper(value: o)),
           let s = String(data: data, encoding: .utf8) {
            optStr = s
        }
    }
    return KernField(
        id: row.id,
        collection_id: row.collection_id,
        user_id: row.user_id,
        name: row.name,
        slug: row.slug,
        type: type,
        optionsJSON: optStr,
        is_required: row.is_required,
        is_primary: row.is_primary,
        is_hidden_by_default: row.is_hidden_by_default,
        sort_order: row.sort_order,
        created_at: row.created_at
    )
}

/// Wraps AnyCodableValue for JSONEncoder (re-encode as JSON tree).
private struct AnyCodableWrapper: Encodable {
    let value: AnyCodableValue
    func encode(to encoder: Encoder) throws { try value.encode(to: encoder) }
}

private func mapView(_ row: ViewRowDTO) -> KernView {
    let config: ViewConfig
    if let c = row.config {
        config = decodeViewConfig(c) ?? .default
    } else {
        config = .default
    }
    return KernView(
        id: row.id,
        collection_id: row.collection_id,
        user_id: row.user_id,
        name: row.name,
        type: KernViewType(rawValue: row.type) ?? .table,
        config: config,
        custom_view_id: row.custom_view_id,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at
    )
}

private func decodeViewConfig(_ v: AnyCodableValue) -> ViewConfig? {
    guard let data = try? JSONEncoder().encode(AnyCodableWrapper(value: v)),
          let o = try? JSONDecoder().decode(ViewConfig.self, from: data) else { return nil }
    return o
}

private func mapRow(_ row: RowDTO) -> KernRow {
    KernRow(
        id: row.id,
        collection_id: row.collection_id,
        user_id: row.user_id,
        data: row.data,
        external_id: row.external_id,
        sort_order: row.sort_order,
        created_at: row.created_at,
        updated_at: row.updated_at,
        relations: nil
    )
}

private func mapProfile(_ row: ProfileRowDTO) -> KernProfile {
    var prefs = UserPreferences.darkDefault
    if case .object(let dict) = row.preferences {
        if case .string(let t) = dict["theme"] { prefs.theme = t }
        if case .bool(let b) = dict["sidebar_collapsed"] { prefs.sidebar_collapsed = b }
        if case .bool(let o) = dict["onboarded"] { prefs.onboarded = o }
    }
    return KernProfile(
        id: row.id,
        email: row.email ?? "",
        full_name: row.full_name,
        avatar_url: row.avatar_url,
        preferences: prefs,
        created_at: row.created_at,
        updated_at: row.updated_at
    )
}

private func mapWidget(_ row: WidgetRowDTO) -> DashboardWidget {
    var cfg: [String: AnyCodableValue] = [:]
    if case .object(let o) = row.config { cfg = o }
    return DashboardWidget(
        id: row.id,
        user_id: row.user_id,
        type: DashboardWidgetType(rawValue: row.type) ?? .collection_stats,
        title: row.title,
        config: cfg,
        position_x: row.position_x,
        position_y: row.position_y,
        width: row.width,
        height: row.height,
        created_at: row.created_at,
        updated_at: row.updated_at
    )
}

private func rowDataToJSON(_ data: [String: AnyCodableValue]) throws -> AnyJSON {
    let enc = try JSONEncoder().encode(AnyCodableDictWrapper(dict: data))
    return try AnyJSON.decoder.decode(AnyJSON.self, from: enc)
}

private struct AnyCodableDictWrapper: Encodable {
    let dict: [String: AnyCodableValue]
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: DynamicKey.self)
        for (k, v) in dict {
            try c.encode(v, forKey: DynamicKey(stringValue: k)!)
        }
    }
}

private struct DynamicKey: CodingKey {
    var stringValue: String
    var intValue: Int?
    init?(stringValue: String) { self.stringValue = stringValue; intValue = nil }
    init?(intValue: Int) { return nil }
}

enum KernSlugify {
    static func slugify(_ text: String) -> String {
        let lower = text.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        let filtered = lower.unicodeScalars.filter { CharacterSet.alphanumerics.contains($0) || $0 == " " || $0 == "-" || $0 == "_" }
        let s = String(String.UnicodeScalarView(filtered))
        let parts = s.split { $0 == " " || $0 == "-" || $0 == "_" }.filter { !$0.isEmpty }
        return parts.joined(separator: "-")
    }
}
