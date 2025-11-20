import React, { useState, useEffect } from 'react';
import { staysAPI } from '../services/api';
import CheckInModal from './CheckInModal';
import DiscardModal from './DiscardModal';

function PendingCard({ refreshData }) {
  const [pendingStays, setPendingStays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStay, setSelectedStay] = useState(null);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  useEffect(() => {
    fetchPendingStays();
  }, []);

  const fetchPendingStays = async () => {
    try {
      setLoading(true);
      const data = await staysAPI.getPendingStays();
      setPendingStays(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch pending stays');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckInClick = (stay) => {
    setSelectedStay(stay);
    setShowCheckInModal(true);
  };

  const handleDiscardClick = (stay) => {
    setSelectedStay(stay);
    setShowDiscardModal(true);
  };

  const handleCheckInSuccess = () => {
    setShowCheckInModal(false);
    setSelectedStay(null);
    fetchPendingStays();
    if (refreshData) refreshData();
  };

  const handleDiscardSuccess = () => {
    setShowDiscardModal(false);
    setSelectedStay(null);
    fetchPendingStays();
    if (refreshData) refreshData();
  };

  if (loading) return <div className="loading">Loading pending stays...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="card">
      <div className="card-header">
        <h2>Entradas Pendientes</h2>
        <button 
          className="btn btn-refresh"
          onClick={fetchPendingStays}
          title="Actualizar pendientes"
        >
          🔄 Actualizar
        </button>
      </div>
      <div className="card-body">
        {pendingStays.length === 0 ? (
          <p>No hay entradas pendientes</p>
        ) : (
          <div className="stay-list">
            {pendingStays.map(stay => (
              <div key={stay.id} className="stay-item">
                <div className="stay-info">
                  <div className="license-plate">{stay.vehicle.license_plate}</div>
                  <div className="vehicle-type">{stay.vehicle.country}</div>
                  <div className="detection-time">
                    {new Date(stay.detection_time).toLocaleString()}
                  </div>
                </div>
                <div className="stay-actions">
                  <button 
                    className="btn btn-check-in"
                    onClick={() => handleCheckInClick(stay)}
                  >
                    Check-in
                  </button>
                  <button 
                    className="btn btn-discard"
                    onClick={() => handleDiscardClick(stay)}
                  >
                    Descartar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {selectedStay && (
        <>
          <CheckInModal
            show={showCheckInModal}
            onHide={() => setShowCheckInModal(false)}
            stay={selectedStay}
            onSuccess={handleCheckInSuccess}
          />
          <DiscardModal
            show={showDiscardModal}
            onHide={() => setShowDiscardModal(false)}
            stay={selectedStay}
            onSuccess={handleDiscardSuccess}
          />
        </>
      )}
    </div>
  );
}

export default PendingCard;