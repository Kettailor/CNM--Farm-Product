
import Gallery from '@/components/gallery'
import Wrapper from '@/layouts/Wrapper'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: 'Thư viện | FarmHub - Nông sản thông minh',
  description: 'Khám phá thư viện hình ảnh, dự án và mô hình triển khai nông nghiệp thông minh trên nền tảng FarmHub.',
};


export default function index() {
  return (
    <Wrapper>
      <Gallery />
    </Wrapper>
  )
}
