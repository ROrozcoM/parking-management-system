import React, { useState, useEffect } from 'react';
import { staysAPI } from '../services/api';
import { Modal, Button, Form, Alert } from 'react-bootstrap';

// Diccionario de nacionalidades con motes
const NATIONALITY_INSULTS = {
  "Spain": ["cateto nacional", "español"], // españolazo, cateto, polla con bandera, señorito del sur, torero moroso
  "France": ["gabacho", "francés"], // franchute, rana, queso apestoso, parisino pijo, rendido de mierda
  "Germany": ["teutón", "alemán"], // kraut, nazi, fritz, comedor de salchicha, cuadrado sin alma
  "Italy": ["tortellini", "italiano"], // macarrón, mafioso, spaghetti, mamma mia, gesticulador, pizza con piña
  "Portugal": ["luso", "portugués"], // portu, manolo, bacalao, luso pobre, primo atrasado
  "United Kingdom": ["guiri", "británico"], // inglés de mierda, rosbif, limey, té a las 5, colonizador calvo
  "Netherlands": ["fuma tulipanes", "holandés"], // coffee-shop, zuequero, tulipán marihuana, putero de Ámsterdam
  "Belgium": ["del antiguo flandes", "belga"], // gofre gordo, país que no existe, traidor de Flandes, pederasta real
  "Switzerland": ["primo de heidi", "suizo"], // evasor fiscal, relojero neutral, nazi con chocolate, cuchillo multiusos
  "Austria": ["nazi con lederhosen", "austríaco"], // Hitler con yodel, tirolés nazi, primo rico del boche
  "Poland": ["ladrón de coches", "polaco"], // robarruedas, fontanero 24h, polaco ladrón, Auschwitz tour
  "Czech Republic": ["checoslovaco que sobró", "checo"], // cerveza barata, prostituta de Praga, checoslovaco que sobró
  "Sweden": ["rubio del IKEA", "sueco"], // progre aburrido, vikingo vegano, rubia fría, socialismo de muebles
  "Norway": ["vikingo", "noruego"], // vikingo rico, salmonero, fondo soberano, esquí caro
  "Denmark": ["vikingo Lego", "danés"], // rubio feliz, hygge pagado por todos, porno vikingo
  "Finland": ["vikingo", "finlandés"], // sisu alcohólico, alce depresivo, metalero suicida
  "Ireland": ["guiri", "irlandés"], // patata alcohólica, católico borracho, duende verde, IRA de bar
  "Luxembourg": ["banquero enano", "luxemburgués"], // paraíso fiscal liliputiense, país de mentira, rico por metro cuadrado
  "Greece": ["heleno estafador de la UE", "griego"], // estafador de la UE, souvlaki deuda, heleno moroso
  "Hungary": ["gitano con goulash", "húngaro"], // gitano con goulash, Orbán lover, paprika nazi
  "Romania": ["gitano con goulash", "rumano"], // drácula ladrón, rey de los gitanos, Timisoara express
  "Bulgaria": ["mafioso del este", "búlgaro"], // yogur luchador, mafia del este, primo pobre del gitano
  "Croatia": ["primo de Luka Modric", "croata"], // nazi de playa, balcánico con WiFi, Dalmata genocida
  "Slovenia": ["yugoslavo rico", "esloveno"], // yugoslavo rico, país que nadie ubica, primo pijo de los balcanes
  "Slovakia": ["checo de segunda", "eslovaco"], // checo de segunda, gitano con montañas, país que sobra
  "Serbia": ["primo de Djokovic", "serbio"], // genocida de los Balcanes, borracho con rakia, Djokovic loco
  "Lithuania": ["báltico triste", "lituano"], // primo pobre del vikingo, católico ortodoxo, patata con frío
  "Latvia": ["ruso que no quiere serlo", "letón"], // ruso que no quiere serlo, báltico sin playa
  "Estonia": ["ruso con WiFi", "estonio"], // ruso con WiFi, báltico nórdico, nerd del frío
  "Malta": ["mafioso mediterráneo", "maltés"], // casino flotante, caballero con sobrepeso, mafia mediterránea
  "Cyprus": ["chipriota dividido", "chipriota"], // turco-griego peleado, paraíso fiscal con playa
  "Iceland": ["vikingo arruinado", "islandés"], // volcán con deuda, elfo quebrado, Björk loca
  "Albania": ["mafioso del Adriático", "albanés"], // mafia del Adriático, búnker lover, primo del gitano
  "Bosnia and Herzegovina": ["yugoslavo", "bosnio"], // Srebrenica express, balcánico complicado, musulmán con rakia
  "Montenegro": ["yugoslavo", "montenegrino"], // serbio con playa, ruso con yate
  "North Macedonia": ["yugoslavo", "macedonio"], // griego robado, yugoslavo renombrado, Alexander el impostor
  "Moldova": ["rumano que no quiso serlo", "moldavo"], // rumano que no quiso serlo, país más pobre de Europa
  "Ukraine": ["primo de zelenski", "ucraniano"], // banderista, nazi del girasol, borscht con esvástica
  "Belarus": ["tractorista ruso", "bielorruso"], // último dictador de Europa, tractorista ruso
  "Russia": ["volchevike", "ruso"], // iván borracho, putiniano, vodka con radiación, oso polar alcohólico
  "Turkey": ["kebab", "turco"], // genocida armenio, sultán de pacotilla, kebabero removido
  "Morocco": ["moraco", "marroquí"], // moraco, patera, hachís con alfombra, primo que cruza
  "Algeria": ["magrebí del desierto", "argelino"], // pirata del desierto, magrebí cortador de cabezas
  "Tunisia": ["moro light", "tunecino"], // moro light, terrorista de playa, yihadista con resort
  "United States": ["yanqui imperialista", "estadounidense"], // yanqui imperialista, gordo de McDonald's, cowboy retrasado
  "Canada": ["primo educado del yanqui", "canadiense"], // sorry-man, maple pijo, policía montada marica
  "Mexico": ["pinche mexicano", "mexicano"], // naco, frijolero, narco chaparro, tequila con gusano
  "Brazil": ["brasuca", "brasileño"], // macaco, favelado, samba con cuchillo
  "Argentina": ["boludo", "argentino"], // che arrogante, descendiente de barco, asado inflacionario
  "Chile": ["paco roba mar", "chileno"], // paco ladrón de océano, terremoto con vino caja
  "Australia": ["guiri con mullet", "australiano"], // convicto descendiente, koala borracho, canguro boxeador
  "New Zealand": ["kiwi ovejero", "neozelandés"], // pastor de ovejas neozelandés, hobbit follador, maorí tatuado
  "Japan": ["japo", "japonés"], // nipón kamikaze, ojos rasgados, tentáculo lover
  "China": ["chinillo", "chino"], // virus de Wuhan, copia barata, todo a un euro
  "South Korea": ["k-pop", "coreano"], // plástico operado, kimchi norcoreano light, Samsung esclavo
  "India": ["gandhi", "indio"], // callcenter cagón, vaca sagrada en la calle, tech support estafador
  "Israel": ["judío caza palestinos", "israelí"], // sionista usurero, nariz grande, lobby mundial
  "South Africa": ["bóer", "sudafricano"], // apartheid blanco, racista con braai, mandela blanco
  "Other": ["extranjero de mierda", "otro"], // guiri genérico, inmigrante random, persona de fuera
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [blacklistInfo, setBlacklistInfo] = useState(null);
  const [checkingBlacklist, setCheckingBlacklist] = useState(false);
  const [forceCheckIn, setForceCheckIn] = useState(false);
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
    setCustomerHistory(null);
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
              <option value="C">©️ Tipo C - Large</option>
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
              disabled={loading || checkingBlacklist || checkingHistory || (blacklistInfo?.is_blacklisted && !forceCheckIn)}
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