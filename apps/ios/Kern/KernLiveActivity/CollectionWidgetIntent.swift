import AppIntents
import Foundation
import Supabase

// MARK: - App Entity
struct KernCollectionEntity: AppEntity {
    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Kern Collection"
    static var defaultQuery = KernCollectionQuery()
    
    var id: String
    var name: String
    var slug: String
    
    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(stringLiteral: name)
    }
}

// MARK: - Query
struct KernCollectionQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [KernCollectionEntity] {
        let all = try await fetchCollections()
        return all.filter { identifiers.contains($0.id) }
    }
    
    func suggestedEntities() async throws -> [KernCollectionEntity] {
        try await fetchCollections()
    }
    
    private func fetchCollections() async throws -> [KernCollectionEntity] {
        guard let client = WidgetSupabase.client else { return [] }
        struct DTO: Decodable { let id: String; let name: String; let slug: String }
        let rows: [DTO] = try await client.from("collections")
            .select("id, name, slug")
            .order("sort_order", ascending: true)
            .execute()
            .value
        return rows.map { KernCollectionEntity(id: $0.id, name: $0.name, slug: $0.slug) }
    }
}

// MARK: - Intent
struct CollectionWidgetIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Kern Collection"
    static var description = IntentDescription("Displays data from a specific Kern collection on your Home Screen.")
    
    @Parameter(title: "Collection")
    var collection: KernCollectionEntity?
}

// MARK: - Supabase Client Helper (Shared across intents and widgets)
enum WidgetSupabase {
    static var client: SupabaseClient? {
        let bundle = Bundle.main
        var urlStr = (bundle.object(forInfoDictionaryKey: "SUPABASE_URL") as? String ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "\"", with: "")
        var key = (bundle.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "\"", with: "")
            
        guard let url = URL(string: urlStr), !key.isEmpty else { return nil }
        
        return SupabaseClient(
            supabaseURL: url,
            supabaseKey: key,
            options: SupabaseClientOptions(
                auth: SupabaseClientOptions.AuthOptions(
                    storage: UserDefaultsAuthStorage(suiteName: "group.sharann.kern")
                )
            )
        )
    }
}
