from sqlalchemy.orm import Session
from app import models, schemas

# --- Product CRUD ---
def get_product(db: Session, product_id: int):
    return db.query(models.Product).filter(models.Product.id == product_id).first()

def get_product_by_sku(db: Session, sku: str):
    return db.query(models.Product).filter(models.Product.sku == sku).first()

def get_products(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Product).order_by(models.Product.id.desc()).offset(skip).limit(limit).all()

def create_product(db: Session, product: schemas.ProductCreate):
    db_product = get_product_by_sku(db, product.sku)
    if db_product:
        raise ValueError("Product SKU must be unique")
    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

# --- Customer CRUD ---
def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def get_customer_by_email(db: Session, email: str):
    return db.query(models.Customer).filter(models.Customer.email == email).first()

def get_customers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Customer).order_by(models.Customer.id.desc()).offset(skip).limit(limit).all()

def create_customer(db: Session, customer: schemas.CustomerCreate):
    db_customer = get_customer_by_email(db, customer.email)
    if db_customer:
        raise ValueError("Customer email must be unique")
    db_customer = models.Customer(**customer.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

# --- Order CRUD ---
def get_orders(db: Session, skip: int = 0, limit: int = 100):
    # Eager load customer and product to populate responses fully
    return db.query(models.Order).order_by(models.Order.id.desc()).offset(skip).limit(limit).all()

def create_order(db: Session, order: schemas.OrderCreate):
    # Fetch customer
    db_customer = get_customer(db, order.customer_id)
    if not db_customer:
        raise ValueError("Customer not found")
    
    # Fetch product (using SELECT FOR UPDATE if not SQLite to prevent race conditions)
    query = db.query(models.Product).filter(models.Product.id == order.product_id)
    if db.bind.dialect.name != 'sqlite':
        query = query.with_for_update()
    db_product = query.first()
    
    if not db_product:
        raise ValueError("Product not found")
    
    # Check stock
    if db_product.stock < order.quantity:
        raise ValueError("Insufficient stock")
    
    # Reduce stock
    db_product.stock -= order.quantity
    
    # Calculate total price
    total_price = round(order.quantity * db_product.price, 2)
    
    # Create order
    db_order = models.Order(
        customer_id=order.customer_id,
        product_id=order.product_id,
        quantity=order.quantity,
        total_price=total_price,
        status="Placed"
    )
    
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    return db_order
