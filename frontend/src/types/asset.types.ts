export interface Asset {
  _id: string;
  name: string;
  serialNumber: string;
  category: string;
  status: string;
  location?: string;
  assignedTo?: string;
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
  assignedTo?: string;
  department?: string;
  assignedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}
