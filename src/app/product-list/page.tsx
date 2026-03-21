
import ProductList from '@/components/product-list'
import Wrapper from '@/layouts/Wrapper'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: 'Danh sách sản phẩm | FarmHub - Nông sản thông minh',
  description: 'Danh mục sản phẩm nông sản trong hệ thống FarmHub với thông tin sản xuất và truy xuất nguồn gốc đầy đủ.',
};

export default function index() {
  return (
    <Wrapper>
      <ProductList />
    </Wrapper>
  )
}
