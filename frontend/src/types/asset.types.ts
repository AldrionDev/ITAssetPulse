export interface Asset {
  _id: string;
  name: string;
  serialNumber: string;
  category: string;
  status: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NewAsset {
  name: string;
  serialNumber: string;
  category: string;
  status: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}
