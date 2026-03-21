
import ProductDetails from '@/components/product-details'
import Wrapper from '@/layouts/Wrapper'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: 'Chi tiết sản phẩm | FarmHub - Nông sản thông minh',
  description: 'Thông tin chi tiết sản phẩm nông sản, chứng nhận, lô hàng và dữ liệu truy xuất nguồn gốc trên FarmHub.',
};

export default function index() {
  return (
    <Wrapper>
      <ProductDetails />
    </Wrapper>
  )
}
