interface InfoGridItem {
  label: string
  value: string | React.ReactNode
}

export function CompactInfoGrid({
  items,
  columns = 2,
}: {
  items: InfoGridItem[]
  columns?: 2 | 3
}) {
  const colClasses = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
  }

  return (
    <div className={`grid gap-3 ${colClasses[columns]}`}>
      {items.map((item, index) => (
        <div
          key={index}
          className="rounded-xl bg-gray-50 px-3 py-2.5"
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
            {item.label}
          </div>
          <div className="mt-1 text-sm font-semibold text-[#0F1B3D]">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}
