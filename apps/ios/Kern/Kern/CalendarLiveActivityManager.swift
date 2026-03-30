import ActivityKit
import EventKit
import Foundation

enum KernCalendarLiveActivityPreferences {
    static let liveActivitiesEnabledKey = "kernCalendarLiveActivitiesEnabled"

    static var isLiveActivitiesEnabled: Bool {
        get {
            if UserDefaults.standard.object(forKey: liveActivitiesEnabledKey) == nil {
                return true
            }
            return UserDefaults.standard.bool(forKey: liveActivitiesEnabledKey)
        }
        set { UserDefaults.standard.set(newValue, forKey: liveActivitiesEnabledKey) }
    }
}

/// Syncs in-progress Apple Calendar events with Live Activities (up to 8 concurrent).
@MainActor
final class CalendarLiveActivityManager {
    static let shared = CalendarLiveActivityManager()

    private let eventStore = EKEventStore()
    private var debounceTask: Task<Void, Never>?
    private var storeObserver: NSObjectProtocol?

    private init() {
        storeObserver = NotificationCenter.default.addObserver(
            forName: .EKEventStoreChanged,
            object: eventStore,
            queue: .main
        ) { [weak self] _ in
            self?.scheduleSync()
        }
    }

    deinit {
        if let storeObserver {
            NotificationCenter.default.removeObserver(storeObserver)
        }
    }

    /// Debounced so bursts of `EKEventStoreChanged` do not spam sync.
    func scheduleSync() {
        debounceTask?.cancel()
        debounceTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }
            await self?.syncWithCalendar()
        }
    }

    func syncWithCalendar() async {
        guard KernCalendarLiveActivityPreferences.isLiveActivitiesEnabled else {
            await endAllActivities()
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            await endAllActivities()
            return
        }

        let status = EKEventStore.authorizationStatus(for: .event)
        guard status == .fullAccess else {
            await endAllActivities()
            return
        }

        let now = Date()
        let inProgress = Self.cappedInProgressEvents(store: eventStore, now: now, maxCount: 8)
        let wantedIds = Set(inProgress.compactMap(\.eventIdentifier))

        for activity in Activity<CalendarLiveActivityAttributes>.activities {
            let id = activity.attributes.eventId
            if !wantedIds.contains(id) {
                await activity.end(nil, dismissalPolicy: .immediate)
            }
        }

        for event in inProgress {
            guard let eventId = event.eventIdentifier else { continue }
            let state = Self.contentState(for: event)
            let attributes = CalendarLiveActivityAttributes(eventId: eventId)
            let content = ActivityContent(state: state, staleDate: nil)

            if let existing = Activity<CalendarLiveActivityAttributes>.activities.first(where: { $0.attributes.eventId == eventId }) {
                await existing.update(content)
            } else {
                do {
                    _ = try Activity.request(attributes: attributes, content: content, pushType: nil)
                } catch {
                    // Authorization or system limits; ignore for this sync tick.
                }
            }
        }
    }

    func requestCalendarAccess() async -> Bool {
        if EKEventStore.authorizationStatus(for: .event) == .fullAccess {
            return true
        }
        do {
            return try await eventStore.requestFullAccessToEvents()
        } catch {
            return false
        }
    }

    private func endAllActivities() async {
        for activity in Activity<CalendarLiveActivityAttributes>.activities {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }

    /// When the feature is turned off from Settings, end every Kern calendar Live Activity.
    func disableAndEndAll() async {
        await endAllActivities()
    }

    // MARK: - Event selection

    /// In-progress: non-cancelled, and either timed (start <= now < end) or all-day on this local calendar day.
    private static func cappedInProgressEvents(store: EKEventStore, now: Date, maxCount: Int) -> [EKEvent] {
        let cal = Calendar.current
        let windowStart = cal.startOfDay(for: now)
        guard let windowEnd = cal.date(byAdding: .day, value: 1, to: windowStart) else { return [] }

        let predicate = store.predicateForEvents(withStart: windowStart, end: windowEnd, calendars: nil)
        let events = store.events(matching: predicate)
        let active = events.filter { isInProgress($0, now: now) }
        let sorted = active.sorted { $0.endDate < $1.endDate }
        return Array(sorted.prefix(maxCount))
    }

    private static func isInProgress(_ event: EKEvent, now: Date) -> Bool {
        guard event.status != .canceled else { return false }
        if event.isAllDay {
            let cal = Calendar.current
            let dayStart = cal.startOfDay(for: event.startDate)
            guard let dayEnd = cal.date(byAdding: .day, value: 1, to: dayStart) else { return false }
            return now >= dayStart && now < dayEnd
        }
        return event.startDate <= now && now < event.endDate
    }

    private static let notesMaxLength = 320

    private static func contentState(for event: EKEvent) -> CalendarLiveActivityAttributes.ContentState {
        let title = event.title?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
            ? event.title!
            : "Event"
        let calName = event.calendar?.title ?? ""
        let location = event.location?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false ? event.location : nil
        let notes = truncatedNotes(event.notes)
        let urlStr = event.url?.absoluteString.trimmingCharacters(in: .whitespacesAndNewlines)
        let eventURL = (urlStr?.isEmpty == false) ? urlStr : nil

        let cal = Calendar.current
        let startDate: Date
        let endDate: Date
        if event.isAllDay {
            let dayStart = cal.startOfDay(for: event.startDate)
            startDate = dayStart
            endDate = cal.date(byAdding: .day, value: 1, to: dayStart) ?? event.endDate
        } else {
            startDate = event.startDate
            endDate = event.endDate
        }

        return CalendarLiveActivityAttributes.ContentState(
            title: title,
            calendarName: calName,
            location: location,
            notes: notes,
            eventURL: eventURL,
            startDate: startDate,
            endDate: endDate,
            isAllDay: event.isAllDay
        )
    }

    private static func truncatedNotes(_ raw: String?) -> String? {
        guard var n = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !n.isEmpty else { return nil }
        n = n.replacingOccurrences(of: "\n", with: " ")
        if n.count <= notesMaxLength { return n }
        let end = n.index(n.startIndex, offsetBy: notesMaxLength, limitedBy: n.endIndex) ?? n.endIndex
        return String(n[..<end]) + "…"
    }
}
