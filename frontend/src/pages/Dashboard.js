import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import PendingCard from '../components/PendingCard';
import ActiveCard from '../components/ActiveCard';

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

  if (loading) return <div className="loading">Loading dashboard...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="dashboard">
      {/*<h1 className="page-title">Parking Dashboard</h1>*/}
      
      {dashboardData && (
        <div className="stats-container">
          <div className="stat-card">
            <h3>Total Plazas</h3>
            <p className="stat-value">{dashboardData.total_spots}</p>
          </div>
          <div className="stat-card">
            <h3>Plazas Ocupadas</h3>
            <p className="stat-value">{dashboardData.occupied_spots}</p>
          </div>
          <div className="stat-card">
            <h3>Plazas Libres</h3>
            <p className="stat-value">{dashboardData.available_spots}</p>
          </div>
          <div className="stat-card">
            <h3>% Ocupación</h3>
            <p className="stat-value">
              {dashboardData.total_spots > 0 
                ? Math.round((dashboardData.occupied_spots / dashboardData.total_spots) * 100)
                : 0}%
            </p>
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
        </div>
      </div>
    </div>
  );
}

export default Dashboard;