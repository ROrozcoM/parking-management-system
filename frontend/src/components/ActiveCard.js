import React, { useState, useEffect } from 'react';
import { staysAPI } from '../services/api';
import CheckOutModal from './CheckOutModal';
import PaymentModal from './PaymentModal';
import ManualEntryModal from './ManualEntryModal';

function ActiveCard({ refreshData }) {
  const [activeStays, setActiveStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStay, setSelectedStay] = useState(null);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);

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
            {activeStays.map(stay => (
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
                  <div className="check-in-time">
                    <strong>Entrada:</strong> {new Date(stay.check_in_time).toLocaleString()}
                  </div>
                  {stay.payment_status === 'prepaid' && stay.prepaid_amount && (
                    <div className="prepaid-info">
                      <small className="text-success">
                        <strong>Pagado adelantado:</strong> {stay.prepaid_amount.toFixed(2)} €
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
                    <button 
                      className="btn btn-check-out"
                      onClick={() => handleCheckOutClick(stay)}
                    >
                      🚗 Check-out
                    </button>
                  </div>
                </div>
              </div>
            ))}
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