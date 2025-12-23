import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';

function DeleteSinpaModal({ show, onHide, onResolved }) {
  const [blacklistEntries, setBlacklistEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [resolutionType, setResolutionType] = useState('forgive'); // 'forgive' o 'paid'
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (show) {
      fetchBlacklistEntries();
    }
  }, [show]);

  useEffect(() => {
    // Filtrar entradas por matrícula
    if (searchTerm) {
      const filtered = blacklistEntries.filter(entry =>
        entry.vehicle.license_plate.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEntries(filtered);
    } else {
      setFilteredEntries(blacklistEntries);
    }
  }, [searchTerm, blacklistEntries]);

  const fetchBlacklistEntries = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/blacklist/?resolved=false', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar lista negra');
      }

      const data = await response.json();
      setBlacklistEntries(data);
      setFilteredEntries(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching blacklist:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManageClick = (entry) => {
    setSelectedEntry(entry);
    setResolutionType('forgive');
    setPaymentMethod('cash');
    setNotes('');
    setShowConfirmModal(true);
  };

  const handleResolve = async () => {
    if (!selectedEntry) return;

    setResolving(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('paid', resolutionType === 'paid');
      
      if (resolutionType === 'paid') {
        params.append('payment_method', paymentMethod);
      }
      
      if (notes) {
        params.append('notes', notes);
      }

      const response = await fetch(
        `/api/blacklist/${selectedEntry.id}/resolve?${params}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al resolver SINPA');
      }

      // Éxito
      setShowConfirmModal(false);
      setSelectedEntry(null);
      fetchBlacklistEntries();
      
      if (onResolved) {
        onResolved();
      }

    } catch (err) {
      setError(err.message);
      console.error('Error resolving SINPA:', err);
    } finally {
      setResolving(false);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setError(null);
    onHide();
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Agrupar entradas por vehículo y sumar deuda total
  const groupedEntries = filteredEntries.reduce((acc, entry) => {
    const vehicleId = entry.vehicle_id;
    
    if (!acc[vehicleId]) {
      acc[vehicleId] = {
        vehicle: entry.vehicle,
        entries: [],
        totalDebt: 0
      };
    }
    
    acc[vehicleId].entries.push(entry);
    acc[vehicleId].totalDebt += entry.amount_owed;
    
    return acc;
  }, {});

  const groupedArray = Object.values(groupedEntries);

  return (
    <>
      <Modal show={show} onHide={handleClose} size="lg" centered>
        <Modal.Header closeButton style={{ backgroundColor: '#fff3cd', borderBottom: '2px solid #ffc107' }}>
          <Modal.Title>🚫 Gestionar Lista Negra (SINPAs)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Alert variant="warning" className="mb-3">
            <strong>ℹ️ Importante:</strong> Aquí puedes eliminar vehículos de la lista negra. 
            Puedes perdonar la deuda o registrarla como pagada.
          </Alert>

          {/* Buscador */}
          <Form.Group className="mb-3">
            <Form.Label><strong>🔍 Buscar por matrícula:</strong></Form.Label>
            <Form.Control
              type="text"
              placeholder="Ej: ABC1234"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              disabled={loading}
            />
          </Form.Group>

          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
              <p className="mt-2 text-muted">Cargando lista negra...</p>
            </div>
          ) : groupedArray.length === 0 ? (
            <Alert variant="success" className="text-center">
              <h5>✅ No hay vehículos en lista negra</h5>
              <p className="mb-0">Todos los SINPAs están resueltos.</p>
            </Alert>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {groupedArray.map((group, index) => (
                <div
                  key={index}
                  className="mb-3 p-3"
                  style={{
                    border: '2px solid #dc3545',
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fa'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h5 className="mb-1">
                        <span className="license-plate-display">{group.vehicle.license_plate}</span>
                        <small className="text-muted ms-2">({group.vehicle.country})</small>
                      </h5>
                      <div className="text-muted small">
                        {group.vehicle.vehicle_type}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="h4 mb-0 text-danger">
                        {group.totalDebt.toFixed(2)} €
                      </div>
                      <small className="text-muted">Deuda total</small>
                    </div>
                  </div>

                  <div className="mb-2">
                    <strong>Incidentes registrados:</strong> {group.entries.length}
                  </div>

                  {group.entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="mb-2 p-2 bg-white rounded"
                      style={{ fontSize: '0.875rem' }}
                    >
                      <div><strong>Fecha:</strong> {formatDateTime(entry.incident_date)}</div>
                      <div><strong>Importe:</strong> {entry.amount_owed.toFixed(2)} €</div>
                      {entry.notes && <div><strong>Notas:</strong> {entry.notes}</div>}
                    </div>
                  ))}

                  <Button
                    variant="warning"
                    size="sm"
                    className="w-100 mt-2"
                    onClick={() => handleManageClick(group.entries[0])}
                    style={{ fontWeight: 600 }}
                  >
                    ⚙️ Gestionar SINPA
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de confirmación */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#fff3cd', borderBottom: '2px solid #ffc107' }}>
          <Modal.Title>⚠️ Resolver SINPA</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEntry && (
            <>
              <div
                className="mb-3 p-3"
                style={{
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px'
                }}
              >
                <div className="mb-2">
                  <strong>Matrícula:</strong>{' '}
                  <span className="license-plate-display">
                    {selectedEntry.vehicle.license_plate}
                  </span>
                </div>
                <div className="mb-2">
                  <strong>Deuda total:</strong>{' '}
                  <span className="text-danger h5">{selectedEntry.amount_owed.toFixed(2)} €</span>
                </div>
              </div>

              <div className="mb-3">
                <strong>¿Cómo deseas resolver este SINPA?</strong>
              </div>

              <Form.Check
                type="radio"
                id="resolution-forgive"
                name="resolutionType"
                label="🗑️ Perdonar deuda (No pagó, pero se perdona)"
                checked={resolutionType === 'forgive'}
                onChange={() => setResolutionType('forgive')}
                className="mb-2"
              />
              <Form.Text className="d-block text-muted mb-3 ms-4">
                Se eliminará de lista negra sin registrar ingreso en caja.
              </Form.Text>

              <Form.Check
                type="radio"
                id="resolution-paid"
                name="resolutionType"
                label="💰 Marcar como pagado (Cliente pagó la deuda)"
                checked={resolutionType === 'paid'}
                onChange={() => setResolutionType('paid')}
                className="mb-2 fw-bold"
              />
              <Form.Text className="d-block text-muted mb-3 ms-4">
                Se registrará el pago en caja activa y se eliminará de lista negra.
              </Form.Text>

              {resolutionType === 'paid' && (
                <div className="ms-4 mb-3">
                  <Form.Group className="mb-3">
                    <Form.Label><strong>Método de pago:</strong></Form.Label>
                    <Form.Select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      disabled={resolving}
                    >
                      <option value="cash">💵 Efectivo</option>
                      <option value="card">💳 Tarjeta</option>
                      <option value="transfer">🏦 Transferencia</option>
                    </Form.Select>
                  </Form.Group>
                </div>
              )}

              <Form.Group className="mb-3">
                <Form.Label><strong>Notas (opcional):</strong></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  placeholder="Ej: Cliente volvió y pagó en efectivo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={resolving}
                />
              </Form.Group>

              <Alert variant="info" className="mb-0">
                <small>
                  <strong>Esta acción:</strong><br />
                  ✓ Eliminará el vehículo de lista negra<br />
                  {resolutionType === 'paid' ? (
                    <>✓ Registrará {selectedEntry.amount_owed.toFixed(2)} € en caja activa</>
                  ) : (
                    <>✓ NO registrará ingreso (deuda perdonada)</>
                  )}
                  <br />
                  ✓ Creará registro en historial<br />
                  ⚠️ NO se puede deshacer
                </small>
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)} disabled={resolving}>
            Cancelar
          </Button>
          <Button variant="warning" onClick={handleResolve} disabled={resolving}>
            {resolving ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Procesando...
              </>
            ) : (
              <>✓ Confirmar Resolución</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default DeleteSinpaModal;