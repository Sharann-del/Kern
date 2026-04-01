import EventKit
import SwiftUI

// MARK: - CalendarView

struct CalendarView: View {
    @Environment(\.kernTheme) private var theme
    @Environment(\.openURL) private var openURL

    @State private var displayedYear: Int
    @State private var displayedMonth: Int
    @State private var selectedDate: Date
    @State private var items: [CalendarItem] = []
    @State private var itemsByDay: [Date: [CalendarItem]] = [:]
    @State private var loading = true
    @State private var calendarAccess = EKEventStore.authorizationStatus(for: .event) == .fullAccess
    @State private var remindersAccess = EKEventStore.authorizationStatus(for: .reminder) == .fullAccess

    private let calendar = Calendar.current
    private let eventStore = EKEventStore()
    var onMenuTap: (() -> Void)? = nil

    init(onMenuTap: (() -> Void)? = nil) {
        self.onMenuTap = onMenuTap
        let now = Date()
        let cal = Calendar.current
        _displayedYear = State(initialValue: cal.component(.year, from: now))
        _displayedMonth = State(initialValue: cal.component(.month, from: now))
        _selectedDate = State(initialValue: cal.startOfDay(for: now))
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {

                if !calendarAccess {
                    calendarAccessBanner
                } else if loading {
                    ProgressView()
                        .tint(theme.text3)
                        .frame(maxWidth: .infinity)
                        .padding(60)
                } else {
                    // Month navigator
                    monthHeader
                        .padding(.horizontal, 16)
                        .padding(.bottom, 8)

                    // Weekday labels
                    weekdayRow
                        .padding(.horizontal, 16)
                        .padding(.bottom, 4)

                    // Day grid
                    monthGrid
                        .padding(.horizontal, 16)
                        .padding(.bottom, 16)

                    // Divider
                    Rectangle()
                        .fill(theme.border)
                        .frame(height: 1)
                        .padding(.horizontal, 16)

                    // Selected day events + reminders
                    selectedDayHeader
                        .padding(.horizontal, 16)
                        .padding(.top, 16)
                        .padding(.bottom, 8)

                    itemsList
                        .padding(.horizontal, 16)
                        .padding(.bottom, 8)

                    // Reminders access nudge (if calendar access granted but not reminders)
                    if !remindersAccess {
                        remindersAccessNudge
                            .padding(.horizontal, 16)
                            .padding(.bottom, 16)
                    }

                    Spacer(minLength: 24)
                }
            }
        }
        .safeAreaInset(edge: .top) {
            VStack(spacing: 0) {
                HStack(spacing: 16) {
                    Button {
                        onMenuTap?()
                    } label: {
                        Image(systemName: "line.3.horizontal")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(theme.text2)
                            .frame(width: 32, height: 32)
                            .border(theme.border, width: 1)
                    }
                    .buttonStyle(.plain)

                    Text("Calendar")
                        .font(KernFont.display(34))
                        .foregroundStyle(theme.text)
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
                .background(theme.bg0)
                
                Rectangle()
                    .fill(theme.border)
                    .frame(height: 1)
            }
        }
        .kernNoOverscroll([.vertical])
        .background(theme.bg0)
        .task { await loadAll() }
        .onChange(of: displayedYear) { _, _ in Task { await loadAll() } }
        .onChange(of: displayedMonth) { _, _ in Task { await loadAll() } }
    }

    // MARK: - Calendar Access Banner

    private var calendarAccessBanner: some View {
        VStack(spacing: 16) {
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 40))
                .foregroundStyle(theme.accent)

            Text("Calendar Access Required")
                .font(KernFont.ui(17, weight: .semibold))
                .foregroundStyle(theme.text)

            Text("Grant full calendar access to see your events and reminders here.")
                .font(KernFont.body(14))
                .foregroundStyle(theme.text2)
                .multilineTextAlignment(.center)

            KernButton(title: "Allow Access", variant: .secondary) {
                Task {
                    do {
                        let granted = try await eventStore.requestFullAccessToEvents()
                        calendarAccess = granted
                        if granted {
                            // Also request reminders
                            remindersAccess = await CalendarService.requestRemindersAccess(store: eventStore)
                            await loadAll()
                        }
                    } catch {
                        calendarAccess = false
                    }
                }
            }
            .frame(maxWidth: 200)
        }
        .frame(maxWidth: .infinity)
        .padding(40)
    }

    // MARK: - Reminders Access Nudge

    private var remindersAccessNudge: some View {
        HStack(spacing: 12) {
            Image(systemName: "checklist")
                .font(.system(size: 16))
                .foregroundStyle(theme.accent)

            VStack(alignment: .leading, spacing: 2) {
                Text("Show Reminders")
                    .font(KernFont.ui(13, weight: .medium))
                    .foregroundStyle(theme.text)
                Text("Allow access to see your reminders alongside events")
                    .font(KernFont.body(11))
                    .foregroundStyle(theme.text3)
            }

            Spacer()

            Button {
                Task {
                    remindersAccess = await CalendarService.requestRemindersAccess(store: eventStore)
                    if remindersAccess { await loadAll() }
                }
            } label: {
                Text("Enable")
                    .font(KernFont.label(11))
                    .foregroundStyle(theme.accent)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .overlay(Rectangle().stroke(theme.accent.opacity(0.4), lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
        .padding(12)
        .background(theme.bg1)
        .overlay(Rectangle().stroke(theme.border, lineWidth: 1))
    }

    // MARK: - Month Header

    private var monthHeader: some View {
        HStack(spacing: 12) {
            Button {
                navigateMonth(by: -1)
            } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(theme.text2)
                    .frame(width: 32, height: 32)
                    .background(theme.bg1)
                    .overlay(Rectangle().stroke(theme.border, lineWidth: 1))
            }
            .buttonStyle(.plain)

            VStack(spacing: 2) {
                Text(monthYearString)
                    .font(KernFont.ui(17, weight: .semibold))
                    .foregroundStyle(theme.text)
            }
            .frame(maxWidth: .infinity)

            Button {
                navigateMonth(by: 1)
            } label: {
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(theme.text2)
                    .frame(width: 32, height: 32)
                    .background(theme.bg1)
                    .overlay(Rectangle().stroke(theme.border, lineWidth: 1))
            }
            .buttonStyle(.plain)

            Button {
                goToToday()
            } label: {
                Text("Today")
                    .font(KernFont.label(12))
                    .foregroundStyle(theme.accent)
                    .frame(height: 32)
                    .padding(.horizontal, 10)
                    .background(theme.bg1)
                    .overlay(Rectangle().stroke(theme.accent.opacity(0.4), lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Weekday Row

    private var weekdayRow: some View {
        let symbols = calendar.veryShortWeekdaySymbols
        return LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 0) {
            ForEach(symbols, id: \.self) { day in
                Text(day)
                    .font(KernFont.label(11))
                    .foregroundStyle(theme.text3)
                    .frame(maxWidth: .infinity)
                    .frame(height: 28)
            }
        }
    }

    // MARK: - Month Grid

    private var monthGrid: some View {
        let days = gridDays()
        return LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 0), count: 7), spacing: 0) {
            ForEach(Array(days.enumerated()), id: \.offset) { _, day in
                dayCell(day)
            }
        }
    }

    private func dayCell(_ date: Date) -> some View {
        let dayNum = calendar.component(.day, from: date)
        let isCurrentMonth = calendar.component(.month, from: date) == displayedMonth
            && calendar.component(.year, from: date) == displayedYear
        let isToday = calendar.isDateInToday(date)
        let isSelected = calendar.isDate(date, inSameDayAs: selectedDate)
        let dayKey = calendar.startOfDay(for: date)
        let dayItems = itemsByDay[dayKey] ?? []
        let dotColors = Array(Set(dayItems.map { $0.colorHex })).prefix(3)
        let hasReminders = dayItems.contains(where: { if case .reminder = $0 { return true }; return false })

        return Button {
            withAnimation(.easeInOut(duration: 0.15)) {
                selectedDate = dayKey
            }
        } label: {
            VStack(spacing: 3) {
                ZStack {
                    if isSelected {
                        Rectangle()
                            .fill(theme.accent)
                            .frame(width: 30, height: 30)
                    } else if isToday {
                        Rectangle()
                            .stroke(theme.accent, lineWidth: 1.5)
                            .frame(width: 30, height: 30)
                    }

                    Text("\(dayNum)")
                        .font(KernFont.ui(14, weight: isToday || isSelected ? .semibold : .regular))
                        .foregroundStyle(
                            isSelected ? theme.onAccent :
                            isToday ? theme.accent :
                            isCurrentMonth ? theme.text : theme.text3.opacity(0.4)
                        )
                }

                // Event dots + reminder indicator
                HStack(spacing: 3) {
                    ForEach(Array(dotColors.enumerated()), id: \.offset) { _, hex in
                        Circle()
                            .fill(colorFromHex(hex))
                            .frame(width: 4, height: 4)
                    }
                    if hasReminders && dotColors.isEmpty {
                        // Show a small dash for reminder-only days
                        RoundedRectangle(cornerRadius: 0)
                            .fill(theme.text3)
                            .frame(width: 6, height: 2)
                    }
                }
                .frame(height: 6)
                .opacity(dotColors.isEmpty && !hasReminders ? 0 : 1)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Selected Day Header

    private var selectedDayHeader: some View {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d"
        let selectedItems = itemsByDay[calendar.startOfDay(for: selectedDate)] ?? []
        let eventCount = selectedItems.filter { if case .event = $0 { return true }; return false }.count
        let reminderCount = selectedItems.filter { if case .reminder = $0 { return true }; return false }.count

        return HStack(alignment: .firstTextBaseline) {
            Text(formatter.string(from: selectedDate))
                .font(KernFont.ui(15, weight: .semibold))
                .foregroundStyle(theme.text)

            Spacer()

            HStack(spacing: 8) {
                if eventCount > 0 {
                    HStack(spacing: 3) {
                        Image(systemName: "calendar")
                            .font(.system(size: 9))
                        Text("\(eventCount)")
                            .font(KernFont.label(11))
                    }
                    .foregroundStyle(theme.text3)
                }
                if reminderCount > 0 {
                    HStack(spacing: 3) {
                        Image(systemName: "checklist")
                            .font(.system(size: 9))
                        Text("\(reminderCount)")
                            .font(KernFont.label(11))
                    }
                    .foregroundStyle(theme.text3)
                }
            }
        }
    }

    // MARK: - Items List (Events + Reminders)

    private var itemsList: some View {
        let selectedItems = itemsByDay[calendar.startOfDay(for: selectedDate)] ?? []

        return Group {
            if selectedItems.isEmpty {
                emptyView
            } else {
                VStack(spacing: 0) {
                    ForEach(selectedItems) { item in
                        switch item {
                        case .event(let event):
                            eventCard(event)
                        case .reminder(let reminder):
                            reminderCard(reminder)
                        }
                    }
                }
            }
        }
    }

    private var emptyView: some View {
        VStack(spacing: 12) {
            Image(systemName: "calendar")
                .font(.system(size: 32))
                .foregroundStyle(theme.text3.opacity(0.5))

            Text("No events or reminders")
                .font(KernFont.body(14))
                .foregroundStyle(theme.text3)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }

    // MARK: - Event Card

    private func eventCard(_ event: CalendarEventSnapshot) -> some View {
        HStack(alignment: .top, spacing: 0) {
            // Calendar color bar
            Rectangle()
                .fill(event.calendarColor)
                .frame(width: 3)

            VStack(alignment: .leading, spacing: 4) {
                Text(event.title)
                    .font(KernFont.ui(14, weight: .medium))
                    .foregroundStyle(theme.text)
                    .lineLimit(2)

                HStack(spacing: 6) {
                    Image(systemName: "clock")
                        .font(.system(size: 10))
                        .foregroundStyle(theme.text3)
                    Text(event.timeRangeText)
                        .font(KernFont.body(12))
                        .foregroundStyle(theme.text2)
                }

                if !event.calendarTitle.isEmpty {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(event.calendarColor)
                            .frame(width: 6, height: 6)
                        Text(event.calendarTitle)
                            .font(KernFont.body(11))
                            .foregroundStyle(theme.text3)
                    }
                }

                if let location = event.location {
                    HStack(spacing: 6) {
                        Image(systemName: "mappin")
                            .font(.system(size: 10))
                            .foregroundStyle(theme.text3)
                        Text(location)
                            .font(KernFont.body(11))
                            .foregroundStyle(theme.text3)
                            .lineLimit(1)
                    }
                }

                if event.isInProgress {
                    HStack(spacing: 6) {
                        Circle()
                            .fill(theme.success)
                            .frame(width: 6, height: 6)
                        Text("In progress")
                            .font(KernFont.label(10))
                            .foregroundStyle(theme.success)
                    }
                    .padding(.top, 2)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.bg1)
        .overlay(
            Rectangle()
                .stroke(theme.border, lineWidth: 1)
        )
        .padding(.bottom, -1)
    }

    // MARK: - Reminder Card

    private func reminderCard(_ reminder: ReminderSnapshot) -> some View {
        HStack(alignment: .top, spacing: 0) {
            // List color bar
            Rectangle()
                .fill(reminder.listColor)
                .frame(width: 3)

            HStack(alignment: .top, spacing: 10) {
                // Checkbox
                Button {
                    let _ = CalendarService.toggleReminderCompletion(id: reminder.id, store: eventStore)
                    Task { await loadAll() }
                } label: {
                    ZStack {
                        RoundedRectangle(cornerRadius: 0)
                            .stroke(reminder.isCompleted ? theme.success : reminder.listColor, lineWidth: 1.5)
                            .frame(width: 18, height: 18)

                        if reminder.isCompleted {
                            RoundedRectangle(cornerRadius: 0)
                                .fill(theme.success)
                                .frame(width: 12, height: 12)
                            Image(systemName: "checkmark")
                                .font(.system(size: 9, weight: .bold))
                                .foregroundStyle(theme.bg0)
                        }
                    }
                }
                .buttonStyle(.plain)
                .padding(.top, 1)

                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(reminder.title)
                            .font(KernFont.ui(14, weight: .medium))
                            .foregroundStyle(reminder.isCompleted ? theme.text3 : theme.text)
                            .strikethrough(reminder.isCompleted, color: theme.text3)
                            .lineLimit(2)

                        if let pLabel = reminder.priorityLabel {
                            Text(pLabel)
                                .font(KernFont.label(11))
                                .foregroundStyle(theme.danger)
                        }
                    }

                    HStack(spacing: 8) {
                        if !reminder.dueDateText.isEmpty {
                            HStack(spacing: 4) {
                                Image(systemName: "clock")
                                    .font(.system(size: 9))
                                    .foregroundStyle(theme.text3)
                                Text(reminder.dueDateText)
                                    .font(KernFont.body(11))
                                    .foregroundStyle(theme.text3)
                                    .monospacedDigit()
                            }
                        }

                        if !reminder.listTitle.isEmpty {
                            HStack(spacing: 4) {
                                Circle()
                                    .fill(reminder.listColor)
                                    .frame(width: 5, height: 5)
                                Text(reminder.listTitle)
                                    .font(KernFont.body(10))
                                    .foregroundStyle(theme.text3)
                            }
                        }
                    }

                    if let notes = reminder.notes {
                        Text(notes)
                            .font(KernFont.body(10))
                            .foregroundStyle(theme.text3.opacity(0.7))
                            .lineLimit(1)
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(reminder.isCompleted ? theme.bg1.opacity(0.6) : theme.bg1)
        .overlay(
            Rectangle()
                .stroke(theme.border, lineWidth: 1)
        )
        .padding(.bottom, -1)
    }

    // MARK: - Data

    private func loadAll() async {
        loading = true
        defer { loading = false }
        calendarAccess = EKEventStore.authorizationStatus(for: .event) == .fullAccess
        remindersAccess = EKEventStore.authorizationStatus(for: .reminder) == .fullAccess
        guard calendarAccess else { return }

        let events = CalendarService.fetchMonthEvents(
            year: displayedYear,
            month: displayedMonth,
            store: eventStore
        )

        let reminders: [ReminderSnapshot]
        if remindersAccess {
            reminders = await CalendarService.fetchMonthReminders(
                year: displayedYear,
                month: displayedMonth,
                store: eventStore
            )
        } else {
            reminders = []
        }

        let merged = CalendarService.mergeItems(events: events, reminders: reminders)
        items = merged
        itemsByDay = CalendarService.itemsByDate(merged)
    }

    // MARK: - Navigation

    private func navigateMonth(by offset: Int) {
        var comps = DateComponents()
        comps.year = displayedYear
        comps.month = displayedMonth
        comps.day = 1
        guard let current = calendar.date(from: comps),
              let next = calendar.date(byAdding: .month, value: offset, to: current) else { return }
        displayedYear = calendar.component(.year, from: next)
        displayedMonth = calendar.component(.month, from: next)
        if calendar.component(.month, from: Date()) == displayedMonth
            && calendar.component(.year, from: Date()) == displayedYear {
            selectedDate = calendar.startOfDay(for: Date())
        } else {
            selectedDate = calendar.startOfDay(for: next)
        }
    }

    private func goToToday() {
        let now = Date()
        displayedYear = calendar.component(.year, from: now)
        displayedMonth = calendar.component(.month, from: now)
        selectedDate = calendar.startOfDay(for: now)
    }

    // MARK: - Helpers

    private var monthYearString: String {
        guard let date = calendar.date(from: DateComponents(year: displayedYear, month: displayedMonth, day: 1)) else {
            return ""
        }
        let fmt = DateFormatter()
        fmt.dateFormat = "MMMM yyyy"
        return fmt.string(from: date)
    }

    private func gridDays() -> [Date] {
        guard let monthStart = calendar.date(from: DateComponents(year: displayedYear, month: displayedMonth, day: 1))
        else { return [] }

        let weekday = calendar.component(.weekday, from: monthStart)
        let firstWeekday = calendar.firstWeekday
        let leadDays = (weekday - firstWeekday + 7) % 7
        guard let gridStart = calendar.date(byAdding: .day, value: -leadDays, to: monthStart) else { return [] }

        return (0..<42).compactMap { calendar.date(byAdding: .day, value: $0, to: gridStart) }
    }

    private func colorFromHex(_ hex: UInt32) -> Color {
        Color(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}
