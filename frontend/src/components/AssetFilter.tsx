import type { AssetFilters } from "../hooks/useAssetFilter";

interface AssetFilterProps {
  filters: AssetFilters;
  availableCategories: string[];
  availableStatuses: string[];
  onFilterChange: (key: keyof AssetFilters, value: string) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  totalCount: number;
  filteredCount: number;
}

export const AssetFilter = ({
  filters,
  availableCategories,
  availableStatuses,
  onFilterChange,
  onReset,
  hasActiveFilters,
  totalCount,
  filteredCount,
}: AssetFilterProps) => {
  return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
      <div className="flex flex-col md:flex-row gap-3">

        {/* Text field */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange("search", e.target.value)}
            placeholder="Search by name, serial number, category, status or location..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
        </div>

        {/* Category filter */}
        <select
          value={filters.category}
          onChange={(e) => onFilterChange("category", e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer min-w-[150px]"
        >
          {availableCategories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "All" ? "All Categories" : cat}
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange("status", e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer min-w-[140px]"
        >
          {availableStatuses.map((status) => (
            <option key={status} value={status}>
              {status === "All" ? "All Statuses" : status}
            </option>
          ))}
        </select>

        {/* Reset button – only visible when there is an active filter */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 border border-red-100 rounded-xl transition whitespace-nowrap"
          >
            ✕ Reset
          </button>
        )}
      </div>

      {/* Result counter – only visible when there is an active filter */}
      {hasActiveFilters && (
        <p className="text-xs text-gray-400 mt-3">
          Showing{" "}
          <span className="font-bold text-indigo-600">{filteredCount}</span> of{" "}
          <span className="font-bold">{totalCount}</span> assets
        </p>
      )}
    </div>
  );
};