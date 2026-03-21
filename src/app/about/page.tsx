

import About from '@/components/about'
import Wrapper from '@/layouts/Wrapper'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: 'Giới thiệu | FarmHub - Nông sản thông minh',
  description: 'Tìm hiểu nền tảng FarmHub cho quản lý nông trại số, truy xuất nguồn gốc và vận hành nông nghiệp hiện đại.',
};


export default function index() {
  return (
    <Wrapper>
      <About />
    </Wrapper>
  )
}
