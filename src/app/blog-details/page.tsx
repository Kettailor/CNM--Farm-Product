
import BlogDetails from '@/components/blog-details'
import Wrapper from '@/layouts/Wrapper'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: 'Chi tiết bài viết | FarmHub - Nông sản thông minh',
  description: 'Nội dung chi tiết về giải pháp nông nghiệp thông minh, truy xuất nguồn gốc và chuẩn hoá vận hành nông trại.',
};


export default function index() {
  return (
    <Wrapper>
      <BlogDetails />
    </Wrapper>
  )
}
