from pydantic import BaseModel


class BatchOut(BaseModel):
    id: int
    batch_code: str
    farm_name: str
    status: str

    class Config:
        from_attributes = True
