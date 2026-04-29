export interface Asset {
  _id: string;
  name: string;
  serialNumber: string;
  category: string;
  status: string;
  location?: string;
  assignedEmployeeId?: string;
  department?: string;
  assignedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NewAsset {
  name: string;
  serialNumber: string;
  category: string;
  status: string;
  location?: string;
  assignedEmployeeId?: string;
  department?: string;
  assignedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetHistory {
  assetId: string;
  action: string;
  oldValue?: string;
  newValue?: string;
  changedAt: string;
}