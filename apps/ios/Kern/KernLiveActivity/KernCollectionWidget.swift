import Foundation
import SwiftUI
import WidgetKit
import Supabase

// MARK: - Design Tokens (hardcoded for widget)
private enum KW {
    static let bg0 = Color(red: 0.102, green: 0.102, blue: 0.094)        // #1A1A18
    static let bg1 = Color(red: 0.173, green: 0.173, blue: 0.165)        // #2C2C2A
    static let border = Color(red: 0.247, green: 0.239, blue: 0.220)     // #3F3D38
    static let text = Color(red: 0.961, green: 0.957, blue: 0.941)       // #F5F4F0
    static let text2 = Color(red: 0.910, green: 0.902, blue: 0.882)      // #E8E6E1
    static let text3 = Color(red: 0.612, green: 0.596, blue: 0.565)      // #9C9890
    static let accent = Color(red: 0.784, green: 0.659, blue: 0.294)     // #C8A84B
}

// MARK: - Models
struct CollectionWidgetRow: Identifiable {
    let id: String
    let primaryText: String
}

struct CollectionWidgetEntry: TimelineEntry {
    let date: Date
    let collectionName: String?
    let rows: [CollectionWidgetRow]
    let error: String?
}

// MARK: - Provider
struct CollectionWidgetProvider: AppIntentTimelineProvider {
    func placeholder(in context: Context) -> CollectionWidgetEntry {
        CollectionWidgetEntry(
            date: Date(),
            collectionName: "Tasks",
            rows: [
                CollectionWidgetRow(id: "1", primaryText: "Buy groceries"),
                CollectionWidgetRow(id: "2", primaryText: "Finish report"),
                CollectionWidgetRow(id: "3", primaryText: "Call mom")
            ],
            error: nil
        )
    }

    func snapshot(for configuration: CollectionWidgetIntent, in context: Context) async -> CollectionWidgetEntry {
        await fetchData(configuration: configuration)
    }

    func timeline(for configuration: CollectionWidgetIntent, in context: Context) async -> Timeline<CollectionWidgetEntry> {
        let entry = await fetchData(configuration: configuration)
        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    private func fetchData(configuration: CollectionWidgetIntent) async -> CollectionWidgetEntry {
        guard let col = configuration.collection else {
            return CollectionWidgetEntry(date: Date(), collectionName: nil, rows: [], error: "No collection selected. Long press to edit.")
        }

        guard let client = WidgetSupabase.client else {
            return CollectionWidgetEntry(date: Date(), collectionName: col.name, rows: [], error: "Not logged in or missing configuration.")
        }

        do {
            // Fetch primary field
            struct FieldDTO: Decodable { let slug: String }
            let fields: [FieldDTO] = try await client.from("fields")
                .select("slug")
                .eq("collection_id", value: col.id)
                .eq("is_primary", value: true)
                .limit(1)
                .execute()
                .value
            
            let primarySlug = fields.first?.slug ?? "name"
            
            // Fetch rows
            struct RowDTO: Decodable {
                let id: String
                let data: [String: AnyJSON]
            }
            let rows: [RowDTO] = try await client.from("rows")
                .select("id, data")
                .eq("collection_id", value: col.id)
                .order("sort_order", ascending: true)
                .limit(10)
                .execute()
                .value
            
            let widgetRows = rows.map { row in
                let text: String
                if case .string(let s) = row.data[primarySlug] {
                    text = s.isEmpty ? "Untitled" : s
                } else {
                    text = "Untitled"
                }
                return CollectionWidgetRow(id: row.id, primaryText: text)
            }
            
            return CollectionWidgetEntry(date: Date(), collectionName: col.name, rows: widgetRows, error: nil)

        } catch {
            return CollectionWidgetEntry(date: Date(), collectionName: col.name, rows: [], error: "Failed to load data.")
        }
    }
}

// MARK: - Widget
struct KernCollectionAppWidget: Widget {
    let kind: String = "KernCollectionWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(
            kind: kind,
            intent: CollectionWidgetIntent.self,
            provider: CollectionWidgetProvider()
        ) { entry in
            KernCollectionWidgetView(entry: entry)
                .containerBackground(KW.bg0, for: .widget)
        }
        .configurationDisplayName("Kern Collection")
        .description("Displays data from a selected Kern collection.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

// MARK: - UI Views
struct KernCollectionWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: CollectionWidgetEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(spacing: 6) {
                Image(systemName: "tray.full.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(KW.accent)
                Text(entry.collectionName ?? "Kern")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(KW.text)
                Spacer()
            }
            .padding(14)
            .background(KW.bg1)
            
            Rectangle()
                .fill(KW.border)
                .frame(height: 1)
            
            // Content
            if let error = entry.error {
                Spacer()
                Text(error)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(KW.text3)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 14)
                    .frame(maxWidth: .infinity)
                Spacer()
            } else if entry.rows.isEmpty {
                Spacer()
                VStack(spacing: 6) {
                    Image(systemName: "doc.text.magnifyingglass")
                        .font(.system(size: 24))
                        .foregroundStyle(KW.text3.opacity(0.4))
                    Text("No items")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(KW.text3)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    let maxRows = maxItems(for: family)
                    ForEach(Array(entry.rows.prefix(maxRows).enumerated()), id: \.element.id) { idx, row in
                        if idx > 0 {
                            Rectangle()
                                .fill(KW.border.opacity(0.5))
                                .frame(height: 1)
                                .padding(.leading, 14)
                        }
                        
                        Text(row.primaryText)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(KW.text2)
                            .lineLimit(1)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                    }
                    
                    let remaining = entry.rows.count - maxRows
                    if remaining > 0 {
                        Rectangle()
                            .fill(KW.border.opacity(0.5))
                            .frame(height: 1)
                            .padding(.leading, 14)
                        
                        Text("+\(remaining) more items")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(KW.accent)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                    }
                    Spacer(minLength: 0)
                }
            }
        }
    }
    
    private func maxItems(for family: WidgetFamily) -> Int {
        switch family {
        case .systemSmall: return 3
        case .systemMedium: return 3
        case .systemLarge: return 7
        default: return 3
        }
    }
}
