import React, { useState, useEffect } from 'react';
import { historyAPI } from '../services/api';
import DeleteCheckoutModal from '../components/DeleteCheckoutModal';

function History() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtros
  const [daysFilter, setDaysFilter] = useState(30);
  const [actionFilter, setActionFilter] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [useCustomDates, setUseCustomDates] = useState(false);
  
  // Modal de eliminación
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchHistoryLogs();
    fetchStats();
  }, [daysFilter, actionFilter, customStartDate, customEndDate, useCustomDates]);

  const fetchHistoryLogs = async () => {
    try {
      setLoading(true);
      
      let params = {
        skip: 0,
        limit: 100
      };
      
      if (useCustomDates && customStartDate && customEndDate) {
        params.start_date = new Date(customStartDate).toISOString();
        params.end_date = new Date(customEndDate).toISOString();
      } else {
        params.days = daysFilter;
      }
      
      if (actionFilter) {
        params.action_filter = actionFilter;
      }
      
      const data = await historyAPI.getLogs(params);
      setLogs(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch history logs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const data = await historyAPI.getStats(daysFilter);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const handleCheckoutDeleted = () => {
    fetchHistoryLogs();
    fetchStats();
  };

  const getActionBadgeClass = (action) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('check-in')) return 'action-badge check-in';
    if (actionLower.includes('check-out') && !actionLower.includes('eliminado')) return 'action-badge check-out';
    if (actionLower.includes('eliminado')) return 'action-badge deleted';
    if (actionLower.includes('prepayment') || actionLower.includes('prepago')) return 'action-badge prepayment';
    if (actionLower.includes('extendida') || actionLower.includes('extend')) return 'action-badge extend';
    if (actionLower.includes('manual entry') && !actionLower.includes('eliminado')) return 'action-badge manual';  // Manual pero NO eliminado
    if (actionLower.includes('discard')) return 'action-badge discard';
    if (actionLower.includes('blacklist') || actionLower.includes('sinpa')) return 'action-badge blacklist';
    return 'action-badge';
  };

  const getActionIcon = (action) => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('check-in')) return '📥';
    if (actionLower.includes('check-out') && !actionLower.includes('eliminado')) return '📤';
    if (actionLower.includes('eliminado')) return '🗑️';
    if (actionLower.includes('prepayment') || actionLower.includes('prepago')) return '💰';
    if (actionLower.includes('extendida') || actionLower.includes('extend')) return '➕';
    if (actionLower.includes('discard')) return '❌';
    if (actionLower.includes('manual entry') && !actionLower.includes('eliminado')) return '✍️';  // Manual pero NO eliminado
    if (actionLower.includes('blacklist') || actionLower.includes('sinpa')) return '🚫';
    return '📝';
  };

  const formatDetails = (details) => {
    if (!details) return '-';
    
    const detailsObj = typeof details === 'string' ? JSON.parse(details) : details;
    
    return Object.entries(detailsObj)
      .filter(([key, value]) => value !== null && value !== undefined)
      .map(([key, value]) => {
        const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        return `${formattedKey}: ${value}`;
      })
      .join(', ');
  };

  if (loading && logs.length === 0) return <div className="loading">Loading history...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="history">
      {/* Filters */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">
          <h2>🔍 Filters</h2>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            
            {/* Date Range Toggle */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                Date Range
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={!useCustomDates}
                    onChange={() => setUseCustomDates(false)}
                  />
                  <span>Quick Select</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    checked={useCustomDates}
                    onChange={() => setUseCustomDates(true)}
                  />
                  <span>Custom</span>
                </label>
              </div>
            </div>
            
            {/* Quick Date Select */}
            {!useCustomDates && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                  Time Period
                </label>
                <select 
                  className="form-control"
                  value={daysFilter}
                  onChange={(e) => setDaysFilter(Number(e.target.value))}
                  style={{ padding: '0.625rem', fontSize: '0.875rem' }}
                >
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days (1 month)</option>
                  <option value={90}>Last 90 days (3 months)</option>
                  <option value={365}>Last 365 days (1 year)</option>
                </select>
              </div>
            )}
            
            {/* Custom Date Range */}
            {useCustomDates && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    style={{ padding: '0.625rem', fontSize: '0.875rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    style={{ padding: '0.625rem', fontSize: '0.875rem' }}
                  />
                </div>
              </>
            )}
            
            {/* Action Filter - ACTUALIZADO CON NUEVAS OPCIONES */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}>
                Action Type
              </label>
              <select 
                className="form-control"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                style={{ padding: '0.625rem', fontSize: '0.875rem' }}
              >
                <option value="">All Actions</option>
                <option value="check-in">📥 Check-ins</option>
                <option value="check-out">📤 Check-outs</option>
                <option value="prepayment">💰 Prepayments</option>
                <option value="extend">➕ Extensions</option>
                <option value="eliminado">🗑️ Checkouts Eliminados</option>
                <option value="discard">❌ Discarded</option>
                <option value="manual entry">✍️ Manual Entries</option>
                <option value="blacklist">🚫 Blacklist / SINPA</option>
              </select>
            </div>
            
          </div>
          
          {/* Botones - Reset y Eliminar Checkout */}
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setDaysFilter(30);
                setActionFilter('');
                setCustomStartDate('');
                setCustomEndDate('');
                setUseCustomDates(false);
              }}
            >
              🔄 Reset Filters
            </button>
            <button 
              className="btn btn-danger"
              onClick={() => setShowDeleteModal(true)}
            >
              🗑️ Eliminar Checkout del Historial
            </button>
          </div>
        </div>
      </div>
      
      {/* History Table */}
      {logs.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ fontSize: '1.125rem', color: 'var(--secondary-color)' }}>
              📭 No history logs found for selected filters
            </p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>License Plate</th>
                    <th>Vehicle Type</th>
                    <th>Country</th>
                    <th>Action</th>
                    <th>Timestamp</th>
                    <th>Details</th>
                    <th>User</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>
                        <strong style={{ 
                          color: 'var(--primary-color)', 
                          fontSize: '1rem',
                          letterSpacing: '0.5px'
                        }}>
                          {log.license_plate}
                        </strong>
                      </td>
                      <td>{log.vehicle_type || '-'}</td>
                      <td>
                        {log.country ? (
                          <span style={{ 
                            padding: '0.25rem 0.5rem',
                            backgroundColor: 'rgba(74, 107, 223, 0.1)',
                            borderRadius: '4px',
                            fontSize: '0.875rem',
                            fontWeight: 600
                          }}>
                            {log.country}
                          </span>
                        ) : '-'}
                      </td>
                      <td>
                        <span className={getActionBadgeClass(log.action)}>
                          {getActionIcon(log.action)} {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.875rem' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ fontSize: '0.875rem', maxWidth: '300px' }}>
                        {formatDetails(log.details)}
                      </td>
                      <td>{log.username || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {/* Results Info */}
      <div style={{ 
        marginTop: '1rem', 
        textAlign: 'center', 
        color: 'var(--secondary-color)',
        fontSize: '0.875rem'
      }}>
        Showing {logs.length} event{logs.length !== 1 ? 's' : ''}
      </div>

      {/* Modal de eliminación */}
      <DeleteCheckoutModal
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        onDeleted={handleCheckoutDeleted}
      />
      
      {/* Estilos CSS mejorados para badges */}
      <style>{`
        .action-badge {
          padding: 0.375rem 0.75rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          display: inline-block;
          white-space: nowrap;
        }
        
        .action-badge.check-in {
          background-color: #d4edda;
          color: #155724;
        }
        
        .action-badge.check-out {
          background-color: #cce5ff;
          color: #004085;
        }
        
        .action-badge.prepayment {
          background-color: #d1ecf1;
          color: #0c5460;
        }
        
        .action-badge.extend {
          background-color: #fff3cd;
          color: #856404;
        }
        
        .action-badge.deleted {
          background-color: #f8d7da;
          color: #721c24;
        }
        
        .action-badge.manual {
          background-color: #e2e3e5;
          color: #383d41;
        }
        
        .action-badge.discard {
          background-color: #f5c6cb;
          color: #721c24;
        }
        
        .action-badge.blacklist {
          background-color: #343a40;
          color: #ffffff;
        }
      `}</style>
    </div>
  );
}

export default History;