interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-gray-100 mb-2">{title}</h1>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  )
}
