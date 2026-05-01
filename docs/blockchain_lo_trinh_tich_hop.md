# Lo trinh tich hop Blockchain cho KetKat-EcoFarm

## Muc tieu
- Tao cau truc san cho truy xuat nguon goc nong trai, chan nuoi, kho, van chuyen.
- Chua bat buoc trien khai mang blockchain that o giai doan hien tai.

## Da co trong he thong
- API Next.js:
  - `GET /api/blockchain/trang-thai`
  - `POST /api/blockchain/ghi-nhan`
- API FastAPI mo rong:
  - `GET /api/blockchain/trang-thai`
  - `GET /api/blockchain/ma-bam`
- CSDL mo rong:
  - `du_lieu.chuoi_khoi_mang`
  - `du_lieu.truy_xuat_san_pham_chuoi_khoi`
  - `du_lieu.nhat_ky_dong_bo_chuoi_khoi`

## Cach dung tam thoi
1. Goi FastAPI de tao ma bam SHA-256 tu du lieu truy xuat.
2. Gui ma bam + thong tin san pham vao `POST /api/blockchain/ghi-nhan`.
3. Ban ghi duoc luu o trang thai `cho_dong_bo`.
4. Khi tich hop Hyperledger Fabric that, tao worker dong bo va cap nhat:
   - `ma_giao_dich_chuoi_khoi`
   - `khoi_so`
   - `trang_thai_dong_bo = da_dong_bo`

## De xuat giai doan tiep theo
- Them worker dong bo nen (queue/job).
- Ky so du lieu truoc khi gui blockchain.
- Them endpoint tra cuu truy xuat cong khai bang `ma_truy_xuat`.
- Gan lien ket voi QR dong de nguoi dung quet xem lich su.

