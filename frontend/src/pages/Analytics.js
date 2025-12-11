import React, { useState, useEffect } from 'react';
import { Alert, Spinner, Card, Row, Col, ButtonGroup, Button, Table, Nav } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState(30); // días
  const [activePaymentTab, setActivePaymentTab] = useState('transfer'); // transfer o card
  const navigate = useNavigate();

  // Estados para cada tipo de datos
  const [overview, setOverview] = useState(null);
  const [revenueTimeline, setRevenueTimeline] = useState([]);
  const [nightsTimeline, setNightsTimeline] = useState([]);
  const [totalNights, setTotalNights] = useState(null);
  const [countryDistribution, setCountryDistribution] = useState([]);
  const [rentalTotals, setRentalTotals] = useState(null);
  const [peakHours, setPeakHours] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);  // ← Para Pie Chart original
  const [paymentMethodsDetailed, setPaymentMethodsDetailed] = useState(null);  // ← NUEVO
  const [stayDuration, setStayDuration] = useState([]);
  const [stayLengthDistribution, setStayLengthDistribution] = useState([]);
  const [weekdayDistribution, setWeekdayDistribution] = useState([]);
  const [rentalVsOwned, setRentalVsOwned] = useState(null);

  useEffect(() => {
    loadAllData();
  }, [timeRange]);

  const fetchWithAuth = async (url) => {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.status === 403) {
      setError('No tienes permisos para acceder a esta página');
      setTimeout(() => navigate('/'), 2000);
      throw new Error('Forbidden');
    }

    if (!response.ok) {
      throw new Error('Error al cargar datos');
    }

    return response.json();
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Cargar todos los datos en paralelo
      const [
        overviewData,
        revenueData,
        nightsTimelineData,
        totalNightsData,
        countryData,
        peakHoursData,
        paymentMethodsData,  // ← Original (para Pie Chart)
        paymentMethodsDetailedData,  // ← NUEVO (para Cards + Tabla)
        stayDurationData,
        stayLengthData,
        weekdayData,
        rentalVsOwnedData
      ] = await Promise.all([
        fetchWithAuth('/api/analytics/overview'),
        fetchWithAuth(`/api/analytics/revenue-timeline?days=${timeRange}`),
        fetchWithAuth(`/api/analytics/nights-timeline?days=${timeRange}`),
        fetchWithAuth('/api/analytics/total-nights'),
        fetchWithAuth('/api/analytics/country-distribution'),
        fetchWithAuth('/api/analytics/peak-hours'),
        fetchWithAuth('/api/analytics/payment-methods'),  // ← Original
        fetchWithAuth('/api/analytics/payment-methods-detailed'),  // ← NUEVO
        fetchWithAuth('/api/analytics/stay-duration-by-country'),
        fetchWithAuth('/api/analytics/stay-length-distribution'),
        fetchWithAuth('/api/analytics/weekday-distribution'),
        fetchWithAuth('/api/analytics/rental-vs-owned')
      ]);

      setOverview(overviewData);
      setRevenueTimeline(revenueData);
      setNightsTimeline(nightsTimelineData);
      setTotalNights(totalNightsData);
      setCountryDistribution(countryData.by_country);
      setRentalTotals(countryData.rental_totals);
      setPeakHours(peakHoursData);
      setPaymentMethods(paymentMethodsData);  // ← Original (Pie Chart)
      setPaymentMethodsDetailed(paymentMethodsDetailedData);  // ← NUEVO (Cards + Tabla)
      setStayDuration(stayDurationData);
      setStayLengthDistribution(stayLengthData);
      setWeekdayDistribution(weekdayData);
      setRentalVsOwned(rentalVsOwnedData);

    } catch (err) {
      if (err.message !== 'Forbidden') {
        console.error('Error:', err);
        setError(err.message || 'Error al cargar analytics');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Cargando analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <Alert variant="danger">
          <Alert.Heading>⚠️ Error</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4 mb-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          {/*<h1>📊 Analytics Dashboard</h1>*/}
        </div>
        <ButtonGroup>
          <Button 
            variant={timeRange === 7 ? 'primary' : 'outline-primary'}
            onClick={() => setTimeRange(7)}
          >
            7 días
          </Button>
          <Button 
            variant={timeRange === 30 ? 'primary' : 'outline-primary'}
            onClick={() => setTimeRange(30)}
          >
            30 días
          </Button>
          <Button 
            variant={timeRange === 90 ? 'primary' : 'outline-primary'}
            onClick={() => setTimeRange(90)}
          >
            90 días
          </Button>
        </ButtonGroup>
      </div>

      {/* KPIs Principales */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h6 className="text-muted">Total Estancias</h6>
              <h2 className="text-primary">{overview?.total_stays || 0}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h6 className="text-muted">Ingresos Totales</h6>
              <h2 className="text-success">{overview?.total_revenue?.toFixed(2) || 0} €</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h6 className="text-muted">Total Pernoctas</h6>
              <h2 className="text-info">{totalNights?.total_nights || 0}</h2>
              <small className="text-muted">
                Promedio: {totalNights?.avg_nights_per_stay || 0} noches/cliente
              </small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h6 className="text-muted">SINPAS</h6>
              <h2 className="text-danger">
                {overview?.total_sinpas || 0}
                <small className="text-muted d-block" style={{fontSize: '0.5em'}}>
                  {overview?.debt_sinpas?.toFixed(2) || 0}€ deuda
                </small>
              </h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* NUEVO: KPIs de Métodos de Pago - Compactos */}
      {paymentMethodsDetailed && (
        <Row className="mb-3">
          <Col md={4}>
            <Card className="text-center border-success">
              <Card.Body className="py-2">
                <small className="text-muted d-block mb-1">💵 Efectivo</small>
                <h5 className="text-success mb-0">{paymentMethodsDetailed.totals.cash.amount.toFixed(2)} €</h5>
                <small className="text-muted">({paymentMethodsDetailed.totals.cash.count} pagos)</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center border-info">
              <Card.Body className="py-2">
                <small className="text-muted d-block mb-1">💳 Tarjeta</small>
                <h5 className="text-info mb-0">{paymentMethodsDetailed.totals.card.amount.toFixed(2)} €</h5>
                <small className="text-muted">({paymentMethodsDetailed.totals.card.count} pagos)</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center border-primary">
              <Card.Body className="py-2">
                <small className="text-muted d-block mb-1">🏦 Transferencia</small>
                <h5 className="text-primary mb-0">{paymentMethodsDetailed.totals.transfer.amount.toFixed(2)} €</h5>
                <small className="text-muted">({paymentMethodsDetailed.totals.transfer.count} pagos)</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Gráficos de Línea: Ingresos y Pernoctas */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Ingresos Diarios (últimos {timeRange} días)</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={revenueTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#82ca9d" name="Ingresos (€)" />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Pernoctas Diarias (últimos {timeRange} días)</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={nightsTimeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="nights" stroke="#8884d8" name="Pernoctas" />
                </LineChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Distribución por País con Tabla Detallada */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5>Distribución por País (Top 10)</h5>
            </Card.Header>
            <Card.Body>
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>País</th>
                    <th className="text-center">Vehículos</th>
                    <th className="text-center">Ingresos</th>
                    <th className="text-center">Pernoctas</th>
                    <th className="text-center">Media noches/vehículo</th>
                    <th className="text-center">Alquiler</th>
                  </tr>
                </thead>
                <tbody>
                  {countryDistribution.slice(0, 10).map((item, index) => (
                    <tr key={index}>
                      <td><strong>{item.country}</strong></td>
                      <td className="text-center">{item.count}</td>
                      <td className="text-center text-success"><strong>{item.revenue.toFixed(2)} €</strong></td>
                      <td className="text-center text-primary"><strong>{item.total_nights}</strong></td>
                      <td className="text-center">{item.avg_nights}</td>
                      <td className="text-center text-warning"><strong>{item.rental_count}</strong></td>
                    </tr>
                  ))}
                  
                  {rentalTotals && rentalTotals.count > 0 && (
                    <tr style={{ backgroundColor: '#fff3cd', fontWeight: 'bold' }}>
                      <td>🚗 TOTAL ALQUILERES</td>
                      <td className="text-center">{rentalTotals.count}</td>
                      <td className="text-center text-success">{rentalTotals.revenue.toFixed(2)} €</td>
                      <td className="text-center text-primary">{rentalTotals.total_nights}</td>
                      <td className="text-center">{rentalTotals.avg_nights}</td>
                      <td className="text-center text-warning">{rentalTotals.rental_count}</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Distribución de Estancias por Duración y Métodos de Pago */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>📊 Distribución de Estancias por Duración</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stayLengthDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" name="Vehículos" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>

        {/* Pie Chart Original: Payment Status */}
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Métodos de Pago</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    dataKey="count"
                    nameKey="method"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {paymentMethods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* NUEVA: Tabla de Transacciones Electrónicas con Pestañas */}
      {paymentMethodsDetailed && (
        <Row className="mb-4">
          <Col md={12}>
            <Card>
              <Card.Header>
                <h5>💳 Pagos Electrónicos</h5>
              </Card.Header>
              <Card.Body>
                <Nav variant="tabs" className="mb-3">
                  <Nav.Item>
                    <Nav.Link 
                      active={activePaymentTab === 'transfer'}
                      onClick={() => setActivePaymentTab('transfer')}
                      style={{ cursor: 'pointer' }}
                    >
                      🏦 Transferencias ({paymentMethodsDetailed.totals.transfer.count})
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link 
                      active={activePaymentTab === 'card'}
                      onClick={() => setActivePaymentTab('card')}
                      style={{ cursor: 'pointer' }}
                    >
                      💳 Tarjeta ({paymentMethodsDetailed.totals.card.count})
                    </Nav.Link>
                  </Nav.Item>
                </Nav>

                {/* Contenido de Transferencias */}
                {activePaymentTab === 'transfer' && (
                  <>
                    {paymentMethodsDetailed.transactions.transfer.length > 0 ? (
                      <Table striped bordered hover responsive>
                        <thead>
                          <tr>
                            <th>Matrícula</th>
                            <th>País</th>
                            <th className="text-end">Importe</th>
                            <th>Check-in</th>
                            <th>Check-out</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentMethodsDetailed.transactions.transfer.map((tx, index) => (
                            <tr key={index}>
                              <td><strong>{tx.license_plate}</strong></td>
                              <td>{tx.country}</td>
                              <td className="text-end text-success"><strong>{tx.amount.toFixed(2)} €</strong></td>
                              <td>{tx.check_in_time ? new Date(tx.check_in_time).toLocaleString('es-ES') : 'N/A'}</td>
                              <td>{tx.check_out_time ? new Date(tx.check_out_time).toLocaleString('es-ES') : 'N/A'}</td>
                            </tr>
                          ))}
                          <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                            <td colSpan="2" className="text-end">TOTAL:</td>
                            <td className="text-end text-success">
                              {paymentMethodsDetailed.totals.transfer.amount.toFixed(2)} €
                            </td>
                            <td colSpan="2"></td>
                          </tr>
                        </tbody>
                      </Table>
                    ) : (
                      <Alert variant="info">No hay pagos por transferencia registrados</Alert>
                    )}
                  </>
                )}

                {/* Contenido de Tarjeta */}
                {activePaymentTab === 'card' && (
                  <>
                    {paymentMethodsDetailed.transactions.card.length > 0 ? (
                      <Table striped bordered hover responsive>
                        <thead>
                          <tr>
                            <th>Matrícula</th>
                            <th>País</th>
                            <th className="text-end">Importe</th>
                            <th>Check-in</th>
                            <th>Check-out</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentMethodsDetailed.transactions.card.map((tx, index) => (
                            <tr key={index}>
                              <td><strong>{tx.license_plate}</strong></td>
                              <td>{tx.country}</td>
                              <td className="text-end text-info"><strong>{tx.amount.toFixed(2)} €</strong></td>
                              <td>{tx.check_in_time ? new Date(tx.check_in_time).toLocaleString('es-ES') : 'N/A'}</td>
                              <td>{tx.check_out_time ? new Date(tx.check_out_time).toLocaleString('es-ES') : 'N/A'}</td>
                            </tr>
                          ))}
                          <tr style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                            <td colSpan="2" className="text-end">TOTAL:</td>
                            <td className="text-end text-info">
                              {paymentMethodsDetailed.totals.card.amount.toFixed(2)} €
                            </td>
                            <td colSpan="2"></td>
                          </tr>
                        </tbody>
                      </Table>
                    ) : (
                      <Alert variant="info">No hay pagos con tarjeta registrados</Alert>
                    )}
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Horas Pico y Días de la Semana */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Horas Pico de Entrada</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#FF8042" name="Check-ins" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Distribución por Día de la Semana</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weekdayDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0088FE" name="Check-ins" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Panel de Vehículos Propios vs Alquiler */}
      {rentalVsOwned && (
        <Row className="mb-4">
          <Col md={12}>
            <Card>
              <Card.Header>
                <h5>Vehículos Propios vs Alquiler</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6} className="text-center border-end">
                    <div className="p-3">
                      <h6 className="text-muted mb-3">Vehículos Propios</h6>
                      <h2 className="text-primary mb-2">{rentalVsOwned.owned_count}</h2>
                      <div className="progress" style={{ height: '25px' }}>
                        <div 
                          className="progress-bar bg-primary" 
                          role="progressbar" 
                          style={{ width: `${rentalVsOwned.owned_percentage}%` }}
                          aria-valuenow={rentalVsOwned.owned_percentage} 
                          aria-valuemin="0" 
                          aria-valuemax="100"
                        >
                          <strong>{rentalVsOwned.owned_percentage}%</strong>
                        </div>
                      </div>
                    </div>
                  </Col>
                  <Col md={6} className="text-center">
                    <div className="p-3">
                      <h6 className="text-muted mb-3">Vehículos de Alquiler</h6>
                      <h2 className="text-warning mb-2">{rentalVsOwned.rental_count}</h2>
                      <div className="progress" style={{ height: '25px' }}>
                        <div 
                          className="progress-bar bg-warning" 
                          role="progressbar" 
                          style={{ width: `${rentalVsOwned.rental_percentage}%` }}
                          aria-valuenow={rentalVsOwned.rental_percentage} 
                          aria-valuemin="0" 
                          aria-valuemax="100"
                        >
                          <strong>{rentalVsOwned.rental_percentage}%</strong>
                        </div>
                      </div>
                    </div>
                  </Col>
                </Row>
                <div className="text-center mt-3 text-muted">
                  <small>Total de estancias completadas: <strong>{rentalVsOwned.total}</strong></small>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}

export default Analytics;