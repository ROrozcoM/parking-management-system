import React from 'react';
import { Modal, Button } from 'react-bootstrap';

function TicketTypeModal({ show, onHide, onSelectType }) {
  const handleSelect = (type) => {
    onSelectType(type);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Seleccionar Tipo de Ticket</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="d-grid gap-3">
          <Button 
            variant="primary" 
            size="lg"
            onClick={() => handleSelect('open_exit')}
          >
            <div className="text-start">
              <strong>📋 Ticket de Salida Abierta</strong>
              <br />
              <small>Para clientes que acaban de entrar (sin cobro)</small>
            </div>
          </Button>

          <Button 
            variant="success" 
            size="lg"
            onClick={() => handleSelect('checkout')}
          >
            <div className="text-start">
              <strong>💰 Ticket de Pago</strong>
              <br />
              <small>Ticket normal de checkout con importe</small>
            </div>
          </Button>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancelar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default TicketTypeModal;