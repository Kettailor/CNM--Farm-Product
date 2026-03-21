interface PortfolioDataType {
  id: number;
  title: string;
  price: number;
  image: string;
  category: string;
  description: string;
}

const productImages = [
  "/assets/img/08dbb3ce-181c-4f36-8ab8-8c8f94cf174b.svg",
  "/assets/img/08dbb3ce-181c-5092-8f78-f40213d3d315.svg",
  "/assets/img/08dbb3ce-181c-4fde-8668-b2bb31d25893.svg",
  "/assets/img/08dbb3ce-181c-5024-823f-d878c31298eb.svg",
  "/assets/img/08dbb3ce-181c-5131-8a69-f43eeaf5298d.svg",
  "/assets/img/08dbb3ce-181c-4e80-833e-6c43bd5dd105.svg",
  "/assets/img/08dbb3ce-181c-4e63-853a-4f27b18c6379.svg",
  "/assets/img/08dbb3ce-181c-4e53-8a7c-cb0ae4282dcc.svg",
];

const portfolio_data: PortfolioDataType[] = [
  { id: 1, title: "Cà chua hữu cơ", price: 120, image: productImages[0], category: "Tươi", description: "Nông sản sạch đạt chuẩn truy xuất" },
  { id: 2, title: "Thịt bò trang trại", price: 80, image: productImages[1], category: "Hữu cơ", description: "Chuỗi chăn nuôi minh bạch từ nông trại" },
  { id: 3, title: "Rau xanh tổng hợp", price: 45, image: productImages[2], category: "Rau củ", description: "Canh tác an toàn theo quy trình số" },
  { id: 4, title: "Trứng gà sạch", price: 44, image: productImages[3], category: "Rau củ", description: "Kiểm soát nguồn gốc và chất lượng" },
  { id: 5, title: "Bắp ngọt", price: 80, image: productImages[4], category: "Hữu cơ", description: "Nông sản mùa vụ chất lượng cao" },
  { id: 6, title: "Cải xoăn", price: 45, image: productImages[5], category: "Tươi", description: "Theo dõi quy trình chăm sóc theo lô" },
  { id: 7, title: "Thanh long", price: 120, image: productImages[6], category: "Tươi", description: "Vùng trồng chuẩn hoá dữ liệu" },
  { id: 8, title: "Bí đỏ", price: 80, image: productImages[7], category: "Hữu cơ", description: "Đảm bảo minh bạch chuỗi cung ứng" },
];

export default portfolio_data