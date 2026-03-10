'use client'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
  sent: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  accepted: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  rejected: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
}

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status.toLowerCase()] ?? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
  const label = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label}
    </span>
  )
}
