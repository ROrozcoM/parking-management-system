import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert, Spinner, Form } from 'react-bootstrap';

function PendingTransfersCard({ refreshData }) {
  const [pendingTransfers, setPendingTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);
  const [sinpaId, setSinpaId] = useState(null);
  
  // Modal de confirmación de transferencia recibida
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  // Modal de SINPA
  const [showSinpaModal, setShowSinpaModal] = useState(false);
  const [sinpaNotes, setSinpaNotes] = useState('');
  const [assignedUserId, setAssignedUserId] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);

  useEffect(() => {
    fetchPendingTransfers();
  }, []);

  const fetchPendingTransfers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stays/pending-transfers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Error fetching pending transfers');

      const data = await response.json();
      setPendingTransfers(data.pending_transfers || []);
      setError(null);
    } catch (err) {
      setError('Error al cargar transferencias pendientes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClick = (transfer) => {
    setSelectedTransfer(transfer);
    setShowConfirmModal(true);
  };

  const handleSinpaClick = async (transfer) => {
    setSelectedTransfer(transfer);
    setSinpaNotes('');
    
    // Cargar lista de usuarios disponibles
    try {
      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const users = await response.json();
        setAvailableUsers(users);
        
        // Por defecto: usuario que registró la transferencia
        setAssignedUserId(transfer.created_by_user_id);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      // Si falla, al menos permitir continuar sin selector
      setAvailableUsers([]);
      setAssignedUserId(null);
    }
    
    setShowSinpaModal(true);
  };

  const handleConfirmTransfer = async () => {
    if (!selectedTransfer) return;

    setConfirmingId(selectedTransfer.id);
    setError(null);

    try {
      const response = await fetch(`/api/stays/pending-transfers/${selectedTransfer.id}/confirm`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al confirmar transferencia');
      }

      // Éxito
      setShowConfirmModal(false);
      setSelectedTransfer(null);
      fetchPendingTransfers();
      if (refreshData) refreshData();

    } catch (err) {
      setError(err.message);
      console.error('Error confirming transfer:', err);
    } finally {
      setConfirmingId(null);
    }
  };

  const handleConfirmSinpa = async () => {
    if (!selectedTransfer) return;

    setSinpaId(selectedTransfer.id);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (sinpaNotes) params.append('notes', sinpaNotes);
      if (assignedUserId) params.append('assigned_to_user_id', assignedUserId);
      
      const response = await fetch(
        `/api/stays/pending-transfers/${selectedTransfer.id}/mark-sinpa?${params}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al marcar como SINPA');
      }

      const result = await response.json();

      // Éxito
      setShowSinpaModal(false);
      setSelectedTransfer(null);
      setSinpaNotes('');
      setAssignedUserId(null);
      fetchPendingTransfers();
      if (refreshData) refreshData();


    } catch (err) {
      setError(err.message);
      console.error('Error marking as SINPA:', err);
    } finally {
      setSinpaId(null);
    }
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

  const getTransactionTypeLabel = (type) => {
    const labels = {
      'checkout': '📤 Checkout',
      'prepayment': '📝 Prepago',
      'extension': '➕ Extensión',
      'product_sale': '🛒 Producto'
    };
    return labels[type] || type;
  };

  // No mostrar el card si no hay transferencias pendientes
  if (!loading && pendingTransfers.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-body text-center">
          <Spinner animation="border" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="card">
        <div className="card-header" style={{ 
          background: 'linear-gradient(135deg, #17a2b8, #138496)',
          color: 'white'
        }}>
          <h2 style={{ margin: 0 }}>
            🏦 Transferencias Pendientes ({pendingTransfers.length})
          </h2>
        </div>

        <div className="card-body">
          {error && <Alert variant="danger">{error}</Alert>}

          <Alert variant="info" className="mb-3">
            <strong>ℹ️ Importante:</strong> Estas transferencias están pendientes de confirmación bancaria. 
            Una vez confirmado el ingreso, presiona "Confirmar Recibido". Si nunca llega, puedes marcarla como SINPA.
          </Alert>

          {pendingTransfers.length === 0 ? (
            <p className="text-muted text-center py-3">No hay transferencias pendientes</p>
          ) : (
            <div className="list-group">
              {pendingTransfers.map(transfer => (
                <div 
                  key={transfer.id} 
                  className="list-group-item"
                  style={{
                    borderLeft: '4px solid #17a2b8',
                    marginBottom: '0.75rem',
                    borderRadius: '4px'
                  }}
                >
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div>
                      <h5 className="mb-1">
                        <span className="license-plate-display">{transfer.license_plate}</span>
                        <small className="text-muted ms-2">({transfer.country})</small>
                      </h5>
                      <div className="d-flex gap-3 flex-wrap">
                        <span className="badge bg-info">
                          {getTransactionTypeLabel(transfer.transaction_type)}
                        </span>
                        {transfer.parking_spot && (
                          <span className="badge bg-secondary">
                            Plaza: {transfer.parking_spot}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="h4 mb-0 text-success">
                        {transfer.amount.toFixed(2)} €
                      </div>
                    </div>
                  </div>

                  <div className="small text-muted mb-2">
                    <div><strong>Registrado:</strong> {formatDateTime(transfer.created_at)}</div>
                    <div><strong>Por:</strong> {transfer.created_by}</div>
                    {transfer.notes && (
                      <div><strong>Notas:</strong> {transfer.notes}</div>
                    )}
                  </div>

                  <div className="d-grid gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleConfirmClick(transfer)}
                      disabled={confirmingId === transfer.id || sinpaId === transfer.id}
                    >
                      {confirmingId === transfer.id ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          Confirmando...
                        </>
                      ) : (
                        <>✓ Confirmar Recibido</>
                      )}
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleSinpaClick(transfer)}
                      disabled={confirmingId === transfer.id || sinpaId === transfer.id}
                    >
                      {sinpaId === transfer.id ? (
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
                        <>🚨 Marcar como SINPA</>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación de transferencia recibida */}
      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#d1ecf1', borderBottom: '2px solid #17a2b8' }}>
          <Modal.Title>🏦 Confirmar Transferencia Recibida</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTransfer && (
            <>
              <Alert variant="info">
                <strong>¿Confirmas que recibiste esta transferencia en el banco?</strong>
                <br />
                <small>Se registrará automáticamente en caja y se contabilizará en analytics.</small>
              </Alert>

              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '1rem', 
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Matrícula:</strong> {selectedTransfer.license_plate}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Tipo:</strong> {getTransactionTypeLabel(selectedTransfer.transaction_type)}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Importe:</strong> <span className="text-success h5">{selectedTransfer.amount.toFixed(2)} €</span>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Fecha registro:</strong> {formatDateTime(selectedTransfer.created_at)}
                </div>
                <div>
                  <strong>Registrado por:</strong> {selectedTransfer.created_by}
                </div>
              </div>

              <Alert variant="warning" className="mb-0">
                <small>
                  ⚠️ Esta acción NO se puede deshacer. Asegúrate de verificar el banco antes de confirmar.
                </small>
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleConfirmTransfer}>
            ✓ Sí, Confirmar Transferencia
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de confirmación SINPA */}
      <Modal show={showSinpaModal} onHide={() => setShowSinpaModal(false)} centered>
        <Modal.Header closeButton style={{ backgroundColor: '#f8d7da', borderBottom: '2px solid #dc3545' }}>
          <Modal.Title className="text-danger">🚨 Marcar como SINPA</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTransfer && (
            <>
              <Alert variant="danger">
                <strong>⚠️ ¿Confirmas que esta transferencia NUNCA llegó?</strong>
                <br />
                <small>El vehículo será añadido a la lista negra automáticamente como deudor.</small>
              </Alert>

              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '1rem', 
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Matrícula:</strong> <span className="license-plate-display">{selectedTransfer.license_plate}</span>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Tipo:</strong> {getTransactionTypeLabel(selectedTransfer.transaction_type)}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Importe adeudado:</strong> <span className="text-danger h5">{selectedTransfer.amount.toFixed(2)} €</span>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Fecha registro:</strong> {formatDateTime(selectedTransfer.created_at)}
                </div>
                <div>
                  <strong>Registrado por:</strong> {selectedTransfer.created_by}
                </div>
              </div>

              {/* NUEVO: Selector de usuario para asignar SINPA */}
              {availableUsers.length > 0 && (
                <Form.Group className="mb-3">
                  <Form.Label><strong>Asignar SINPA a:</strong></Form.Label>
                  <Form.Select
                    value={assignedUserId || ''}
                    onChange={(e) => setAssignedUserId(parseInt(e.target.value))}
                  >
                    {availableUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                        {user.id === selectedTransfer.created_by_user_id && ' (Registró la transferencia) ⭐'}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    Por defecto se asigna al usuario que registró la transferencia pendiente.
                  </Form.Text>
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label><strong>Notas (opcional):</strong></Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Ej: Transferencia nunca recibida. Verificado con banco..."
                  value={sinpaNotes}
                  onChange={(e) => setSinpaNotes(e.target.value)}
                />
              </Form.Group>

              <Alert variant="warning" className="mb-0">
                <small>
                  <strong>Esta acción:</strong><br />
                  ✓ Eliminará la transferencia pendiente<br />
                  ✓ Marcará el vehículo como SINPA<br />
                  ✓ Añadirá a lista negra automáticamente<br />
                  ✓ Registrará como deuda en el sistema<br />
                  ✓ Se asignará al usuario seleccionado arriba<br />
                  ⚠️ NO se puede deshacer
                </small>
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSinpaModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleConfirmSinpa}>
            🚨 Sí, Marcar como SINPA
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default PendingTransfersCard;