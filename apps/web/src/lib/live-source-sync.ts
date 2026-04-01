/** Edge function name for manual "Sync now" / popover sync. */
export function edgeFunctionForLiveSource(liveSourceType: string | null | undefined): string | null {
  if (!liveSourceType) return null;
  if (liveSourceType.startsWith('github_')) return 'sync-github';
  if (liveSourceType === 'google_calendar_events') return 'sync-google-calendar';
  if (liveSourceType === 'rss_feed') return 'sync-rss';
  if (liveSourceType === 'notion_database') return 'sync-notion';
  if (liveSourceType === 'linear_issues') return 'sync-linear';
  if (liveSourceType === 'ics_calendar') return 'sync-ics';
  return null;
}
