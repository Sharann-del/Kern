import ActivityKit
import Foundation

struct CalendarLiveActivityAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var title: String
        var calendarName: String
        var location: String?
        var notes: String?
        var eventURL: String?
        var startDate: Date
        var endDate: Date
        var isAllDay: Bool
    }

    var eventId: String
}
