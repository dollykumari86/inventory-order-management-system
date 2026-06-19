from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime

# --- Product Schemas ---
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1)
    sku: str = Field(..., min_length=1)
    price: float = Field(..., ge=0.0)
    stock: int = Field(..., ge=0)
    description: Optional[str] = None

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Customer Schemas ---
class CustomerBase(BaseModel):
    name: str = Field(..., min_length=1)
    email: EmailStr
    address: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# --- Order Schemas ---
class OrderCreate(BaseModel):
    customer_id: int
    product_id: int
    quantity: int = Field(..., gt=0)

class OrderResponse(BaseModel):
    id: int
    customer_id: int
    product_id: int
    quantity: int
    total_price: float
    status: str
    created_at: datetime
    product: Optional[ProductResponse] = None
    customer: Optional[CustomerResponse] = None

    model_config = ConfigDict(from_attributes=True)
