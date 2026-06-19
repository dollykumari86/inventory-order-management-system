export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  description?: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  address?: string;
}

export interface Order {
  id: number;
  customer_id: number;
  product_id: number;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
  product?: Product;
  customer?: Customer;
}
