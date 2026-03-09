export type UserRole = 'Admin' | 'Farmer' | 'Distributor' | 'Retailer' | 'Consumer';

export type Batch = {
  id: string;
  code: string;
  crop: string;
  status: string;
  farmName: string;
  harvestDate: string;
};

export type TraceabilityEvent = {
  stage: 'Farm' | 'Harvest' | 'Processing' | 'Logistics' | 'Retailer';
  timestamp: string;
  description: string;
};
