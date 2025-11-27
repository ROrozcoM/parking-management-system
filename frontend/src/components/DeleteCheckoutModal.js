import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';

function DeleteCheckoutModal({ show, onHide, onDeleted }) {
  const [checkouts, setCheckouts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStayId, setSelectedStayId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    if (show) {
      fetchRecentCheckouts();
      setSelectedStayId(null);
      setConfirmDelete(false);
    }
  }, [show, limit]);

  const fetchRecentCheckouts = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stays/recent-checkouts?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error al cargar checkouts');

      const data = await response.json();
      setCheckouts(data);
      setError(null);
    } catch (err) {
      setError('Error al cargar checkouts recientes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedStayId) {
      alert('Selecciona un checkout para eliminar');
      return;
    }

    if (!confirmDelete) {
      alert('Debes confirmar que estás seguro antes de eliminar');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/stays/${selectedStayId}/checkout`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al eliminar checkout');
      }

      const result = await response.json();
      alert(`✅ ${result.message}`);
      
      onDeleted(); // Callback para recargar historia
      onHide();
    } catch (err) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedStayId(null);
    setConfirmDelete(false);
    setLimit(10);
    onHide();
  };

  const selectedCheckout = checkouts.find(c => c.stay_id === selectedStayId);

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>🗑️ Eliminar Checkout del Historial</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Alert variant="warning">
          <strong>⚠️ Advertencia:</strong> Esta acción eliminará el checkout del historial.
          El stay se marcará como DISCARDED, la plaza se liberará, y la transacción de caja se eliminará.
        </Alert>

        {error && <Alert variant="danger">{error}</Alert>}

        {/* Filtro de límite */}
        <div className="mb-3">
          <label className="form-label fw-bold">Mostrar últimos:</label>
          <div className="btn-group" role="group">
            <button
              type="button"
              className={`btn btn-sm ${limit === 10 ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setLimit(10)}
            >
              10
            </button>
            <button
              type="button"
              className={`btn btn-sm ${limit === 50 ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setLimit(50)}
            >
              50
            </button>
            <button
              type="button"
              className={`btn btn-sm ${limit === 100 ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => setLimit(100)}
            >
              100
            </button>
          </div>
        </div>

        {/* Lista de checkouts */}
        {loading ? (
          <div className="text-center p-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2">Cargando checkouts...</p>
          </div>
        ) : checkouts.length === 0 ? (
          <div className="text-center p-5">
            <p>No hay checkouts recientes</p>
          </div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table table-hover">
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white' }}>
                <tr>
                  <th style={{ width: '50px' }}></th>
                  <th>Matrícula</th>
                  <th>País</th>
                  <th>Check-out</th>
                  <th>Precio</th>
                  <th>Usuario</th>
                </tr>
              </thead>
              <tbody>
                {checkouts.map(checkout => (
                  <tr 
                    key={checkout.stay_id}
                    onClick={() => setSelectedStayId(checkout.stay_id)}
                    style={{ 
                      cursor: 'pointer',
                      backgroundColor: selectedStayId === checkout.stay_id ? '#e7f3ff' : 'transparent'
                    }}
                  >
                    <td>
                      <input
                        type="radio"
                        name="selectedCheckout"
                        checked={selectedStayId === checkout.stay_id}
                        onChange={() => setSelectedStayId(checkout.stay_id)}
                      />
                    </td>
                    <td>
                      <strong style={{ color: 'var(--primary-color)' }}>
                        {checkout.license_plate}
                      </strong>
                    </td>
                    <td>{checkout.country}</td>
                    <td style={{ fontSize: '0.875rem' }}>
                      {new Date(checkout.check_out_time).toLocaleString()}
                    </td>
                    <td><strong>{checkout.final_price?.toFixed(2)} €</strong></td>
                    <td>{checkout.user}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Detalles del seleccionado */}
        {selectedCheckout && (
          <div className="mt-3 p-3 bg-light rounded">
            <h6 className="fw-bold mb-2">Checkout seleccionado:</h6>
            <div className="row">
              <div className="col-6 mb-2">
                <small className="text-muted">Matrícula:</small>
                <div><strong>{selectedCheckout.license_plate}</strong></div>
              </div>
              <div className="col-6 mb-2">
                <small className="text-muted">País:</small>
                <div>{selectedCheckout.country}</div>
              </div>
              <div className="col-6 mb-2">
                <small className="text-muted">Check-in:</small>
                <div>{new Date(selectedCheckout.check_in_time).toLocaleString()}</div>
              </div>
              <div className="col-6 mb-2">
                <small className="text-muted">Check-out:</small>
                <div>{new Date(selectedCheckout.check_out_time).toLocaleString()}</div>
              </div>
              <div className="col-6 mb-2">
                <small className="text-muted">Precio:</small>
                <div><strong>{selectedCheckout.final_price?.toFixed(2)} €</strong></div>
              </div>
              <div className="col-6 mb-2">
                <small className="text-muted">Método de pago:</small>
                <div>{selectedCheckout.payment_method}</div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmación */}
        {selectedStayId && (
          <div className="mt-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="confirmDeleteCheckbox"
                checked={confirmDelete}
                onChange={(e) => setConfirmDelete(e.target.checked)}
              />
              <label className="form-check-label fw-bold text-danger" htmlFor="confirmDeleteCheckbox">
                ✓ Confirmo que deseo eliminar este checkout del historial
              </label>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancelar
        </Button>
        <Button 
          variant="danger" 
          onClick={handleDelete}
          disabled={!selectedStayId || !confirmDelete || loading}
        >
          {loading ? 'Eliminando...' : '🗑️ Eliminar Checkout'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default DeleteCheckoutModal;