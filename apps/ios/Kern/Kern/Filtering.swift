import Foundation

enum RowFilterSort {
    static func applyFilters(_ rows: [KernRow], filters: [FilterRule], fields: [KernField]) -> [KernRow] {
        guard !filters.isEmpty else { return rows }
        return rows.filter { row in filters.allSatisfy { evaluateFilter(row, $0, fields) } }
    }

    static func applySorts(_ rows: [KernRow], sorts: [SortRule], fields: [KernField]) -> [KernRow] {
        guard !sorts.isEmpty else { return rows }
        var next = rows
        next.sort { a, b in
            for sort in sorts {
                let field = fields.first { $0.slug == sort.field_slug }
                let aVal = a.data[sort.field_slug]
                let bVal = b.data[sort.field_slug]
                if aVal == nil && bVal == nil { continue }
                if aVal == nil { return sort.direction == "asc" }
                if bVal == nil { return sort.direction != "asc" }
                let cmp = compareValues(aVal, bVal, field: field)
                if cmp != 0 {
                    return sort.direction == "asc" ? cmp < 0 : cmp > 0
                }
            }
            return false
        }
        return next
    }

    static func primarySearchText(_ row: KernRow, fields: [KernField]) -> String {
        guard let primary = fields.first(where: { $0.is_primary }) else {
            return row.data.values.map(\.stringValue).joined(separator: " ")
        }
        return row.data[primary.slug]?.stringValue ?? ""
    }

    private static func isEmptyValue(_ value: AnyCodableValue?) -> Bool {
        guard let value else { return true }
        switch value {
        case .null: return true
        case .string(let s): return s.isEmpty
        case .array(let a): return a.isEmpty
        default: return false
        }
    }

    private static func toDateMs(_ v: AnyCodableValue?) -> Double {
        guard let v else { return .nan }
        let s: String
        switch v {
        case .string(let x): s = x
        default: s = v.stringValue
        }
        return Date.kernParseLoose(s)?.timeIntervalSince1970 ?? .nan
    }

    private static func toYmd(_ v: AnyCodableValue?) -> String {
        guard let v else { return "" }
        let s: String
        switch v {
        case .string(let x): s = x
        default: s = v.stringValue
        }
        guard let d = Date.kernParseLoose(s) else { return "" }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withFullDate]
        return f.string(from: d)
    }

    private static func multiIds(_ value: AnyCodableValue?) -> [String] {
        guard case .array(let a) = value else { return [] }
        return a.map(\.stringValue)
    }

    private static func textEq(_ a: AnyCodableValue?, _ b: AnyCodableValue?) -> Bool {
        String(describing: a).lowercased() == String(describing: b).lowercased()
    }

    private static func resolveSelectOptionId(field: KernField?, filterValue: AnyCodableValue?) -> String {
        let raw = filterValue?.stringValue ?? ""
        guard field?.type == .select, let json = field?.optionsJSON,
              let data = json.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let items = obj["items"] as? [[String: Any]] else { return raw }
        if items.contains(where: { ($0["id"] as? String) == raw }) { return raw }
        let lower = raw.lowercased()
        if let hit = items.first(where: { (($0["label"] as? String)?.lowercased() == lower) }) {
            return (hit["id"] as? String) ?? raw
        }
        return raw
    }

    private static func evaluateFilter(_ row: KernRow, _ filter: FilterRule, _ fields: [KernField]) -> Bool {
        let field = fields.first { $0.slug == filter.field_slug }
        let value = row.data[filter.field_slug]
        let op = filter.op
        let fv = filter.value
        let ftype = field?.type

        switch op {
        case .is_empty: return isEmptyValue(value)
        case .is_not_empty: return !isEmptyValue(value)
        case .is_true: if case .bool(let b) = value { return b }; return value.map { $0.stringValue == "true" } ?? false
        case .is_false:
            if case .bool(let b) = value { return !b }
            return value == nil || value == .bool(false)
        default: break
        }

        switch op {
        case .contains:
            if ftype == .multi_select {
                return multiIds(value).contains(fv?.stringValue ?? "")
            }
            return value?.stringValue.lowercased().contains((fv?.stringValue ?? "").lowercased()) ?? false
        case .not_contains:
            if ftype == .multi_select {
                return !multiIds(value).contains(fv?.stringValue ?? "")
            }
            return !(value?.stringValue.lowercased().contains((fv?.stringValue ?? "").lowercased()) ?? false)
        case .starts_with:
            return value?.stringValue.lowercased().hasPrefix((fv?.stringValue ?? "").lowercased()) ?? false
        case .ends_with:
            return value?.stringValue.lowercased().hasSuffix((fv?.stringValue ?? "").lowercased()) ?? false
        case .eq:
            if ftype == .number {
                return (value?.doubleValue ?? .nan) == (fv?.doubleValue ?? .nan)
            }
            if ftype == .boolean {
                if case .bool(let x) = fv { return value == .bool(x) }
                return false
            }
            if ftype == .select {
                let id = resolveSelectOptionId(field: field, filterValue: fv)
                return value?.stringValue == id
            }
            if ftype == .date || ftype == .datetime {
                return toYmd(value) == toYmd(fv)
            }
            return textEq(value, fv)
        case .neq:
            if ftype == .number {
                return (value?.doubleValue ?? .nan) != (fv?.doubleValue ?? .nan)
            }
            if ftype == .select {
                let id = resolveSelectOptionId(field: field, filterValue: fv)
                return value?.stringValue != id
            }
            if ftype == .date || ftype == .datetime {
                return toYmd(value) != toYmd(fv)
            }
            return !textEq(value, fv)
        case .gt:
            let a = value?.doubleValue ?? .nan
            let b = fv?.doubleValue ?? .nan
            return !a.isNaN && !b.isNaN && a > b
        case .lt:
            let a = value?.doubleValue ?? .nan
            let b = fv?.doubleValue ?? .nan
            return !a.isNaN && !b.isNaN && a < b
        case .gte:
            if ftype == .date || ftype == .datetime {
                let a = toDateMs(value)
                let b = toDateMs(fv)
                return !a.isNaN && !b.isNaN && a >= b
            }
            let a = value?.doubleValue ?? .nan
            let b = fv?.doubleValue ?? .nan
            return !a.isNaN && !b.isNaN && a >= b
        case .lte:
            if ftype == .date || ftype == .datetime {
                let a = toDateMs(value)
                let b = toDateMs(fv)
                return !a.isNaN && !b.isNaN && a <= b
            }
            let a = value?.doubleValue ?? .nan
            let b = fv?.doubleValue ?? .nan
            return !a.isNaN && !b.isNaN && a <= b
        case .before:
            let a = toDateMs(value)
            let b = toDateMs(fv)
            return !a.isNaN && !b.isNaN && a < b
        case .after:
            let a = toDateMs(value)
            let b = toDateMs(fv)
            return !a.isNaN && !b.isNaN && a > b
        case .on:
            return toYmd(value) == toYmd(fv)
        default:
            return true
        }
    }

    private static func compareValues(_ a: AnyCodableValue?, _ b: AnyCodableValue?, field: KernField?) -> Int {
        switch field?.type {
        case .number:
            let x = a?.doubleValue ?? .nan
            let y = b?.doubleValue ?? .nan
            if x.isNaN || y.isNaN { return 0 }
            return x == y ? 0 : (x < y ? -1 : 1)
        case .date, .datetime:
            let x = toDateMs(a)
            let y = toDateMs(b)
            if x.isNaN || y.isNaN { return 0 }
            return x == y ? 0 : (x < y ? -1 : 1)
        case .boolean:
            let x = (a == .bool(true))
            let y = (b == .bool(true))
            return (x ? 1 : 0) - (y ? 1 : 0)
        case .select:
            let al = selectLabel(a, field: field)
            let bl = selectLabel(b, field: field)
            return al.localizedStandardCompare(bl).toSortInt
        case .multi_select:
            let al = multiLabel(a, field: field)
            let bl = multiLabel(b, field: field)
            return al.localizedStandardCompare(bl).toSortInt
        default:
            return (a?.stringValue ?? "").localizedStandardCompare(b?.stringValue ?? "").toSortInt
        }
    }

    private static func selectLabel(_ v: AnyCodableValue?, field: KernField?) -> String {
        let id = v?.stringValue ?? ""
        guard let json = field?.optionsJSON,
              let data = json.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let items = obj["items"] as? [[String: Any]],
              let hit = items.first(where: { ($0["id"] as? String) == id }) else { return id }
        return (hit["label"] as? String) ?? id
    }

    private static func multiLabel(_ v: AnyCodableValue?, field: KernField?) -> String {
        let ids = multiIds(v)
        guard let json = field?.optionsJSON,
              let data = json.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let items = obj["items"] as? [[String: Any]] else {
            return ids.sorted().joined(separator: ", ")
        }
        let labels = ids.map { id -> String in
            items.first { ($0["id"] as? String) == id }.flatMap { $0["label"] as? String } ?? id
        }.sorted()
        return labels.joined(separator: ", ")
    }
}

private extension AnyCodableValue {
    var doubleValue: Double {
        switch self {
        case .double(let d): return d
        case .int(let i): return Double(i)
        case .string(let s): return Double(s) ?? .nan
        default: return .nan
        }
    }
}

private extension ComparisonResult {
    var toSortInt: Int {
        switch self {
        case .orderedAscending: return -1
        case .orderedSame: return 0
        case .orderedDescending: return 1
        @unknown default: return 0
        }
    }
}

