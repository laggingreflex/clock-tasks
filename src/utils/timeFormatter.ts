/**
 * Format seconds into human-readable time string
 * Examples: "45s", "2.5m", "1.3h", "5.2d", "3.1w", "2.4mo", "1.2y"
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = seconds / 60
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`
  }

  const hours = minutes / 60
  if (hours < 24) {
    return `${hours.toFixed(1)}h`
  }

  const days = hours / 24
  if (days < 7) {
    return `${days.toFixed(1)}d`
  }

  const weeks = days / 7
  if (weeks < 4.3) {
    return `${weeks.toFixed(1)}w`
  }

  const months = days / 30.44
  if (months < 12) {
    return `${months.toFixed(1)}mo`
  }

  const years = days / 365.25
  return `${years.toFixed(1)}y`
}
