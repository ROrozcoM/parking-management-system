import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';

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
  const [actualAmount, setActualAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session && show) {
      setActualAmount(session.expected_amount.toFixed(2));
      setNotes('');
    }
  }, [session, show]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (hasPending) {
      const confirm = window.confirm(
        'Hay transacciones pendientes de registrar. ¿Deseas cerrar la caja de todos modos?'
      );
      if (!confirm) return;
    }

    setLoading(true);
    try {
      await onClose(parseFloat(actualAmount), notes || null);
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  const difference = parseFloat(actualAmount) - session.expected_amount;

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>🔒 Cerrar Caja</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {hasPending && (
          <Alert variant="warning" className="mb-3">
            ⚠️ <strong>Atención:</strong> Hay transacciones pendientes de registrar
          </Alert>
        )}

        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <h5>Resumen del día:</h5>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
            <div>Inicial:</div>
            <div style={{ textAlign: 'right' }}><strong>{session.initial_amount.toFixed(2)} €</strong></div>
            
            <div>Ingresos efectivo:</div>
            <div style={{ textAlign: 'right', color: '#28a745' }}><strong>+{session.total_cash_in.toFixed(2)} €</strong></div>
            
            <div>Retiros:</div>
            <div style={{ textAlign: 'right', color: '#dc3545' }}><strong>-{session.total_withdrawals.toFixed(2)} €</strong></div>
            
            <hr style={{ gridColumn: '1 / -1', margin: '0.5rem 0' }} />
            
            <div><strong>ESPERADO:</strong></div>
            <div style={{ textAlign: 'right', fontSize: '1.25rem', color: 'var(--primary-color)' }}>
              <strong>{session.expected_amount.toFixed(2)} €</strong>
            </div>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Importe real en caja (€)</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              value={actualAmount}
              onChange={(e) => setActualAmount(e.target.value)}
              required
              autoFocus
            />
            <Form.Text className="text-muted">
              Cuenta el dinero físicamente y registra el importe real
            </Form.Text>
          </Form.Group>

          {actualAmount && difference !== 0 && (
            <Alert variant={difference > 0 ? 'success' : 'danger'}>
              <strong>Diferencia:</strong> {difference > 0 ? '+' : ''}{difference.toFixed(2)} €
              {difference < 0 ? ' (Falta dinero)' : ' (Sobra dinero)'}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Notas (opcional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Cliente no pagó 2€, posible error en cambio..."
            />
          </Form.Group>

          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" disabled={loading}>
              {loading ? 'Cerrando...' : '🔒 Cerrar Caja'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
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