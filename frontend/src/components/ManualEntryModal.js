import React, { useState } from 'react';
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

function ManualEntryModal({ show, onHide, onSuccess }) {
  const [licensePlate, setLicensePlate] = useState('');
  const [country, setCountry] = useState('Spain');
  const [vehicleType, setVehicleType] = useState('Caravan');
  const [spotType, setSpotType] = useState('A');
  const [isRental, setIsRental] = useState(false);  // ← NUEVO ESTADO
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blacklistInfo, setBlacklistInfo] = useState(null);
  const [checkingBlacklist, setCheckingBlacklist] = useState(false);
  const [forceCheckIn, setForceCheckIn] = useState(false);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [checkingHistory, setCheckingHistory] = useState(false);

  // Lista completa de países
  const countries = [
    'Spain', 'France', 'Germany', 'Italy', 'Portugal', 'United Kingdom',
    'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Poland', 'Czech Republic',
    'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland', 'Luxembourg',
    'Greece', 'Hungary', 'Romania', 'Bulgaria', 'Croatia', 'Slovenia',
    'Slovakia', 'Serbia', 'Lithuania', 'Latvia', 'Estonia', 'Malta',
    'Cyprus', 'Iceland', 'Albania', 'Bosnia and Herzegovina', 'Montenegro',
    'North Macedonia', 'Moldova', 'Ukraine', 'Belarus', 'Russia', 'Turkey',
    'Morocco', 'Algeria', 'Tunisia', 'United States', 'Canada', 'Mexico',
    'Brazil', 'Argentina', 'Chile', 'Australia', 'New Zealand', 'Japan',
    'China', 'South Korea', 'India', 'Israel', 'South Africa', 'Other'
  ];

  const handleLicensePlateChange = async (value) => {
    setLicensePlate(value);
    setBlacklistInfo(null);
    setCustomerHistory(null);
    setForceCheckIn(false);
    
    // Si tiene al menos 4 caracteres, verificar lista negra e historial
    if (value.length >= 4) {
      checkBlacklist(value);
      checkCustomerHistory(value);
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

  const checkCustomerHistory = async (plate) => {
    setCheckingHistory(true);
    try {
      const response = await fetch(`/api/stays/history/${plate}`, {
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
    
    // Si está en lista negra y no se ha forzado, no permitir
    if (blacklistInfo?.is_blacklisted && !forceCheckIn) {
      setError('Este vehículo está en lista negra. Debe confirmar para continuar.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      await staysAPI.createManualEntry(licensePlate, vehicleType, spotType, country, isRental);  // ← PASAR isRental
      onSuccess();
      
      // Reset form
      setLicensePlate('');
      setCountry('Spain');
      setVehicleType('Caravan');
      setSpotType('A');
      setIsRental(false);  // ← RESET
      setBlacklistInfo(null);
      setCustomerHistory(null);
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
    setCountry('Spain');
    setVehicleType('Caravan');
    setSpotType('A');
    setIsRental(false);  // ← RESET
    setBlacklistInfo(null);
    setCustomerHistory(null);
    setForceCheckIn(false);
    setError(null);
    onHide();
  };

  // Obtener mote y gentilicio - priorizar historial, sino usar dropdown
  const countryToUse = customerHistory?.country || country;
  const { mote, gentilicio } = getNationalityInsult(countryToUse);

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Add Manual Entry</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* VERIFICANDO INFORMACIÓN */}
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
            <Form.Label>Country</Form.Label>
            <Form.Select 
              value={country} 
              onChange={(e) => setCountry(e.target.value)}
              disabled={loading}
            >
              {countries.map(countryName => (
                <option key={countryName} value={countryName}>
                  {countryName}
                </option>
              ))}
            </Form.Select>
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

          {/* NUEVO: CHECKBOX DE ALQUILER */}
          <Form.Group className="mb-3">
            <Form.Check 
              type="checkbox"
              id="is-rental-manual"
              label="🚗 Vehículo de alquiler"
              checked={isRental}
              onChange={(e) => setIsRental(e.target.checked)}
              disabled={loading}
            />
            <Form.Text className="text-muted">
              Marcar si el vehículo es de una empresa de alquiler
            </Form.Text>
          </Form.Group>
          
          {error && <div className="alert alert-danger">{error}</div>}
          
          <div className="d-flex justify-content-end gap-2">
            <Button variant="secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              disabled={loading || checkingBlacklist || checkingHistory || (blacklistInfo?.is_blacklisted && !forceCheckIn)}
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