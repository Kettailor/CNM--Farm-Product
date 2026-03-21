
const demo_img_1 = "/assets/img/08dbb3ce-181c-4f36-8ab8-8c8f94cf174b.svg";
const demo_img_2 = "/assets/img/08dbb3ce-181c-5092-8f78-f40213d3d315.svg";
const demo_img_3 = "/assets/img/08dbb3ce-181c-4fde-8668-b2bb31d25893.svg";

interface DataType {
  id: number;
  title: string;
  link: string;
  img_dropdown?: boolean;
  has_dropdown?: boolean;
  sub_menus?: {
    link: string;
    title: string;
    demo_img?: string;
  }[];
}

const menu_data: DataType[] = [
  {
    id: 1,
    title: "Trang chủ",
    link: "#",
    img_dropdown: true,
    sub_menus: [
      { link: "/", title: "Giao diện 01", demo_img: demo_img_1 },
      { link: "/home-2", title: "Giao diện 02", demo_img: demo_img_2 },
      { link: "/home-3", title: "Giao diện 03", demo_img: demo_img_3 },
    ],
  },
  {
    id: 2,
    title: "Giới thiệu",
    link: "/about",
    has_dropdown: false,
  },
  {
    id: 3,
    title: "Dịch vụ",
    link: "#",
    has_dropdown: true,
    sub_menus: [
      { link: "/service", title: "Danh sách dịch vụ" },
      { link: "/service-details", title: "Chi tiết dịch vụ" },
    ],
  },
  {
    id: 4,
    title: "Dự án",
    link: "#",
    has_dropdown: true,
    sub_menus: [
      { link: "/gallery", title: "Thư viện" },
      { link: "/gallery-details", title: "Chi tiết dự án" },
    ],
  },
  {
    id: 5,
    title: "Tin tức",
    link: "#",
    has_dropdown: true,
    sub_menus: [
      { link: "/blog", title: "Bài viết" },
      { link: "/blog-details", title: "Chi tiết bài viết" },
    ],
  },
  {
    id: 6,
    title: "Trang",
    link: "#",
    has_dropdown: true,
    sub_menus: [
      { link: "/about", title: "Giới thiệu" },
      { link: "/product-list", title: "Sản phẩm" },
      { link: "/product-details", title: "Chi tiết sản phẩm" },
      { link: "/faq", title: "Câu hỏi thường gặp" },
      { link: "/contact", title: "Liên hệ" },
    ],
  },
  {
    id: 7,
    title: "Liên hệ",
    link: "/contact",
    has_dropdown: false,
  },
];

export default menu_data;
