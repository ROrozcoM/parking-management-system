import React, { useState } from 'react';
import { staysAPI } from '../services/api';
import { Modal, Button, Form } from 'react-bootstrap';

function DiscardModal({ show, onHide, stay, onSuccess }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      await staysAPI.discard(stay.id, reason);
      onSuccess();
    } catch (err) {
      setError('Failed to discard stay');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Discard Stay</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          <strong>License Plate:</strong> {stay.vehicle.license_plate}
        </p>
        <p>
          <strong>Vehicle Type:</strong> {stay.vehicle.vehicle_type}
        </p>
        <p>
          <strong>Detection Time:</strong> {new Date(stay.detection_time).toLocaleString()}
        </p>
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Reason for Discard</Form.Label>
            <Form.Select 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              disabled={loading}
              required
            >
              <option value="">Select a reason</option>
              <option value="False detection">False detection</option>
              <option value="Unauthorized vehicle">Unauthorized vehicle</option>
              <option value="Sedan">Sedan (will blacklist vehicle)</option>
              <option value="Other">Other</option>
            </Form.Select>
          </Form.Group>
          
          {error && <div className="alert alert-danger">{error}</div>}
          
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={onHide} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" disabled={loading}>
              {loading ? 'Processing...' : 'Discard'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default DiscardModal;