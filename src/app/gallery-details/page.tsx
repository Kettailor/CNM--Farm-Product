

import GalleryDetails from '@/components/gallery-details'
import Wrapper from '@/layouts/Wrapper'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: 'Chi tiết dự án | FarmHub - Nông sản thông minh',
  description: 'Theo dõi chi tiết dự án, quy trình triển khai và kết quả ứng dụng giải pháp truy xuất nguồn gốc FarmHub.',
};



export default function index() {
  return (
    <Wrapper>
      <GalleryDetails />
    </Wrapper>
  )
}
