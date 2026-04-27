import type { Asset } from "../types/asset.types";

type RecentlyAddedAssetsProps = {
  assets: Asset[];
};

const RecentlyAddedAssets = ({ assets }: RecentlyAddedAssetsProps) => {
  const getStatusStyle = (status: string) => {
    if (status === "available") {
      return "bg-emerald-100 text-emerald-700";
    }

    if (status === "assigned") {
      return "bg-amber-100 text-amber-700";
    }

    if (status === "maintenance") {
      return "bg-rose-100 text-rose-700";
    }

    return "bg-gray-100 text-gray-600";
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-extrabold text-gray-900">
            Recently Added Assets
          </h2>
          <p className="text-sm text-gray-500">Latest assets in inventory</p>
        </div>

        <span className="text-3xl">🆕</span>
      </div>

      {assets.length === 0 ? (
        <p className="text-gray-500 text-sm">No recently added assets.</p>
      ) : (
        <ul className="space-y-3">
          {assets.map((asset) => (
            <li
              key={asset._id}
              className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
            >
              <div>
                <p className="text-gray-800 font-bold">{asset.name}</p>
                <p className="text-sm text-gray-500">{asset.category}</p>
              </div>

              <span
                className={`px-3 py-1 rounded-full text-xs font-extrabold ${getStatusStyle(
                  asset.status,
                )}`}
              >
                {asset.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default RecentlyAddedAssets;
