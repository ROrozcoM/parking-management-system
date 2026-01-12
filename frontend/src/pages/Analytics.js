import React, { useState, useEffect } from 'react';
import { Alert, Spinner, Card, Row, Col, ButtonGroup, Button, Table, Nav, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

function Analytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activePaymentTab, setActivePaymentTab] = useState('transfer');
  const navigate = useNavigate();

  // Estados para cada tipo de datos
  const [overview, setOverview] = useState(null);
  const [revenueTimeline, setRevenueTimeline] = useState([]);
  const [nightsTimeline, setNightsTimeline] = useState([]);
  const [totalNights, setTotalNights] = useState(null);
  const [countryDistribution, setCountryDistribution] = useState([]);
  const [rentalTotals, setRentalTotals] = useState(null);
  const [peakHours, setPeakHours] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethodsDetailed, setPaymentMethodsDetailed] = useState(null);
  const [paymentDistByCountry, setPaymentDistByCountry] = useState(null); // ← NUEVO
  const [stayLengthDistribution, setStayLengthDistribution] = useState([]);
  const [weekdayDistribution, setWeekdayDistribution] = useState([]);
  const [rentalVsOwned, setRentalVsOwned] = useState(null);

  // Estados para ocupación
  const [dailyOccupancy, setDailyOccupancy] = useState(null);
  const [checkinsTimeline, setCheckinsTimeline] = useState(null);
  const [occupancyPeriod, setOccupancyPeriod] = useState(null);
  const [occupancyStartDate, setOccupancyStartDate] = useState('');
  const [occupancyEndDate, setOccupancyEndDate] = useState('');
  const [occupancyCountry, setOccupancyCountry] = useState('all');
  const [loadingOccupancy, setLoadingOccupancy] = useState(false);

  // Estados para rendimiento de usuarios
  const [userPerformance, setUserPerformance] = useState(null);
  const [performanceStartDate, setPerformanceStartDate] = useState('');
  const [performanceEndDate, setPerformanceEndDate] = useState('');
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [performanceTimeRange, setPerformanceTimeRange] = useState('all');

  useEffect(() => {
    loadAllData();
    loadDailyOccupancy();
    loadCheckinsTimeline();
    loadUserPerformance();
  }, []);

  // Auto-cargar ocupación de última semana
  useEffect(() => {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    
    const todayStr = today.toISOString().split('T')[0];
    const lastWeekStr = lastWeek.toISOString().split('T')[0];
    
    setOccupancyStartDate(lastWeekStr);
    setOccupancyEndDate(todayStr);
    
    setTimeout(() => {
      const url = `/api/analytics/occupancy-period?start_date=${lastWeekStr}&end_date=${todayStr}&country=all`;
      fetchWithAuth(url)
        .then(data => setOccupancyPeriod(data))
        .catch(err => console.error('Error auto-cargando ocupación:', err));
    }, 500);
  }, []);

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

      const [
        overviewData,
        revenueData,
        nightsTimelineData,
        totalNightsData,
        countryData,
        peakHoursData,
        paymentMethodsData,
        paymentMethodsDetailedData,
        paymentDistByCountryData, // ← NUEVO
        stayLengthData,
        weekdayData,
        rentalVsOwnedData
      ] = await Promise.all([
        fetchWithAuth('/api/analytics/overview'),
        fetchWithAuth('/api/analytics/revenue-timeline'),
        fetchWithAuth('/api/analytics/nights-timeline'),
        fetchWithAuth('/api/analytics/total-nights'),
        fetchWithAuth('/api/analytics/country-distribution'),
        fetchWithAuth('/api/analytics/peak-hours'),
        fetchWithAuth('/api/analytics/payment-methods'),
        fetchWithAuth('/api/analytics/payment-methods-detailed'),
        fetchWithAuth('/api/analytics/payment-distribution-by-country'), // ← NUEVO
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
      setPaymentMethods(paymentMethodsData);
      setPaymentMethodsDetailed(paymentMethodsDetailedData);
      setPaymentDistByCountry(paymentDistByCountryData); // ← NUEVO
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

  const loadDailyOccupancy = async () => {
    try {
      const data = await fetchWithAuth('/api/analytics/daily-occupancy-average');
      setDailyOccupancy(data);
    } catch (err) {
      console.error('Error cargando ocupación diaria:', err);
    }
  };

  const loadCheckinsTimeline = async () => {
    try {
      const data = await fetchWithAuth('/api/analytics/checkins-around-today?days_before=7&days_after=7');
      setCheckinsTimeline(data);
    } catch (err) {
      console.error('Error cargando check-ins timeline:', err);
    }
  };

  const calculateOccupancyPeriod = async () => {
    if (!occupancyStartDate || !occupancyEndDate) {
      alert('Por favor selecciona ambas fechas');
      return;
    }

    try {
      setLoadingOccupancy(true);
      const url = `/api/analytics/occupancy-period?start_date=${occupancyStartDate}&end_date=${occupancyEndDate}${occupancyCountry !== 'all' ? `&country=${occupancyCountry}` : ''}`;
      const data = await fetchWithAuth(url);
      setOccupancyPeriod(data);
    } catch (err) {
      console.error('Error calculando ocupación:', err);
      alert('Error al calcular ocupación');
    } finally {
      setLoadingOccupancy(false);
    }
  };

  const loadUserPerformance = async (startDate = null, endDate = null) => {
    try {
      setLoadingPerformance(true);
      let url = '/api/analytics/user-performance';
      
      if (startDate && endDate) {
        url += `?start_date=${startDate}&end_date=${endDate}`;
      }
      
      const data = await fetchWithAuth(url);
      setUserPerformance(data);
    } catch (err) {
      console.error('Error cargando rendimiento de usuarios:', err);
    } finally {
      setLoadingPerformance(false);
    }
  };

  const handlePerformanceQuickRange = (days) => {
    setPerformanceTimeRange(days);
    
    if (days === 'all') {
      setPerformanceStartDate('');
      setPerformanceEndDate('');
      loadUserPerformance();
    } else {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - days);
      
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];
      
      setPerformanceStartDate(startStr);
      setPerformanceEndDate(endStr);
      loadUserPerformance(startStr, endStr);
    }
  };

  const calculateCustomPerformance = () => {
    if (!performanceStartDate || !performanceEndDate) {
      alert('Por favor selecciona ambas fechas');
      return;
    }
    
    setPerformanceTimeRange('custom');
    loadUserPerformance(performanceStartDate, performanceEndDate);
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
      {/* Header con Campaña */}
      <div className="mb-4 text-center">
        {overview?.campaign_name && (
          <h4 className="text-muted">Campaña {overview.campaign_name}</h4>
        )}
      </div>

      {/* KPIs Principales - CAMPAÑA ACTUAL */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h6 className="text-muted">Total Estancias</h6>
              <h2 className="text-primary">{overview?.total_stays || 0}</h2>
              <small className="text-muted">Campaña actual</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h6 className="text-muted">Ingresos Totales</h6>
              <h2 className="text-success">{overview?.total_revenue?.toFixed(2) || 0} €</h2>
              <small className="text-muted">Campaña actual</small>
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

      {/* KPIs de Métodos de Pago - CAMPAÑA ACTUAL */}
      {paymentMethodsDetailed && (
        <Row className="mb-4">
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

      {/* Gráficos de Línea: Ingresos y Pernoctas - CAMPAÑA ACTUAL */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Ingresos Diarios - Campaña {overview?.campaign_name}</h5>
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
              <h5>Pernoctas Diarias - Campaña {overview?.campaign_name}</h5>
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

      {/* ============================================================ */}
      {/* NUEVOS GRÁFICOS: ANÁLISIS DE MÉTODOS DE PAGO POR PAÍS */}
      {/* ============================================================ */}
      
      {/* ROW 1: 2 Gráficos grandes - Tipo de Pago */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Tipo de Pago - Campaña {overview?.campaign_name}</h5>
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
              <div className="text-center mt-2">
                <small className="text-muted">Adelantado / Normal / SINPA</small>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>Método de Pago - Campaña {overview?.campaign_name}</h5>
            </Card.Header>
            <Card.Body>
              {paymentMethodsDetailed && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Efectivo', value: paymentMethodsDetailed.totals.cash.count },
                        { name: 'Tarjeta', value: paymentMethodsDetailed.totals.card.count },
                        { name: 'Transferencia', value: paymentMethodsDetailed.totals.transfer.count }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      <Cell fill="#28a745" />
                      <Cell fill="#17a2b8" />
                      <Cell fill="#007bff" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="text-center mt-2">
                <small className="text-muted">Efectivo / Tarjeta / Transferencia</small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ROW 2: 5 Mini gráficos - Distribución por país */}
      {paymentDistByCountry && (
        <Row className="mb-4">
          <Col md={12}>
            <h5 className="text-center mb-3" style={{ color: '#666' }}>Distribución por País - Campaña {overview?.campaign_name}</h5>
          </Col>

          {/* Pago Adelantado */}
          <Col md={2} className="mb-3">
            <Card className="h-100">
              <Card.Header className="text-center bg-primary text-white py-2">
                <small><strong>Pago Adelantado</strong></small>
              </Card.Header>
              <Card.Body className="p-2">
                {paymentDistByCountry.prepaid.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={paymentDistByCountry.prepaid.slice(0, 5)}
                        dataKey="count"
                        nameKey="country"
                        cx="50%"
                        cy="50%"
                        outerRadius={50}
                        label={false}
                      >
                        {paymentDistByCountry.prepaid.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted py-5">
                    <small>Sin datos</small>
                  </div>
                )}
                <div className="mt-2" style={{ fontSize: '0.7rem' }}>
                  {paymentDistByCountry.prepaid.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="d-flex justify-content-between">
                      <span style={{ color: COLORS[idx] }}>●</span>
                      <span className="text-truncate mx-1">{item.country}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Pago Normal */}
          <Col md={2} className="mb-3">
            <Card className="h-100">
              <Card.Header className="text-center bg-success text-white py-2">
                <small><strong>Pago Normal</strong></small>
              </Card.Header>
              <Card.Body className="p-2">
                {paymentDistByCountry.normal.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={paymentDistByCountry.normal.slice(0, 5)}
                        dataKey="count"
                        nameKey="country"
                        cx="50%"
                        cy="50%"
                        outerRadius={50}
                        label={false}
                      >
                        {paymentDistByCountry.normal.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted py-5">
                    <small>Sin datos</small>
                  </div>
                )}
                <div className="mt-2" style={{ fontSize: '0.7rem' }}>
                  {paymentDistByCountry.normal.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="d-flex justify-content-between">
                      <span style={{ color: COLORS[idx] }}>●</span>
                      <span className="text-truncate mx-1">{item.country}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Efectivo */}
          <Col md={3} className="mb-3">
            <Card className="h-100">
              <Card.Header className="text-center bg-success text-white py-2">
                <small><strong>💵 Efectivo</strong></small>
              </Card.Header>
              <Card.Body className="p-2">
                {paymentDistByCountry.cash.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={paymentDistByCountry.cash.slice(0, 5)}
                        dataKey="count"
                        nameKey="country"
                        cx="50%"
                        cy="50%"
                        outerRadius={50}
                        label={false}
                      >
                        {paymentDistByCountry.cash.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted py-5">
                    <small>Sin datos</small>
                  </div>
                )}
                <div className="mt-2" style={{ fontSize: '0.7rem' }}>
                  {paymentDistByCountry.cash.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="d-flex justify-content-between">
                      <span style={{ color: COLORS[idx] }}>●</span>
                      <span className="text-truncate mx-1">{item.country}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Tarjeta */}
          <Col md={2} className="mb-3">
            <Card className="h-100">
              <Card.Header className="text-center bg-info text-white py-2">
                <small><strong>💳 Tarjeta</strong></small>
              </Card.Header>
              <Card.Body className="p-2">
                {paymentDistByCountry.card.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={paymentDistByCountry.card.slice(0, 5)}
                        dataKey="count"
                        nameKey="country"
                        cx="50%"
                        cy="50%"
                        outerRadius={50}
                        label={false}
                      >
                        {paymentDistByCountry.card.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted py-5">
                    <small>Sin datos</small>
                  </div>
                )}
                <div className="mt-2" style={{ fontSize: '0.7rem' }}>
                  {paymentDistByCountry.card.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="d-flex justify-content-between">
                      <span style={{ color: COLORS[idx] }}>●</span>
                      <span className="text-truncate mx-1">{item.country}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Transferencia */}
          <Col md={3} className="mb-3">
            <Card className="h-100">
              <Card.Header className="text-center bg-primary text-white py-2">
                <small><strong>🏦 Transferencia</strong></small>
              </Card.Header>
              <Card.Body className="p-2">
                {paymentDistByCountry.transfer.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={paymentDistByCountry.transfer.slice(0, 5)}
                        dataKey="count"
                        nameKey="country"
                        cx="50%"
                        cy="50%"
                        outerRadius={50}
                        label={false}
                      >
                        {paymentDistByCountry.transfer.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-muted py-5">
                    <small>Sin datos</small>
                  </div>
                )}
                <div className="mt-2" style={{ fontSize: '0.7rem' }}>
                  {paymentDistByCountry.transfer.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="d-flex justify-content-between">
                      <span style={{ color: COLORS[idx] }}>●</span>
                      <span className="text-truncate mx-1">{item.country}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Tabla de Pagos Electrónicos - CAMPAÑA ACTUAL */}
      {paymentMethodsDetailed && (
        <Row className="mb-4">
          <Col md={12}>
            <Card>
              <Card.Header>
                <h5>Pagos Electrónicos - Campaña {overview?.campaign_name}</h5>
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

                {activePaymentTab === 'transfer' && (
                  <>
                    {paymentMethodsDetailed.transactions.transfer.length > 0 ? (
                      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        <Table striped bordered hover responsive>
                          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
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
                          </tbody>
                        </Table>
                      </div>
                    ) : (
                      <Alert variant="info">No hay pagos por transferencia registrados</Alert>
                    )}
                    <div className="mt-2 p-2 bg-light text-end">
                      <strong>TOTAL: {paymentMethodsDetailed.totals.transfer.amount.toFixed(2)} €</strong>
                    </div>
                  </>
                )}

                {activePaymentTab === 'card' && (
                  <>
                    {paymentMethodsDetailed.transactions.card.length > 0 ? (
                      <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        <Table striped bordered hover responsive>
                          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#fff', zIndex: 1 }}>
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
                          </tbody>
                        </Table>
                      </div>
                    ) : (
                      <Alert variant="info">No hay pagos con tarjeta registrados</Alert>
                    )}
                    <div className="mt-2 p-2 bg-light text-end">
                      <strong>TOTAL: {paymentMethodsDetailed.totals.card.amount.toFixed(2)} €</strong>
                    </div>
                  </>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* SEPARADOR VISUAL */}
      <hr style={{ margin: '3rem 0', border: '2px solid #ddd' }} />
      <h2 className="text-center mb-4" style={{ color: '#666' }}>📈 Estadísticas Globales (Histórico Completo)</h2>

      {/* Ocupación Diaria Media con Check-ins Timeline - GLOBAL */}
      {dailyOccupancy && (
        <Row className="mb-4">
          <Col md={12}>
            <Card>
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">Ocupación y Tendencia de Check-ins</h5>
              </Card.Header>
              <Card.Body>
                <Row className="align-items-center">
                  {/* Gauge - Izquierda */}
                  <Col md={4} className="text-center">
                    <div style={{ position: 'relative', width: '200px', height: '200px', margin: '0 auto' }}>
                      <svg viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke="#e0e0e0"
                          strokeWidth="20"
                        />
                        <circle
                          cx="100"
                          cy="100"
                          r="80"
                          fill="none"
                          stroke={dailyOccupancy.overall_percentage > 80 ? '#dc3545' : dailyOccupancy.overall_percentage > 50 ? '#ffc107' : '#28a745'}
                          strokeWidth="20"
                          strokeDasharray={`${(dailyOccupancy.overall_percentage / 100) * 502.65} 502.65`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        <h1 style={{ fontSize: '3rem', margin: 0, fontWeight: 'bold' }}>
                          {dailyOccupancy.overall_percentage}%
                        </h1>
                        <small className="text-muted">Ocupación</small>
                      </div>
                    </div>
                    <p className="text-muted mt-3 mb-0">
                      <strong>{dailyOccupancy.total_occupied}</strong> de <strong>{dailyOccupancy.total_available}</strong> plazas
                    </p>
                    <small className="text-muted">Promedio histórico para {dailyOccupancy.date}</small>
                  </Col>

                  {/* Gráfico Check-ins - Derecha */}
                  <Col md={8}>
                    <h6 className="text-muted mb-3">Check-ins: 7 días atrás + Hoy + 7 días adelante</h6>
                    
                    {checkinsTimeline ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={checkinsTimeline.timeline}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="day_label" 
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis />
                          <Tooltip 
                            labelFormatter={(label) => `Día: ${label}`}
                            formatter={(value) => [`${value} check-ins`, '']}
                          />
                          <Bar 
                            dataKey="checkins" 
                            shape={(props) => {
                              const { x, y, width, height, payload } = props;
                              const fill = payload.is_today ? '#ff8042' : '#8884d8';
                              return <rect x={x} y={y} width={width} height={height} fill={fill} />;
                            }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center py-5">
                        <Spinner animation="border" size="sm" />
                        <p className="text-muted mt-2">Cargando check-ins...</p>
                      </div>
                    )}
                    
                    <small className="text-muted d-block text-center mt-2">
                      🟠 = Hoy | 🔵 = Otros días
                    </small>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Análisis de Ocupación por Período - GLOBAL */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header className="bg-info text-black">
              <h5 className="mb-0">Análisis de Ocupación por Período</h5>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label><strong>Fecha Inicio:</strong></Form.Label>
                    <Form.Control
                      type="date"
                      value={occupancyStartDate}
                      onChange={(e) => setOccupancyStartDate(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label><strong>Fecha Fin:</strong></Form.Label>
                    <Form.Control
                      type="date"
                      value={occupancyEndDate}
                      onChange={(e) => setOccupancyEndDate(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label><strong>País:</strong></Form.Label>
                    <Form.Select
                      value={occupancyCountry}
                      onChange={(e) => setOccupancyCountry(e.target.value)}
                    >
                      <option value="all">Todos los países</option>
                      {countryDistribution.slice(0, 10).map((country, index) => (
                        <option key={index} value={country.country}>
                          {country.country}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3} className="d-flex align-items-end">
                  <Button
                    variant="primary"
                    onClick={calculateOccupancyPeriod}
                    disabled={loadingOccupancy || !occupancyStartDate || !occupancyEndDate}
                    style={{ width: '100%' }}
                  >
                    {loadingOccupancy ? (
                      <>
                        <Spinner size="sm" animation="border" /> Calculando...
                      </>
                    ) : (
                      '🔍 Calcular Ocupación'
                    )}
                  </Button>
                </Col>
              </Row>

              {occupancyPeriod && (
                <>
                  <Alert variant="success">
                    <Row>
                      <Col md={6}>
                        <strong>Período:</strong> {new Date(occupancyPeriod.period.start).toLocaleDateString('es-ES')} - {new Date(occupancyPeriod.period.end).toLocaleDateString('es-ES')}
                        <br />
                        <strong>Días analizados:</strong> {occupancyPeriod.period.days}
                      </Col>
                      <Col md={6} className="text-end">
                        <h4 className="mb-0">
                          Ocupación Media: <strong style={{ color: '#28a745' }}>{occupancyPeriod.average_occupancy}%</strong>
                        </h4>
                      </Col>
                    </Row>
                  </Alert>

                  <Card className="mb-3">
                    <Card.Header>
                      <strong>Evolución Diaria de Ocupación</strong>
                    </Card.Header>
                    <Card.Body>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={occupancyPeriod.timeline}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(date) => new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                          />
                          <YAxis domain={[0, 100]} />
                          <Tooltip 
                            labelFormatter={(date) => new Date(date).toLocaleDateString('es-ES')}
                            formatter={(value) => [`${value}%`, 'Ocupación']}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="occupancy_percentage" 
                            stroke="#0088FE" 
                            name="Ocupación (%)" 
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </Card.Body>
                  </Card>

                  <Row>
                    <Col md={6}>
                      <Card>
                        <Card.Header>
                          <strong>Ocupación Media por Tipo de Plaza</strong>
                        </Card.Header>
                        <Card.Body>
                          <Table bordered>
                            <thead>
                              <tr>
                                <th>Tipo</th>
                                <th className="text-center">Ocupación Media</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.entries(occupancyPeriod.by_type).map(([type, percentage]) => (
                                <tr key={type}>
                                  <td><strong>{type}</strong></td>
                                  <td className="text-center">
                                    <strong style={{ color: percentage > 80 ? '#dc3545' : percentage > 50 ? '#ffc107' : '#28a745' }}>
                                      {percentage}%
                                    </strong>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </Card.Body>
                      </Card>
                    </Col>

                    {occupancyPeriod.by_country && (
                      <Col md={6}>
                        <Card>
                          <Card.Header>
                            <strong>Distribución por País en el Período</strong>
                          </Card.Header>
                          <Card.Body style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            <Table bordered size="sm">
                              <thead>
                                <tr>
                                  <th>País</th>
                                  <th className="text-center">Estancias</th>
                                  <th className="text-center">%</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Object.entries(occupancyPeriod.by_country)
                                  .sort(([, a], [, b]) => b.stays - a.stays)
                                  .map(([country, data]) => (
                                    <tr key={country}>
                                      <td>{country}</td>
                                      <td className="text-center">{data.stays}</td>
                                      <td className="text-center"><strong>{data.percentage}%</strong></td>
                                    </tr>
                                  ))}
                              </tbody>
                            </Table>
                          </Card.Body>
                        </Card>
                      </Col>
                    )}
                  </Row>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Distribución por País - GLOBAL */}
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
                      <td>TOTAL ALQUILERES</td>
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

      {/* Distribución de Estancias por Duración - GLOBAL */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5>Distribución de Estancias por Duración</h5>
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
      </Row>

      {/* Horas Pico y Días de la Semana - GLOBAL */}
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

      {/* Panel de Vehículos Propios vs Alquiler - GLOBAL */}
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

      {/* Rendimiento por Usuario - GLOBAL */}
      {userPerformance && (
        <Row className="mb-4">
          <Col md={12}>
            <Card>
              <Card.Header className="bg-warning text-dark">
                <h5 className="mb-0">Rendimiento por Usuario</h5>
              </Card.Header>
              <Card.Body>
                <Row className="mb-3">
                  <Col md={12} className="mb-2">
                    <ButtonGroup>
                      <Button
                        variant={performanceTimeRange === 'all' ? 'warning' : 'outline-warning'}
                        onClick={() => handlePerformanceQuickRange('all')}
                      >
                        TODO EL HISTÓRICO
                      </Button>
                      <Button
                        variant={performanceTimeRange === 7 ? 'warning' : 'outline-warning'}
                        onClick={() => handlePerformanceQuickRange(7)}
                      >
                        7 días
                      </Button>
                      <Button
                        variant={performanceTimeRange === 30 ? 'warning' : 'outline-warning'}
                        onClick={() => handlePerformanceQuickRange(30)}
                      >
                        30 días
                      </Button>
                      <Button
                        variant={performanceTimeRange === 90 ? 'warning' : 'outline-warning'}
                        onClick={() => handlePerformanceQuickRange(90)}
                      >
                        90 días
                      </Button>
                    </ButtonGroup>
                  </Col>
                </Row>

                <Row className="mb-3">
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label><strong>Fecha Inicio:</strong></Form.Label>
                      <Form.Control
                        type="date"
                        value={performanceStartDate}
                        onChange={(e) => setPerformanceStartDate(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group>
                      <Form.Label><strong>Fecha Fin:</strong></Form.Label>
                      <Form.Control
                        type="date"
                        value={performanceEndDate}
                        onChange={(e) => setPerformanceEndDate(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4} className="d-flex align-items-end">
                    <Button
                      variant="warning"
                      onClick={calculateCustomPerformance}
                      disabled={loadingPerformance || !performanceStartDate || !performanceEndDate}
                      style={{ width: '100%' }}
                    >
                      {loadingPerformance ? (
                        <>
                          <Spinner size="sm" animation="border" /> Calculando...
                        </>
                      ) : (
                        'Calcular'
                      )}
                    </Button>
                  </Col>
                </Row>

                <Alert variant="info">
                  <Row>
                    <Col md={6}>
                      <strong>Período: </strong>
                      {userPerformance.period.is_full_history ? (
                        'TODO EL HISTÓRICO'
                      ) : (
                        `${new Date(userPerformance.period.start).toLocaleDateString('es-ES')} - ${new Date(userPerformance.period.end).toLocaleDateString('es-ES')}`
                      )}
                    </Col>
                    <Col md={6} className="text-end">
                      <strong>Total Acciones: </strong>{userPerformance.totals.total_actions} | 
                      <strong> Acciones Pago: </strong>{userPerformance.totals.payment_actions} | 
                      <strong> Ingresos: </strong>{userPerformance.totals.revenue.toFixed(2)} €
                    </Col>
                  </Row>
                </Alert>

                {userPerformance.top_performers.general && (
                  <Alert variant="success">
                    <Row>
                      <Col md={6}>
                        🏆 <strong>TOP PERFORMER (General):</strong> {userPerformance.top_performers.general}
                      </Col>
                      <Col md={6}>
                        💰 <strong>TOP PERFORMER (Pagos):</strong> {userPerformance.top_performers.payments}
                      </Col>
                    </Row>
                  </Alert>
                )}

                <div style={{ overflowX: 'auto' }}>
                  <Table striped bordered hover responsive size="sm">
                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                      <tr>
                        <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Usuario</th>
                        <th colSpan="3" className="text-center" style={{ backgroundColor: '#d1ecf1' }}>Gestión Estancias</th>
                        <th colSpan="3" className="text-center" style={{ backgroundColor: '#d4edda' }}>Gestión Pagos</th>
                        <th colSpan="2" className="text-center" style={{ backgroundColor: '#cfe2ff' }}>Gestión Caja</th>
                        <th rowSpan="2" className="text-center" style={{ backgroundColor: '#f8d7da', verticalAlign: 'middle' }}>SINPA</th>
                        <th colSpan="3" className="text-center" style={{ backgroundColor: '#fff3cd' }}>Totales</th>
                      </tr>
                      <tr>
                        <th className="text-center" style={{ backgroundColor: '#d1ecf1' }}>Check-ins</th>
                        <th className="text-center" style={{ backgroundColor: '#d1ecf1' }}>Manuales</th>
                        <th className="text-center" style={{ backgroundColor: '#d1ecf1' }}>Descartados</th>
                        <th className="text-center" style={{ backgroundColor: '#d4edda' }}>Check-outs</th>
                        <th className="text-center" style={{ backgroundColor: '#d4edda' }}>Prepagos</th>
                        <th className="text-center" style={{ backgroundColor: '#d4edda' }}>Extensión</th>
                        <th className="text-center" style={{ backgroundColor: '#cfe2ff' }}>Abre</th>
                        <th className="text-center" style={{ backgroundColor: '#cfe2ff' }}>Cierre</th>
                        <th className="text-center" style={{ backgroundColor: '#fff3cd' }}>Total Acción</th>
                        <th className="text-center" style={{ backgroundColor: '#d4edda' }}>Acciones Pago</th>
                        <th className="text-center" style={{ backgroundColor: '#d1f2eb' }}>Ingresos €</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userPerformance.users.map((user, index) => (
                        <tr key={index}>
                          <td><strong>{user.username}</strong></td>
                          <td className="text-center">{user.checkins}</td>
                          <td className="text-center">{user.manual_entries}</td>
                          <td className="text-center">{user.discarded}</td>
                          <td className="text-center">{user.checkouts}</td>
                          <td className="text-center">{user.prepayments}</td>
                          <td className="text-center">{user.extensions}</td>
                          <td className="text-center">{user.cash_opened}</td>
                          <td className="text-center">{user.cash_closed}</td>
                          <td className="text-center text-danger"><strong>{user.sinpas}</strong></td>
                          <td className="text-center" style={{ backgroundColor: '#fff3cd' }}>
                            <strong>{user.total_actions}</strong>
                          </td>
                          <td className="text-center" style={{ backgroundColor: '#d4edda' }}>
                            <strong>{user.payment_actions}</strong>
                          </td>
                          <td className="text-center text-success" style={{ backgroundColor: '#d1f2eb' }}>
                            <strong>{user.revenue.toFixed(2)} €</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                <hr className="my-4" />
                
                <h5 className="mb-3">💳 Desglose por Método de Pago</h5>
                
                <div style={{ overflowX: 'auto' }}>
                  <Table striped bordered hover responsive size="sm">
                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                      <tr>
                        <th rowSpan="2" style={{ verticalAlign: 'middle' }}>Usuario</th>
                        <th colSpan="2" className="text-center" style={{ backgroundColor: '#d4edda' }}>💵 Efectivo</th>
                        <th colSpan="2" className="text-center" style={{ backgroundColor: '#cfe2ff' }}>💳 Tarjeta</th>
                        <th colSpan="2" className="text-center" style={{ backgroundColor: '#d1ecf1' }}>🏦 Transferencia</th>
                        <th rowSpan="2" className="text-center" style={{ backgroundColor: '#fff3cd', verticalAlign: 'middle' }}>Total €</th>
                      </tr>
                      <tr>
                        <th className="text-center" style={{ backgroundColor: '#d4edda' }}>Count</th>
                        <th className="text-center" style={{ backgroundColor: '#d4edda' }}>Importe</th>
                        <th className="text-center" style={{ backgroundColor: '#cfe2ff' }}>Count</th>
                        <th className="text-center" style={{ backgroundColor: '#cfe2ff' }}>Importe</th>
                        <th className="text-center" style={{ backgroundColor: '#d1ecf1' }}>Count</th>
                        <th className="text-center" style={{ backgroundColor: '#d1ecf1' }}>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userPerformance.users.map((user, index) => (
                        <tr key={index}>
                          <td><strong>{user.username}</strong></td>
                          <td className="text-center">{user.payment_methods.cash.count}</td>
                          <td className="text-center text-success">
                            <strong>{user.payment_methods.cash.amount.toFixed(2)} €</strong>
                          </td>
                          <td className="text-center">{user.payment_methods.card.count}</td>
                          <td className="text-center text-primary">
                            <strong>{user.payment_methods.card.amount.toFixed(2)} €</strong>
                          </td>
                          <td className="text-center">{user.payment_methods.transfer.count}</td>
                          <td className="text-center text-info">
                            <strong>{user.payment_methods.transfer.amount.toFixed(2)} €</strong>
                          </td>
                          <td className="text-center" style={{ backgroundColor: '#fff3cd' }}>
                            <strong>{user.revenue.toFixed(2)} €</strong>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
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