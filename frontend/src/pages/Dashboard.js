import React, { useState, useEffect, useRef } from 'react';
import { dashboardAPI } from '../services/api';
import PendingCard from '../components/PendingCard';
import ActiveCard from '../components/ActiveCard';
import PendingTransfersCard from '../components/PendingTransfersCard';

function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingTransfersCount, setPendingTransfersCount] = useState(0);
  
  // Ref para scroll al card de transferencias
  const transfersCardRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
    fetchPendingTransfersCount();
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

  const fetchPendingTransfersCount = async () => {
    try {
      const response = await fetch('/api/stays/pending-transfers', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingTransfersCount(data.count || 0);
      }
    } catch (err) {
      console.error('Error fetching pending transfers count:', err);
    }
  };

  const handleRefreshData = () => {
    fetchDashboardData();
    fetchPendingTransfersCount();
  };

  const scrollToTransfers = () => {
    if (transfersCardRef.current) {
      transfersCardRef.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
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
      {/* Badge flotante de transferencias pendientes */}
      {pendingTransfersCount > 0 && (
        <div
          onClick={scrollToTransfers}
          style={{
            position: 'fixed',
            top: '80px',
            right: '20px',
            backgroundColor: '#17a2b8',
            color: 'white',
            padding: '0.75rem 1.25rem',
            borderRadius: '50px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            zIndex: 1000,
            fontWeight: 'bold',
            fontSize: '0.9rem',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'pulse 2s infinite'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.backgroundColor = '#138496';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.backgroundColor = '#17a2b8';
          }}
          title="Click para ver transferencias pendientes"
        >
          <span style={{ fontSize: '1.2rem' }}>🏦</span>
          <span>{pendingTransfersCount} Transfer. Pend.</span>
        </div>
      )}

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
            <PendingCard refreshData={handleRefreshData} />
          </div>
          <div className="col-12 col-lg-6">
            <ActiveCard refreshData={handleRefreshData} />
          </div>
          <div className="col-12" ref={transfersCardRef}>
            <PendingTransfersCard refreshData={handleRefreshData} />
          </div>
        </div>
      </div>

      {/* Animación de pulso */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(23, 162, 184, 0.4);
          }
          50% {
            box-shadow: 0 4px 20px rgba(23, 162, 184, 0.8);
          }
        }
      `}</style>
    </div>
  );
}

export default Dashboard;
