import React from 'react';
import { Metadata } from 'next';
import SmartFarmExperience from '@/components/traceability/SmartFarmExperience';

export const metadata: Metadata = {
  title: 'Nông sản thông minh - Đăng ký & quản lý truy xuất nguồn gốc',
  description:
    'Website giới thiệu, onboarding đăng ký tài khoản nông trại và hệ thống quản lý truy xuất nguồn gốc.',
};

export default function HomePage() {
  return <SmartFarmExperience />;
}
