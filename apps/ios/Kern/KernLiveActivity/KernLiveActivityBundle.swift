import SwiftUI
import WidgetKit

@main
struct KernLiveActivityBundle: WidgetBundle {
    var body: some Widget {
        CalendarLiveActivityWidget()
        KernCalendarWidget()
        KernCollectionAppWidget()
    }
}
