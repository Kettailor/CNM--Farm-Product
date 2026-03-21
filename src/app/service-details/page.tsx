

import ServiceDetails from '@/components/service-details'
import Wrapper from '@/layouts/Wrapper'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: 'Chi tiết dịch vụ | FarmHub - Nông sản thông minh',
  description: 'Thông tin chi tiết từng dịch vụ FarmHub cho hệ thống quản lý nông trại và truy xuất nông sản chuyên nghiệp.',
};


export default function index() {
  return (
    <Wrapper>
      <ServiceDetails />
    </Wrapper>
  )
}
