
import React from 'react'
import { Metadata } from 'next';
import HomeTwo from '@/components/homes/home-2'
import Wrapper from '@/layouts/Wrapper';


export const metadata: Metadata = {
  title: 'Trang chủ 2 | FarmHub - Nông sản thông minh',
  description: 'Giao diện trang chủ 2 dành cho hệ sinh thái FarmHub với định hướng quản trị nông trại và truy xuất nguồn gốc.',
};



export default function index() {
  return (
    <Wrapper>
      <HomeTwo />
    </Wrapper>
  )
}
