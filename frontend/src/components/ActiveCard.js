import React, { useState, useEffect } from 'react';
import { staysAPI } from '../services/api';
import CheckOutModal from './CheckOutModal';
import PaymentModal from './PaymentModal';
import ManualEntryModal from './ManualEntryModal';
import ExtendStayModal from './ExtendStayModal';

function ActiveCard({ refreshData }) {
  const [activeStays, setActiveStays] = useState([]);
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
        <button 
          className="btn btn-primary"
          onClick={handleAddManualEntryClick}
        >
          Entrada Manual
        </button>
      </div>
      <div className="card-body">
        {activeStays.length === 0 ? (
          <p>No active stays</p>
        ) : (
          <div className="stay-list">
            {activeStays.map(stay => {
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
                    
                    {/* NUEVO: Mostrar fecha de salida prevista */}
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