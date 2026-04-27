type CategoryBreakdownProps = {
  categories: Record<string, number>;
};

const CategoryBreakdown = ({ categories }: CategoryBreakdownProps) => {
  const items = Object.entries(categories);

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">
            Category Breakdown
          </h2>
          <p className="text-sm text-gray-500">Assets grouped by category</p>
        </div>

        <span className="text-3xl">📊</span>
      </div>

      {items.length === 0 ? (
        <p className="text-gray-500 text-sm">No categories yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map(([category, count], index) => (
            <li
              key={category}
              className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-3 h-3 rounded-full ${
                    index % 4 === 0
                      ? "bg-indigo-500"
                      : index % 4 === 1
                        ? "bg-emerald-500"
                        : index % 4 === 2
                          ? "bg-amber-500"
                          : "bg-rose-500"
                  }`}
                />
                <span className="text-gray-700 font-semibold">{category}</span>
              </div>

              <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-extrabold">
                {count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default CategoryBreakdown;
