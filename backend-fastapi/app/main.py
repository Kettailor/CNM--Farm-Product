from io import BytesIO
import hashlib
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse, Response
import segno

app = FastAPI(
    title="KetKat-EcoFarm API",
    version="1.0.0",
    description="Dich vu FastAPI bo sung cho KetKat-EcoFarm",
)


@app.get("/api/health")
def health_check():
    return JSONResponse(
        {
            "trang_thai": "dang_hoat_dong",
            "dich_vu": "fastapi",
            "he_thong": "KetKat-EcoFarm",
        }
    )


@app.get("/api/qr")
def tao_qr_dong(
    data: str = Query(..., description="Du lieu can ma hoa vao QR"),
    scale: int = Query(8, ge=2, le=20),
):
    qr = segno.make(data, error="h")
    buffer = BytesIO()
    qr.save(buffer, kind="svg", scale=scale)
    return Response(content=buffer.getvalue(), media_type="image/svg+xml")


@app.get("/api/blockchain/trang-thai")
def trang_thai_blockchain():
    return JSONResponse(
        {
            "trang_thai": "san_sang_khoi_tao",
            "nen_tang_du_kien": "hyperledger_fabric",
            "ghi_chu": "Dang o che do khoi tao cau truc, chua ghi block that.",
        }
    )


@app.get("/api/blockchain/ma-bam")
def tao_ma_bam(
    ma_san_pham: str = Query(..., description="Ma dinh danh san pham"),
    du_lieu: str = Query(..., description="Du lieu truy xuat can bam"),
):
    noi_dung = f"{ma_san_pham}|{du_lieu}"
    ma_bam = hashlib.sha256(noi_dung.encode("utf-8")).hexdigest()
    return JSONResponse(
        {
            "ma_san_pham": ma_san_pham,
            "ma_bam_sha256": ma_bam,
            "muc_dich": "Du lieu trung gian truoc khi day len blockchain that",
        }
    )

