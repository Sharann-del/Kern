import EventKit
import SwiftUI
import WidgetKit

// MARK: - Design Tokens (hardcoded for widget extension — no access to KernTheme)

private enum KW {
    static let bg0 = Color(red: 0.102, green: 0.102, blue: 0.094)        // #1A1A18
    static let bg1 = Color(red: 0.173, green: 0.173, blue: 0.165)        // #2C2C2A
    static let border = Color(red: 0.247, green: 0.239, blue: 0.220)     // #3F3D38
    static let text = Color(red: 0.961, green: 0.957, blue: 0.941)       // #F5F4F0
    static let text2 = Color(red: 0.910, green: 0.902, blue: 0.882)      // #E8E6E1
    static let text3 = Color(red: 0.612, green: 0.596, blue: 0.565)      // #9C9890
    static let accent = Color(red: 0.784, green: 0.659, blue: 0.294)     // #C8A84B
    static let onAccent = Color(red: 0.102, green: 0.102, blue: 0.094)   // #1A1A18
    static let success = Color(red: 0.353, green: 0.620, blue: 0.447)    // #5A9E72
}

// MARK: - Timeline Entry

struct CalendarWidgetEntry: TimelineEntry {
    let date: Date
    let events: [CalendarEventSnapshot]
    let currentEvent: CalendarEventSnapshot?
    let nextEvent: CalendarEventSnapshot?
    let totalTodayCount: Int
}

// MARK: - Timeline Provider

struct CalendarWidgetProvider: TimelineProvider {
    private let eventStore = EKEventStore()

    func placeholder(in context: Context) -> CalendarWidgetEntry {
        CalendarWidgetEntry(
            date: Date(),
            events: [],
            currentEvent: nil,
            nextEvent: nil,
            totalTodayCount: 0
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (CalendarWidgetEntry) -> Void) {
        let entry = buildEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<CalendarWidgetEntry>) -> Void) {
        let entry = buildEntry()
        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func buildEntry() -> CalendarWidgetEntry {
        let now = Date()
        let todayEvents = CalendarService.fetchTodayEvents(store: eventStore)

        let current = todayEvents.first(where: { $0.isInProgress && !$0.isAllDay })
        let next: CalendarEventSnapshot? = {
            if let c = current {
                return todayEvents.first(where: { $0.startDate > c.startDate && !$0.isAllDay })
            }
            return todayEvents.first(where: { $0.startDate > now && !$0.isAllDay })
                ?? todayEvents.first(where: { $0.isAllDay })
        }()

        // For medium/large: upcoming events (remaining today)
        let remaining = todayEvents.filter { $0.endDate > now || $0.isAllDay }

        return CalendarWidgetEntry(
            date: now,
            events: Array(remaining.prefix(7)),
            currentEvent: current,
            nextEvent: next,
            totalTodayCount: todayEvents.count
        )
    }
}

// MARK: - Widget Definition

struct KernCalendarWidget: Widget {
    let kind: String = "KernCalendarWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: CalendarWidgetProvider()) { entry in
            KernCalendarWidgetView(entry: entry)
                .containerBackground(KW.bg0, for: .widget)
        }
        .configurationDisplayName("Kern Calendar")
        .description("Upcoming events from your Apple Calendar.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

// MARK: - Entry View

struct KernCalendarWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: CalendarWidgetEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallCalendarWidget(entry: entry)
        case .systemMedium:
            MediumCalendarWidget(entry: entry)
        case .systemLarge:
            LargeCalendarWidget(entry: entry)
        default:
            SmallCalendarWidget(entry: entry)
        }
    }
}

// MARK: - Small Widget

private struct SmallCalendarWidget: View {
    let entry: CalendarWidgetEntry
    private let cal = Calendar.current

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Date header
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 1) {
                    Text(weekdayString)
                        .font(.system(size: 10, weight: .semibold, design: .rounded))
                        .foregroundStyle(KW.accent)
                        .textCase(.uppercase)
                        .tracking(0.8)

                    Text(dayString)
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(KW.text)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                Spacer()
                Text(monthString)
                    .font(.system(size: 10, weight: .medium, design: .rounded))
                    .foregroundStyle(KW.text3)
            }
            .padding(.bottom, 8)

            // Separator
            Rectangle()
                .fill(KW.border)
                .frame(height: 1)
                .padding(.bottom, 8)

            if let event = entry.currentEvent ?? entry.nextEvent {
                VStack(alignment: .leading, spacing: 3) {
                    if entry.currentEvent != nil {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(KW.success)
                                .frame(width: 5, height: 5)
                            Text("NOW")
                                .font(.system(size: 8, weight: .bold, design: .rounded))
                                .foregroundStyle(KW.success)
                                .tracking(0.5)
                        }
                    } else {
                        Text("NEXT")
                            .font(.system(size: 8, weight: .bold, design: .rounded))
                            .foregroundStyle(KW.text3)
                            .tracking(0.5)
                    }

                    Text(event.title)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(KW.text)
                        .lineLimit(2)

                    Text(event.shortTimeText)
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(KW.text3)
                        .monospacedDigit()
                }

                Spacer(minLength: 0)

                let moreCount = max(0, entry.totalTodayCount - 1)
                if moreCount > 0 {
                    Text("+\(moreCount) more")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(KW.accent)
                }
            } else {
                Spacer()
                VStack(spacing: 4) {
                    Image(systemName: "calendar")
                        .font(.system(size: 18))
                        .foregroundStyle(KW.text3.opacity(0.5))
                    Text("No events")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(KW.text3)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            }
        }
        .padding(14)
    }

    private var dayString: String { "\(cal.component(.day, from: entry.date))" }
    private var weekdayString: String {
        let fmt = DateFormatter(); fmt.dateFormat = "EEE"; return fmt.string(from: entry.date)
    }
    private var monthString: String {
        let fmt = DateFormatter(); fmt.dateFormat = "MMM"; return fmt.string(from: entry.date)
    }
}

// MARK: - Medium Widget

private struct MediumCalendarWidget: View {
    let entry: CalendarWidgetEntry
    private let cal = Calendar.current

    var body: some View {
        HStack(spacing: 0) {
            // Left: date column
            VStack(alignment: .leading, spacing: 2) {
                Text(weekdayString)
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(KW.accent)
                    .textCase(.uppercase)
                    .tracking(0.8)

                Text(dayString)
                    .font(.system(size: 44, weight: .bold, design: .rounded))
                    .foregroundStyle(KW.text)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)

                Text(monthYearString)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(KW.text3)

                Spacer(minLength: 0)

                Text("\(entry.totalTodayCount) event\(entry.totalTodayCount == 1 ? "" : "s")")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(KW.accent)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(KW.accent.opacity(0.12))
            }
            .frame(width: 90)
            .padding(14)

            // Divider
            Rectangle()
                .fill(KW.border)
                .frame(width: 1)

            // Right: event list
            VStack(alignment: .leading, spacing: 0) {
                if entry.events.isEmpty {
                    Spacer()
                    VStack(spacing: 6) {
                        Image(systemName: "calendar")
                            .font(.system(size: 22))
                            .foregroundStyle(KW.text3.opacity(0.4))
                        Text("No events today")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(KW.text3)
                    }
                    .frame(maxWidth: .infinity)
                    Spacer()
                } else {
                    ForEach(Array(entry.events.prefix(3).enumerated()), id: \.element.id) { idx, event in
                        if idx > 0 {
                            Rectangle()
                                .fill(KW.border.opacity(0.5))
                                .frame(height: 1)
                                .padding(.leading, 10)
                        }
                        MediumEventRow(event: event, isCurrent: entry.currentEvent?.id == event.id)
                    }

                    let remaining = entry.events.count - 3
                    if remaining > 0 {
                        Rectangle()
                            .fill(KW.border.opacity(0.5))
                            .frame(height: 1)
                            .padding(.leading, 10)
                        Text("+\(remaining) more")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(KW.accent)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                    }
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private var dayString: String { "\(cal.component(.day, from: entry.date))" }
    private var weekdayString: String {
        let fmt = DateFormatter(); fmt.dateFormat = "EEE"; return fmt.string(from: entry.date)
    }
    private var monthYearString: String {
        let fmt = DateFormatter(); fmt.dateFormat = "MMM yyyy"; return fmt.string(from: entry.date)
    }
}

private struct MediumEventRow: View {
    let event: CalendarEventSnapshot
    let isCurrent: Bool

    var body: some View {
        HStack(alignment: .center, spacing: 8) {
            // Calendar color dot
            RoundedRectangle(cornerRadius: 1.5)
                .fill(event.calendarColor)
                .frame(width: 3, height: 28)

            VStack(alignment: .leading, spacing: 1) {
                Text(event.title)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(KW.text)
                    .lineLimit(1)

                HStack(spacing: 4) {
                    if isCurrent {
                        Circle()
                            .fill(KW.success)
                            .frame(width: 4, height: 4)
                    }
                    Text(event.shortTimeText)
                        .font(.system(size: 10, weight: .medium, design: .rounded))
                        .foregroundStyle(isCurrent ? KW.success : KW.text3)
                        .monospacedDigit()
                }
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
    }
}

// MARK: - Large Widget

private struct LargeCalendarWidget: View {
    let entry: CalendarWidgetEntry
    private let cal = Calendar.current

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(weekdayString)
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundStyle(KW.accent)
                        .textCase(.uppercase)
                        .tracking(0.8)

                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(dayString)
                            .font(.system(size: 38, weight: .bold, design: .rounded))
                            .foregroundStyle(KW.text)

                        Text(monthYearString)
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(KW.text3)
                    }
                }

                Spacer()

                // Mini week dots
                HStack(spacing: 6) {
                    ForEach(weekDates(), id: \.self) { date in
                        let isToday = cal.isDateInToday(date)
                        VStack(spacing: 3) {
                            Text(shortDay(date))
                                .font(.system(size: 8, weight: .medium))
                                .foregroundStyle(isToday ? KW.accent : KW.text3)

                            Text("\(cal.component(.day, from: date))")
                                .font(.system(size: 10, weight: isToday ? .bold : .regular, design: .rounded))
                                .foregroundStyle(isToday ? KW.accent : KW.text3)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 10)

            // Separator
            Rectangle()
                .fill(KW.border)
                .frame(height: 1)

            // Event list
            if entry.events.isEmpty {
                Spacer()
                VStack(spacing: 8) {
                    Image(systemName: "calendar")
                        .font(.system(size: 28))
                        .foregroundStyle(KW.text3.opacity(0.4))
                    Text("No upcoming events")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(KW.text3)
                }
                .frame(maxWidth: .infinity)
                Spacer()
            } else {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(entry.events.prefix(6).enumerated()), id: \.element.id) { idx, event in
                        if idx > 0 {
                            Rectangle()
                                .fill(KW.border.opacity(0.4))
                                .frame(height: 1)
                                .padding(.leading, 16)
                        }
                        LargeEventRow(event: event, isCurrent: entry.currentEvent?.id == event.id)
                    }

                    let remaining = max(0, entry.events.count - 6)
                    if remaining > 0 {
                        Rectangle()
                            .fill(KW.border.opacity(0.4))
                            .frame(height: 1)
                            .padding(.leading, 16)

                        Text("+\(remaining) more event\(remaining == 1 ? "" : "s")")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(KW.accent)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                    }
                }

                Spacer(minLength: 0)
            }
        }
    }

    private var dayString: String { "\(cal.component(.day, from: entry.date))" }
    private var weekdayString: String {
        let fmt = DateFormatter(); fmt.dateFormat = "EEEE"; return fmt.string(from: entry.date)
    }
    private var monthYearString: String {
        let fmt = DateFormatter(); fmt.dateFormat = "MMMM yyyy"; return fmt.string(from: entry.date)
    }

    private func weekDates() -> [Date] {
        let today = cal.startOfDay(for: entry.date)
        let weekday = cal.component(.weekday, from: today) - cal.firstWeekday
        let offset = (weekday + 7) % 7
        guard let weekStart = cal.date(byAdding: .day, value: -offset, to: today) else { return [] }
        return (0..<7).compactMap { cal.date(byAdding: .day, value: $0, to: weekStart) }
    }

    private func shortDay(_ date: Date) -> String {
        let fmt = DateFormatter(); fmt.dateFormat = "E"
        return String(fmt.string(from: date).prefix(1))
    }
}

private struct LargeEventRow: View {
    let event: CalendarEventSnapshot
    let isCurrent: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 0) {
            // Color bar
            Rectangle()
                .fill(event.calendarColor)
                .frame(width: 3)
                .padding(.vertical, 4)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(event.title)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(KW.text)
                        .lineLimit(1)

                    Spacer(minLength: 0)

                    if isCurrent {
                        HStack(spacing: 3) {
                            Circle()
                                .fill(KW.success)
                                .frame(width: 5, height: 5)
                            Text("NOW")
                                .font(.system(size: 8, weight: .bold, design: .rounded))
                                .foregroundStyle(KW.success)
                                .tracking(0.5)
                        }
                    }
                }

                HStack(spacing: 8) {
                    Text(event.timeRangeText)
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(KW.text3)
                        .monospacedDigit()

                    if !event.calendarTitle.isEmpty {
                        Text("·")
                            .foregroundStyle(KW.text3.opacity(0.5))
                        Text(event.calendarTitle)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(KW.text3)
                            .lineLimit(1)
                    }
                }

                if let location = event.location {
                    HStack(spacing: 4) {
                        Image(systemName: "mappin")
                            .font(.system(size: 8))
                            .foregroundStyle(KW.text3.opacity(0.7))
                        Text(location)
                            .font(.system(size: 10))
                            .foregroundStyle(KW.text3)
                            .lineLimit(1)
                    }
                }
            }
            .padding(.leading, 10)
            .padding(.trailing, 16)
        }
        .padding(.leading, 16)
        .padding(.vertical, 8)
    }
}
