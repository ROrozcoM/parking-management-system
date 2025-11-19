import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { staysAPI } from '../services/api';

function PaymentModal({ show, onHide, stay, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState(null);

  const handlePrintTicket = async () => {
    setPrinting(true);
    setError(null);

    try {
      const ticketData = {
        type: 'prepayment',
        license_plate: stay.vehicle.license_plate,
        check_in_time: stay.check_in_time,
        amount: parseFloat(amount)
      };

      const result = await staysAPI.printTicket(ticketData);
      
      if (result.success) {
        // Ticket impreso correctamente (sin alert)
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

    setLoading(true);
    setError(null);

    try {
      // Llamada directa al endpoint
      const response = await fetch(`/api/stays/${stay.id}/prepayment?amount=${amount}&payment_method=${paymentMethod}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al procesar el pago');
      }

      const result = await response.json();
      
      if (result.success) {
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
    setError(null);
    onHide();
  };

  if (!stay) return null;

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Pago Adelantado</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
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
            <strong>Entrada:</strong>
            <span>{new Date(stay.check_in_time).toLocaleString()}</span>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
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
                <>✓ Confirmar Pago Adelantado</>
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