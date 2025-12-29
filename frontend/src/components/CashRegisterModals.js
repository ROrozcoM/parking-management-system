import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Badge } from 'react-bootstrap';

// Modal para abrir caja
function OpenCashModal({ show, onHide, onOpen }) {
  const [initialAmount, setInitialAmount] = useState('100');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onOpen(parseFloat(initialAmount));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>🔓 Abrir Caja</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Importe inicial en caja (€)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              required
              autoFocus
              placeholder="100.00"
            />
            <Form.Text className="text-muted">
              Introduce el dinero inicial con el que abres la caja
            </Form.Text>
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Abriendo...' : '🔓 Abrir Caja'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

// Modal para registrar transacción pendiente
function RegisterPendingModal({ show, onHide, pending, onRegister }) {
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (pending && show) {
      setAmountPaid(pending.amount.toString());
      setPaymentMethod('cash');
    }
  }, [pending, show]);

  const calculateChange = () => {
    if (paymentMethod !== 'cash' || !pending) return 0;
    const paid = parseFloat(amountPaid) || 0;
    return paid - pending.amount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pending) return;

    if (paymentMethod === 'cash' && parseFloat(amountPaid) < pending.amount) {
      alert('El importe pagado no puede ser menor al precio');
      return;
    }

    setLoading(true);
    try {
      await onRegister(pending.stay_id, paymentMethod, parseFloat(amountPaid));
    } finally {
      setLoading(false);
    }
  };

  if (!pending) return null;

  const change = calculateChange();

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>📝 Registrar en Caja</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <div><strong>Matrícula:</strong> {pending.license_plate}</div>
          <div><strong>Tipo:</strong> {pending.transaction_type}</div>
          <div><strong>Importe:</strong> <span style={{ fontSize: '1.25rem', color: 'var(--primary-color)' }}>{pending.amount.toFixed(2)} €</span></div>
        </div>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Método de pago</Form.Label>
            <div>
              <Form.Check
                inline
                type="radio"
                label="💵 Efectivo"
                value="cash"
                checked={paymentMethod === 'cash'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <Form.Check
                inline
                type="radio"
                label="💳 Tarjeta"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <Form.Check
                inline
                type="radio"
                label="🏦 Transferencia"
                value="transfer"
                checked={paymentMethod === 'transfer'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
            </div>
          </Form.Group>

          {paymentMethod === 'cash' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Cliente pagó (€)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  min={pending.amount}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  required
                />
              </Form.Group>

              {change > 0 && (
                <Alert variant="warning">
                  <strong>Cambio a devolver:</strong> {change.toFixed(2)} €
                </Alert>
              )}
            </>
          )}

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? 'Registrando...' : '✓ Registrar'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

// Modal para cerrar caja
function CloseCashModal({ show, onHide, session, onClose, hasPending }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [preCloseInfo, setPreCloseInfo] = useState(null);
  const [suggestedChange, setSuggestedChange] = useState(300);
  
  // Paso 2: Contador de billetes/monedas
  const [cashBreakdown, setCashBreakdown] = useState({
    "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0,
    "2": 0, "1": 0, "0.50": 0, "0.20": 0, "0.10": 0, "0.05": 0, "0.02": 0, "0.01": 0
  });
  const [actualCard, setActualCard] = useState('0');
  const [actualTransfer, setActualTransfer] = useState('0');
  
  // Paso 3: Retiro
  const [actualWithdrawal, setActualWithdrawal] = useState('0');
  
  // Paso 4: Notas
  const [notes, setNotes] = useState('');

  // Cargar info al abrir modal
  useEffect(() => {
    if (show && session) {
      loadPreCloseInfo();
      setStep(1);
      setSuggestedChange(300);
      resetForm();
    }
  }, [show, session]);

  const resetForm = () => {
    const emptyBreakdown = {};
    ["500", "200", "100", "50", "20", "10", "5", "2", "1", 
     "0.50", "0.20", "0.10", "0.05", "0.02", "0.01"].forEach(d => {
      emptyBreakdown[d] = 0;
    });
    setCashBreakdown(emptyBreakdown);
    setActualCard('0');
    setActualTransfer('0');
    setActualWithdrawal('0');
    setNotes('');
  };

  const loadPreCloseInfo = async () => {
    try {
      const response = await fetch(
        `/api/cash/pre-close-info?suggested_change=${suggestedChange}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Error al cargar info');
      
      const data = await response.json();
      setPreCloseInfo(data);
      
      // Pre-llenar con valores esperados
      setActualCard(data.expected_card.toFixed(2));
      setActualTransfer(data.expected_transfer.toFixed(2));
      setActualWithdrawal(data.suggested_withdrawal.toFixed(2));
      
    } catch (err) {
      console.error('Error:', err);
      alert('Error al cargar información de cierre');
    }
  };

  // Calcular total efectivo contado
  const calculateCashTotal = () => {
    let total = 0;
    Object.entries(cashBreakdown).forEach(([denom, count]) => {
      total += parseFloat(denom) * parseInt(count || 0);
    });
    return total;
  };

  // Calcular total general
  const calculateGrandTotal = () => {
    const cash = calculateCashTotal();
    const card = parseFloat(actualCard) || 0;
    const transfer = parseFloat(actualTransfer) || 0;
    return cash + card + transfer;
  };

  // Calcular lo que queda en caja
  const calculateRemaining = () => {
    const cashTotal = calculateCashTotal();
    const withdrawal = parseFloat(actualWithdrawal) || 0;
    return Math.max(0, cashTotal - withdrawal);
  };

  // Validar paso actual
  const canProceedToNextStep = () => {
    if (step === 2) {
      const cashTotal = calculateCashTotal();
      return cashTotal > 0;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && suggestedChange !== preCloseInfo?.suggested_change) {
      loadPreCloseInfo();
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {


    const cashTotal = calculateCashTotal();
    const cashDiff = cashTotal - (preCloseInfo?.expected_cash || 0);
    
    // Warning si descuadre grande
    if (Math.abs(cashDiff) > 10) {
      const confirm = window.confirm(
        `⚠️ DESCUADRE GRANDE: ${cashDiff > 0 ? '+' : ''}${cashDiff.toFixed(2)}€\n\n` +
        `¿Estás seguro de cerrar con esta diferencia?\n` +
        `Por favor añade una nota explicativa.`
      );
      if (!confirm) return;
      
      if (!notes.trim()) {
        alert('Debes añadir una nota explicando el descuadre');
        setStep(4);
        return;
      }
    }

    setLoading(true);
    
    try {
      const closeData = {
        cash_breakdown: cashBreakdown,
        actual_cash: cashTotal,
        actual_card: parseFloat(actualCard),
        actual_transfer: parseFloat(actualTransfer),
        actual_withdrawal: parseFloat(actualWithdrawal),
        remaining_in_register: calculateRemaining(),
        notes: notes || null
      };

      await onClose(closeData);
      
    } catch (err) {
      alert('Error al cerrar caja: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  if (!session || !preCloseInfo) {
    return (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Body className="text-center p-5">
          <div className="spinner-border text-primary mb-3" role="status"></div>
          <p>Cargando información...</p>
        </Modal.Body>
      </Modal>
    );
  }

  // Calcular valores para mostrar
  const cashTotal = calculateCashTotal();
  const grandTotal = calculateGrandTotal();
  const cashDifference = cashTotal - preCloseInfo.expected_cash;
  const totalDifference = grandTotal - preCloseInfo.expected_total;
  const remaining = calculateRemaining();

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>🔒 Cerrar Caja - Paso {step} de 4</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {/* Progress bar */}
        <div className="progress mb-4">
          <div 
            className="progress-bar" 
            role="progressbar" 
            style={{width: `${(step / 4) * 100}%`}}
            aria-valuenow={(step / 4) * 100} 
            aria-valuemin="0" 
            aria-valuemax="100"
          ></div>
        </div>

        {/* PASO 1: RESUMEN ESPERADO */}
        {step === 1 && (
          <div>
            <h5 className="mb-3">📊 Resumen del Día</h5>
            
            <div className="p-3 bg-light rounded mb-3">
              <div className="row">
                <div className="col-6">
                  <small className="text-muted">Inicial:</small>
                  <div><strong>{session.initial_amount.toFixed(2)} €</strong></div>
                </div>
                <div className="col-6">
                  <small className="text-muted">Ingresos efectivo:</small>
                  <div className="text-success"><strong>+{session.total_cash_in.toFixed(2)} €</strong></div>
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-6">
                  <small className="text-muted">Retiros:</small>
                  <div className="text-danger"><strong>-{session.total_withdrawals.toFixed(2)} €</strong></div>
                </div>
              </div>
            </div>

            <h6 className="mb-2">Importes Esperados por Método:</h6>
            <div className="p-3 bg-info bg-opacity-10 rounded">
              <div className="d-flex justify-content-between mb-2">
                <span>💶 Efectivo:</span>
                <strong>{preCloseInfo.expected_cash.toFixed(2)} €</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>💳 Tarjeta:</span>
                <strong>{preCloseInfo.expected_card.toFixed(2)} €</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>🏦 Transferencia:</span>
                <strong>{preCloseInfo.expected_transfer.toFixed(2)} €</strong>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <strong>TOTAL ESPERADO:</strong>
                <strong className="fs-5 text-primary">{preCloseInfo.expected_total.toFixed(2)} €</strong>
              </div>
            </div>

            <Form.Group className="mt-3">
              <Form.Label>Cambio recomendado para mañana:</Form.Label>
              <Form.Control
                type="number"
                step="10"
                min="0"
                value={suggestedChange}
                onChange={(e) => setSuggestedChange(parseFloat(e.target.value) || 0)}
              />
              <Form.Text className="text-muted">
                Sugerencia de retiro: <strong>{preCloseInfo.suggested_withdrawal.toFixed(2)} €</strong>
              </Form.Text>
            </Form.Group>
          </div>
        )}

        {/* PASO 2: CONTADOR DE BILLETES */}
        {step === 2 && (
          <div>
            <h5 className="mb-3">💶 Contador de Billetes y Monedas</h5>
            
            <div className="row">
              <div className="col-md-6">
                <h6>💶 Billetes:</h6>
                {["500", "200", "100", "50", "20", "10", "5"].map(denom => (
                  <Form.Group key={denom} className="mb-2">
                    <div className="input-group input-group-sm">
                      <span className="input-group-text" style={{width: '70px'}}>{denom}€ ×</span>
                      <Form.Control
                        type="number"
                        min="0"
                        value={cashBreakdown[denom]}
                        onChange={(e) => setCashBreakdown({
                          ...cashBreakdown,
                          [denom]: parseInt(e.target.value) || 0
                        })}
                      />
                      <span className="input-group-text">
                        = {(parseFloat(denom) * (cashBreakdown[denom] || 0)).toFixed(2)}€
                      </span>
                    </div>
                  </Form.Group>
                ))}
              </div>

              <div className="col-md-6">
                <h6>🪙 Monedas:</h6>
                {["2", "1", "0.50", "0.20", "0.10", "0.05", "0.02", "0.01"].map(denom => (
                  <Form.Group key={denom} className="mb-2">
                    <div className="input-group input-group-sm">
                      <span className="input-group-text" style={{width: '70px'}}>{denom}€ ×</span>
                      <Form.Control
                        type="number"
                        min="0"
                        value={cashBreakdown[denom]}
                        onChange={(e) => setCashBreakdown({
                          ...cashBreakdown,
                          [denom]: parseInt(e.target.value) || 0
                        })}
                      />
                      <span className="input-group-text">
                        = {(parseFloat(denom) * (cashBreakdown[denom] || 0)).toFixed(2)}€
                      </span>
                    </div>
                  </Form.Group>
                ))}
              </div>
            </div>

            {/* AQUÍ ESTÁ EL CAMBIO - Diferencia de efectivo con indicador visual mejorado */}
            <div className="mt-3 p-3 bg-light rounded">
              <div className="d-flex justify-content-between mb-2">
                <span>Total efectivo contado:</span>
                <strong className={cashDifference === 0 ? 'text-success' : cashDifference > 0 ? 'text-success' : 'text-warning'}>
                  {cashTotal.toFixed(2)} €
                </strong>
              </div>
              <div className="d-flex justify-content-between">
                <span>Esperado:</span>
                <span>{preCloseInfo.expected_cash.toFixed(2)} €</span>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span>Diferencia:</span>
                <div>
                  {cashDifference > 0 ? (
                    // SOBRA DINERO - Verde intenso con badge
                    <div className="d-flex align-items-center gap-2">
                      <strong className="text-success fs-5">
                        +{cashDifference.toFixed(2)} € 
                      </strong>
                      <Badge bg="success" className="fs-6">
                        🍺 ¡Momento birras!
                      </Badge>
                    </div>
                  ) : cashDifference === 0 ? (
                    // CUADRA PERFECTO
                    <strong className="text-success">
                      {cashDifference.toFixed(2)} € ✅
                    </strong>
                  ) : (
                    // FALTA DINERO - Rojo
                    <strong className="text-danger">
                      {cashDifference.toFixed(2)} € ⚠️
                    </strong>
                  )}
                </div>
              </div>
            </div>

            <hr />

            <h6>Otros métodos de pago:</h6>
            <Form.Group className="mb-2">
              <Form.Label>💳 Tarjeta (€):</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0"
                value={actualCard}
                onChange={(e) => setActualCard(e.target.value)}
              />
              <Form.Text className="text-muted">
                Esperado: {preCloseInfo.expected_card.toFixed(2)} €
              </Form.Text>
            </Form.Group>

            <Form.Group>
              <Form.Label>🏦 Transferencia (€):</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0"
                value={actualTransfer}
                onChange={(e) => setActualTransfer(e.target.value)}
              />
              <Form.Text className="text-muted">
                Esperado: {preCloseInfo.expected_transfer.toFixed(2)} €
              </Form.Text>
            </Form.Group>
          </div>
        )}

        {/* PASO 3: RETIRO */}
        {step === 3 && (
          <div>
            <h5 className="mb-3">💸 Retiro de Efectivo</h5>

            <div className="p-3 bg-light rounded mb-3">
              <div className="d-flex justify-content-between mb-2">
                <span>Efectivo total:</span>
                <strong>{cashTotal.toFixed(2)} €</strong>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Cambio recomendado:</span>
                <span>{suggestedChange.toFixed(2)} €</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between">
                <strong>SUGERIDO RETIRAR:</strong>
                <strong className="text-success">{preCloseInfo.suggested_withdrawal.toFixed(2)} €</strong>
              </div>
            </div>

            <Alert variant="info">
              <strong>💡 Sugerencia:</strong> Retira las ganancias del día y deja el cambio inicial para mañana.
            </Alert>

            <Form.Group className="mb-3">
              <Form.Label>¿Cuánto retiraste realmente? (€)</Form.Label>
              <Form.Control
                type="number"
                step="0.01"
                min="0"
                max={cashTotal}
                value={actualWithdrawal}
                onChange={(e) => setActualWithdrawal(e.target.value)}
                autoFocus
              />
            </Form.Group>

            <div className="p-3 bg-success bg-opacity-10 rounded">
              <div className="d-flex justify-content-between">
                <strong>Quedará en caja:</strong>
                <strong className="fs-5 text-success">{remaining.toFixed(2)} €</strong>
              </div>
            </div>
          </div>
        )}

        {/* PASO 4: CONFIRMACIÓN */}
        {step === 4 && (
          <div>
            <h5 className="mb-3">✅ Confirmación Final</h5>

            <div className="p-3 bg-light rounded mb-3">
              <h6>Resumen completo:</h6>
              
              <div className="row mt-3">
                <div className="col-6">
                  <small className="text-muted">Efectivo:</small>
                  <div className={cashDifference === 0 ? 'text-success' : 'text-warning'}>
                    <strong>{cashTotal.toFixed(2)} €</strong>
                    {cashDifference === 0 ? ' ✅' : ` (${cashDifference > 0 ? '+' : ''}${cashDifference.toFixed(2)}€)`}
                  </div>
                </div>
                <div className="col-6">
                  <small className="text-muted">Tarjeta:</small>
                  <div><strong>{parseFloat(actualCard).toFixed(2)} €</strong></div>
                </div>
              </div>

              <div className="row mt-2">
                <div className="col-6">
                  <small className="text-muted">Transferencia:</small>
                  <div><strong>{parseFloat(actualTransfer).toFixed(2)} €</strong></div>
                </div>
                <div className="col-6">
                  <small className="text-muted">Total:</small>
                  <div className={totalDifference === 0 ? 'text-success' : 'text-warning'}>
                    <strong>{grandTotal.toFixed(2)} €</strong>
                    {totalDifference === 0 ? ' ✅' : ` (${totalDifference > 0 ? '+' : ''}${totalDifference.toFixed(2)}€)`}
                  </div>
                </div>
              </div>

              <hr />

              <div className="row">
                <div className="col-6">
                  <small className="text-muted">Retiro:</small>
                  <div><strong>{parseFloat(actualWithdrawal).toFixed(2)} €</strong></div>
                </div>
                <div className="col-6">
                  <small className="text-muted">Queda en caja:</small>
                  <div className="text-success"><strong>{remaining.toFixed(2)} €</strong></div>
                </div>
              </div>
            </div>

            {(Math.abs(cashDifference) > 0.01 || Math.abs(totalDifference) > 0.01) && (
              <Alert variant="warning">
                ⚠️ <strong>Hay un descuadre.</strong> Por favor añade una nota explicativa.
              </Alert>
            )}

            <Form.Group>
              <Form.Label>📝 Notas (opcional):</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Todo correcto, descuadre por error en cambio, etc..."
              />
            </Form.Group>

            <Alert variant="info" className="mt-3">
              <strong>📧 Email automático:</strong> Se enviará un resumen completo a autocaravanascordoba@gmail.com
            </Alert>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <div className="d-flex justify-content-between w-100">
          <div>
            {step > 1 && (
              <Button variant="secondary" onClick={handleBack} disabled={loading}>
                ← Atrás
              </Button>
            )}
          </div>
          
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={onHide} disabled={loading}>
              Cancelar
            </Button>
            
            {step < 4 ? (
              <Button 
                variant="primary" 
                onClick={handleNext}
                disabled={!canProceedToNextStep()}
              >
                Siguiente →
              </Button>
            ) : (
              <Button 
                variant="danger" 
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? 'Cerrando...' : '🔒 Cerrar Caja y Enviar Email'}
              </Button>
            )}
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
}

// Modal para registrar retiro
function WithdrawalModal({ show, onHide, onWithdrawal }) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onWithdrawal(parseFloat(amount), notes || null);
      setAmount('');
      setNotes('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>💸 Registrar Retiro</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Importe a retirar (€)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
              placeholder="200.00"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Motivo</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Llevar al banco, pago a proveedor..."
            />
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="warning" disabled={loading}>
              {loading ? 'Registrando...' : '💸 Registrar Retiro'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

// Al final de CashRegisterModals.js, después de la última función:

export { OpenCashModal, RegisterPendingModal, CloseCashModal, WithdrawalModal };