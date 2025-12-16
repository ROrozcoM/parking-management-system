import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';

function ProductSaleModal({ show, onHide, onSuccess }) {
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customProductName, setCustomProductName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show) {
      fetchProducts();
    }
  }, [show]);

  const fetchProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await fetch('/api/products', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error cargando productos');

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Error al cargar productos');
    } finally {
      setLoadingProducts(false);
    }
  };

  const calculateTotal = () => {
    if (customPrice && quantity) {
      return (parseFloat(customPrice) * quantity).toFixed(2);
    }
    return '0.00';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validaciones
    if (!selectedProductId) {
      setError('Selecciona un producto');
      return;
    }

    if (!customProductName.trim()) {
      setError('El nombre del producto no puede estar vacío');
      return;
    }

    if (!customPrice || parseFloat(customPrice) <= 0) {
      setError('Introduce un precio válido');
      return;
    }

    if (quantity <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }

    setLoading(true);

    try {
      const body = {
        quantity: parseInt(quantity),
        payment_method: paymentMethod,
        unit_price: parseFloat(customPrice),
        product_name: customProductName.trim()
      };

      if (selectedProductId !== 'other') {
        body.product_id = parseInt(selectedProductId);
      }

      console.log('Enviando body:', body);

      const response = await fetch('/api/cash/product-sale', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error registrando venta');
      }

      const result = await response.json();
      
      if (result.success) {
        onSuccess();
        handleClose();
      }

    } catch (err) {
      console.error('Error registering sale:', err);
      setError(err.message || 'Error al registrar la venta');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedProductId('');
    setCustomProductName('');
    setCustomPrice('');
    setQuantity(1);
    setPaymentMethod('cash');
    setError(null);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton style={{ backgroundColor: '#28a745', color: 'white' }}>
        <Modal.Title>🛒 Registrar Venta de Productos</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Form onSubmit={handleSubmit}>
          {/* Selector de producto */}
          <Form.Group className="mb-3">
            <Form.Label><strong>Producto:</strong></Form.Label>
            {loadingProducts ? (
              <div className="text-center py-3">
                <Spinner animation="border" size="sm" />
                <span className="ms-2">Cargando productos...</span>
              </div>
            ) : (
              <Form.Select
                value={selectedProductId}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedProductId(value);
                  setError(null);
                  
                  // Pre-rellenar nombre y precio según selección
                  if (value === 'other') {
                    setCustomProductName('');
                    setCustomPrice('');
                  } else if (value) {
                    const product = products.find(p => p.id === parseInt(value));
                    if (product) {
                      setCustomProductName(product.name);
                      setCustomPrice(product.price.toString());
                    }
                  } else {
                    setCustomProductName('');
                    setCustomPrice('');
                  }
                }}
                disabled={loading}
                required
              >
                <option value="">-- Selecciona un producto --</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} - {product.price.toFixed(2)}€ (precio sugerido)
                  </option>
                ))}
                <option value="other">➕ Otro producto</option>
              </Form.Select>
            )}
          </Form.Group>

          {/* Nombre y precio (siempre visible si hay producto seleccionado) */}
          {selectedProductId && (
            <>
              <Form.Group className="mb-3">
                <Form.Label><strong>Nombre del producto:</strong></Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Nombre del producto"
                  value={customProductName}
                  onChange={(e) => setCustomProductName(e.target.value)}
                  disabled={loading || selectedProductId !== 'other'}
                  required
                  style={{
                    backgroundColor: selectedProductId !== 'other' ? '#f8f9fa' : 'white'
                  }}
                />
                {selectedProductId !== 'other' && (
                  <Form.Text className="text-muted">
                    Producto del catálogo (no editable)
                  </Form.Text>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label><strong>Precio unitario (€):</strong></Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  disabled={loading}
                  required
                />
                {selectedProductId !== 'other' && (
                  <Form.Text className="text-success">
                    ✏️ Puedes modificar el precio sugerido
                  </Form.Text>
                )}
              </Form.Group>
            </>
          )}

          {/* Cantidad */}
          <Form.Group className="mb-3">
            <Form.Label><strong>Cantidad:</strong></Form.Label>
            <Form.Control
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={loading}
              required
            />
          </Form.Group>

          {/* Total calculado */}
          {selectedProductId && (
            <Alert variant="success" className="mb-3">
              <div className="d-flex justify-content-between align-items-center">
                <strong>Total a cobrar:</strong>
                <span className="h4 mb-0">{calculateTotal()} €</span>
              </div>
            </Alert>
          )}

          {/* Método de pago */}
          <Form.Group className="mb-3">
            <Form.Label><strong>Método de pago:</strong></Form.Label>
            <Form.Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={loading}
            >
              <option value="cash">💵 Efectivo</option>
              <option value="card">💳 Tarjeta</option>
              <option value="transfer">🏦 Transferencia</option>
            </Form.Select>
            {paymentMethod === 'transfer' && (
              <Form.Text className="text-muted">
                Las transferencias quedarán pendientes de confirmación
              </Form.Text>
            )}
          </Form.Group>

          {/* Botón de registrar */}
          <div className="d-grid">
            <Button
              variant="success"
              type="submit"
              size="lg"
              disabled={loading || loadingProducts || !selectedProductId}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Registrando...
                </>
              ) : (
                <>✓ Registrar Venta</>
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default ProductSaleModal;