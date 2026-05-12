import type { RecurrenceRule } from '../../types'

/**
 * Returns all dates matching the rule between `after` (exclusive) and `through` (inclusive).
 */
export function getDueDates(rule: RecurrenceRule, after: Date, through: Date): Date[] {
  const dates: Date[] = []
  const current = new Date(after)
  current.setDate(current.getDate() + 1) // Start day after `after`

  while (current <= through) {
    if (matchesRule(rule, current)) {
      dates.push(new Date(current))
    }
    current.setDate(current.getDate() + 1)
  }

  return dates
}

/**
 * Returns the single next occurrence after a given date.
 */
export function getNextDueDate(rule: RecurrenceRule, after: Date): Date {
  const current = new Date(after)
  current.setDate(current.getDate() + 1)

  // Look ahead up to 366 days
  for (let i = 0; i < 366; i++) {
    if (matchesRule(rule, current)) {
      return new Date(current)
    }
    current.setDate(current.getDate() + 1)
  }

  // Fallback: return tomorrow (should never happen with valid rules)
  const fallback = new Date(after)
  fallback.setDate(fallback.getDate() + 1)
  return fallback
}

/**
 * Returns a human-readable description of the rule.
 */
export function describeRule(rule: RecurrenceRule): string {
  switch (rule.type) {
    case 'daily':
      return 'Every day'
    case 'weekly': {
      if (!rule.days || rule.days.length === 0) return 'Weekly'
      if (rule.days.length === 7) return 'Every day'
      if (rule.days.length === 5 && [1, 2, 3, 4, 5].every((d) => rule.days!.includes(d))) {
        return 'Every weekday'
      }
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const names = rule.days.sort((a, b) => a - b).map((d) => dayNames[d])
      return `Every ${names.join(', ')}`
    }
    case 'monthly': {
      const day = rule.day_of_month ?? 1
      const suffix =
        day === 1 || day === 21 || day === 31
          ? 'st'
          : day === 2 || day === 22
            ? 'nd'
            : day === 3 || day === 23
              ? 'rd'
              : 'th'
      return `Monthly on the ${day}${suffix}`
    }
    default:
      return 'Custom'
  }
}

function matchesRule(rule: RecurrenceRule, date: Date): boolean {
  switch (rule.type) {
    case 'daily':
      return true
    case 'weekly':
      return (rule.days ?? []).includes(date.getDay())
    case 'monthly':
      return date.getDate() === (rule.day_of_month ?? 1)
    default:
      return false
  }
}
