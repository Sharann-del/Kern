import SwiftUI
import UIKit

private struct TableScrollBounceOff: UIViewRepresentable {
    func makeUIView(context: Context) -> UIView {
        let v = UIView()
        v.isUserInteractionEnabled = false
        v.backgroundColor = .clear
        return v
    }

    func updateUIView(_ uiView: UIView, context: Context) {
        DispatchQueue.main.async {
            var walker: UIView? = uiView.superview
            while let cur = walker {
                if let sc = cur as? UIScrollView {
                    sc.bounces = false
                    sc.alwaysBounceVertical = false
                    sc.alwaysBounceHorizontal = false
                    return
                }
                walker = cur.superview
            }
        }
    }
}

struct KernFlowLayout: Layout {
    var spacing: CGFloat = 4
    var lineSpacing: CGFloat = 4

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxW = proposal.width ?? .infinity
        guard maxW.isFinite, maxW > 0 else {
            var tw: CGFloat = 0
            var th: CGFloat = 0
            for s in subviews {
                let sz = s.sizeThatFits(.unspecified)
                tw += sz.width + spacing
                th = max(th, sz.height)
            }
            return CGSize(width: max(tw - spacing, 0), height: th)
        }
        var lineW: CGFloat = 0
        var lineH: CGFloat = 0
        var totalH: CGFloat = 0
        var maxUsedW: CGFloat = 0
        for sub in subviews {
            let sz = sub.sizeThatFits(.unspecified)
            let chunk = lineW == 0 ? sz.width : sz.width + spacing
            if lineW + chunk > maxW && lineW > 0 {
                totalH += lineH + lineSpacing
                maxUsedW = max(maxUsedW, lineW)
                lineW = 0
                lineH = 0
            }
            lineW += (lineW > 0 ? spacing : 0) + sz.width
            lineH = max(lineH, sz.height)
        }
        totalH += lineH
        maxUsedW = max(maxUsedW, lineW)
        return CGSize(width: min(maxUsedW, maxW), height: max(totalH, lineH))
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let maxW = bounds.width
        var x = bounds.minX
        var y = bounds.minY
        var lineH: CGFloat = 0
        for sub in subviews {
            let sz = sub.sizeThatFits(.unspecified)
            if x + sz.width > bounds.minX + maxW && x > bounds.minX {
                y += lineH + lineSpacing
                x = bounds.minX
                lineH = 0
            }
            sub.place(
                at: CGPoint(x: x, y: y),
                anchor: .topLeading,
                proposal: ProposedViewSize(width: sz.width, height: sz.height)
            )
            x += sz.width + spacing
            lineH = max(lineH, sz.height)
        }
    }
}

private extension Color {
    static func kernOptionColor(_ hex: String, theme: KernThemeColors) -> Color {
        var s = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        guard s.hasPrefix("#") else { return theme.text2 }
        s.removeFirst()
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return theme.text2 }
        let r = Double((v >> 16) & 0xFF) / 255
        let g = Double((v >> 8) & 0xFF) / 255
        let b = Double(v & 0xFF) / 255
        return Color(.sRGB, red: r, green: g, blue: b, opacity: 1)
    }
}

struct KernSelectOption: Identifiable, Equatable, Hashable {
    let id: String
    let label: String
    let colorHex: String
}

struct TableRowsView: View {
    private let checkCol: CGFloat = 36
    private let colW: CGFloat = 140
    private let rowMinH: CGFloat = 40

    let rows: [KernRow]
    let fields: [KernField]
    let theme: KernThemeColors
    @Binding var selection: Set<String>
    var onTap: (KernRow) -> Void

    var body: some View {
        ScrollView([.horizontal, .vertical]) {
            VStack(alignment: .leading, spacing: 0) {
                HStack(spacing: 0) {
                    Rectangle()
                        .fill(theme.bg1)
                        .frame(width: checkCol, height: 36)
                        .overlay(Rectangle().stroke(theme.border, lineWidth: 0.5))
                    ForEach(fields) { f in
                        Text(f.name)
                            .font(KernFont.label(12))
                            .foregroundStyle(theme.text2)
                            .frame(width: colW, height: 36, alignment: .leading)
                            .padding(.horizontal, 8)
                            .background(theme.bg1)
                            .overlay(Rectangle().stroke(theme.border, lineWidth: 0.5))
                    }
                }
                ForEach(rows) { row in
                    HStack(alignment: .top, spacing: 0) {
                        Button {
                            if selection.contains(row.id) { selection.remove(row.id) } else { selection.insert(row.id) }
                        } label: {
                            Image(systemName: selection.contains(row.id) ? "checkmark.square.fill" : "square")
                                .font(.system(size: 16))
                                .foregroundStyle(theme.text2)
                        }
                        .buttonStyle(.plain)
                        .frame(width: checkCol)
                        .frame(minHeight: rowMinH)
                        .background(theme.bg0)
                        .overlay(Rectangle().stroke(theme.border, lineWidth: 0.5))
                        ForEach(fields) { f in
                            tableCell(row: row, field: f)
                                .frame(width: colW, alignment: .topLeading)
                                .frame(minHeight: rowMinH)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 8)
                                .background(theme.bg0)
                                .overlay(Rectangle().stroke(theme.border, lineWidth: 0.5))
                        }
                    }
                    .contentShape(Rectangle())
                    .onTapGesture {
                        onTap(row)
                    }
                }
            }
            .background(TableScrollBounceOff())
        }
        .kernNoOverscroll([.vertical, .horizontal])
    }

    @ViewBuilder
    private func tableCell(row: KernRow, field: KernField) -> some View {
        switch field.type {
        case .select:
            if let o = selectedOption(row: row, field: field) {
                selectPill(label: o.label, hex: o.colorHex)
            } else {
                Text("–")
                    .font(KernFont.body(13))
                    .foregroundStyle(theme.text3)
            }
        case .multi_select:
            let opts = selectedOptions(row: row, field: field)
            if opts.isEmpty {
                Text("–")
                    .font(KernFont.body(13))
                    .foregroundStyle(theme.text3)
            } else {
                KernFlowLayout(spacing: 4, lineSpacing: 4) {
                    ForEach(opts) { o in
                        selectPill(label: o.label, hex: o.colorHex)
                    }
                }
            }
        default:
            Text(FieldValueFormatter.string(row: row, field: field))
                .font(KernFont.body(13))
                .foregroundStyle(theme.text)
                .lineLimit(4)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private func selectedOption(row: KernRow, field: KernField) -> KernSelectOption? {
        let id = row.data[field.slug]?.stringValue ?? ""
        guard !id.isEmpty else { return nil }
        return FieldValueFormatter.selectOptions(field).first { $0.id == id }
    }

    private func selectedOptions(row: KernRow, field: KernField) -> [KernSelectOption] {
        guard case .array(let a) = row.data[field.slug] else { return [] }
        let all = FieldValueFormatter.selectOptions(field)
        return a.compactMap { sid in
            all.first { $0.id == sid.stringValue }
        }
    }

    @ViewBuilder
    private func selectPill(label: String, hex: String) -> some View {
        let c = Color.kernOptionColor(hex, theme: theme)
        Text(label)
            .font(KernFont.label(11))
            .foregroundStyle(c)
            .padding(.horizontal, 6)
            .padding(.vertical, 3)
            .background(c.opacity(0.16))
            .overlay(Rectangle().stroke(c.opacity(0.5), lineWidth: 1))
    }
}

// MARK: - List

struct ListRowsView: View {
    let rows: [KernRow]
    let fields: [KernField]
    let theme: KernThemeColors
    var onTap: (KernRow) -> Void

    var body: some View {
        List(rows) { row in
            Button {
                onTap(row)
            } label: {
                VStack(alignment: .leading, spacing: 6) {
                    if let primary = fields.first(where: { $0.is_primary }) {
                        Text(FieldValueFormatter.string(row: row, field: primary))
                            .font(KernFont.ui(16, weight: .semibold))
                            .foregroundStyle(theme.text)
                    }
                    ForEach(fields.filter { !$0.is_primary }) { f in
                        HStack {
                            Text(f.name)
                                .font(KernFont.label(12))
                                .foregroundStyle(theme.text3)
                            Spacer()
                            Text(FieldValueFormatter.string(row: row, field: f))
                                .font(KernFont.body(13))
                                .foregroundStyle(theme.text2)
                                .multilineTextAlignment(.trailing)
                        }
                    }
                }
                .padding(.vertical, 6)
            }
            .listRowBackground(theme.bg0)
            .listRowSeparatorTint(theme.border)
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
        .background(theme.bg0)
        .kernNoOverscroll([.vertical])
    }
}

// MARK: - Kanban

struct KanbanRowsView: View {
    let rows: [KernRow]
    let fields: [KernField]
    let groupField: KernField?
    let theme: KernThemeColors
    var onTap: (KernRow) -> Void
    /// `optionId` is an option id, or `nil` to clear (Other / uncategorized).
    var onMove: (KernRow, String?) -> Void

    private let unassigned = "uncategorized"

    var body: some View {
        let options = FieldValueFormatter.selectItems(groupField)
        let cols: [String] = options.isEmpty ? [unassigned] : options.map(\.id) + [unassigned]

        ScrollView(.horizontal, showsIndicators: false) {
            HStack(alignment: .top, spacing: 12) {
                ForEach(cols, id: \.self) { colId in
                    columnView(colId: colId, options: options)
                }
            }
            .padding(16)
        }
        .kernNoOverscroll([.horizontal, .vertical])
    }

    @ViewBuilder
    private func columnView(colId: String, options: [(id: String, label: String)]) -> some View {
        let title = options.first { $0.id == colId }?.label ?? (colId == unassigned ? "Other" : colId)
        let inCol = rows.filter { r in
            let key = FieldValueFormatter.kanbanColumnId(row: r, field: groupField)
            if colId == unassigned { return key == nil }
            return key == colId
        }
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(KernFont.label(13))
                .foregroundStyle(theme.text2)
                .padding(.bottom, 4)
            ScrollView(.vertical, showsIndicators: true) {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(inCol) { row in
                        kanbanCard(row: row, colId: colId, options: options)
                    }
                }
            }
            .frame(width: 220)
            .kernNoOverscroll([.vertical])
        }
        .frame(width: 220, alignment: .topLeading)
    }

    private func kanbanCard(
        row: KernRow,
        colId: String,
        options: [(id: String, label: String)]
    ) -> some View {
        Button {
            onTap(row)
        } label: {
            VStack(alignment: .leading, spacing: 4) {
                if let p = fields.first(where: { $0.is_primary }) {
                    Text(FieldValueFormatter.string(row: row, field: p))
                        .font(KernFont.label(14))
                        .foregroundStyle(theme.text)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(theme.bg1)
            .overlay(
                RoundedRectangle(cornerRadius: 0)
                    .stroke(theme.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .contextMenu {
            if colId != unassigned {
                Button("Move to Other") {
                    onMove(row, nil)
                }
            }
            ForEach(options.filter { $0.id != colId }, id: \.id) { opt in
                Button("Move to \(opt.label)") {
                    onMove(row, opt.id)
                }
            }
        }
    }
}

// MARK: - Calendar (month grid)

struct CalendarRowsView: View {
    let rows: [KernRow]
    let fields: [KernField]
    let dateSlug: String?
    let theme: KernThemeColors
    var onTap: (KernRow) -> Void

    @State private var monthOffset = 0

    var body: some View {
        let slug = dateSlug ?? fields.first { $0.type == .date || $0.type == .datetime }?.slug ?? ""
        ScrollView {
        VStack(spacing: 12) {
            HStack {
                Button { monthOffset -= 1 } label: { Image(systemName: "chevron.left").foregroundStyle(theme.text) }
                Spacer()
                Text(monthTitle)
                    .font(KernFont.label(15))
                    .foregroundStyle(theme.text)
                Spacer()
                Button { monthOffset += 1 } label: { Image(systemName: "chevron.right").foregroundStyle(theme.text) }
            }
            .padding(.horizontal, 16)
            let grid = calendarCells(slug: slug)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 4), count: 7), spacing: 4) {
                ForEach(0 ..< grid.count, id: \.self) { i in
                    let cell = grid[i]
                    VStack(alignment: .leading, spacing: 2) {
                        Text(cell.dayLabel)
                            .font(KernFont.label(11))
                            .foregroundStyle(theme.text3)
                        ForEach(cell.rows, id: \.id) { r in
                            Button {
                                onTap(r)
                            } label: {
                                Text(titleRow(r))
                                    .font(.system(size: 10))
                                    .lineLimit(2)
                                    .foregroundStyle(theme.text)
                                    .padding(4)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(theme.bg1)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .frame(minHeight: 64, alignment: .topLeading)
                    .padding(4)
                    .background(theme.bg0)
                    .overlay(Rectangle().stroke(theme.border.opacity(0.5), lineWidth: 0.5))
                }
            }
            .padding(.horizontal, 8)
        }
        .padding(.vertical, 8)
        }
        .kernNoOverscroll([.vertical])
    }

    private var monthTitle: String {
        let cal = Calendar.current
        var c = DateComponents()
        c.month = monthOffset
        let d = cal.date(byAdding: c, to: Date()) ?? Date()
        let f = DateFormatter()
        f.dateFormat = "LLLL yyyy"
        return f.string(from: d)
    }

    private struct CalCell {
        let dayLabel: String
        let rows: [KernRow]
    }

    private func calendarCells(slug: String) -> [CalCell] {
        let cal = Calendar.current
        var c = DateComponents()
        c.month = monthOffset
        let anchor = cal.date(byAdding: c, to: Date()) ?? Date()
        guard let range = cal.range(of: .day, in: .month, for: anchor),
              let startOfMonth = cal.date(from: cal.dateComponents([.year, .month], from: anchor))
        else { return [] }
        let firstWeekday = cal.component(.weekday, from: startOfMonth)
        let pad = (firstWeekday + 5) % 7
        var cells: [CalCell] = Array(repeating: CalCell(dayLabel: "", rows: []), count: pad)
        for day in range {
            guard let dayDate = cal.date(byAdding: .day, value: day - 1, to: startOfMonth) else { continue }
            let ymd = cal.dateComponents([.year, .month, .day], from: dayDate)
            let matching = rows.filter { r in
                guard let v = r.data[slug] else { return false }
                let s = v.stringValue
                guard let d = Date.kernParseLoose(s) else { return false }
                let rc = cal.dateComponents([.year, .month, .day], from: d)
                return rc.year == ymd.year && rc.month == ymd.month && rc.day == ymd.day
            }
            cells.append(CalCell(dayLabel: "\(day)", rows: matching))
        }
        while cells.count % 7 != 0 {
            cells.append(CalCell(dayLabel: "", rows: []))
        }
        return cells
    }

    private func titleRow(_ r: KernRow) -> String {
        if let p = fields.first(where: { $0.is_primary }) {
            return FieldValueFormatter.string(row: r, field: p)
        }
        return r.id.prefix(6).description
    }
}

// MARK: - Gallery

struct GalleryRowsView: View {
    let rows: [KernRow]
    let fields: [KernField]
    let coverSlug: String?
    let theme: KernThemeColors
    var onTap: (KernRow) -> Void

    private let cols = [GridItem(.adaptive(minimum: 140), spacing: 12)]

    var body: some View {
        let slug = coverSlug ?? fields.first { $0.type == .file || $0.type == .url }?.slug ?? ""
        ScrollView {
            LazyVGrid(columns: cols, spacing: 12) {
                ForEach(rows) { row in
                    Button {
                        onTap(row)
                    } label: {
                        VStack(alignment: .leading, spacing: 8) {
                            RoundedRectangle(cornerRadius: 0)
                                .fill(theme.bg2)
                                .aspectRatio(4 / 3, contentMode: .fit)
                                .overlay {
                                    Image(systemName: "photo")
                                        .foregroundStyle(theme.text3)
                                }
                            if let p = fields.first(where: { $0.is_primary }) {
                                Text(FieldValueFormatter.string(row: row, field: p))
                                    .font(KernFont.label(13))
                                    .foregroundStyle(theme.text)
                                    .lineLimit(2)
                            }
                            if !slug.isEmpty, let cf = fields.first(where: { $0.slug == slug }) {
                                Text(FieldValueFormatter.string(row: row, field: cf))
                                    .font(KernFont.body(11))
                                    .foregroundStyle(theme.text3)
                                    .lineLimit(1)
                            }
                        }
                        .padding(10)
                        .background(theme.bg1)
                        .overlay(
                            RoundedRectangle(cornerRadius: 0)
                                .stroke(theme.border, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(16)
        }
        .kernNoOverscroll([.vertical])
    }

}

// MARK: - Custom placeholder

struct CustomViewPlaceholder: View {
    let theme: KernThemeColors

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "curlybraces")
                .font(.system(size: 36))
                .foregroundStyle(theme.text3)
            Text("Custom views")
                .font(KernFont.label(16))
                .foregroundStyle(theme.text)
            Text("Edit and publish custom views in the Kern web app. This screen will render embedded views in a future update.")
                .font(KernFont.body(14))
                .foregroundStyle(theme.text2)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Formatting

enum FieldValueFormatter {
    /// Web `SELECT_COLORS` defaults (`apps/web/src/lib/constants.ts`).
    private static let selectFallbackColors: [String] = [
        "#f43f5e", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
        "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899",
    ]

    static func string(row: KernRow, field: KernField) -> String {
        if field.type == .relation, let rels = row.relations?[field.slug], let first = rels.first {
            return string(row: first, field: primaryFieldFallback(first))
        }
        let v = row.data[field.slug]
        switch field.type {
        case .boolean:
            if case .bool(let b) = v { return b ? "Yes" : "No" }
            return v?.stringValue ?? ""
        case .multi_select:
            if case .array(let a) = v {
                let items = selectOptions(field)
                return a.map { id in
                    items.first { $0.id == id.stringValue }?.label ?? id.stringValue
                }.joined(separator: ", ")
            }
            return ""
        case .select:
            let items = selectOptions(field)
            let id = v?.stringValue ?? ""
            return items.first { $0.id == id }?.label ?? id
        default:
            return v?.stringValue ?? ""
        }
    }

    static func selectOptions(_ field: KernField?) -> [KernSelectOption] {
        guard let field, let json = field.optionsJSON,
              let data = json.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let items = obj["items"] as? [[String: Any]] else { return [] }
        return items.enumerated().compactMap { idx, i in
            guard let id = i["id"] as? String, let label = i["label"] as? String else { return nil }
            let raw = (i["color"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let hex: String
            if raw.hasPrefix("#"), raw.count >= 4 {
                hex = raw
            } else {
                hex = selectFallbackColors[idx % selectFallbackColors.count]
            }
            return KernSelectOption(id: id, label: label, colorHex: hex)
        }
    }

    static func selectItems(_ field: KernField?) -> [(id: String, label: String)] {
        selectOptions(field).map { ($0.id, $0.label) }
    }

    /// Resolved column option id for Kanban (nil → “uncategorized” bucket).
    static func kanbanColumnId(row: KernRow, field: KernField?) -> String? {
        guard let field else { return nil }
        let v = row.data[field.slug]
        switch field.type {
        case .select:
            let s = v?.stringValue ?? ""
            if s.isEmpty { return nil }
            return s
        case .multi_select:
            guard case .array(let a) = v, let first = a.first else { return nil }
            let s = first.stringValue
            return s.isEmpty ? nil : s
        default:
            let s = v?.stringValue ?? ""
            return s.isEmpty ? nil : s
        }
    }

    private static func primaryFieldFallback(_ row: KernRow) -> KernField {
        KernField(
            id: "", collection_id: row.collection_id, user_id: row.user_id,
            name: "Name", slug: "name", type: .text, optionsJSON: nil,
            is_required: false, is_primary: true, is_hidden_by_default: false,
            sort_order: 0, created_at: row.created_at
        )
    }
}
