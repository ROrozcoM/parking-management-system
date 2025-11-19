import React, { useState, useEffect } from 'react';
import { staysAPI } from '../services/api';
import { Modal, Button, Form, Alert } from 'react-bootstrap';

function CheckInModal({ show, onHide, stay, onSuccess }) {
  const [spotType, setSpotType] = useState('A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blacklistInfo, setBlacklistInfo] = useState(null);
  const [checkingBlacklist, setCheckingBlacklist] = useState(false);
  const [forceCheckIn, setForceCheckIn] = useState(false);

  useEffect(() => {
    if (show && stay) {
      checkBlacklist();
    }
  }, [show, stay]);

  const checkBlacklist = async () => {
    setCheckingBlacklist(true);
    try {
      const response = await fetch(`/api/blacklist/check/${stay.vehicle.license_plate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBlacklistInfo(data);
      }
    } catch (err) {
      console.error('Error checking blacklist:', err);
    } finally {
      setCheckingBlacklist(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Si está en lista negra y no se ha forzado, no permitir
    if (blacklistInfo?.is_blacklisted && !forceCheckIn) {
      setError('Este vehículo está en lista negra. Debe confirmar para continuar.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await staysAPI.checkIn(stay.id, spotType);
      onSuccess();
      handleClose();
    } catch (err) {
      setError('Failed to check in stay');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForceCheckIn(false);
    setBlacklistInfo(null);
    onHide();
  };

  if (!stay) return null;

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>🚗 Check-in Vehicle</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* ALERTA DE LISTA NEGRA */}
        {checkingBlacklist && (
          <Alert variant="info">
            <span className="spinner-border spinner-border-sm me-2"></span>
            Verificando lista negra...
          </Alert>
        )}

        {blacklistInfo?.is_blacklisted && (
          <Alert variant="danger" className="mb-4">
            <h5 className="alert-heading">⚠️⚠️⚠️ ALERTA - CLIENTE MOROSO ⚠️⚠️⚠️</h5>
            <hr />
            <div className="mb-2">
              <strong>Matrícula:</strong> <span className="text-danger fs-5">{stay.vehicle.license_plate}</span>
            </div>
            <div className="mb-2">
              <strong>Deuda total pendiente:</strong> <span className="text-danger fs-4">{blacklistInfo.total_debt.toFixed(2)} €</span>
            </div>
            <div className="mb-3">
              <strong>Incidentes registrados:</strong> {blacklistInfo.entries.length}
            </div>
            
            {blacklistInfo.entries.map((entry, index) => (
              <div key={entry.id} className="mb-2 p-2 bg-light rounded">
                <small>
                  <strong>Incidente {index + 1}:</strong> {new Date(entry.incident_date).toLocaleDateString()} - {entry.amount_owed.toFixed(2)} €
                  {entry.notes && <><br /><em>{entry.notes}</em></>}
                </small>
              </div>
            ))}

            <hr />
            <Form.Check 
              type="checkbox"
              id="force-checkin"
              label="He verificado la situación y deseo permitir el check-in de todos modos"
              checked={forceCheckIn}
              onChange={(e) => setForceCheckIn(e.target.checked)}
              className="fw-bold"
            />
          </Alert>
        )}

        {/* Información del vehículo */}
        <div className="mb-3" style={{ 
          padding: '1rem', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '8px',
          borderLeft: '4px solid var(--primary-color)'
        }}>
          <div className="mb-2">
            <strong>License Plate:</strong>{' '}
            <span className="license-plate" style={{ fontSize: '1.125rem' }}>
              {stay.vehicle.license_plate}
            </span>
          </div>
          <div>
            <strong>Vehicle Type:</strong>{' '}
            <span style={{ color: 'var(--secondary-color)' }}>
              {stay.vehicle.vehicle_type}
            </span>
          </div>
        </div>
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label style={{ fontWeight: 600 }}>Select Parking Spot Type</Form.Label>
            <Form.Select 
              value={spotType} 
              onChange={(e) => setSpotType(e.target.value)}
              disabled={loading || checkingBlacklist}
              size="lg"
              style={{ 
                borderColor: 'var(--border-color)',
                borderWidth: '2px'
              }}
            >
              <option value="A">🅰️ Type A - Standard</option>
              <option value="B">🅱️ Type B - Compact</option>
              <option value="C">©️ Type C - Large</option>
              <option value="Special">⭐ Special - Reserved</option>
            </Form.Select>
          </Form.Group>
          
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          
          <div className="d-flex justify-content-end gap-2">
            <Button 
              variant="secondary" 
              onClick={handleClose} 
              disabled={loading}
              style={{ minWidth: '100px' }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="btn-check-in"
              disabled={loading || checkingBlacklist || (blacklistInfo?.is_blacklisted && !forceCheckIn)}
              style={{ minWidth: '120px' }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Processing...
                </>
              ) : (
                <>✓ Check-in</>
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default CheckInModal;