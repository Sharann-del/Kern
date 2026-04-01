import EventKit
import Foundation
import SwiftUI

// MARK: - Lightweight calendar event snapshot (value type, Sendable)

/// A sendable snapshot of an `EKEvent` so calendar data can cross actor boundaries
/// and be used in both the main app and the widget extension.
struct CalendarEventSnapshot: Identifiable, Sendable {
    let id: String
    let title: String
    let startDate: Date
    let endDate: Date
    let isAllDay: Bool
    let location: String?
    let notes: String?
    let calendarTitle: String
    let calendarColorHex: UInt32
    let status: Int // EKEventStatus raw value

    var calendarColor: Color {
        Color(
            red: Double((calendarColorHex >> 16) & 0xFF) / 255,
            green: Double((calendarColorHex >> 8) & 0xFF) / 255,
            blue: Double(calendarColorHex & 0xFF) / 255
        )
    }

    var isInProgress: Bool {
        let now = Date()
        if isAllDay {
            let cal = Calendar.current
            let dayStart = cal.startOfDay(for: startDate)
            guard let dayEnd = cal.date(byAdding: .day, value: 1, to: dayStart) else { return false }
            return now >= dayStart && now < dayEnd
        }
        return startDate <= now && now < endDate
    }

    var timeRangeText: String {
        if isAllDay { return "All day" }
        let fmt = DateFormatter()
        fmt.dateFormat = "h:mm a"
        return "\(fmt.string(from: startDate)) – \(fmt.string(from: endDate))"
    }

    var shortTimeText: String {
        if isAllDay { return "All day" }
        let fmt = DateFormatter()
        fmt.dateFormat = "h:mm a"
        return fmt.string(from: startDate)
    }
}

// MARK: - Lightweight reminder snapshot (value type, Sendable)

/// A sendable snapshot of an `EKReminder` for display alongside calendar events.
struct ReminderSnapshot: Identifiable, Sendable {
    let id: String
    let title: String
    let dueDate: Date?
    let isCompleted: Bool
    let priority: Int // 0 = none, 1 = high, 5 = medium, 9 = low
    let notes: String?
    let listTitle: String
    let listColorHex: UInt32

    var listColor: Color {
        Color(
            red: Double((listColorHex >> 16) & 0xFF) / 255,
            green: Double((listColorHex >> 8) & 0xFF) / 255,
            blue: Double(listColorHex & 0xFF) / 255
        )
    }

    var dueDateText: String {
        guard let due = dueDate else { return "" }
        let cal = Calendar.current
        if cal.isDateInToday(due) {
            let fmt = DateFormatter()
            fmt.dateFormat = "h:mm a"
            return fmt.string(from: due)
        }
        let fmt = DateFormatter()
        fmt.dateFormat = "MMM d, h:mm a"
        return fmt.string(from: due)
    }

    var priorityLabel: String? {
        switch priority {
        case 1...4: return "!!"
        case 5: return "!"
        case 6...9: return nil
        default: return nil
        }
    }
}

// MARK: - Unified calendar item for display

/// A single item in the calendar — either an event or a reminder.
enum CalendarItem: Identifiable, Sendable {
    case event(CalendarEventSnapshot)
    case reminder(ReminderSnapshot)

    var id: String {
        switch self {
        case .event(let e): return "ev_\(e.id)"
        case .reminder(let r): return "rm_\(r.id)"
        }
    }

    /// Sort key: events use startDate, reminders use dueDate (or .distantFuture if no due date).
    var sortDate: Date {
        switch self {
        case .event(let e): return e.startDate
        case .reminder(let r): return r.dueDate ?? .distantFuture
        }
    }

    var isAllDay: Bool {
        switch self {
        case .event(let e): return e.isAllDay
        case .reminder: return false
        }
    }

    /// The color hex to use for dot indicators.
    var colorHex: UInt32 {
        switch self {
        case .event(let e): return e.calendarColorHex
        case .reminder(let r): return r.listColorHex
        }
    }
}

// MARK: - Calendar Service

/// Shared calendar reading service. Works in both main app and widget extension contexts.
/// `EKEventStore` accesses the system calendar DB directly — no App Group needed.
enum CalendarService {

    // MARK: - Events

    /// Fetch events in a date range, returning lightweight snapshots.
    static func fetchEvents(from start: Date, to end: Date, store: EKEventStore? = nil) -> [CalendarEventSnapshot] {
        let eventStore = store ?? EKEventStore()
        let status = EKEventStore.authorizationStatus(for: .event)
        guard status == .fullAccess else { return [] }

        let predicate = eventStore.predicateForEvents(withStart: start, end: end, calendars: nil)
        let ekEvents = eventStore.events(matching: predicate)

        return ekEvents
            .filter { $0.status != .canceled }
            .map { snapshot(from: $0) }
            .sorted { a, b in
                if a.isAllDay != b.isAllDay { return !a.isAllDay }
                return a.startDate < b.startDate
            }
    }

    /// Today's events.
    static func fetchTodayEvents(store: EKEventStore? = nil) -> [CalendarEventSnapshot] {
        let cal = Calendar.current
        let start = cal.startOfDay(for: Date())
        guard let end = cal.date(byAdding: .day, value: 1, to: start) else { return [] }
        return fetchEvents(from: start, to: end, store: store)
    }

    /// Upcoming events for the next N days (including today).
    static func fetchUpcomingEvents(days: Int, store: EKEventStore? = nil) -> [CalendarEventSnapshot] {
        let cal = Calendar.current
        let start = cal.startOfDay(for: Date())
        guard let end = cal.date(byAdding: .day, value: days, to: start) else { return [] }
        return fetchEvents(from: start, to: end, store: store)
    }

    /// Fetch events for a specific month (full grid — includes leading/trailing days from adjacent months).
    static func fetchMonthEvents(year: Int, month: Int, store: EKEventStore? = nil) -> [CalendarEventSnapshot] {
        let cal = Calendar.current
        guard let monthStart = cal.date(from: DateComponents(year: year, month: month, day: 1)),
              let monthEnd = cal.date(byAdding: .month, value: 1, to: monthStart) else { return [] }

        let weekdayOfFirst = cal.component(.weekday, from: monthStart) - cal.firstWeekday
        let leadDays = (weekdayOfFirst + 7) % 7
        guard let gridStart = cal.date(byAdding: .day, value: -leadDays, to: monthStart),
              let gridEnd = cal.date(byAdding: .day, value: 42, to: gridStart) else {
            return fetchEvents(from: monthStart, to: monthEnd, store: store)
        }

        return fetchEvents(from: gridStart, to: gridEnd, store: store)
    }

    // MARK: - Reminders

    /// Fetch reminders with due dates in a given range. Uses the callback-based EKEventStore API wrapped in async.
    static func fetchReminders(from start: Date, to end: Date, store: EKEventStore? = nil) async -> [ReminderSnapshot] {
        let eventStore = store ?? EKEventStore()
        let status = EKEventStore.authorizationStatus(for: .reminder)
        guard status == .fullAccess else { return [] }

        let predicate = eventStore.predicateForReminders(in: nil)

        let ekReminders: [EKReminder] = await withCheckedContinuation { continuation in
            eventStore.fetchReminders(matching: predicate) { result in
                continuation.resume(returning: result ?? [])
            }
        }

        let cal = Calendar.current
        let startDay = cal.startOfDay(for: start)
        let endDay = cal.startOfDay(for: end)

        return ekReminders
            .compactMap { reminder -> ReminderSnapshot? in
                guard let dueDateComps = reminder.dueDateComponents,
                      let dueDate = cal.date(from: dueDateComps) else {
                    // Include undated incomplete reminders for "today" if the range includes today
                    if !reminder.isCompleted && cal.isDateInToday(start) {
                        return reminderSnapshot(from: reminder, dueDate: nil)
                    }
                    return nil
                }
                let dueDay = cal.startOfDay(for: dueDate)
                guard dueDay >= startDay && dueDay < endDay else { return nil }
                return reminderSnapshot(from: reminder, dueDate: dueDate)
            }
            .sorted { a, b in
                let aDate = a.dueDate ?? .distantFuture
                let bDate = b.dueDate ?? .distantFuture
                if a.isCompleted != b.isCompleted { return !a.isCompleted }
                return aDate < bDate
            }
    }

    /// Fetch today's reminders.
    static func fetchTodayReminders(store: EKEventStore? = nil) async -> [ReminderSnapshot] {
        let cal = Calendar.current
        let start = cal.startOfDay(for: Date())
        guard let end = cal.date(byAdding: .day, value: 1, to: start) else { return [] }
        return await fetchReminders(from: start, to: end, store: store)
    }

    /// Fetch reminders for a month grid range.
    static func fetchMonthReminders(year: Int, month: Int, store: EKEventStore? = nil) async -> [ReminderSnapshot] {
        let cal = Calendar.current
        guard let monthStart = cal.date(from: DateComponents(year: year, month: month, day: 1)),
              let monthEnd = cal.date(byAdding: .month, value: 1, to: monthStart) else { return [] }

        let weekdayOfFirst = cal.component(.weekday, from: monthStart) - cal.firstWeekday
        let leadDays = (weekdayOfFirst + 7) % 7
        guard let gridStart = cal.date(byAdding: .day, value: -leadDays, to: monthStart),
              let gridEnd = cal.date(byAdding: .day, value: 42, to: gridStart) else {
            return await fetchReminders(from: monthStart, to: monthEnd, store: store)
        }

        return await fetchReminders(from: gridStart, to: gridEnd, store: store)
    }

    // MARK: - Unified items

    /// Merge events and reminders into a unified sorted list of CalendarItems.
    static func mergeItems(events: [CalendarEventSnapshot], reminders: [ReminderSnapshot]) -> [CalendarItem] {
        var items: [CalendarItem] = events.map { .event($0) } + reminders.map { .reminder($0) }
        items.sort { a, b in
            // All-day events first, then sort by date
            if a.isAllDay != b.isAllDay { return a.isAllDay }
            return a.sortDate < b.sortDate
        }
        return items
    }

    /// Group unified items by calendar day.
    static func itemsByDate(_ items: [CalendarItem]) -> [Date: [CalendarItem]] {
        let cal = Calendar.current
        var map: [Date: [CalendarItem]] = [:]
        for item in items {
            switch item {
            case .event(let e):
                if e.isAllDay {
                    var day = cal.startOfDay(for: e.startDate)
                    let endDay = cal.startOfDay(for: e.endDate)
                    while day < endDay {
                        map[day, default: []].append(item)
                        guard let next = cal.date(byAdding: .day, value: 1, to: day) else { break }
                        day = next
                    }
                } else {
                    let day = cal.startOfDay(for: e.startDate)
                    map[day, default: []].append(item)
                }
            case .reminder(let r):
                if let due = r.dueDate {
                    let day = cal.startOfDay(for: due)
                    map[day, default: []].append(item)
                } else {
                    let today = cal.startOfDay(for: Date())
                    map[today, default: []].append(item)
                }
            }
        }
        return map
    }

    /// Group snapshots by calendar day (kept for backward compatibility with widgets).
    static func eventsByDate(_ events: [CalendarEventSnapshot]) -> [Date: [CalendarEventSnapshot]] {
        let cal = Calendar.current
        var map: [Date: [CalendarEventSnapshot]] = [:]
        for e in events {
            if e.isAllDay {
                var day = cal.startOfDay(for: e.startDate)
                let endDay = cal.startOfDay(for: e.endDate)
                while day < endDay {
                    map[day, default: []].append(e)
                    guard let next = cal.date(byAdding: .day, value: 1, to: day) else { break }
                    day = next
                }
            } else {
                let day = cal.startOfDay(for: e.startDate)
                map[day, default: []].append(e)
            }
        }
        return map
    }

    // MARK: - Toggle reminder completion

    /// Toggle the completion status of a reminder by its identifier.
    static func toggleReminderCompletion(id: String, store: EKEventStore) -> Bool {
        guard let item = store.calendarItem(withIdentifier: id) as? EKReminder else { return false }
        item.isCompleted = !item.isCompleted
        if item.isCompleted {
            item.completionDate = Date()
        }
        do {
            try store.save(item, commit: true)
            return true
        } catch {
            return false
        }
    }

    // MARK: - Permission

    /// Request full access to reminders.
    static func requestRemindersAccess(store: EKEventStore) async -> Bool {
        if EKEventStore.authorizationStatus(for: .reminder) == .fullAccess { return true }
        do {
            return try await store.requestFullAccessToReminders()
        } catch {
            return false
        }
    }

    // MARK: - Private

    private static func snapshot(from event: EKEvent) -> CalendarEventSnapshot {
        CalendarEventSnapshot(
            id: event.eventIdentifier ?? UUID().uuidString,
            title: event.title?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
                ? event.title! : "Event",
            startDate: event.startDate,
            endDate: event.endDate,
            isAllDay: event.isAllDay,
            location: {
                let loc = event.location?.trimmingCharacters(in: .whitespacesAndNewlines)
                return (loc?.isEmpty == false) ? loc : nil
            }(),
            notes: {
                let n = event.notes?.trimmingCharacters(in: .whitespacesAndNewlines)
                return (n?.isEmpty == false) ? n : nil
            }(),
            calendarTitle: event.calendar?.title ?? "",
            calendarColorHex: cgColorToHex(event.calendar?.cgColor),
            status: event.status.rawValue
        )
    }

    private static func reminderSnapshot(from reminder: EKReminder, dueDate: Date?) -> ReminderSnapshot {
        ReminderSnapshot(
            id: reminder.calendarItemIdentifier,
            title: reminder.title?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
                ? reminder.title! : "Reminder",
            dueDate: dueDate,
            isCompleted: reminder.isCompleted,
            priority: Int(reminder.priority),
            notes: {
                let n = reminder.notes?.trimmingCharacters(in: .whitespacesAndNewlines)
                return (n?.isEmpty == false) ? n : nil
            }(),
            listTitle: reminder.calendar?.title ?? "",
            listColorHex: cgColorToHex(reminder.calendar?.cgColor)
        )
    }

    private static func cgColorToHex(_ cgColor: CGColor?) -> UInt32 {
        guard let cgColor,
              let rgb = cgColor.converted(to: CGColorSpaceCreateDeviceRGB(), intent: .defaultIntent, options: nil),
              let comps = rgb.components, comps.count >= 3 else {
            return 0x9C9890 // fallback: Kern text tertiary
        }
        let r = UInt32(min(255, max(0, comps[0] * 255)).rounded())
        let g = UInt32(min(255, max(0, comps[1] * 255)).rounded())
        let b = UInt32(min(255, max(0, comps[2] * 255)).rounded())
        return (r << 16) | (g << 8) | b
    }
}
