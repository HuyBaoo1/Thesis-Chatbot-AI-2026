const formatDate = (
  value: string | null | undefined,
  options?: Intl.DateTimeFormatOptions
) => {
  if (!value) {
    return "--"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "--"
  }

  return new Intl.DateTimeFormat("vi-VN", options).format(date)
}

const formatDateOnly = (value: string | null | undefined) =>
  formatDate(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

const formatDateTime = (value: string | null | undefined) =>
  formatDate(value, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

export { formatDate, formatDateOnly, formatDateTime }
