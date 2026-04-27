export const getAssetStatusLabel = (status: string) => {
  if (status === "available") return "Available";
  if (status === "assigned") return "Assigned";
  if (status === "maintenance") return "Maintenance";

  return status;
};

export const getAssetStatusStyle = (status: string) => {
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
