
import Faq from '@/components/faq'
import Wrapper from '@/layouts/Wrapper'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: 'Câu hỏi thường gặp | FarmHub - Nông sản thông minh',
  description: 'Giải đáp các câu hỏi phổ biến về nền tảng FarmHub, vận hành nông trại số và truy xuất nguồn gốc nông sản.',
};

export default function index() {
  return (
    <Wrapper>
      <Faq />
    </Wrapper>
  )
}
