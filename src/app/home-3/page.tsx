

import HomeThree from '@/components/homes/home-3'
import Wrapper from '@/layouts/Wrapper'
import { Metadata } from 'next';
import React from 'react'


export const metadata: Metadata = {
  title: 'Trang chủ 3 | FarmHub - Nông sản thông minh',
  description: 'Giao diện trang chủ 3 của FarmHub, tập trung vào trải nghiệm chuyên nghiệp cho nông nghiệp hiện đại.',
};

export default function index() {
  return (
    <Wrapper>
      <HomeThree />
    </Wrapper>
  )
}
