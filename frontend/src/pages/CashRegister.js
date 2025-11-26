import React, { useState, useEffect } from 'react';
import { cashAPI } from '../services/api';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { OpenCashModal, RegisterPendingModal, CloseCashModal, WithdrawalModal } from '../components/CashRegisterModals';


function CashRegister() {
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingTransactions, setPendingTransactions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  // Modals
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [selectedPending, setSelectedPending] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Intentar obtener sesión activa
      try {
        const session = await cashAPI.getActiveSession();
        setActiveSession(session);
        
        // Si hay sesión activa, cargar transacciones y pendientes
        const [txs, pending] = await Promise.all([
          cashAPI.getTransactions(session.id),
          cashAPI.getPendingTransactions()
        ]);
        
        setTransactions(txs);
        setPendingTransactions(pending.pending || []);
      } catch (err) {
        // No hay sesión activa
        if (err.response?.status === 404) {
          setActiveSession(null);
          setTransactions([]);
          setPendingTransactions([]);
        } else {
          throw err;
        }
      }
      
      setError(null);
    } catch (err) {
      setError('Error al cargar datos de caja');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async (initialAmount) => {
    try {
      await cashAPI.openSession(initialAmount);
      setShowOpenModal(false);
      fetchData();
    } catch (err) {
      alert('Error al abrir caja: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCloseSession = async (closeData) => {
  try {
    // closeData ya viene con el formato correcto del modal
    const response = await fetch(`/api/cash/close-session/${activeSession.id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(closeData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al cerrar caja');
    }

    setShowCloseModal(false);
    fetchData();
    
    // Mensaje de éxito
    alert('✅ Caja cerrada correctamente. Se ha enviado un email con el resumen.');
    
  } catch (err) {
    alert('Error al cerrar caja: ' + (err.message || 'Error desconocido'));
    throw err;
  }
  };

  const handleRegisterPending = async (stayId, paymentMethod, amountPaid) => {
    try {
      await cashAPI.registerPending(stayId, paymentMethod, amountPaid);
      setShowRegisterModal(false);
      setSelectedPending(null);
      fetchData();
    } catch (err) {
      alert('Error al registrar: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleWithdrawal = async (amount, notes) => {
    try {
      await cashAPI.registerWithdrawal(amount, notes);
      setShowWithdrawalModal(false);
      fetchData();
    } catch (err) {
      alert('Error al registrar retiro: ' + (err.response?.data?.detail || err.message));
    }
  };

  
  const handleUndoTransaction = async (transactionId, transactionType) => {
    // Confirmación
    const confirmMessage = transactionType === 'withdrawal' 
      ? '¿Estás seguro de eliminar este retiro? Esta acción no se puede deshacer.'
      : '¿Estás seguro de deshacer esta transacción? El registro volverá a aparecer como pendiente.';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/cash/transaction/${transactionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Error al deshacer transacción');
      }
      
      // Recargar datos
      fetchData();
      
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  // Si no hay sesión activa, mostrar pantalla de apertura
  if (!activeSession) {
    return (
      <div className="cash-register">
        
        
        <div className="card" style={{ maxWidth: '500px', margin: '2rem auto', textAlign: 'center' }}>
          <div className="card-body" style={{ padding: '3rem' }}>
            <h2 style={{ color: 'var(--secondary-color)', marginBottom: '1rem' }}>
              🔒 Caja Cerrada
            </h2>
            <p style={{ marginBottom: '2rem', color: '#666' }}>
              No hay ninguna sesión de caja activa
            </p>
            <Button 
              variant="primary" 
              size="lg"
              onClick={() => setShowOpenModal(true)}
              style={{ minWidth: '200px' }}
            >
              🔓 Abrir Caja
            </Button>
          </div>
        </div>

        <OpenCashModal 
          show={showOpenModal}
          onHide={() => setShowOpenModal(false)}
          onOpen={handleOpenSession}
        />
      </div>
    );
  }

  // Caja abierta - Vista principal
  return (
    <div className="cash-register">
      

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Resumen de caja */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header" style={{ 
          background: 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))',
          color: 'white'
        }}>
          <h2 style={{ margin: 0 }}>Estado de Caja - {new Date(activeSession.opened_at).toLocaleDateString()}</h2>
        </div>
        <div className="card-body">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Inicial</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                {activeSession.initial_amount.toFixed(2)} €
              </div>
            </div>
            
            <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Ingresos</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>
                +{activeSession.total_cash_in.toFixed(2)} €
              </div>
            </div>
            
            <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>Retiros</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc3545' }}>
                -{activeSession.total_withdrawals.toFixed(2)} €
              </div>
            </div>
            
            <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '8px', border: '2px solid #28a745' }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>ESPERADO</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#28a745' }}>
                {activeSession.expected_amount.toFixed(2)} €
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Button variant="warning" onClick={() => setShowWithdrawalModal(true)}>
              💸 Registrar Retiro
            </Button>
            <Button variant="danger" onClick={() => setShowCloseModal(true)}>
              🔒 Cerrar Caja
            </Button>
          </div>
        </div>
      </div>

      {/* Transacciones pendientes */}
      {pendingTransactions.length > 0 && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <div className="card-header" style={{ backgroundColor: '#fff3cd' }}>
            <h2 style={{ margin: 0, color: '#856404' }}>
              ⚠️ Transacciones Pendientes de Registrar ({pendingTransactions.length})
            </h2>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Matrícula</th>
                    <th>Tipo</th>
                    <th>Importe</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTransactions.map(pt => (
                    <tr key={pt.stay_id}>
                      <td>{new Date(pt.timestamp).toLocaleTimeString()}</td>
                      <td><strong>{pt.license_plate}</strong></td>
                      <td>
                        <span className={`action-badge ${pt.transaction_type}`}>
                          {pt.transaction_type === 'checkout' ? '📤 Checkout' : '📝 Prepayment'}
                        </span>
                      </td>
                      <td><strong>{pt.amount.toFixed(2)} €</strong></td>
                      <td>
                        <Button 
                          size="sm" 
                          variant="primary"
                          onClick={() => {
                            setSelectedPending(pt);
                            setShowRegisterModal(true);
                          }}
                        >
                          📝 Registrar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Historial de transacciones del día */}
      <div className="card">
        <div className="card-header">
          <h2 style={{ margin: 0 }}>Movimientos del Día</h2>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              No hay transacciones registradas aún
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Tipo</th>
                    <th>Matrícula</th>
                    <th>Debe</th>
                    <th>Recibido</th>
                    <th>Cambio</th>
                    <th>Método</th>
                    <th>Usuario</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.timestamp).toLocaleTimeString()}</td>
                      <td>
                        <span className={`action-badge ${tx.transaction_type}`}>
                          {getTransactionIcon(tx.transaction_type)} {tx.transaction_type}
                        </span>
                      </td>
                      <td>{tx.license_plate || '-'}</td>
                      <td><strong>{tx.amount_due.toFixed(2)} €</strong></td>
                      <td>{tx.amount_paid ? tx.amount_paid.toFixed(2) + ' €' : '-'}</td>
                      <td>{tx.change_given ? tx.change_given.toFixed(2) + ' €' : '-'}</td>
                      <td>{getPaymentMethodIcon(tx.payment_method)}</td>
                      <td>{tx.username}</td>
                      <td>
                        {tx.transaction_type !== 'initial' && (
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={() => handleUndoTransaction(tx.id, tx.transaction_type)}
                            title="Deshacer transacción"
                          >
                            ↩️
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <RegisterPendingModal
        show={showRegisterModal}
        onHide={() => {
          setShowRegisterModal(false);
          setSelectedPending(null);
        }}
        pending={selectedPending}
        onRegister={handleRegisterPending}
      />

      <CloseCashModal
        show={showCloseModal}
        onHide={() => setShowCloseModal(false)}
        session={activeSession}
        onClose={handleCloseSession}
        hasPending={pendingTransactions.length > 0}
      />

      <WithdrawalModal
        show={showWithdrawalModal}
        onHide={() => setShowWithdrawalModal(false)}
        onWithdrawal={handleWithdrawal}
      />
    </div>
  );
}

// Helper functions
function getTransactionIcon(type) {
  const icons = {
    'checkout': '📤',
    'prepayment': '📝',
    'withdrawal': '💸',
    'initial': '🔓',
    'adjustment': '⚙️'
  };
  return icons[type] || '📋';
}

function getPaymentMethodIcon(method) {
  const icons = {
    'cash': '💵 Efectivo',
    'card': '💳 Tarjeta',
    'transfer': '🏦 Transferencia'
  };
  return icons[method] || method;
}


export default CashRegister;