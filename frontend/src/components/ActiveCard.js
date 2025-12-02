import React, { useState, useEffect } from 'react';
import { staysAPI } from '../services/api';
import CheckOutModal from './CheckOutModal';
import PaymentModal from './PaymentModal';
import ManualEntryModal from './ManualEntryModal';
import ExtendStayModal from './ExtendStayModal';

function ActiveCard({ refreshData }) {
  const [activeStays, setActiveStays] = useState([]);
  const [filteredStays, setFilteredStays] = useState([]);  // ← NUEVO
  const [searchQuery, setSearchQuery] = useState('');  // ← NUEVO
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStay, setSelectedStay] = useState(null);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  const [showExtendStayModal, setShowExtendStayModal] = useState(false);

  useEffect(() => {
    fetchActiveStays();
  }, []);

  // ← NUEVO: Filtrar stays cuando cambia la búsqueda
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredStays(activeStays);
    } else {
      const filtered = activeStays.filter(stay =>
        stay.vehicle.license_plate.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStays(filtered);
    }
  }, [searchQuery, activeStays]);

  const fetchActiveStays = async () => {
    try {
      setLoading(true);
      const data = await staysAPI.getActiveStays();
      setActiveStays(data);
      setFilteredStays(data);  // ← NUEVO
      setError(null);
    } catch (err) {
      setError('Failed to fetch active stays');
      console.error(err);
    } finally {
      setLoading(false);
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

  const handleCheckOutSuccess = () => {
    setShowCheckOutModal(false);
    setSelectedStay(null);
    fetchActiveStays();
    if (refreshData) refreshData();
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedStay(null);
    fetchActiveStays();
    if (refreshData) refreshData();
  };

  const handleExtendStaySuccess = () => {
    setShowExtendStayModal(false);
    setSelectedStay(null);
    fetchActiveStays();
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

  const calculateNights = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return null;
    const diffMs = new Date(checkOut) - new Date(checkIn);
    const days = diffMs / (1000 * 60 * 60 * 24);
    return Math.ceil(days);
  };

  if (loading) return <div className="loading">Loading active stays...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="card">
      <div className="card-header">
        <h2>Entradas Activas</h2>
        
        {/* ← NUEVO: BUSCADOR */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '1rem',
          flex: 1,
          justifyContent: 'center',
          maxWidth: '400px',
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
        </div>
        
        <button 
          className="btn btn-primary"
          onClick={handleAddManualEntryClick}
        >
          Entrada Manual
        </button>
      </div>
      
      <div className="card-body">
        {/* ← NUEVO: Mostrar contador */}
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
              
              return (
                <div key={stay.id} className="stay-item">
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
                    
                    {/* Mostrar fecha de salida prevista */}
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
                        <button 
                          className="btn btn-warning btn-sm"
                          onClick={() => handlePrepaymentClick(stay)}
                        >
                          💳 Pagar por Adelantado
                        </button>
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
    </div>
  );
}

export default ActiveCard;