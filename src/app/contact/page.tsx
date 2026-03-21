

import Contact from '@/components/contact'
import Wrapper from '@/layouts/Wrapper'
import { Metadata } from 'next';
import React from 'react'

export const metadata: Metadata = {
  title: 'Liên hệ | FarmHub - Nông sản thông minh',
  description: 'Kết nối với đội ngũ FarmHub để được tư vấn triển khai hệ thống truy xuất và quản trị nông trại chuyên nghiệp.',
};

export default function index() {
  return (
    <Wrapper>
      <Contact />
    </Wrapper>
  )
}
