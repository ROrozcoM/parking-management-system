import React, { useState, useEffect } from 'react';
import { Modal, Button, Table, Alert, Badge, Spinner } from 'react-bootstrap';

function CashHistoryModal({ show, onHide }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    if (show) {
      loadSessions();
    }
  }, [show]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/cash/closed-sessions?limit=30', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar historial');
      }

      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar el historial de cierres');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (session) => {
    setSelectedSession(session);
    setShowDetailsModal(true);
  };

  const getDifferenceColor = (difference) => {
    if (difference > 0) return 'success';
    if (difference < 0) return 'danger';
    return 'secondary';
  };

  const getDifferenceIcon = (difference) => {
    if (difference > 0) return '🍺';
    if (difference < 0) return '⚠️';
    return '✅';
  };

  // Calcular total de retiros
  const getTotalWithdrawals = () => {
    return sessions.reduce((sum, s) => sum + (s.actual_withdrawal || 0), 0);
  };

  return (
    <>
      {/* Modal principal - Tabla de historial */}
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            📋 Historial de Cierres de Caja
            {!loading && sessions.length > 0 && (
              <Badge bg="success" className="ms-3">
                💸 Total retirado: {getTotalWithdrawals().toFixed(2)} €
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Cargando historial...</p>
            </div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : sessions.length === 0 ? (
            <Alert variant="info">No hay cierres de caja registrados</Alert>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <Table striped bordered hover responsive size="sm">
                <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
                  <tr>
                    <th>Fecha Cierre</th>
                    <th>Usuario</th>
                    <th>Inicial</th>
                    <th>Ingresos</th>
                    <th>Esperado</th>
                    <th>Contado</th>
                    <th className="table-warning">Retirado</th>
                    <th className="table-success">Quedó</th>
                    <th>Descuadre</th>
                    <th>Detalles</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td>
                        <div>
                          <strong>{new Date(session.closed_at).toLocaleDateString('es-ES')}</strong>
                        </div>
                        <small className="text-muted">
                          {new Date(session.closed_at).toLocaleTimeString('es-ES')}
                        </small>
                      </td>
                      <td>{session.closed_by}</td>
                      <td className="text-end">{session.initial_amount.toFixed(2)} €</td>
                      <td className="text-end text-success">+{session.total_cash_in.toFixed(2)} €</td>
                      <td className="text-end">
                        <strong>{session.expected_amount.toFixed(2)} €</strong>
                      </td>
                      <td className="text-end">{session.final_cash_amount.toFixed(2)} €</td>
                      <td className="text-end table-warning">
                        <strong className="text-danger">-{(session.actual_withdrawal || 0).toFixed(2)} €</strong>
                      </td>
                      <td className="text-end table-success">
                        <strong className="text-success">{session.remaining_in_register.toFixed(2)} €</strong>
                      </td>
                      <td className="text-center">
                        <Badge bg={getDifferenceColor(session.cash_difference)}>
                          {session.cash_difference > 0 ? '+' : ''}
                          {session.cash_difference.toFixed(2)} € {getDifferenceIcon(session.cash_difference)}
                        </Badge>
                      </td>
                      <td className="text-center">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => handleViewDetails(session)}
                        >
                          👁️ Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal secundario - Detalles de una sesión específica */}
      <DetailsModal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        session={selectedSession}
      />
    </>
  );
}

// Componente para el modal de detalles
function DetailsModal({ show, onHide, session }) {
  if (!session) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          📊 Detalles del Cierre - {new Date(session.closed_at).toLocaleDateString('es-ES')}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Información General */}
        <div className="mb-4">
          <h5 className="mb-3">📋 Información General</h5>
          <div className="p-3 bg-light rounded">
            <div className="row mb-2">
              <div className="col-6">
                <strong>Abierto por:</strong> {session.opened_by}
              </div>
              <div className="col-6">
                <strong>Cerrado por:</strong> {session.closed_by}
              </div>
            </div>
            <div className="row mb-2">
              <div className="col-6">
                <strong>Apertura:</strong> {new Date(session.opened_at).toLocaleString('es-ES')}
              </div>
              <div className="col-6">
                <strong>Cierre:</strong> {new Date(session.closed_at).toLocaleString('es-ES')}
              </div>
            </div>
            {session.notes && (
              <div className="mt-2">
                <strong>Notas:</strong>
                <div className="p-2 bg-warning bg-opacity-25 rounded mt-1">
                  {session.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Resumen Financiero */}
        <div className="mb-4">
          <h5 className="mb-3">💰 Resumen Financiero</h5>
          <Table bordered size="sm">
            <tbody>
              <tr>
                <td><strong>Saldo Inicial:</strong></td>
                <td className="text-end">{session.initial_amount.toFixed(2)} €</td>
              </tr>
              <tr className="table-success">
                <td><strong>+ Ingresos (efectivo):</strong></td>
                <td className="text-end">+{session.total_cash_in.toFixed(2)} €</td>
              </tr>
              <tr className="table-danger">
                <td><strong>- Retiros durante el día:</strong></td>
                <td className="text-end">-{session.total_withdrawals.toFixed(2)} €</td>
              </tr>
              <tr className="table-primary">
                <td><strong>= Esperado en caja:</strong></td>
                <td className="text-end"><strong>{session.expected_amount.toFixed(2)} €</strong></td>
              </tr>
            </tbody>
          </Table>
        </div>

        {/* Efectivo Contado */}
        <div className="mb-4">
          <h5 className="mb-3">💶 Efectivo Contado</h5>
          <div className="p-3 bg-light rounded">
            <div className="d-flex justify-content-between mb-2">
              <span><strong>Total contado:</strong></span>
              <span className="fs-5">{session.final_cash_amount.toFixed(2)} €</span>
            </div>
            <div className="d-flex justify-content-between mb-2">
              <span>Esperado:</span>
              <span>{session.expected_amount.toFixed(2)} €</span>
            </div>
            <hr />
            <div className="d-flex justify-content-between">
              <span><strong>Diferencia:</strong></span>
              <span>
                <Badge bg={session.cash_difference === 0 ? 'success' : session.cash_difference > 0 ? 'success' : 'danger'}>
                  {session.cash_difference > 0 ? '+' : ''}{session.cash_difference.toFixed(2)} €
                  {session.cash_difference > 0 ? ' 🍺' : session.cash_difference < 0 ? ' ⚠️' : ' ✅'}
                </Badge>
              </span>
            </div>
          </div>
        </div>

        {/* Desglose de Billetes/Monedas */}
        {session.cash_breakdown && Object.keys(session.cash_breakdown).length > 0 && (
          <div className="mb-4">
            <h5 className="mb-3">💵 Desglose de Billetes y Monedas</h5>
            <div className="row">
              <div className="col-md-6">
                <h6 className="text-muted">Billetes:</h6>
                <Table bordered size="sm">
                  <tbody>
                    {['500', '200', '100', '50', '20', '10', '5'].map(denom => {
                      const count = session.cash_breakdown[denom] || 0;
                      if (count === 0) return null;
                      return (
                        <tr key={denom}>
                          <td>{denom}€ × {count}</td>
                          <td className="text-end">{(parseFloat(denom) * count).toFixed(2)} €</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
              <div className="col-md-6">
                <h6 className="text-muted">Monedas:</h6>
                <Table bordered size="sm">
                  <tbody>
                    {['2', '1', '0.50', '0.20', '0.10', '0.05', '0.02', '0.01'].map(denom => {
                      const count = session.cash_breakdown[denom] || 0;
                      if (count === 0) return null;
                      return (
                        <tr key={denom}>
                          <td>{denom}€ × {count}</td>
                          <td className="text-end">{(parseFloat(denom) * count).toFixed(2)} €</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Otros Métodos de Pago */}
        <div className="mb-4">
          <h5 className="mb-3">💳 Otros Métodos de Pago</h5>
          <Table bordered size="sm">
            <tbody>
              <tr>
                <td><strong>💳 Tarjeta:</strong></td>
                <td className="text-end">{session.final_card_amount.toFixed(2)} €</td>
              </tr>
              <tr>
                <td><strong>🏦 Transferencia:</strong></td>
                <td className="text-end">{session.final_transfer_amount.toFixed(2)} €</td>
              </tr>
            </tbody>
          </Table>
        </div>

        {/* SECCIÓN RETIRO DE CAJA - NUEVO */}
        <div className="mb-4">
          <h5 className="mb-3">💸 Retiro de Caja</h5>
          <div className="p-3 bg-warning bg-opacity-10 rounded border border-warning">
            <Table bordered size="sm" className="mb-0">
              <tbody>
                <tr>
                  <td><strong>💸 Retirado:</strong></td>
                  <td className="text-end">
                    <strong className="text-danger fs-5">
                      {(session.actual_withdrawal || 0).toFixed(2)} €
                    </strong>
                  </td>
                </tr>
                <tr className="table-success">
                  <td><strong>💰 Quedó en caja:</strong></td>
                  <td className="text-end">
                    <strong className="text-success fs-5">
                      {session.remaining_in_register.toFixed(2)} €
                    </strong>
                  </td>
                </tr>
              </tbody>
            </Table>
            <small className="text-muted d-block mt-2">
              ℹ️ El importe que quedó en caja se usó como inicial para la siguiente sesión
            </small>
          </div>
        </div>

        {/* Resumen Total (opcional, para ver el cuadre general) */}
        <div className="p-3 bg-info bg-opacity-10 rounded">
          <h6 className="mb-2">📊 Resumen Total del Cierre:</h6>
          <div className="d-flex justify-content-between mb-1">
            <span>Efectivo contado:</span>
            <span>{session.final_cash_amount.toFixed(2)} €</span>
          </div>
          <div className="d-flex justify-content-between mb-1">
            <span>Tarjeta:</span>
            <span>{session.final_card_amount.toFixed(2)} €</span>
          </div>
          <div className="d-flex justify-content-between mb-1">
            <span>Transferencia:</span>
            <span>{session.final_transfer_amount.toFixed(2)} €</span>
          </div>
          <hr className="my-2" />
          <div className="d-flex justify-content-between">
            <strong>Total general:</strong>
            <strong className="fs-5">
              {(session.final_cash_amount + session.final_card_amount + session.final_transfer_amount).toFixed(2)} €
            </strong>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default CashHistoryModal;