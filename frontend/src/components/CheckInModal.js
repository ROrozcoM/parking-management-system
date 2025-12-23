import React, { useState, useEffect } from 'react';
import { staysAPI } from '../services/api';
import { Modal, Button, Form, Alert } from 'react-bootstrap';

// Diccionario de nacionalidades con motes
const NATIONALITY_INSULTS = {
  "Spain": ["cateto nacional", "español"],
  "France": ["gabacho", "francés"],
  "Germany": ["teutón", "alemán"],
  "Italy": ["tortellini", "italiano"],
  "Portugal": ["luso", "portugués"],
  "United Kingdom": ["guiri", "británico"],
  "Netherlands": ["fuma tulipanes", "holandés"],
  "Belgium": ["del antiguo flandes", "belga"],
  "Switzerland": ["primo de heidi", "suizo"],
  "Austria": ["nazi con lederhosen", "austríaco"],
  "Poland": ["ladrón de coches", "polaco"],
  "Czech Republic": ["checoslovaco que sobró", "checo"],
  "Sweden": ["rubio del IKEA", "sueco"],
  "Norway": ["vikingo", "noruego"],
  "Denmark": ["vikingo Lego", "danés"],
  "Finland": ["vikingo", "finlandés"],
  "Ireland": ["guiri", "irlandés"],
  "Luxembourg": ["banquero enano", "luxemburgués"],
  "Greece": ["heleno estafador de la UE", "griego"],
  "Hungary": ["gitano con goulash", "húngaro"],
  "Romania": ["gitano con goulash", "rumano"],
  "Bulgaria": ["mafioso del este", "búlgaro"],
  "Croatia": ["primo de Luka Modric", "croata"],
  "Slovenia": ["yugoslavo rico", "esloveno"],
  "Slovakia": ["checo de segunda", "eslovaco"],
  "Serbia": ["primo de Djokovic", "serbio"],
  "Lithuania": ["báltico triste", "lituano"],
  "Latvia": ["ruso que no quiere serlo", "letón"],
  "Estonia": ["ruso con WiFi", "estonio"],
  "Malta": ["mafioso mediterráneo", "maltés"],
  "Cyprus": ["chipriota dividido", "chipriota"],
  "Iceland": ["vikingo arruinado", "islandés"],
  "Albania": ["mafioso del Adriático", "albanés"],
  "Bosnia and Herzegovina": ["yugoslavo", "bosnio"],
  "Montenegro": ["yugoslavo", "montenegrino"],
  "North Macedonia": ["yugoslavo", "macedonio"],
  "Moldova": ["rumano que no quiso serlo", "moldavo"],
  "Ukraine": ["primo de zelenski", "ucraniano"],
  "Belarus": ["tractorista ruso", "bielorruso"],
  "Russia": ["volchevike", "ruso"],
  "Turkey": ["kebab", "turco"],
  "Morocco": ["moraco", "marroquí"],
  "Algeria": ["magrebí del desierto", "argelino"],
  "Tunisia": ["moro light", "tunecino"],
  "United States": ["yanqui imperialista", "estadounidense"],
  "Canada": ["primo educado del yanqui", "canadiense"],
  "Mexico": ["pinche mexicano", "mexicano"],
  "Brazil": ["brasuca", "brasileño"],
  "Argentina": ["boludo", "argentino"],
  "Chile": ["paco roba mar", "chileno"],
  "Australia": ["guiri con mullet", "australiano"],
  "New Zealand": ["kiwi ovejero", "neozelandés"],
  "Japan": ["japo", "japonés"],
  "China": ["chinillo", "chino"],
  "South Korea": ["k-pop", "coreano"],
  "India": ["gandhi", "indio"],
  "Israel": ["judío caza palestinos", "israelí"],
  "South Africa": ["bóer", "sudafricano"],
  "Other": ["extranjero de mierda", "otro"],
};

// Función para obtener mote y gentilicio
const getNationalityInsult = (country) => {
  const data = NATIONALITY_INSULTS[country] || NATIONALITY_INSULTS["Other"];
  return {
    mote: data[0],
    gentilicio: data[1]
  };
};

function CheckInModal({ show, onHide, stay, onSuccess }) {
  const [spotType, setSpotType] = useState('A');
  const [isRental, setIsRental] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blacklistInfo, setBlacklistInfo] = useState(null);
  const [checkingBlacklist, setCheckingBlacklist] = useState(false);
  const [sinpaAction, setSinpaAction] = useState('keep'); // 'keep' o 'remove'
  const [customerHistory, setCustomerHistory] = useState(null);
  const [checkingHistory, setCheckingHistory] = useState(false);

  useEffect(() => {
    if (show && stay) {
      checkBlacklist();
      checkCustomerHistory();
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

  const checkCustomerHistory = async () => {
    setCheckingHistory(true);
    try {
      const response = await fetch(`/api/stays/history/${stay.vehicle.license_plate}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.is_returning_customer) {
          setCustomerHistory(data);
        }
      }
    } catch (err) {
      console.error('Error checking customer history:', err);
    } finally {
      setCheckingHistory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Si está en lista negra y no se ha seleccionado ninguna opción, no permitir
    if (blacklistInfo?.is_blacklisted && sinpaAction === 'keep') {
      setError('Debe seleccionar una opción para continuar con el check-in.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const removeSinpa = sinpaAction === 'remove';
      await staysAPI.checkIn(stay.id, spotType, isRental, removeSinpa);
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
    setSinpaAction('keep');
    setBlacklistInfo(null);
    setCustomerHistory(null);
    setIsRental(false);
    onHide();
  };

  if (!stay) return null;

  // Obtener mote y gentilicio del país
  const { mote, gentilicio } = getNationalityInsult(stay.vehicle.country);

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Check-in Pendiente</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* VERIFICANDO LISTA NEGRA E HISTORIAL */}
        {(checkingBlacklist || checkingHistory) && (
          <Alert variant="info">
            <span className="spinner-border spinner-border-sm me-2"></span>
            Verificando información del cliente...
          </Alert>
        )}

        {/* ALERTA DE LISTA NEGRA */}
        {blacklistInfo?.is_blacklisted && (
          <Alert variant="danger" className="mb-4">
            <h5 className="alert-heading">⚠️⚠️⚠️ ALERTA - ESTE HIJOPUTA SE FUE SIN PAGAR! ⚠️⚠️⚠️</h5>
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
            <div className="mb-3">
              <strong>¿Qué deseas hacer con este SINPA?</strong>
            </div>
            
            <Form.Check
              type="radio"
              id="sinpa-keep"
              name="sinpaAction"
              label="✓ Check-in Normal (Mantener SINPA y deuda activa)"
              checked={sinpaAction === 'keep'}
              onChange={() => setSinpaAction('keep')}
              className="mb-2"
            />
            <Form.Text className="d-block text-muted mb-3 ms-4">
              El vehículo entrará pero permanecerá en lista negra. La deuda sigue activa. . Si paga la deuda, eliminar el SINPA de aquel día de forma manual (en History)
            </Form.Text>
            
            <Form.Check
              type="radio"
              id="sinpa-remove"
              name="sinpaAction"
              label="🗑️ Check-in + Eliminar SINPA (Ha vuelto con las orejas gachas)"
              checked={sinpaAction === 'remove'}
              onChange={() => setSinpaAction('remove')}
              className="mb-2 fw-bold"
            />
            <Form.Text className="d-block text-muted ms-4">
              Se eliminará de lista negra y se liberará la deuda. Ha salido y entrado, pero ha vuelto
            </Form.Text>
          </Alert>
        )}

        {/* ALERTA DE CLIENTE HABITUAL */}
        {customerHistory?.is_returning_customer && !blacklistInfo?.is_blacklisted && (
          <Alert variant="success" className="mb-3">
            <h6 className="alert-heading">✨ ¡Este {mote} ({gentilicio}) ya ha estado aquí! ✨</h6>
            <hr />
            <div className="row">
              <div className="col-6 mb-2">
                <strong>Visitas anteriores:</strong> {customerHistory.total_visits}
              </div>
              <div className="col-6 mb-2">
                <strong>Última visita:</strong> {new Date(customerHistory.last_visit_date).toLocaleDateString()}
              </div>
              <div className="col-6 mb-2">
                <strong>Total gastado:</strong> {customerHistory.total_spent.toFixed(2)} €
              </div>
              <div className="col-6 mb-2">
                <strong>Media de estancia:</strong> {customerHistory.avg_nights} noches
              </div>
            </div>
            <hr />
            <small className="text-muted">💡 <strong>Sugerencia:</strong> Considera ofrecer descuento por fidelidad o agradecer su preferencia</small>
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
          <div className="mb-2">
            <strong>Country:</strong>{' '}
            <span style={{ color: 'var(--secondary-color)' }}>
              {stay.vehicle.country}
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
            <Form.Label style={{ fontWeight: 600 }}>Seleccionar tipo de plaza</Form.Label>
            <Form.Select 
              value={spotType} 
              onChange={(e) => setSpotType(e.target.value)}
              disabled={loading || checkingBlacklist || checkingHistory}
              size="lg"
              style={{ 
                borderColor: 'var(--border-color)',
                borderWidth: '2px'
              }}
            >
              <option value="A">🅰️ Tipo A - Standard</option>
              <option value="B">🅱️ Tipo B - Compact</option>
              <option value="CB">🅱️©️ Tipo CB - Flexible</option>
              <option value="C">©️ Tipo C - Large</option>
              <option value="CPLUS">©️+ Tipo C+ - Premium Large</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check 
              type="checkbox"
              id="is-rental-checkin"
              label="🚗 Vehículo de alquiler"
              checked={isRental}
              onChange={(e) => setIsRental(e.target.checked)}
              disabled={loading || checkingBlacklist || checkingHistory}
            />
            <Form.Text className="text-muted">
              Marcar si el vehículo es de una empresa de alquiler
            </Form.Text>
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
              disabled={loading || checkingBlacklist || checkingHistory}
              style={{ minWidth: '120px' }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Processing...
                </>
              ) : (
                <>✓ Check-in {sinpaAction === 'remove' && '+ Eliminar SINPA'}</>
              )}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
}

export default CheckInModal;