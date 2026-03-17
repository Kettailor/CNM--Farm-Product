import React from 'react';
import { Metadata } from 'next';
import SmartFarmDashboard from '@/components/traceability/SmartFarmDashboard';

export const metadata: Metadata = {
  title: 'Nông sản thông minh - Truy xuất nguồn gốc',
  description:
    'Giao diện quản lý nông sản thông minh: theo dõi cảm biến, quản lý lô hàng và truy xuất nguồn gốc.',
};

export default function HomePage() {
  return <SmartFarmDashboard />;
}
