from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Batch(Base):
    __tablename__ = "batches"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    batch_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    farm_name: Mapped[str] = mapped_column(String(128))
    status: Mapped[str] = mapped_column(String(64), default="CREATED")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
