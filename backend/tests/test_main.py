import os
# Force SQLite database URL for testing
os.environ["DATABASE_URL"] = "sqlite:///./test.db"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db, engine as db_engine

# Use the app's database sessionmaker, bound to the overridden engine
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def cleanup_test_db_file():
    yield
    # Dispose the engine to release all connection pool handles
    db_engine.dispose()
    if os.path.exists("./test.db"):
        try:
            os.remove("./test.db")
        except Exception:
            pass

@pytest.fixture(autouse=True)
def run_around_tests():
    # Recreate tables before each test on the test database
    Base.metadata.drop_all(bind=db_engine)
    Base.metadata.create_all(bind=db_engine)
    yield
    # Just drop tables between tests to clear data
    Base.metadata.drop_all(bind=db_engine)



def test_create_product():
    response = client.post(
        "/products",
        json={"name": "Gaming Mouse", "sku": "MOUSE-100", "price": 49.99, "stock": 10, "description": "High performance mouse"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Gaming Mouse"
    assert data["sku"] == "MOUSE-100"
    assert data["price"] == 49.99
    assert data["stock"] == 10
    assert "id" in data

def test_duplicate_product_sku():
    # Create first product
    client.post(
        "/products",
        json={"name": "Gaming Mouse", "sku": "MOUSE-100", "price": 49.99, "stock": 10}
    )
    # Create second product with duplicate SKU
    response = client.post(
        "/products",
        json={"name": "Office Mouse", "sku": "MOUSE-100", "price": 19.99, "stock": 5}
    )
    assert response.status_code == 400
    assert "SKU must be unique" in response.json()["detail"]

def test_create_customer():
    response = client.post(
        "/customers",
        json={"name": "John Doe", "email": "john@example.com", "address": "123 Main St"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "John Doe"
    assert data["email"] == "john@example.com"
    assert "id" in data

def test_duplicate_customer_email():
    # Create first customer
    client.post(
        "/customers",
        json={"name": "John Doe", "email": "john@example.com"}
    )
    # Create second customer with duplicate email
    response = client.post(
        "/customers",
        json={"name": "Jane Doe", "email": "john@example.com"}
    )
    assert response.status_code == 400
    assert "email must be unique" in response.json()["detail"]

def test_create_order_reduces_stock():
    # Create product with stock = 10
    prod_resp = client.post(
        "/products",
        json={"name": "Gaming Keyboard", "sku": "KEY-200", "price": 89.99, "stock": 10}
    )
    product_id = prod_resp.json()["id"]

    # Create customer
    cust_resp = client.post(
        "/customers",
        json={"name": "Bob Smith", "email": "bob@example.com"}
    )
    customer_id = cust_resp.json()["id"]

    # Place order for quantity 3
    order_resp = client.post(
        "/orders",
        json={"customer_id": customer_id, "product_id": product_id, "quantity": 3}
    )
    assert order_resp.status_code == 201
    order_data = order_resp.json()
    assert order_data["quantity"] == 3
    assert order_data["total_price"] == round(3 * 89.99, 2)
    assert order_data["status"] == "Placed"

    # Verify stock is reduced
    prod_detail_resp = client.get(f"/products/{product_id}")
    assert prod_detail_resp.json()["stock"] == 7

def test_create_order_insufficient_stock():
    # Create product with stock = 5
    prod_resp = client.post(
        "/products",
        json={"name": "Gaming Headset", "sku": "HD-300", "price": 59.99, "stock": 5}
    )
    product_id = prod_resp.json()["id"]

    # Create customer
    cust_resp = client.post(
        "/customers",
        json={"name": "Alice Johnson", "email": "alice@example.com"}
    )
    customer_id = cust_resp.json()["id"]

    # Try to place order for quantity 6 (insufficient stock)
    order_resp = client.post(
        "/orders",
        json={"customer_id": customer_id, "product_id": product_id, "quantity": 6}
    )
    assert order_resp.status_code == 400
    assert "Insufficient stock" in order_resp.json()["detail"]

    # Verify stock is unchanged
    prod_detail_resp = client.get(f"/products/{product_id}")
    assert prod_detail_resp.json()["stock"] == 5
