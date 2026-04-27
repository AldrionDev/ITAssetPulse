type CategoryBreakdownProps = {
  categories: Record<string, number>;
};

const CategoryBreakdown = ({ categories }: CategoryBreakdownProps) => {
  const items = Object.entries(categories);

  return (
    <section className="dashboard-panel">
      <h2>Category Breakdown</h2>
      {items.length === 0 ? (
        <p>No categories yet</p>
      ) : (
        <ul className="category-breakdown-list">
          {items.map(([category, count]) => (
            <li key={category}>
              <span>{category}</span>
              <strong>{count}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default CategoryBreakdown;
