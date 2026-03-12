import time

from fastapi import Depends, FastAPI, HTTPException, Response
from sqlalchemy import text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.database import Base, SessionLocal, engine, get_db
from app.models.batch import Batch
from app.schemas.batch import BatchOut
from app.services.qr_service import create_qr_svg

app = FastAPI(title=settings.app_name, version=settings.app_version)


def wait_for_database(max_retries: int = 20, delay_seconds: int = 2) -> None:
    for attempt in range(1, max_retries + 1):
        try:
            with SessionLocal() as db:
                db.execute(text("SELECT 1"))
            return
        except OperationalError:
            if attempt == max_retries:
                raise
            time.sleep(delay_seconds)


@app.on_event("startup")
def startup() -> None:
    wait_for_database()
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/batches/{batch_code}", response_model=BatchOut)
def get_batch(batch_code: str, db: Session = Depends(get_db)) -> BatchOut:
    batch = db.query(Batch).filter(Batch.batch_code == batch_code).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    return batch


@app.get("/api/qr/{batch_code}")
def get_batch_qr(batch_code: str) -> Response:
    trace_url = f"http://localhost/traceability/{batch_code}"
    svg = create_qr_svg(trace_url)
    return Response(content=svg, media_type="image/svg+xml")
