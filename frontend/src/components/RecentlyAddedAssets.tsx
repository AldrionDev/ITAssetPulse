import type { Asset } from "../types/asset.types";

type RecentlyAddedAssetsProps = {
  assets: Asset[];
};

const RecentlyAddedAssets = ({ assets }: RecentlyAddedAssetsProps) => {
  return (
    <section className="dashboard-panel">
      <h2>Recently Added Assets</h2>

      {assets.length === 0 ? (
        <p>No assets added recently</p>
      ) : (
        <ul className="recently-added-assets-list">
          {assets.map((asset) => (
            <li key={asset._id}>
              <span>{asset.name}</span>
              <small>{asset.category}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default RecentlyAddedAssets;
