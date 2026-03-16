interface QuoteMetricsProps {
  exchangeRate: string
  ebitdaMargin: string
  msnCount: number
}

export function QuoteMetrics({ exchangeRate, ebitdaMargin, msnCount }: QuoteMetricsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Exchange Rate (USD/EUR)</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-mono">
          {exchangeRate}
        </p>
      </div>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">EBITDA Margin</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 font-mono">
          {ebitdaMargin}%
        </p>
      </div>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Aircraft (MSNs)</p>
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {msnCount}
        </p>
      </div>
    </div>
  )
}
