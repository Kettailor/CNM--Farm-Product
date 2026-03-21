

import Service from '@/components/service'
import Wrapper from '@/layouts/Wrapper'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: 'Dịch vụ | FarmHub - Nông sản thông minh',
  description: 'Các dịch vụ số hoá nông trại, quản lý vận hành và truy xuất nguồn gốc được cung cấp bởi FarmHub.',
};


export default function index() {
  return (
    <Wrapper>
      <Service />
    </Wrapper>
  )
}
