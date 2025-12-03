import React, { useState } from 'react';
import { staysAPI } from '../services/api';
import { Modal, Button, Form, Alert } from 'react-bootstrap';

// Diccionario de nacionalidades con motes (igual que antes, lo omito por brevedad)
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
  // ... resto del diccionario
};

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
  const [isRental, setIsRental] = useState(false);
  
  // ← NUEVO: Estado para check_in_time
  const [checkInTime, setCheckInTime] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blacklistInfo, setBlacklistInfo] = useState(null);
  const [checkingBlacklist, setCheckingBlacklist] = useState(false);
  const [forceCheckIn, setForceCheckIn] = useState(false);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [checkingHistory, setCheckingHistory] = useState(false);

  // ← NUEVO: Función para obtener fecha/hora actual en formato local
  const getCurrentDateTime = () => {
    const now = new Date();
    // Formato: YYYY-MM-DDTHH:MM
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // ← NUEVO: Inicializar checkInTime al abrir modal
  React.useEffect(() => {
    if (show) {
      setCheckInTime(getCurrentDateTime());
    }
  }, [show]);

  // Lista completa de países (omitida por brevedad)
  const countries = [
    'Spain', 'France', 'Germany', 'Italy', 'Portugal', 'United Kingdom', 
  'Netherlands', 'Belgium', 'Switzerland', 'Austria', 'Poland', 
  'Czech Republic', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Ireland',
  'Luxembourg', 'Greece', 'Hungary', 'Romania', 'Bulgaria', 'Croatia',
  'Slovenia', 'Slovakia', 'Serbia', 'Lithuania', 'Latvia', 'Estonia',
  'Malta', 'Cyprus', 'Iceland', 'Albania', 'Bosnia and Herzegovina',
  'Montenegro', 'North Macedonia', 'Moldova', 'Ukraine', 'Belarus',
  'Russia', 'Turkey', 'Morocco', 'Algeria', 'Tunisia', 'United States',
  'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile', 'Australia',
  'New Zealand', 'Japan', 'China', 'South Korea', 'India', 'Israel',
  'South Africa', 'Other'
  ];

  const handleLicensePlateChange = async (value) => {
    setLicensePlate(value);
    setBlacklistInfo(null);
    setCustomerHistory(null);
    setForceCheckIn(false);
    
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
    
    if (blacklistInfo?.is_blacklisted && !forceCheckIn) {
      setError('Este vehículo está en lista negra. Debe confirmar para continuar.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // Convertir checkInTime a formato ISO para el backend
      const checkInTimeISO = checkInTime ? new Date(checkInTime).toISOString() : null;
      
      // ← MODIFICADO: Pasar checkInTime
      await staysAPI.createManualEntry(
        licensePlate, 
        vehicleType, 
        spotType, 
        country, 
        isRental,
        checkInTimeISO  // ← AÑADIR
      );
      onSuccess();
      
      // Reset form
      setLicensePlate('');
      setCountry('Spain');
      setVehicleType('Caravan');
      setSpotType('A');
      setIsRental(false);
      setCheckInTime(getCurrentDateTime());  // ← RESET a hora actual
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
    setIsRental(false);
    setCheckInTime('');
    setBlacklistInfo(null);
    setCustomerHistory(null);
    setForceCheckIn(false);
    setError(null);
    onHide();
  };

  const countryToUse = customerHistory?.country || country;
  const { mote, gentilicio } = getNationalityInsult(countryToUse);

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Add Manual Entry</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Alertas de verificación (igual que antes) */}
        {(checkingBlacklist || checkingHistory) && (
          <Alert variant="info">
            <span className="spinner-border spinner-border-sm me-2"></span>
            Verificando información del cliente...
          </Alert>
        )}

        {/* Alerta lista negra (igual que antes) */}
        {blacklistInfo?.is_blacklisted && (
          <Alert variant="danger" className="mb-4">
            {/* ... contenido igual ... */}
          </Alert>
        )}

        {/* Alerta cliente habitual (igual que antes) */}
        {customerHistory?.is_returning_customer && !blacklistInfo?.is_blacklisted && (
          <Alert variant="success" className="mb-3">
            {/* ... contenido igual ... */}
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

          {/* ← NUEVO: Campo de fecha/hora de entrada */}
          <Form.Group className="mb-3">
            <Form.Label>📅 Fecha y hora de entrada</Form.Label>
            <Form.Control 
              type="datetime-local"
              value={checkInTime}
              onChange={(e) => setCheckInTime(e.target.value)}
              disabled={loading}
              required
            />
            <Form.Text className="text-muted">
              Por defecto: ahora. Editar si la cámara estuvo rota.
            </Form.Text>
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