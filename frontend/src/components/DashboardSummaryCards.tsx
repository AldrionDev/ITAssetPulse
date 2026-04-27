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
    { label: "Total assets", value: totalAssets, color: "bg-blue-500" },
    { label: "Available", value: availableCount, color: "bg-green-500" },
    { label: "Assigned", value: assignedCount, color: "bg-yellow-500" },
    { label: "Maintenance", value: maintenanceCount, color: "bg-red-500" },
  ];

  return (
    <div className="dashboard-cards">
      {cards.map((card) => (
        <div className={`dashboard-card ${card.color}`} key={card.label}>
          <p>{card.label}</p>
          <strong>{card.value}</strong>
        </div>
      ))}
    </div>
  );
};

export default DashboardSummaryCards;
