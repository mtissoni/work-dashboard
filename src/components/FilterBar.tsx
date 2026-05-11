import { CATEGORIES, PRIORITIES, EFFORTS, STATUSES } from '../types'
import type { TaskFilters } from '../types'

interface FilterBarProps {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
  sourceListOptions: string[]
}

export function FilterBar({ filters, onFiltersChange, sourceListOptions }: FilterBarProps) {
  const update = (key: keyof TaskFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value || undefined })
  }

  const hasActiveFilters = Object.values(filters).some(Boolean)

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <input
        type="text"
        placeholder="Search tasks..."
        value={filters.search ?? ''}
        onChange={(e) => update('search', e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded-md text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <Select
        value={filters.category ?? ''}
        onChange={(v) => update('category', v)}
        options={CATEGORIES}
        placeholder="Category"
      />
      <Select
        value={filters.priority ?? ''}
        onChange={(v) => update('priority', v)}
        options={PRIORITIES}
        placeholder="Priority"
      />
      <Select
        value={filters.effort ?? ''}
        onChange={(v) => update('effort', v)}
        options={EFFORTS}
        placeholder="Effort"
      />
      <Select
        value={filters.status ?? ''}
        onChange={(v) => update('status', v)}
        options={STATUSES}
        placeholder="Status"
      />
      {sourceListOptions.length > 0 && (
        <Select
          value={filters.sourceList ?? ''}
          onChange={(v) => update('sourceList', v)}
          options={sourceListOptions}
          placeholder="Source List"
        />
      )}

      {hasActiveFilters && (
        <button
          onClick={() => onFiltersChange({})}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
        >
          Clear
        </button>
      )}
    </div>
  )
}

function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1.5 border border-gray-300 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}
