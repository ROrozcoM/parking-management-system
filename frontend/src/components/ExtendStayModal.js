import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { staysAPI } from '../services/api';

function ExtendStayModal({ show, onHide, stay, onSuccess }) {
  const [nightsToAdd, setNightsToAdd] = useState(1);
  const [additionalAmount, setAdditionalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [loading, setLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState(null);
  const [newCheckoutDate, setNewCheckoutDate] = useState('');
  const [currentNights, setCurrentNights] = useState(0);

  useEffect(() => {
    if (stay) {
      calculateCurrentNights();
      calculateNewValues();
    }
  }, [stay, nightsToAdd]);

  const calculateCurrentNights = () => {
    if (stay.check_in_time && stay.check_out_time) {
      const checkIn = new Date(stay.check_in_time);
      const checkOut = new Date(stay.check_out_time);
      const diffMs = checkOut - checkIn;
      const nights = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      setCurrentNights(nights);
    }
  };

  const calculateNewValues = () => {
    if (!stay || !stay.check_out_time) return;

    // Calcular nueva fecha de checkout
    const currentCheckout = new Date(stay.check_out_time);
    const newCheckout = new Date(currentCheckout);
    newCheckout.setDate(newCheckout.getDate() + parseInt(nightsToAdd));
    setNewCheckoutDate(newCheckout.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));

    // Calcular importe adicional (10€/noche - ajusta según tu tarifa)
    const pricePerNight = 10;
    const calculatedAmount = nightsToAdd * pricePerNight;
    setAdditionalAmount(calculatedAmount.toFixed(2));
  };

  const handlePrintTicket = async () => {
    setPrinting(true);
    setError(null);

    try {
      // Calcular nueva fecha de checkout
      const currentCheckout = new Date(stay.check_out_time);
      const newCheckout = new Date(currentCheckout);
      newCheckout.setDate(newCheckout.getDate() + parseInt(nightsToAdd));

      // Obtener tipo de plaza
      const spotType = stay.parking_spot?.spot_type || '';

      const ticketData = {
        type: 'extension',
        license_plate: stay.vehicle.license_plate,
        check_in_time: stay.check_in_time,
        check_out_time: newCheckout.toISOString(),
        nights: parseInt(nightsToAdd),  // ← Solo noches AÑADIDAS
        amount: parseFloat(additionalAmount),  // ← Solo importe de extensión
        spot_type: spotType
      };

      const result = await staysAPI.printTicket(ticketData);
      
      if (result.success) {
        console.log('Ticket de extensión impreso correctamente');
      }

    } catch (err) {
      console.error('Error printing extension ticket:', err);
      setError('Error al imprimir el ticket de extensión');
    } finally {
      setPrinting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!nightsToAdd || nightsToAdd <= 0) {
      setError('Debe añadir al menos 1 noche');
      return;
    }

    if (!additionalAmount || parseFloat(additionalAmount) <= 0) {
      setError('El importe adicional debe ser mayor a 0');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/stays/${stay.id}/extend-stay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nights_to_add: parseInt(nightsToAdd),
          additional_amount: parseFloat(additionalAmount),
          payment_method: paymentMethod
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al extender la estancia');
      }

      const result = await response.json();

      if (result.success) {
        onSuccess();
        handleClose();
      } else {
        throw new Error('Error al extender la estancia');
      }

    } catch (err) {
      console.error('Error extending stay:', err);
      setError(err.message || 'Error al extender la estancia');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNightsToAdd(1);
    setAdditionalAmount('');
    setPaymentMethod('cash');
    setError(null);
    setNewCheckoutDate('');
    onHide();
  };

  if (!stay) return null;

  const totalNights = currentNights + parseInt(nightsToAdd);
  const totalAmount = (parseFloat(stay.prepaid_amount || 0) + parseFloat(additionalAmount || 0)).toFixed(2);

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>➕ Extender Estancia</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Alert variant="info" className="mb-3">
          <strong>ℹ️ Nota:</strong> Esta extensión se registrará en el historial para trazabilidad de pagos.
        </Alert>

        <div className="stay-summary mb-4 p-3 bg-light rounded">
          <h5 className="mb-3">Resumen Actual</h5>
          
          <div className="row">
            <div className="col-md-6">
              <div className="detail-row mb-2">
                <strong>Matrícula:</strong>
                <span className="license-plate-display ms-2">{stay.vehicle.license_plate}</span>
              </div>
              <div className="detail-row mb-2">
                <strong>Noches actuales:</strong>
                <span className="ms-2">{currentNights} noche{currentNights !== 1 ? 's' : ''}</span>
              </div>
              <div className="detail-row mb-2">
                <strong>Salida actual:</strong>
                <span className="ms-2">
                  {stay.check_out_time 
                    ? new Date(stay.check_out_time).toLocaleString('es-ES')
                    : 'No definida'}
                </span>
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="detail-row mb-2">
                <strong>Pagado actual:</strong>
                <span className="text-success ms-2 fs-5">{stay.prepaid_amount?.toFixed(2)} €</span>
              </div>
              <div className="detail-row mb-2">
                <strong>Método original:</strong>
                <span className="ms-2">
                  {!stay.payment_method || stay.payment_method === 'cash' ? '💵 Efectivo' : 
                   stay.payment_method === 'card' ? '💳 Tarjeta' : 
                   stay.payment_method === 'transfer' ? '🏦 Transferencia' : 
                   '💵 Efectivo'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          <h5 className="mb-3">Extensión de Estancia</h5>

          <Form.Group className="mb-3">
            <Form.Label><strong>Noches a añadir:</strong></Form.Label>
            <Form.Control
              type="number"
              min="1"
              value={nightsToAdd}
              onChange={(e) => setNightsToAdd(e.target.value)}
              disabled={loading || printing}
              required
            />
            <Form.Text className="text-muted">
              Total noches: {totalNights} ({currentNights} actuales + {nightsToAdd} nuevas)
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label><strong>Nueva fecha de salida:</strong></Form.Label>
            <Form.Control
              type="text"
              value={newCheckoutDate}
              disabled
              readOnly
              className="bg-light"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label><strong>Importe adicional (€):</strong></Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={additionalAmount}
              onChange={(e) => setAdditionalAmount(e.target.value)}
              disabled={loading || printing}
              required
            />
            <Form.Text className="text-muted">
              Precio sugerido: {nightsToAdd} noche{nightsToAdd > 1 ? 's' : ''} × 10€ = {(nightsToAdd * 10).toFixed(2)}€
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label><strong>Método de pago de esta extensión:</strong></Form.Label>
            <Form.Select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              disabled={loading || printing}
            >
              <option value="cash">💵 Efectivo</option>
              <option value="card">💳 Tarjeta</option>
              <option value="transfer">🏦 Transferencia</option>
            </Form.Select>
            <Form.Text className="text-muted">
              Se registrará en el historial para trazabilidad
            </Form.Text>
          </Form.Group>

          <Alert variant="success" className="mb-3">
            <h6 className="mb-2">Resumen Final:</h6>
            <div className="d-flex justify-content-between">
              <span><strong>Total noches:</strong></span>
              <span>{totalNights} noche{totalNights !== 1 ? 's' : ''}</span>
            </div>
            <div className="d-flex justify-content-between">
              <span><strong>Total pagado:</strong></span>
              <span className="fs-5">{totalAmount} €</span>
            </div>
            <hr />
            <small className="text-muted">
              Métodos: {!stay.payment_method || stay.payment_method === 'cash' ? 'Efectivo' : stay.payment_method === 'card' ? 'Tarjeta' : stay.payment_method === 'transfer' ? 'Transferencia' : 'Efectivo'} ({stay.prepaid_amount?.toFixed(2)}€) + {paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'} ({additionalAmount}€)
            </small>
          </Alert>

          <div className="d-grid gap-2">
            {/* Botón de imprimir ticket */}
            <Button 
              variant="info" 
              onClick={handlePrintTicket}
              disabled={!additionalAmount || parseFloat(additionalAmount) <= 0 || printing || loading}
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
                <>🖨️ Generar Ticket de Extensión</>
              )}
            </Button>

            {/* Botón de confirmar extensión */}
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
                <>✓ Confirmar Extensión de Estancia</>
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

export default ExtendStayModal;