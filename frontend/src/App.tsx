import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Users, 
  FileText, 
  Plus, 
  AlertCircle, 
  CheckCircle
} from 'lucide-react';
import type { Product, Customer, Order } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'products' | 'customers' | 'orders'>('products');
  const [apiBaseUrl, setApiBaseUrl] = useState(() => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) return envUrl;
    return localStorage.getItem('api_base_url') || 'http://localhost:8000';
  });

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Loading & Notification states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  // Forms state
  const [productForm, setProductForm] = useState({ name: '', sku: '', price: '', stock: '', description: '' });
  const [customerForm, setCustomerForm] = useState({ name: '', email: '', address: '' });
  const [orderForm, setOrderForm] = useState({ customer_id: '', product_id: '', quantity: '1' });

  // Update localStorage on URL change
  useEffect(() => {
    localStorage.setItem('api_base_url', apiBaseUrl);
  }, [apiBaseUrl]);

  // Load data based on active tab
  useEffect(() => {
    fetchData();
  }, [activeTab, apiBaseUrl]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'products') {
        const data = await apiRequest('/products');
        setProducts(data);
      } else if (activeTab === 'customers') {
        const data = await apiRequest('/customers');
        setCustomers(data);
      } else if (activeTab === 'orders') {
        const data = await apiRequest('/orders');
        setOrders(data);
        // Pre-fetch products/customers for order dropdowns
        const prods = await apiRequest('/products');
        const custs = await apiRequest('/customers');
        setProducts(prods);
        setCustomers(custs);
      }
    } catch (err: any) {
      setError(`Connection failed: ${err.message}. Make sure backend is running.`);
    } finally {
      setLoading(false);
    }
  };

  const apiRequest = async (path: string, method: string = 'GET', body?: any) => {
    const url = `${apiBaseUrl.replace(/\/$/, '')}${path}`;
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }
    const response = await fetch(url, options);
    
    const contentType = response.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");
    
    if (!response.ok) {
      let errorMessage = `Request failed (${response.status})`;
      if (isJson) {
        const errJson = await response.json().catch(() => ({}));
        errorMessage = errJson.detail || errorMessage;
      } else {
        const text = await response.text().catch(() => "");
        if (text.includes("spinning up") || text.includes("starting") || text.includes("Render")) {
          errorMessage = "Render backend is starting up (waking up from sleep). Please wait 1 minute and click Reconnect.";
        } else {
          errorMessage = `Server error (${response.status}): ${text.substring(0, 80)}`;
        }
      }
      throw new Error(errorMessage);
    }
    
    if (!isJson) {
      const text = await response.text().catch(() => "");
      if (text.includes("spinning up") || text.includes("starting") || text.includes("Render")) {
        throw new Error("Render backend is starting up (waking up from sleep). Please wait 1-2 minutes and click Reconnect.");
      }
      throw new Error("Response was not in JSON format. Please verify you entered the correct Web Service URL, not your database link or Render Dashboard URL.");
    }
    
    return response.json();
  };

  const triggerNotification = (type: 'success' | 'error', message: string) => {
    if (type === 'success') {
      setSuccess(message);
      setTimeout(() => setSuccess(null), 5000);
    } else {
      setError(message);
      setTimeout(() => setError(null), 8000);
    }
  };

  // Form Submissions
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        name: productForm.name,
        sku: productForm.sku,
        price: parseFloat(productForm.price),
        stock: parseInt(productForm.stock),
        description: productForm.description || undefined
      };
      await apiRequest('/products', 'POST', payload);
      triggerNotification('success', `Product ${productForm.name} added successfully!`);
      setProductForm({ name: '', sku: '', price: '', stock: '', description: '' });
      setIsProductModalOpen(false);
      fetchData();
    } catch (err: any) {
      triggerNotification('error', err.message);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await apiRequest('/customers', 'POST', customerForm);
      triggerNotification('success', `Customer ${customerForm.name} registered successfully!`);
      setCustomerForm({ name: '', email: '', address: '' });
      setIsCustomerModalOpen(false);
      fetchData();
    } catch (err: any) {
      triggerNotification('error', err.message);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        customer_id: parseInt(orderForm.customer_id),
        product_id: parseInt(orderForm.product_id),
        quantity: parseInt(orderForm.quantity)
      };
      await apiRequest('/orders', 'POST', payload);
      triggerNotification('success', 'Order placed successfully! Product stock updated.');
      setOrderForm({ customer_id: '', product_id: '', quantity: '1' });
      setIsOrderModalOpen(false);
      fetchData();
    } catch (err: any) {
      triggerNotification('error', err.message);
    }
  };

  // Helper to compute selected order values
  const getSelectedProductPrice = () => {
    const prod = products.find(p => p.id === parseInt(orderForm.product_id));
    return prod ? prod.price : 0;
  };

  const getSelectedProductStock = () => {
    const prod = products.find(p => p.id === parseInt(orderForm.product_id));
    return prod ? prod.stock : 0;
  };

  const getEstimatedTotal = () => {
    const price = getSelectedProductPrice();
    const qty = parseInt(orderForm.quantity) || 0;
    return (price * qty).toFixed(2);
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">E</div>
          <span className="brand-name">Nexus E-Shop</span>
        </div>

        <nav className="nav-menu">
          <button 
            className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <ShoppingBag size={18} />
            <span>Products</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            <Users size={18} />
            <span>Customers</span>
          </button>
          <button 
            className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            <FileText size={18} />
            <span>Orders</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.8rem', paddingBottom: '0.8rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'left' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-cyan)', letterSpacing: '0.5px' }}>API CONNECTION</span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <input 
                type="text" 
                style={{
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  padding: '0.3rem 0.5rem',
                  color: 'white',
                  fontSize: '0.75rem',
                  flexGrow: 1,
                  boxSizing: 'border-box',
                  width: '1px'
                }}
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                placeholder="http://localhost:8000"
              />
              <button 
                type="button"
                onClick={fetchData}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '0.7rem',
                  padding: '0.3rem 0.5rem',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Sync
              </button>
            </div>
          </div>
          <p style={{ margin: 0 }}>© 2026 Nexus Stack</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">


        {/* Action Alert Banners */}
        {error && (
          <div className="alert alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* PAGE: Products */}
        {activeTab === 'products' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Product Catalog</h1>
                <p className="page-description">Manage warehouse inventory items and pricing.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsProductModalOpen(true)}>
                <Plus size={18} />
                <span>Add Product</span>
              </button>
            </div>

            {loading && products.length === 0 ? (
              <div className="empty-state">Loading product database...</div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <ShoppingBag className="empty-icon" />
                <p className="empty-text">No products in inventory yet.</p>
                <button className="btn btn-secondary" onClick={() => setIsProductModalOpen(true)}>
                  Create First Product
                </button>
              </div>
            ) : (
              <div className="grid-cols-3">
                {products.map((product) => {
                  const isOutOfStock = product.stock <= 0;
                  const isLowStock = product.stock > 0 && product.stock <= 3;
                  return (
                    <div key={product.id} className="glass-card">
                      <div className="card-title-group">
                        <h3 className="card-title">{product.name}</h3>
                        <span className="card-badge badge-cyan">{product.sku}</span>
                      </div>
                      <div className="card-price">{product.price.toFixed(2)}</div>
                      
                      <div className="card-detail-item" style={{ marginTop: '1.5rem' }}>
                        <span className="card-detail-label">Status</span>
                        <span className="stock-status">
                          <span className={`status-dot ${isOutOfStock ? 'status-dot-out' : isLowStock ? 'status-dot-low' : 'status-dot-in'}`}></span>
                          <span style={{ color: isOutOfStock ? 'var(--accent-rose)' : isLowStock ? '#f59e0b' : 'var(--accent-emerald)' }}>
                            {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                          </span>
                        </span>
                      </div>
                      
                      <div className="card-detail-item">
                        <span className="card-detail-label">Available Units</span>
                        <span className="card-detail-val">{product.stock}</span>
                      </div>
                      
                      {product.description && (
                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--glass-border)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {product.description}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PAGE: Customers */}
        {activeTab === 'customers' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Customer Registry</h1>
                <p className="page-description">Maintain client profiles and contact addresses.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsCustomerModalOpen(true)}>
                <Plus size={18} />
                <span>Add Customer</span>
              </button>
            </div>

            {loading && customers.length === 0 ? (
              <div className="empty-state">Loading customer records...</div>
            ) : customers.length === 0 ? (
              <div className="empty-state">
                <Users className="empty-icon" />
                <p className="empty-text">No registered customers found.</p>
                <button className="btn btn-secondary" onClick={() => setIsCustomerModalOpen(true)}>
                  Register First Customer
                </button>
              </div>
            ) : (
              <div className="table-container glass-card" style={{ padding: 0 }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Customer Name</th>
                      <th>Email Address</th>
                      <th>Shipping Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((cust) => (
                      <tr key={cust.id}>
                        <td>{cust.id}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cust.name}</td>
                        <td>{cust.email}</td>
                        <td>{cust.address || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PAGE: Orders */}
        {activeTab === 'orders' && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Sales Orders</h1>
                <p className="page-description">Track checkout transactions and real-time stock updates.</p>
              </div>
              <button className="btn btn-primary" onClick={() => setIsOrderModalOpen(true)}>
                <Plus size={18} />
                <span>Create Order</span>
              </button>
            </div>

            {loading && orders.length === 0 ? (
              <div className="empty-state">Loading sales orders...</div>
            ) : orders.length === 0 ? (
              <div className="empty-state">
                <FileText className="empty-icon" />
                <p className="empty-text">No orders placed yet.</p>
                <button className="btn btn-secondary" onClick={() => setIsOrderModalOpen(true)}>
                  Place First Order
                </button>
              </div>
            ) : (
              <div className="table-container glass-card" style={{ padding: 0 }}>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Product Info</th>
                      <th>Qty</th>
                      <th>Total Cost</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((ord) => (
                      <tr key={ord.id}>
                        <td>#{ord.id}</td>
                        <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {ord.customer ? ord.customer.name : `Customer ID: ${ord.customer_id}`}
                        </td>
                        <td>
                          <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                            {ord.product ? ord.product.name : `Product ID: ${ord.product_id}`}
                          </div>
                          {ord.product && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU: {ord.product.sku}</div>}
                        </td>
                        <td>{ord.quantity}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>${ord.total_price.toFixed(2)}</td>
                        <td>
                          <span className="card-badge badge-emerald">{ord.status}</span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {new Date(ord.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL: Add Product */}
      {isProductModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div className="modal-header">
              <h2 className="modal-title">New Warehouse Product</h2>
              <button className="modal-close" onClick={() => setIsProductModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddProduct}>
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. UltraWide Gaming Monitor"
                />
              </div>
              <div className="form-group">
                <label className="form-label">SKU (Unique Identifier)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={productForm.sku}
                  onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                  placeholder="e.g. MON-34-UW"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    className="form-control" 
                    required 
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="299.99"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Initial Stock</label>
                  <input 
                    type="number" 
                    min="0"
                    className="form-control" 
                    required 
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    placeholder="25"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  className="form-control" 
                  rows={3}
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Additional catalog specifications..."
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsProductModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Catalog Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add Customer */}
      {isCustomerModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Register New Customer</h2>
              <button className="modal-close" onClick={() => setIsCustomerModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddCustomer}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required 
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder="e.g. Jane Smith"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address (Unique)</label>
                <input 
                  type="email" 
                  className="form-control" 
                  required 
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  placeholder="jane.smith@example.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Shipping Address (Optional)</label>
                <textarea 
                  className="form-control" 
                  rows={2}
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder="e.g. 742 Evergreen Terrace, Springfield"
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCustomerModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Register Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Order */}
      {isOrderModalOpen && (
        <div className="modal-overlay">
          <div className="glass-card modal-content">
            <div className="modal-header">
              <h2 className="modal-title">Create Sales Order</h2>
              <button className="modal-close" onClick={() => setIsOrderModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateOrder}>
              <div className="form-group">
                <label className="form-label">Select Customer</label>
                <select 
                  className="form-control" 
                  required 
                  value={orderForm.customer_id}
                  onChange={(e) => setOrderForm({ ...orderForm, customer_id: e.target.value })}
                >
                  <option value="">-- Choose Profile --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Select Product</label>
                <select 
                  className="form-control" 
                  required 
                  value={orderForm.product_id}
                  onChange={(e) => setOrderForm({ ...orderForm, product_id: e.target.value })}
                >
                  <option value="">-- Choose Inventory Item --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                      {p.name} - ${p.price.toFixed(2)} ({p.stock} in stock) {p.stock <= 0 ? '[OUT OF STOCK]' : ''}
                    </option>
                  ))}
                </select>
              </div>
              
              {orderForm.product_id && (
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span className="text-secondary">Item Unit Price:</span>
                    <span className="text-primary" style={{ fontWeight: 600 }}>${getSelectedProductPrice().toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Available Stock:</span>
                    <span className="text-primary" style={{ fontWeight: 600, color: getSelectedProductStock() <= 3 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                      {getSelectedProductStock()} units
                    </span>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Checkout Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  className="form-control" 
                  required 
                  value={orderForm.quantity}
                  onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })}
                />
              </div>

              {orderForm.product_id && orderForm.quantity && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 0', borderTop: '1px dashed var(--glass-border)', marginTop: '1.5rem' }}>
                  <span style={{ fontWeight: 600 }}>Estimated Order Total:</span>
                  <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                    ${getEstimatedTotal()}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsOrderModalOpen(false)}>
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={orderForm.product_id ? (parseInt(orderForm.quantity) > getSelectedProductStock()) : true}
                >
                  Confirm Purchase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
