import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { staysAPI } from '../services/api';

function CheckOutModal({ show, onHide, stay, onSuccess }) {
  const [finalPrice, setFinalPrice] = useState('');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(null);
  
  // Estados para el modal de SINPA
  const [showSinpaModal, setShowSinpaModal] = useState(false);
  const [sinpaNotes, setSinpaNotes] = useState('');
  const [sinpaLoading, setSinpaLoading] = useState(false);

  useEffect(() => {
    if (stay && stay.check_in_time) {
      initializeTimes();
    }
  }, [stay]);

  useEffect(() => {
    if (checkInTime && checkOutTime) {
      calculateDuration();
    }
  }, [checkInTime, checkOutTime]);

  const initializeTimes = () => {
    // Inicializar fecha de entrada (desde stay o ahora)
    const checkIn = stay.check_in_time 
      ? new Date(stay.check_in_time)
      : new Date();
    
    // Inicializar fecha de salida (desde stay si existe, o ahora)
    const checkOut = stay.check_out_time 
      ? new Date(stay.check_out_time)
      : new Date();
    
    // Formatear para input datetime-local (YYYY-MM-DDTHH:MM)
    setCheckInTime(formatDateTimeLocal(checkIn));
    setCheckOutTime(formatDateTimeLocal(checkOut));

    // Si ya tiene pago adelantado, usar ese precio
    if (stay.prepaid_amount) {
      setFinalPrice(stay.prepaid_amount.toFixed(2));
    }
  };

  const formatDateTimeLocal = (date) => {
    // Convierte Date a formato "YYYY-MM-DDTHH:MM" para input datetime-local
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const calculateDuration = () => {
    const checkIn = new Date(checkInTime);
    const checkOut = new Date(checkOutTime);
    const diffMs = checkOut - checkIn;
    const days = diffMs / (1000 * 60 * 60 * 24);
    setDuration(days.toFixed(2));

    // Calcular precio solo si no hay prepago
    if (!stay.prepaid_amount) {
      const nights = Math.ceil(days);
      const calculatedPrice = nights * 10; // 10€/noche - ajusta según tu tarifa
      setFinalPrice(calculatedPrice.toFixed(2));
    }
  };

  const handlePrintTicket = async () => {
    setPrinting(true);
    setError(null);

    try {
      const ticketData = {
        type: 'checkout',
        license_plate: stay.vehicle.license_plate,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        amount: parseFloat(finalPrice)
      };

      const result = await staysAPI.printTicket(ticketData);
      
      if (result.success) {
        console.log('Ticket impreso correctamente');
      }

    } catch (err) {
      console.error('Error printing ticket:', err);
      setError('Error al imprimir el ticket');
    } finally {
      setPrinting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!finalPrice || parseFloat(finalPrice) < 0) {
      setError('Por favor, ingrese un precio válido');
      return;
    }

    if (!checkInTime || !checkOutTime) {
      setError('Por favor, ingrese fechas válidas');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stays/${stay.id}/check-out`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          final_price: parseFloat(finalPrice),
          check_in_time: new Date(checkInTime).toISOString(),
          check_out_time: new Date(checkOutTime).toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error en el checkout');
      }

      onSuccess();
      handleClose();

    } catch (err) {
      console.error('Error during checkout:', err);
      setError(err.message || 'Error al realizar el check-out');
    } finally {
      setLoading(false);
    }
  };

  const handleSinpaClick = () => {
    setShowSinpaModal(true);
  };

  const handleSinpaConfirm = async () => {
    setSinpaLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stays/${stay.id}/mark-sinpa?notes=${encodeURIComponent(sinpaNotes || '')}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al marcar como SINPA');
      }

      setShowSinpaModal(false);
      onSuccess();
      handleClose();

    } catch (err) {
      console.error('Error marking as sinpa:', err);
      setError(err.message || 'Error al marcar como SINPA');
    } finally {
      setSinpaLoading(false);
    }
  };

  const handleClose = () => {
    setFinalPrice('');
    setCheckInTime('');
    setCheckOutTime('');
    setError(null);
    setDuration(null);
    setSinpaNotes('');
    setShowSinpaModal(false);
    onHide();
  };

  if (!stay) return null;

  const alreadyPaid = stay.payment_status === 'prepaid';

  return (
    <>
      <Modal show={show} onHide={handleClose} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Check-Out</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          
          <div className="checkout-details mb-4">
            <div className="row">
              <div className="col-md-6">
                <h5>Detalles del Vehículo</h5>
                <div className="detail-row">
                  <strong>Matrícula:</strong>
                  <span className="license-plate-display">{stay.vehicle.license_plate}</span>
                </div>
                <div className="detail-row">
                  <strong>Tipo:</strong>
                  <span>{stay.vehicle.vehicle_type}</span>
                </div>
                <div className="detail-row">
                  <strong>Plaza:</strong>
                  <span>
                    {stay.parking_spot 
                      ? `${stay.parking_spot.spot_type} - ${stay.parking_spot.spot_number}` 
                      : 'No asignada'}
                  </span>
                </div>
              </div>
              
              <div className="col-md-6">
                <h5>Fechas (Editables)</h5>
                
                <Form.Group className="mb-3">
                  <Form.Label><strong>Entrada:</strong></Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    disabled={loading || printing}
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label><strong>Salida:</strong></Form.Label>
                  <Form.Control
                    type="datetime-local"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    disabled={loading || printing}
                  />
                </Form.Group>

                {duration && (
                  <div className="detail-row">
                    <strong>Duración:</strong>
                    <span className="highlight">{duration} días ({Math.ceil(parseFloat(duration))} noches)</span>
                  </div>
                )}
              </div>
            </div>

            {alreadyPaid ? (
              <Alert variant="success" className="mt-3">
                <h5 className="mb-3">✓ YA PAGADO</h5>
                <div className="d-flex justify-content-between">
                  <span><strong>Importe Total:</strong></span>
                  <span className="h5 mb-0">{stay.prepaid_amount?.toFixed(2)} €</span>
                </div>
                <small className="text-muted">Pagado por adelantado</small>
              </Alert>
            ) : (
              <Alert variant="warning" className="mt-3">
                <h5 className="mb-3">⏳ PENDIENTE DE PAGO</h5>
                <Form.Group className="mb-0">
                  <Form.Label>Precio Total (€)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ej: 15.00"
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(e.target.value)}
                    required
                    disabled={loading || printing}
                  />
                  <Form.Text className="text-muted">
                    Precio calculado automáticamente según noches. Puede modificarlo si es necesario.
                  </Form.Text>
                </Form.Group>
              </Alert>
            )}
          </div>

          <Form onSubmit={handleSubmit}>
            <div className="d-grid gap-2">
              <Button 
                variant="info" 
                onClick={handlePrintTicket}
                disabled={!finalPrice || parseFloat(finalPrice) < 0 || printing || loading}
              >
                {printing ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    Imprimiendo...
                  </>
                ) : (
                  <>🖨️ Generar Ticket</>
                )}
              </Button>

              <Button 
                variant="success" 
                type="submit"
                disabled={loading || printing}
                size="lg"
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
                    Procesando...
                  </>
                ) : (
                  <>✓ Confirmar Check-Out {alreadyPaid ? '(Ya Pagado)' : ''}</>
                )}
              </Button>

              <Button 
                variant="danger" 
                onClick={handleSinpaClick}
                disabled={loading || printing}
              >
                🚨 Marcar como SINPA (se fue sin pagar)
              </Button>
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading || printing}>
            Cancelar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de confirmación de SINPA */}
      <Modal show={showSinpaModal} onHide={() => setShowSinpaModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="text-danger">⚠️ Confirmar SINPA</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            <strong>¿Confirma que este vehículo se fue sin pagar?</strong>
            <br />
            <small>El vehículo será añadido a la lista negra automáticamente.</small>
          </Alert>

          <div className="mb-3">
            <strong>Matrícula:</strong> <span className="license-plate-display">{stay?.vehicle.license_plate}</span>
          </div>
          <div className="mb-3">
            <strong>Importe debido:</strong> <span className="text-danger h5">{finalPrice} €</span>
          </div>

          <Form.Group>
            <Form.Label>Notas (opcional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Ej: Se fue durante la noche, cámaras no detectaron salida..."
              value={sinpaNotes}
              onChange={(e) => setSinpaNotes(e.target.value)}
              disabled={sinpaLoading}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSinpaModal(false)} disabled={sinpaLoading}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleSinpaConfirm} disabled={sinpaLoading}>
            {sinpaLoading ? (
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
              <>✓ Confirmar SINPA</>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default CheckOutModal;