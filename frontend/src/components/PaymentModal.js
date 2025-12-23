import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { staysAPI } from '../services/api';

function PaymentModal({ show, onHide, stay, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [checkInTime, setCheckInTime] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState(null);
  const [nights, setNights] = useState(0);

  // Función para obtener precio por noche según tipo de plaza
  const getPricePerNight = (spotType) => {
    const prices = {
      'A': 10,
      'B': 12,
      'CB': 12,
      'C': 16,
      'CPLUS': 32
    };
    return prices[spotType] || 10; // Default 10€ si no se encuentra
  };

  useEffect(() => {
    if (stay) {
      initializeTimes();
    }
  }, [stay]);

  useEffect(() => {
    if (checkInTime && checkOutTime) {
      calculateNights();
    }
  }, [checkInTime, checkOutTime]);

  const initializeTimes = () => {
    // Fecha de entrada: desde detection_time o check_in_time si existe, o ahora
    const checkIn = stay.check_in_time 
      ? new Date(stay.check_in_time)
      : stay.detection_time 
        ? new Date(stay.detection_time)
        : new Date();
    
    // Fecha de salida prevista: 3 días después de la entrada por defecto
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 3); // 3 noches por defecto
    
    setCheckInTime(formatDateTimeLocal(checkIn));
    setCheckOutTime(formatDateTimeLocal(checkOut));
  };

  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const calculateNights = () => {
    const checkIn = new Date(checkInTime);
    const checkOut = new Date(checkOutTime);
    const diffMs = checkOut - checkIn;
    const days = diffMs / (1000 * 60 * 60 * 24);
    const calculatedNights = Math.ceil(days);
    setNights(calculatedNights);

    // Calcular precio sugerido según tipo de plaza
    const spotType = stay.parking_spot?.spot_type || 'A';
    const pricePerNight = getPricePerNight(spotType);
    const suggestedPrice = calculatedNights * pricePerNight;
    setAmount(suggestedPrice.toFixed(2));  // ← SIEMPRE actualizar
  };

  const handlePrintTicket = async () => {
    setPrinting(true);
    setError(null);

    try {
      // Calcular noches
      const checkIn = new Date(checkInTime);
      const checkOut = new Date(checkOutTime);
      const diffMs = checkOut - checkIn;
      const calculatedNights = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      // Obtener tipo de plaza
      const spotType = stay.parking_spot?.spot_type || '';

      const ticketData = {
        type: 'prepayment',
        license_plate: stay.vehicle.license_plate,
        check_in_time: checkInTime,
        check_out_time: checkOutTime,
        nights: calculatedNights,
        amount: parseFloat(amount),
        spot_type: spotType
      };

      const result = await staysAPI.printTicket(ticketData);
      
      if (result.success) {
        console.log('Ticket impreso');
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
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Por favor, ingrese un importe válido');
      return;
    }

    if (!checkInTime || !checkOutTime) {
      setError('Por favor, ingrese fechas válidas');
      return;
    }

    // Validar que checkout sea posterior a checkin
    if (new Date(checkOutTime) <= new Date(checkInTime)) {
      setError('La fecha de salida debe ser posterior a la fecha de entrada');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stays/${stay.id}/prepay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          check_in_time: new Date(checkInTime).toISOString(),
          check_out_time: new Date(checkOutTime).toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al procesar el pago');
      }

      const result = await response.json();
      
      if (result.success) {
        // Mostrar alerta si no imprimió
        if (!result.ticket_printed) {
          alert(`⚠️ Pago registrado correctamente, pero no se pudo imprimir el ticket automáticamente.\n\nUsa el botón "Generar Ticket" para imprimirlo manualmente.\n\nError: ${result.print_error || 'Desconocido'}`);
        }
        
        onSuccess();
        handleClose();
      } else {
        throw new Error('Error al registrar el pago');
      }

    } catch (err) {
      console.error('Error processing prepayment:', err);
      setError(err.message || 'Error al procesar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAmount('');
    setPaymentMethod('cash');
    setCheckInTime('');
    setCheckOutTime('');
    setError(null);
    setNights(0);
    onHide();
  };

  if (!stay) return null;

  const spotType = stay.parking_spot?.spot_type || 'A';
  const pricePerNight = getPricePerNight(spotType);

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Pago Adelantado (Check-in automático)</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Alert variant="info" className="mb-3">
          <strong>ℹ️ Importante:</strong> Al hacer un pago adelantado, el vehículo pasará automáticamente a "Activas" con la fecha de salida prevista.
        </Alert>

        <div className="stay-details mb-4">
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
          <div className="detail-row">
            <strong>Tarifa:</strong>
            <span className="text-success">{pricePerNight}€/noche</span>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          <h5 className="mb-3">Fechas de Estancia (Editables)</h5>

          <Form.Group className="mb-3">
            <Form.Label><strong>Fecha/Hora de Entrada:</strong></Form.Label>
            <Form.Control
              type="datetime-local"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              disabled={loading || printing}
              required
            />
            <Form.Text className="text-muted">
              Fecha real o estimada de entrada
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label><strong>Fecha/Hora de Salida PREVISTA:</strong></Form.Label>
            <Form.Control
              type="datetime-local"
              value={checkOutTime}
              onChange={(e) => setCheckOutTime(e.target.value)}
              disabled={loading || printing}
              required
            />
            <Form.Text className="text-muted">
              Fecha estimada de salida (puede ajustarse después en el checkout)
            </Form.Text>
          </Form.Group>

          {nights > 0 && (
            <Alert variant="secondary" className="mb-3">
              <strong>Noches estimadas:</strong> {nights} noche{nights !== 1 ? 's' : ''}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Importe (€)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              placeholder="Ej: 10.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              disabled={loading || printing}
            />
            <Form.Text className="text-muted">
              Precio calculado: {nights} noche{nights !== 1 ? 's' : ''} × {pricePerNight}€ = {(nights * pricePerNight).toFixed(2)}€
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Método de Pago</Form.Label>
            <Form.Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={loading || printing}
            >
              <option value="cash">Efectivo</option>
              <option value="card">Tarjeta</option>
              <option value="transfer">Transferencia</option>
            </Form.Select>
          </Form.Group>

          <div className="d-grid gap-2">
            <Button 
              variant="info" 
              onClick={handlePrintTicket}
              disabled={!amount || parseFloat(amount) <= 0 || printing || loading}
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
                <>✓ Confirmar Pago Adelantado y Check-in</>
              )}
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
  );
}

export default PaymentModal;