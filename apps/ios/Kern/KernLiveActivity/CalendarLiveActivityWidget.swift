import ActivityKit
import SwiftUI
import WidgetKit

// MARK: - Progress + formatting (widget extension)

private enum CalendarLiveActivityProgress {
    static func progress01(now: Date, state: CalendarLiveActivityAttributes.ContentState) -> Double {
        let start = state.startDate
        let end = state.endDate
        guard end > start else { return 0 }
        let t = now.timeIntervalSince(start) / end.timeIntervalSince(start)
        return min(1, max(0, t))
    }

    /// Remaining time as `24:30` (m:ss) or `1:05:30` (h:mm:ss).
    static func countdownClock(until end: Date, from now: Date) -> String {
        let r = end.timeIntervalSince(now)
        if r <= 0 { return "0:00" }
        let total = Int(r.rounded(.down))
        let h = total / 3600
        let m = (total % 3600) / 60
        let s = total % 60
        if h > 0 {
            return String(format: "%d:%02d:%02d", h, m, s)
        }
        return String(format: "%d:%02d", m, s)
    }

    /// Short label for compact trailing: "45m", "1h", "1h5m", "<1m"
    static func shortTimeRemaining(until end: Date, from now: Date) -> String {
        let sec = end.timeIntervalSince(now)
        if sec <= 0 { return "0m" }
        if sec < 60 { return "<1m" }
        let minutesTotal = Int(sec / 60)
        if minutesTotal < 60 {
            return "\(minutesTotal)m"
        }
        let h = minutesTotal / 60
        let rm = minutesTotal % 60
        if rm == 0 { return "\(h)h" }
        return "\(h)h\(rm)m"
    }
}

// MARK: - Subviews

private struct CompactEventProgressRing: View {
    let state: CalendarLiveActivityAttributes.ContentState

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            let p = CalendarLiveActivityProgress.progress01(now: timeline.date, state: state)
            ZStack {
                Circle()
                    .stroke(Color.white.opacity(0.22), lineWidth: 1.75)
                Circle()
                    .trim(from: 0, to: CGFloat(p))
                    .stroke(Color.white.opacity(0.92), style: StrokeStyle(lineWidth: 1.75, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
            .frame(width: 12, height: 12)
        }
    }
}

private struct CompactEventRemainder: View {
    let state: CalendarLiveActivityAttributes.ContentState

    var body: some View {
        if state.isAllDay {
            Text("Day")
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        } else {
            Text(state.endDate, style: .timer)
                .multilineTextAlignment(.trailing)
                .font(.system(size: 10, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .lineLimit(1)
                .minimumScaleFactor(0.4)
                .frame(maxWidth: 42, alignment: .trailing)
        }
    }
}

private struct MinimalEventGlyph: View {
    let state: CalendarLiveActivityAttributes.ContentState

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            let p = CalendarLiveActivityProgress.progress01(now: timeline.date, state: state)
            Circle()
                .trim(from: 0, to: CGFloat(p))
                .stroke(Color.white.opacity(0.9), lineWidth: 1.5)
                .rotationEffect(.degrees(-90))
                .frame(width: 7, height: 7)
        }
    }
}

private struct LinearEventProgressBar: View {
    let state: CalendarLiveActivityAttributes.ContentState
    var now: Date
    var height: CGFloat = 5

    var body: some View {
        let p = CalendarLiveActivityProgress.progress01(now: now, state: state)
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(Color.primary.opacity(0.15))
                Capsule()
                    .fill(Color.primary.opacity(0.85))
                    .frame(width: max(height * 0.85, g.size.width * CGFloat(p)))
            }
        }
        .frame(height: height)
        .accessibilityLabel("Event progress")
        .accessibilityValue("\(Int((p * 100).rounded())) percent")
    }
}

private enum LiveActivityDisplayContext {
    case lockScreen
    /// Tighter vertical metrics so content fits the expanded Dynamic Island window.
    case expandedDynamicIsland
}

/// Same structure for lock screen / banner and expanded Dynamic Island (per side padding applied outside).
private struct SharedLiveActivityLayout: View {
    let state: CalendarLiveActivityAttributes.ContentState
    var displayContext: LiveActivityDisplayContext = .lockScreen

    private var stackSpacing: CGFloat {
        switch displayContext {
        case .lockScreen: return 10
        case .expandedDynamicIsland: return 6
        }
    }

    private var progressBarHeight: CGFloat {
        switch displayContext {
        case .lockScreen: return 5
        case .expandedDynamicIsland: return 4
        }
    }

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { timeline in
            let now = timeline.date
            VStack(alignment: .leading, spacing: stackSpacing) {
                HStack(alignment: .firstTextBaseline, spacing: 12) {
                    Text(state.title)
                        .font(.headline.weight(.semibold))
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    Group {
                        if state.isAllDay {
                            Text("All day")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.secondary)
                        } else {
                            Text(timerInterval: min(state.startDate, state.endDate.addingTimeInterval(-1))...state.endDate, countsDown: true)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.secondary)
                                .monospacedDigit()
                                .multilineTextAlignment(.trailing)
                                .lineLimit(1)
                                .minimumScaleFactor(0.75)
                        }
                    }
                }

                if !state.calendarName.isEmpty {
                    Text(state.calendarName)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                if !state.isAllDay {
                    Text("\(state.startDate.formatted(date: .omitted, time: .shortened)) – \(state.endDate.formatted(date: .omitted, time: .shortened))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .monospacedDigit()
                }

                LinearEventProgressBar(state: state, now: now, height: progressBarHeight)

                EventExtraDetails(
                    state: state,
                    tight: displayContext == .expandedDynamicIsland
                )
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}

private struct EventExtraDetails: View {
    let state: CalendarLiveActivityAttributes.ContentState
    /// Shorter labels and spacing for expanded Dynamic Island height budget.
    var tight: Bool = false

    var body: some View {
        VStack(alignment: .leading, spacing: tight ? 3 : 6) {
            if let loc = state.location, !loc.isEmpty {
                Text(loc)
                    .font(tight ? .caption2 : .caption)
                    .foregroundStyle(.tertiary)
                    .lineLimit(tight ? 2 : 5)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if let notes = state.notes, !notes.isEmpty {
                Text(notes)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .lineLimit(tight ? 2 : 4)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
            if let u = state.eventURL, !u.isEmpty {
                Text(u)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(tight ? 1 : 2)
                    .multilineTextAlignment(.leading)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Widget

struct CalendarLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CalendarLiveActivityAttributes.self) { context in
            liveActivityView(context: context)
                .activityBackgroundTint(.black.opacity(0.42))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    EmptyView()
                }
                DynamicIslandExpandedRegion(.trailing) {
                    EmptyView()
                }
                DynamicIslandExpandedRegion(.center) {
                    SharedLiveActivityLayout(state: context.state, displayContext: .expandedDynamicIsland)
                        .padding(.horizontal, 18)
                        .padding(.top, 0)
                        .padding(.bottom, 6)
                        .offset(y: -4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    EmptyView()
                }
            } compactLeading: {
                CompactEventProgressRing(state: context.state)
            } compactTrailing: {
                CompactEventRemainder(state: context.state)
                    .foregroundStyle(.primary)
            } minimal: {
                MinimalEventGlyph(state: context.state)
            }
        }
    }

    @ViewBuilder
    private func liveActivityView(context: ActivityViewContext<CalendarLiveActivityAttributes>) -> some View {
        SharedLiveActivityLayout(state: context.state)
            .padding(.horizontal, 18)
            .padding(.vertical, 16)
    }
}
