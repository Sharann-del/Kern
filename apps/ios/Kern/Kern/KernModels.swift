import Foundation

enum FieldType: String, Codable, CaseIterable, Sendable {
    case text, rich_text, number, date, datetime, boolean
    case select, multi_select, url, email, phone, relation, file
}

enum KernViewType: String, Codable, Sendable {
    case table, kanban, calendar, gallery, list, custom
}

enum FilterOperator: String, Codable, Sendable {
    case eq, neq, gt, lt, gte, lte, contains, not_contains
    case starts_with, ends_with, is_empty, is_not_empty
    case is_true, is_false, before, after, on
}

struct FilterRule: Codable, Equatable, Sendable, Identifiable {
    var id: String
    var field_slug: String
    var op: FilterOperator
    var value: AnyCodableValue?

    enum CodingKeys: String, CodingKey {
        case id, field_slug, value
        case op = "operator"
    }
}

struct SortRule: Codable, Equatable, Sendable, Identifiable {
    var id: String
    var field_slug: String
    var direction: String
}

struct ViewConfig: Codable, Equatable, Sendable {
    var hidden_fields: [String]
    var filters: [FilterRule]
    var sorts: [SortRule]
    var group_by_field: String?
    var calendar_date_field: String?
    var gallery_cover_field: String?
    var gallery_card_fields: [String]
    var gallery_card_size: String
    var table_column_widths: [String: Double]
    var kanban_collapsed_columns: [String]

    static let `default` = ViewConfig(
        hidden_fields: [],
        filters: [],
        sorts: [],
        group_by_field: nil,
        calendar_date_field: nil,
        gallery_cover_field: nil,
        gallery_card_fields: [],
        gallery_card_size: "medium",
        table_column_widths: [:],
        kanban_collapsed_columns: []
    )
}

struct UserPreferences: Codable, Equatable, Sendable {
    var theme: String
    var sidebar_collapsed: Bool
    var onboarded: Bool?

    static let darkDefault = UserPreferences(theme: "dark", sidebar_collapsed: false, onboarded: nil)
}

struct KernProfile: Equatable, Sendable {
    var id: String
    var email: String
    var full_name: String?
    var avatar_url: String?
    var preferences: UserPreferences
    var created_at: String
    var updated_at: String
}

struct KernCollection: Identifiable, Equatable, Sendable {
    var id: String
    var user_id: String
    var name: String
    var slug: String
    var icon: String?
    var color: String?
    var description: String?
    var is_live_source: Bool
    var live_source_type: String?
    var sort_order: Int
    var created_at: String
    var updated_at: String
    var row_count: Int
}

struct KernField: Identifiable, Equatable, Sendable {
    var id: String
    var collection_id: String
    var user_id: String
    var name: String
    var slug: String
    var type: FieldType
    var optionsJSON: String?
    var is_required: Bool
    var is_primary: Bool
    var is_hidden_by_default: Bool
    var sort_order: Int
    var created_at: String
}

struct KernRow: Identifiable, Equatable, Sendable {
    var id: String
    var collection_id: String
    var user_id: String
    var data: [String: AnyCodableValue]
    var external_id: String?
    var sort_order: Int
    var created_at: String
    var updated_at: String
    var relations: [String: [KernRow]]?
}

struct KernView: Identifiable, Equatable, Sendable {
    var id: String
    var collection_id: String
    var user_id: String
    var name: String
    var type: KernViewType
    var config: ViewConfig
    var custom_view_id: String?
    var sort_order: Int
    var created_at: String
    var updated_at: String
}

enum DashboardWidgetType: String, Codable, Sendable {
    case collection_stats, recent_rows, view_embed, live_source_status, quick_add
}

struct DashboardWidget: Identifiable, Equatable, Sendable {
    var id: String
    var user_id: String
    var type: DashboardWidgetType
    var title: String?
    var config: [String: AnyCodableValue]
    var position_x: Int
    var position_y: Int
    var width: Int
    var height: Int
    var created_at: String
    var updated_at: String
}

/// Loose JSON values for row `data` / widget config (Codable for persistence helpers).
enum AnyCodableValue: Equatable, Sendable, Codable {
    case string(String)
    case int(Int)
    case double(Double)
    case bool(Bool)
    case array([AnyCodableValue])
    case object([String: AnyCodableValue])
    case null

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null; return }
        if let b = try? c.decode(Bool.self) { self = .bool(b); return }
        if let i = try? c.decode(Int.self) { self = .int(i); return }
        if let d = try? c.decode(Double.self) { self = .double(d); return }
        if let s = try? c.decode(String.self) { self = .string(s); return }
        if let a = try? c.decode([AnyCodableValue].self) { self = .array(a); return }
        if let o = try? c.decode([String: AnyCodableValue].self) { self = .object(o); return }
        throw DecodingError.dataCorruptedError(in: c, debugDescription: "Unsupported JSON")
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .null: try c.encodeNil()
        case .bool(let v): try c.encode(v)
        case .int(let v): try c.encode(v)
        case .double(let v): try c.encode(v)
        case .string(let v): try c.encode(v)
        case .array(let v): try c.encode(v)
        case .object(let v): try c.encode(v)
        }
    }

    var stringValue: String {
        switch self {
        case .string(let s): return s
        case .int(let i): return String(i)
        case .double(let d): return String(d)
        case .bool(let b): return b ? "true" : "false"
        case .null: return ""
        default: return ""
        }
    }
}
