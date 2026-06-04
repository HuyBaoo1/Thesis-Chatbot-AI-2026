export type DashboardRangePreset =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_14_days"
  | "this_month"
  | "last_month"

export type DashboardRangeOption = {
  label: string
  value: DashboardRangePreset
}

export type DashboardRangeParams = {
  from: string
  to: string
}

const DASHBOARD_RANGE_OPTIONS: DashboardRangeOption[] = [
  { value: "today", label: "rangeToday" },
  { value: "yesterday", label: "rangeYesterday" },
  { value: "last_7_days", label: "rangeLast7Days" },
  { value: "last_14_days", label: "rangeLast14Days" },
  { value: "this_month", label: "rangeThisMonth" },
  { value: "last_month", label: "rangeLastMonth" },
]

const cloneDate = (date: Date) => new Date(date.getTime())

const shiftDays = (date: Date, days: number) => {
  const next = cloneDate(date)
  next.setDate(next.getDate() + days)
  return next
}

const startOfMonth = (date: Date) => {
  const next = cloneDate(date)
  next.setDate(1)
  return next
}

const endOfMonth = (date: Date) => {
  const next = cloneDate(date)
  next.setMonth(next.getMonth() + 1, 0)
  return next
}

const toApiDate = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

const buildDashboardRangeParams = (
  preset: DashboardRangePreset
): DashboardRangeParams => {
  const today = new Date()

  switch (preset) {
    case "today":
      return {
        from: toApiDate(today),
        to: toApiDate(today),
      }
    case "yesterday": {
      const yesterday = shiftDays(today, -1)
      return {
        from: toApiDate(yesterday),
        to: toApiDate(yesterday),
      }
    }
    case "last_7_days":
      return {
        from: toApiDate(shiftDays(today, -6)),
        to: toApiDate(today),
      }
    case "last_14_days":
      return {
        from: toApiDate(shiftDays(today, -13)),
        to: toApiDate(today),
      }
    case "this_month":
      return {
        from: toApiDate(startOfMonth(today)),
        to: toApiDate(today),
      }
    case "last_month": {
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      return {
        from: toApiDate(startOfMonth(lastMonthDate)),
        to: toApiDate(endOfMonth(lastMonthDate)),
      }
    }
  }
}

const formatRangeLabel = ({ from, to }: DashboardRangeParams) => {
  if (from === to) {
    return from
  }

  return `${from} -> ${to}`
}

export {
  buildDashboardRangeParams,
  DASHBOARD_RANGE_OPTIONS,
  formatRangeLabel,
}
