import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert, Form } from 'react-bootstrap';
import { staysAPI } from '../services/api';
import CheckOutModal from './CheckOutModal';
import PaymentModal from './PaymentModal';
import ManualEntryModal from './ManualEntryModal';
import ExtendStayModal from './ExtendStayModal';

function ActiveCard({ refreshData }) {
  const [activeStays, setActiveStays] = useState([]);
  const [filteredStays, setFilteredStays] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStay, setSelectedStay] = useState(null);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showExtendStayModal, setShowExtendStayModal] = useState(false);

  // Estados para salidas previstas hoy
  const [checkoutsDueToday, setCheckoutsDueToday] = useState([]);
  const [showCheckoutsDueModal, setShowCheckoutsDueModal] = useState(false);
  const [loadingCheckoutsDue, setLoadingCheckoutsDue] = useState(false);

  // Estados para eliminar estancia activa
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [stayToDelete, setStayToDelete] = useState(null);
  const [confirmLicensePlate, setConfirmLicensePlate] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // ← NUEVOS: Estados para verificación de ronda nocturna
  const [verifiedStayIds, setVerifiedStayIds] = useState([]);
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    fetchActiveStays();
    fetchCheckoutsDueToday();
    loadVerifiedStays();
  }, []);

  useEffect(() => {
    // Filtrar y ordenar: no verificadas primero, verificadas al final
    let stays = activeStays;
    
    if (searchQuery.trim() !== '') {
      stays = stays.filter(stay =>
        stay.vehicle.license_plate.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Ordenar: no verificadas primero, verificadas al final
    const sorted = [...stays].sort((a, b) => {
      const aVerified = verifiedStayIds.includes(a.id);
      const bVerified = verifiedStayIds.includes(b.id);
      
      if (aVerified && !bVerified) return 1;  // a al final
      if (!aVerified && bVerified) return -1; // b al final
      return 0; // mantener orden original
    });

    setFilteredStays(sorted);
  }, [searchQuery, activeStays, verifiedStayIds]);

  // ← NUEVO: Cargar verificaciones desde localStorage
  const loadVerifiedStays = () => {
    try {
      const saved = localStorage.getItem('verifiedStays');
      if (saved) {
        setVerifiedStayIds(JSON.parse(saved));
      }
    } catch (err) {
      console.error('Error loading verified stays:', err);
    }
  };

  // ← NUEVO: Guardar verificaciones en localStorage
  const saveVerifiedStays = (ids) => {
    try {
      localStorage.setItem('verifiedStays', JSON.stringify(ids));
    } catch (err) {
      console.error('Error saving verified stays:', err);
    }
  };

  // ← NUEVO: Toggle verificación
  const handleToggleVerified = (stayId, event) => {
    event.stopPropagation(); // Evitar que se propague el click
    
    setVerifiedStayIds(prev => {
      let newIds;
      if (prev.includes(stayId)) {
        // Desmarcar
        newIds = prev.filter(id => id !== stayId);
      } else {
        // Marcar
        newIds = [...prev, stayId];
      }
      saveVerifiedStays(newIds);
      return newIds;
    });
  };

  // ← NUEVO: Resetear todas las verificaciones
  const handleResetVerifications = () => {
    setVerifiedStayIds([]);
    saveVerifiedStays([]);
    setShowResetModal(false);
  };

  const fetchActiveStays = async () => {
    try {
      setLoading(true);
      const data = await staysAPI.getActiveStays();
      setActiveStays(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch active stays');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCheckoutsDueToday = async () => {
    try {
      const response = await fetch('/api/stays/checkouts-due-today', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) throw new Error('Error fetching checkouts due today');
      
      const data = await response.json();
      console.log('🔍 Checkouts due today:', data.stays);
      setCheckoutsDueToday(data.stays || []);
    } catch (err) {
      console.error('Error fetching checkouts due today:', err);
    }
  };

  const handleCheckOutClick = (stay) => {
    setSelectedStay(stay);
    setShowCheckOutModal(true);
  };

  const handlePrepaymentClick = (stay) => {
    setSelectedStay(stay);
    setShowPaymentModal(true);
  };

  const handleExtendStayClick = (stay) => {
    setSelectedStay(stay);
    setShowExtendStayModal(true);
  };

  const handleAddManualEntryClick = () => {
    setShowManualEntryModal(true);
  };

  const handleShowCheckoutsDue = () => {
    setShowCheckoutsDueModal(true);
  };

  const handleCheckoutFromDueList = (stay) => {
    setShowCheckoutsDueModal(false);
    setSelectedStay(stay);
    setShowCheckOutModal(true);
  };

  const handleDeleteClick = (stay) => {
    setStayToDelete(stay);
    setConfirmLicensePlate('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!stayToDelete) return;

    if (confirmLicensePlate.trim().toUpperCase() !== stayToDelete.vehicle.license_plate.toUpperCase()) {
      setDeleteError('La matrícula no coincide. Por favor, verifica e inténtalo de nuevo.');
      return;
    }

    try {
      const response = await fetch(`/api/stays/${stayToDelete.id}/active`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error eliminando estancia');
      }

      setShowDeleteModal(false);
      setStayToDelete(null);
      setConfirmLicensePlate('');
      fetchActiveStays();
      if (refreshData) refreshData();

    } catch (err) {
      setDeleteError(err.message);
      console.error('Error eliminando estancia:', err);
    }
  };

  const handleCheckOutSuccess = () => {
    setShowCheckOutModal(false);
    setSelectedStay(null);
    fetchActiveStays();
    fetchCheckoutsDueToday();
    if (refreshData) refreshData();
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedStay(null);
    fetchActiveStays();
    fetchCheckoutsDueToday();
    if (refreshData) refreshData();
  };

  const handleExtendStaySuccess = () => {
    setShowExtendStayModal(false);
    setSelectedStay(null);
    fetchActiveStays();
    fetchCheckoutsDueToday();
    if (refreshData) refreshData();
  };

  const handleManualEntrySuccess = () => {
    setShowManualEntryModal(false);
    fetchActiveStays();
    if (refreshData) refreshData();
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    switch (paymentStatus) {
      case 'prepaid':
        return <span className="badge bg-success">✓ Pagado</span>;
      case 'paid':
        return <span className="badge bg-success">✓ Pagado</span>;
      case 'pending':
      default:
        return <span className="badge bg-warning text-dark">⏳ Pendiente Pago</span>;
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'No definida';
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;
    const diffMs = new Date(checkOut) - new Date(checkIn);
    const days = diffMs / (1000 * 60 * 60 * 24);
    return Math.ceil(days);
  };

  if (loading) return <div className="loading">Loading active stays...</div>;
  if (error) return <div className="error">{error}</div>;

  const verifiedCount = verifiedStayIds.length;
  const totalCount = activeStays.length;

  return (
    <div className="card">
      <div className="card-header">
        <h2>Entradas Activas</h2>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          flex: 1,
          justifyContent: 'center',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="text"
              placeholder="🔍 Buscar matrícula..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 2.5rem 0.5rem 1rem',
                borderRadius: '8px',
                border: '2px solid #e0e0e0',
                fontSize: '0.95rem',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#999',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  padding: '0 0.5rem'
                }}
                title="Limpiar búsqueda"
              >
                ×
              </button>
            )}
          </div>

          {/* ← NUEVO: Contador de verificadas */}
          {verifiedCount > 0 && (
            <div style={{
              fontSize: '0.85rem',
              color: '#666',
              whiteSpace: 'nowrap',
              padding: '0.25rem 0.5rem',
              backgroundColor: '#e8f5e9',
              borderRadius: '4px',
              fontWeight: 600
            }}>
              ✓ {verifiedCount}/{totalCount}
            </div>
          )}

          {/* ← NUEVO: Botón reset verificaciones */}
          <button
            onClick={() => setShowResetModal(true)}
            disabled={verifiedCount === 0}
            style={{
              padding: '0.5rem',
              background: verifiedCount > 0 ? '#f0f0f0' : '#e0e0e0',
              border: '1px solid #ccc',
              borderRadius: '6px',
              cursor: verifiedCount > 0 ? 'pointer' : 'not-allowed',
              fontSize: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: verifiedCount > 0 ? 1 : 0.5
            }}
            title="Resetear verificación de ronda"
          >
            🔄
          </button>
        </div>
        
        <button 
          className="btn btn-primary"
          onClick={handleAddManualEntryClick}
        >
          Entrada Manual
        </button>
      </div>
      
      {checkoutsDueToday.length > 0 && (
        <div style={{
          backgroundColor: '#fff3cd',
          borderBottom: '2px solid #ffc107',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onClick={handleShowCheckoutsDue}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffe69c'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff3cd'}
        >
          <span style={{ fontSize: '1.2rem' }}>⚠️</span>
          <strong style={{ color: '#856404' }}>
            Salidas previstas hoy: {checkoutsDueToday.length}
          </strong>
          <span style={{ 
            fontSize: '0.9rem', 
            color: '#856404',
            marginLeft: '0.5rem'
          }}>
            (Click para ver lista)
          </span>
        </div>
      )}
      
      <div className="card-body">
        {searchQuery && (
          <div style={{ 
            marginBottom: '1rem', 
            padding: '0.5rem', 
            backgroundColor: '#f0f8ff',
            borderRadius: '4px',
            textAlign: 'center',
            fontSize: '0.9rem',
            color: '#555'
          }}>
            {filteredStays.length > 0 ? (
              <>Mostrando <strong>{filteredStays.length}</strong> de {activeStays.length} entradas</>
            ) : (
              <>❌ No se encontraron resultados para "<strong>{searchQuery}</strong>"</>
            )}
          </div>
        )}
        
        {filteredStays.length === 0 && !searchQuery ? (
          <p>No active stays</p>
        ) : filteredStays.length === 0 && searchQuery ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            color: '#999'
          }}>
            <p style={{ fontSize: '2rem', margin: '0 0 0.5rem 0' }}>🔍</p>
            <p>No se encontraron vehículos con la matrícula "<strong>{searchQuery}</strong>"</p>
            <button 
              onClick={() => setSearchQuery('')}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                background: 'var(--primary-color)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Ver todas las entradas
            </button>
          </div>
        ) : (
          <div className="stay-list">
            {filteredStays.map(stay => {
              const nights = calculateNights(stay.check_in_time, stay.check_out_time);
              const isVerified = verifiedStayIds.includes(stay.id);
              
              return (
                <div 
                  key={stay.id} 
                  className="stay-item"
                  style={{
                    opacity: isVerified ? 0.6 : 1,
                    position: 'relative'
                  }}
                >
                  {/* ← NUEVO: Checkbox de verificación */}
                  <div
                    onClick={(e) => handleToggleVerified(stay.id, e)}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      width: '20px',
                      height: '20px',
                      border: '2px solid #4CAF50',
                      borderRadius: '4px',
                      backgroundColor: isVerified ? '#4CAF50' : 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 10,
                      transition: 'all 0.2s'
                    }}
                    title={isVerified ? 'Verificado - Click para desmarcar' : 'Click para verificar'}
                  >
                    {isVerified && (
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>

                  <div className="stay-info">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="license-plate">{stay.vehicle.license_plate}</div>
                      {getPaymentStatusBadge(stay.payment_status)}
                    </div>
                    
                    <div className="vehicle-type">{stay.vehicle.country}</div>
                    
                    <div className="spot-info">
                      {stay.parking_spot ? `${stay.parking_spot.spot_type} - ${stay.parking_spot.spot_number}` : 'No spot assigned'}
                    </div>
                    
                    <div className="check-in-time mb-1">
                      <strong>📅 Entrada:</strong> {formatDateTime(stay.check_in_time)}
                    </div>
                    
                    {stay.check_out_time && (
                      <div className="check-out-time mb-1">
                        <strong>📅 Salida prevista:</strong> {formatDateTime(stay.check_out_time)}
                        {nights && (
                          <span className="text-muted ms-2">
                            ({nights} noche{nights !== 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                    )}
                    
                    {stay.payment_status === 'prepaid' && stay.prepaid_amount && (
                      <div className="prepaid-info mt-2">
                        <small className="text-success">
                          <strong>💰 Pagado adelantado:</strong> {stay.prepaid_amount.toFixed(2)} €
                        </small>
                      </div>
                    )}
                  </div>
                  
                  <div className="stay-actions">
                    <div className="d-grid gap-2">
                      {stay.payment_status === 'pending' && (
                        <>
                          <button 
                            className="btn btn-warning btn-sm"
                            onClick={() => handlePrepaymentClick(stay)}
                          >
                            💳 Pagar por Adelantado
                          </button>
                          
                          <button 
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => handleDeleteClick(stay)}
                            style={{ fontSize: '0.85rem' }}
                          >
                            🗑️ Eliminar
                          </button>
                        </>
                      )}
                      
                      {stay.payment_status === 'prepaid' && (
                        <button 
                          className="btn btn-info btn-sm"
                          onClick={() => handleExtendStayClick(stay)}
                        >
                          ➕ Extender Estancia
                        </button>
                      )}
                      
                      <button 
                        className="btn btn-check-out"
                        onClick={() => handleCheckOutClick(stay)}
                      >
                        🚗 Check-out
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {selectedStay && (
        <>
          <CheckOutModal
            show={showCheckOutModal}
            onHide={() => setShowCheckOutModal(false)}
            stay={selectedStay}
            onSuccess={handleCheckOutSuccess}
          />
          
          <PaymentModal
            show={showPaymentModal}
            onHide={() => setShowPaymentModal(false)}
            stay={selectedStay}
            onSuccess={handlePaymentSuccess}
          />
          
          <ExtendStayModal
            show={showExtendStayModal}
            onHide={() => setShowExtendStayModal(false)}
            stay={selectedStay}
            onSuccess={handleExtendStaySuccess}
          />
        </>
      )}
      
      <ManualEntryModal
        show={showManualEntryModal}
        onHide={() => setShowManualEntryModal(false)}
        onSuccess={handleManualEntrySuccess}
      />

      {/* Modal de salidas previstas hoy */}
      <Modal 
        show={showCheckoutsDueModal} 
        onHide={() => setShowCheckoutsDueModal(false)} 
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>⚠️ Salidas Previstas Hoy</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <strong>{checkoutsDueToday.length}</strong> cliente{checkoutsDueToday.length !== 1 ? 's' : ''} con salida prevista para hoy.
            <br />
            <small>Estos vehículos pagaron por adelantado y tienen checkout programado.</small>
          </Alert>

          {checkoutsDueToday.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <p style={{ fontSize: '2rem' }}>✅</p>
              <p>No hay salidas previstas para hoy</p>
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {checkoutsDueToday.map(stay => (
                <div 
                  key={stay.id}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '1rem',
                    marginBottom: '0.75rem',
                    backgroundColor: '#f8f9fa'
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.5rem'
                  }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem' }}>
                        {stay.vehicle?.license_plate || 'N/A'}
                      </strong>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        {stay.vehicle?.vehicle_type || 'N/A'} - {stay.vehicle?.country || 'N/A'}
                      </div>
                    </div>
                    <span className="badge bg-success">Prepagado</span>
                  </div>

                  <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    <div>
                      <strong>Plaza:</strong> {stay.parking_spot ? `${stay.parking_spot.spot_type} - ${stay.parking_spot.spot_number}` : 'N/A'}
                    </div>
                    <div>
                      <strong>Salida prevista:</strong> {formatTime(stay.check_out_time)}
                    </div>
                    <div>
                      <strong>Pagado:</strong> {stay.prepaid_amount?.toFixed(2) || '0.00'} €
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    style={{ width: '100%' }}
                    onClick={() => handleCheckoutFromDueList(stay)}
                  >
                    🚗 Hacer Check-out
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCheckoutsDueModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal de confirmación para eliminar estancia */}
      <Modal 
        show={showDeleteModal} 
        onHide={() => {
          setShowDeleteModal(false);
          setStayToDelete(null);
          setConfirmLicensePlate('');
          setDeleteError('');
        }}
        centered
      >
        <Modal.Header closeButton style={{ backgroundColor: '#fff3cd', borderBottom: '2px solid #ffc107' }}>
          <Modal.Title>⚠️ ELIMINAR ESTANCIA ACTIVA</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {stayToDelete && (
            <>
              <Alert variant="danger">
                <strong>⚠️ Esta acción NO se puede deshacer</strong>
                <br />
                <small>La estancia será marcada como descartada y la plaza se liberará.</small>
              </Alert>

              <div style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '1rem', 
                borderRadius: '8px',
                marginBottom: '1rem'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Matrícula:</strong> {stayToDelete.vehicle.license_plate}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>País:</strong> {stayToDelete.vehicle.country}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Plaza:</strong> {stayToDelete.parking_spot ? `${stayToDelete.parking_spot.spot_type} - ${stayToDelete.parking_spot.spot_number}` : 'N/A'}
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Entrada:</strong> {formatDateTime(stayToDelete.check_in_time)}
                </div>
                <div>
                  <strong>Estado:</strong> {getPaymentStatusBadge(stayToDelete.payment_status)}
                </div>
              </div>

              <Form.Group>
                <Form.Label>
                  <strong>Para confirmar, escribe la matrícula:</strong>
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder={stayToDelete.vehicle.license_plate}
                  value={confirmLicensePlate}
                  onChange={(e) => {
                    setConfirmLicensePlate(e.target.value);
                    setDeleteError('');
                  }}
                  style={{ 
                    textTransform: 'uppercase',
                    borderColor: deleteError ? '#dc3545' : undefined
                  }}
                />
                {deleteError && (
                  <div style={{ color: '#dc3545', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    {deleteError}
                  </div>
                )}
              </Form.Group>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowDeleteModal(false);
              setStayToDelete(null);
              setConfirmLicensePlate('');
              setDeleteError('');
            }}
          >
            Cancelar
          </Button>
          <Button 
            variant="danger" 
            onClick={handleConfirmDelete}
            disabled={!confirmLicensePlate.trim()}
          >
            🗑️ Eliminar Estancia
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ← NUEVO: Modal de confirmación para resetear verificaciones */}
      <Modal 
        show={showResetModal} 
        onHide={() => setShowResetModal(false)}
        centered
        size="sm"
      >
        <Modal.Header closeButton>
          <Modal.Title>🔄 Resetear Verificación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Deseas resetear todas las verificaciones de ronda?</p>
          <p className="text-muted small mb-0">
            Se desmarcarán todas las caravanas verificadas ({verifiedCount} actualmente).
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowResetModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleResetVerifications}>
            🔄 Resetear
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ActiveCard;