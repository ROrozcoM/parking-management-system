import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import PendingCard from '../components/PendingCard';
import ActiveCard from '../components/ActiveCard';
import PendingTransfersCard from '../components/PendingTransfersCard';

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardAPI.getData();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Calcular ocupación por tipo de plaza
  const getSpotsByType = () => {
    if (!dashboardData) return null;

    const spotsByType = {
      A: { total: 27, occupied: 0 },
      B: { total: 16, occupied: 0 },
      CB: { total: 3, occupied: 0 },
      C: { total: 20, occupied: 0 },
      CPLUS: { total: 1, occupied: 0 }
    };

    // Contar ocupados por tipo desde active_stays
    dashboardData.active_stays?.forEach(stay => {
      const type = stay.parking_spot?.spot_type;
      if (type && spotsByType[type]) {
        spotsByType[type].occupied++;
      }
    });

    return spotsByType;
  };

  const spotsByType = getSpotsByType();

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard">
      {dashboardData && (
        <div className="stats-container">
          {/* Total Plazas */}
          <div className="stat-card">
            <h3>Total Plazas</h3>
            <p className="stat-value">{dashboardData.total_spots}</p>
            {spotsByType && (
              <small className="text-muted d-block mt-1" style={{ fontSize: '0.85rem' }}>
                A:{spotsByType.A.total} B:{spotsByType.B.total} CB:{spotsByType.CB.total} C:{spotsByType.C.total} C+:{spotsByType.CPLUS.total}
              </small>
            )}
          </div>

          {/* Plazas Ocupadas */}
          <div className="stat-card">
            <h3>Plazas Ocupadas</h3>
            <p className="stat-value">{dashboardData.occupied_spots}</p>
            {spotsByType && (
              <small className="text-muted d-block mt-1" style={{ fontSize: '0.85rem' }}>
                A:{spotsByType.A.occupied} B:{spotsByType.B.occupied} CB:{spotsByType.CB.occupied} C:{spotsByType.C.occupied} C+:{spotsByType.CPLUS.occupied}
              </small>
            )}
          </div>

          {/* Plazas Libres */}
          <div className="stat-card">
            <h3>Plazas Libres</h3>
            <p className="stat-value">{dashboardData.available_spots}</p>
            {spotsByType && (
              <small className="text-muted d-block mt-1" style={{ fontSize: '0.85rem' }}>
                A:{spotsByType.A.total - spotsByType.A.occupied} B:{spotsByType.B.total - spotsByType.B.occupied} CB:{spotsByType.CB.total - spotsByType.CB.occupied} C:{spotsByType.C.total - spotsByType.C.occupied} C+:{spotsByType.CPLUS.total - spotsByType.CPLUS.occupied}
              </small>
            )}
          </div>

          {/* % Ocupación */}
          <div className="stat-card">
            <h3>% Ocupación</h3>
            <p className="stat-value">
              {dashboardData.total_spots > 0 
                ? Math.round((dashboardData.occupied_spots / dashboardData.total_spots) * 100)
                : 0}%
            </p>
            {spotsByType && (
              <small className="text-muted d-block mt-1" style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
                A:{spotsByType.A.total > 0 ? Math.round((spotsByType.A.occupied / spotsByType.A.total) * 100) : 0}% 
                {' '}B:{spotsByType.B.total > 0 ? Math.round((spotsByType.B.occupied / spotsByType.B.total) * 100) : 0}%
                {' '}CB:{spotsByType.CB.total > 0 ? Math.round((spotsByType.CB.occupied / spotsByType.CB.total) * 100) : 0}%
                {' '}C:{spotsByType.C.total > 0 ? Math.round((spotsByType.C.occupied / spotsByType.C.total) * 100) : 0}%
                {' '}C+:{spotsByType.CPLUS.total > 0 ? Math.round((spotsByType.CPLUS.occupied / spotsByType.CPLUS.total) * 100) : 0}%
              </small>
            )}
          </div>
        </div>
      )}
      
      <div className="container-fluid">
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <PendingCard refreshData={fetchDashboardData} />
          </div>
          <div className="col-12 col-lg-6">
            <ActiveCard refreshData={fetchDashboardData} />
            </div>
          <div className="col-12">
            <PendingTransfersCard refreshData={fetchDashboardData} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;