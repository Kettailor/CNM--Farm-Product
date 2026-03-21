

import Blog from '@/components/blog'
import Wrapper from '@/layouts/Wrapper'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: 'Tin tức | FarmHub - Nông sản thông minh',
  description: 'Cập nhật bài viết về nông nghiệp số, quản lý sản xuất và truy xuất nguồn gốc nông sản trên FarmHub.',
};


export default function index() {
  return (
    <Wrapper>
      <Blog />
    </Wrapper>
  )
}
