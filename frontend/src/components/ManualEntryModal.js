import React, { useState } from 'react';
import { staysAPI } from '../services/api';
import { Modal, Button, Form, Alert } from 'react-bootstrap';

function ManualEntryModal({ show, onHide, onSuccess }) {
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleType, setVehicleType] = useState('Caravan');
  const [spotType, setSpotType] = useState('A');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blacklistInfo, setBlacklistInfo] = useState(null);
  const [checkingBlacklist, setCheckingBlacklist] = useState(false);
  const [forceCheckIn, setForceCheckIn] = useState(false);

  const handleLicensePlateChange = async (value) => {
    setLicensePlate(value);
    setBlacklistInfo(null);
    setForceCheckIn(false);
    
    // Si tiene al menos 4 caracteres, verificar lista negra
    if (value.length >= 4) {
      checkBlacklist(value);
    }
  };

  const checkBlacklist = async (plate) => {
    setCheckingBlacklist(true);
    try {
      const response = await fetch(`/api/blacklist/check/${plate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.is_blacklisted) {
          setBlacklistInfo(data);
        }
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
      
      await staysAPI.createManualEntry(licensePlate, vehicleType, spotType);
      onSuccess();
      
      // Reset form
      setLicensePlate('');
      setVehicleType('Caravan');
      setSpotType('A');
      setBlacklistInfo(null);
      setForceCheckIn(false);
    } catch (err) {
      setError('Failed to create manual entry');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setLicensePlate('');
    setVehicleType('Caravan');
    setSpotType('A');
    setBlacklistInfo(null);
    setForceCheckIn(false);
    setError(null);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Add Manual Entry</Modal.Title>
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
              <strong>Matrícula:</strong> <span className="text-danger fs-5">{licensePlate}</span>
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
              id="force-manual-checkin"
              label="He verificado la situación y deseo permitir el check-in de todos modos"
              checked={forceCheckIn}
              onChange={(e) => setForceCheckIn(e.target.checked)}
              className="fw-bold"
            />
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>License Plate</Form.Label>
            <Form.Control 
              type="text" 
              value={licensePlate} 
              onChange={(e) => handleLicensePlateChange(e.target.value.toUpperCase())}
              disabled={loading}
              required
              placeholder="Ej: ABC1234"
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Vehicle Type</Form.Label>
            <Form.Select 
              value={vehicleType} 
              onChange={(e) => setVehicleType(e.target.value)}
              disabled={loading}
            >
              <option value="Caravan">Caravan</option>
              <option value="Motorhome">Motorhome</option>
              <option value="Camper">Camper</option>
              <option value="Other">Other</option>
            </Form.Select>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Spot Type</Form.Label>
            <Form.Select 
              value={spotType} 
              onChange={(e) => setSpotType(e.target.value)}
              disabled={loading}
            >
              <option value="A">Type A</option>
              <option value="B">Type B</option>
              <option value="C">Type C</option>
              <option value="Special">Special</option>
            </Form.Select>
          </Form.Group>
          
          {error && <div className="alert alert-danger">{error}</div>}
          
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={loading || checkingBlacklist || (blacklistInfo?.is_blacklisted && !forceCheckIn)}
            >
              {loading ? 'Creating...' : 'Create Entry'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default ManualEntryModal;