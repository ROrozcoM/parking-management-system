import React, { useState, useEffect } from 'react';
import { Alert, Spinner, Card, Row, Col, ButtonGroup, Button } from 'react-bootstrap';
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
  const navigate = useNavigate();

  // Estados para cada tipo de datos
  const [overview, setOverview] = useState(null);
  const [revenueTimeline, setRevenueTimeline] = useState([]);
  const [countryDistribution, setCountryDistribution] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [stayDuration, setStayDuration] = useState([]);
  const [monthlyComparison, setMonthlyComparison] = useState([]);
  const [weekdayDistribution, setWeekdayDistribution] = useState([]);

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
        countryData,
        peakHoursData,
        vehicleTypesData,
        paymentMethodsData,
        stayDurationData,
        monthlyData,
        weekdayData
      ] = await Promise.all([
        fetchWithAuth('/api/analytics/overview'),
        fetchWithAuth(`/api/analytics/revenue-timeline?days=${timeRange}`),
        fetchWithAuth('/api/analytics/country-distribution'),
        fetchWithAuth('/api/analytics/peak-hours'),
        fetchWithAuth('/api/analytics/vehicle-types'),
        fetchWithAuth('/api/analytics/payment-methods'),
        fetchWithAuth('/api/analytics/stay-duration-by-country'),
        fetchWithAuth('/api/analytics/monthly-comparison?months=6'),
        fetchWithAuth('/api/analytics/weekday-distribution')
      ]);

      setOverview(overviewData);
      setRevenueTimeline(revenueData);
      setCountryDistribution(countryData);
      setPeakHours(peakHoursData);
      setVehicleTypes(vehicleTypesData);
      setPaymentMethods(paymentMethodsData);
      setStayDuration(stayDurationData);
      setMonthlyComparison(monthlyData);
      setWeekdayDistribution(weekdayData);

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
          {/*<p className="text-muted">Análisis completo del negocio</p>*/}
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
              <h6 className="text-muted">Activos Ahora</h6>
              <h2 className="text-info">{overview?.active_now || 0}</h2>
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

      {/* Gráfico de Ingresos en el Tiempo */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5>📈 Ingresos Diarios (últimos {timeRange} días)</h5>
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
      </Row>

      {/* Comparación Mensual */}
      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5>📅 Comparación Mensual</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" fill="#8884d8" name="Vehículos" />
                  <Bar yAxisId="right" dataKey="revenue" fill="#82ca9d" name="Ingresos (€)" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Distribución por País */}
      <Row className="mb-4">
        <Col md={8}>
          <Card>
            <Card.Header>
              <h5>🌍 Distribución por País</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={countryDistribution.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="country" type="category" width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" name="Vehículos" />
                  <Bar dataKey="revenue" fill="#82ca9d" name="Ingresos (€)" />
                </BarChart>
              </ResponsiveContainer>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card>
            <Card.Header>
              <h5>⏱️ Estancia Media por País</h5>
            </Card.Header>
            <Card.Body>
              <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                {stayDuration.map((item, index) => (
                  <div key={index} className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                    <span>{item.country}</span>
                    <strong>{item.avg_days} días</strong>
                  </div>
                ))}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Horas Pico y Días de la Semana */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>⏰ Horas Pico de Entrada</h5>
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
              <h5>📅 Distribución por Día de la Semana</h5>
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

      {/* Tipos de Vehículos y Métodos de Pago */}
      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>🚗 Tipos de Vehículos</h5>
            </Card.Header>
            <Card.Body>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vehicleTypes}
                    dataKey="count"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {vehicleTypes.map((entry, index) => (
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
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5>💳 Métodos de Pago</h5>
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
    </div>
  );
}

export default Analytics;