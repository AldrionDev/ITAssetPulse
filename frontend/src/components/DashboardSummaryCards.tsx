type DashboardSummaryCardsProps = {
  totalAssets: number;
  availableCount: number;
  assignedCount: number;
  maintenanceCount: number;
};

const DashboardSummaryCards = ({
  totalAssets,
  availableCount,
  assignedCount,
  maintenanceCount,
}: DashboardSummaryCardsProps) => {
  const cards = [
    {
      label: "Total Assets",
      value: totalAssets,
      icon: "📦",
      bg: "from-indigo-500 to-violet-600",
    },
    {
      label: "Available",
      value: availableCount,
      icon: "✅",
      bg: "from-emerald-500 to-teal-600",
    },
    {
      label: "Assigned",
      value: assignedCount,
      icon: "👤",
      bg: "from-amber-400 to-orange-500",
    },
    {
      label: "Maintenance",
      value: maintenanceCount,
      icon: "🛠️",
      bg: "from-rose-500 to-red-600",
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-linear-to-br ${card.bg} rounded-2xl p-6 text-white shadow-lg hover:scale-[1.02] transition-transform duration-200`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wide opacity-90">
              {card.label}
            </p>
            <span className="text-3xl">{card.icon}</span>
          </div>

          <p className="mt-6 text-4xl font-extrabold">{card.value}</p>

          <p className="mt-2 text-sm opacity-80">Current asset count</p>
        </div>
      ))}
    </section>
  );
};

export default DashboardSummaryCards;
