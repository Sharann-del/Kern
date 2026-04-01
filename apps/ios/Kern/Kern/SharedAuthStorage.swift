import Foundation
import Supabase
import Auth

/// A shared storage for Supabase Authentication that uses a UserDefaults App Group.
/// This allows the main app and the widget extension to share the same login session.
struct UserDefaultsAuthStorage: AuthLocalStorage {
    private let defaults: UserDefaults

    init(suiteName: String) {
        self.defaults = UserDefaults(suiteName: suiteName) ?? .standard
    }

    func store(key: String, value: Data) throws {
        defaults.set(value, forKey: key)
    }

    func retrieve(key: String) throws -> Data? {
        defaults.data(forKey: key)
    }

    func remove(key: String) throws {
        defaults.removeObject(forKey: key)
    }
}
