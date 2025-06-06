// wheel-front/src/components/ResultsDisplay.jsx
import React, { useState, useEffect } from 'react';
import './ResultsDisplay.css';

const ResultsDisplay = ({ wheelId, isVisible, onClose }) => {
  console.log("ResultsDisplay component rendered with:", { wheelId, isVisible });
  
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('recent'); // 'recent', 'stats', 'history'
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Charger les résultats récents
  const loadRecentResults = async () => {
    try {
      setLoading(true);
      console.log("Fetching recent results from:", `http://localhost:3000/api/wheels/${wheelId}/results/recent?limit=20`);
      
      const response = await fetch(`http://localhost:3000/api/wheels/${wheelId}/results/recent?limit=20`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      console.log("Response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Recent results data received:", data);
      setResults(data);
    } catch (error) {
      console.error('Error loading recent results:', error);
      // Fallback vers l'ancien système si les nouvelles routes ne sont pas disponibles
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Charger les statistiques
  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3000/api/results/${wheelId}/stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  // Charger l'historique complet
  const loadHistory = async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:3000/api/results/${wheelId}?page=${pageNum}&limit=20`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (pageNum === 1) {
        setResults(data.results);
      } else {
        setResults(prev => [...prev, ...data.results]);
      }
      
      setHasMore(data.pagination.page < data.pagination.pages);
    } catch (error) {
      console.error('Error loading history:', error);
      if (pageNum === 1) {
        setResults([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("ResultsDisplay useEffect triggered:", { isVisible, wheelId, activeTab });
    if (isVisible && wheelId) {
      if (activeTab === 'recent') {
        console.log("Loading recent results...");
        loadRecentResults();
      } else if (activeTab === 'stats') {
        console.log("Loading stats...");
        loadStats();
      } else if (activeTab === 'history') {
        console.log("Loading history...");
        loadHistory(1);
        setPage(1);
      }
    }
  }, [isVisible, wheelId, activeTab]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadMoreHistory = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadHistory(nextPage);
    }
  };

  if (!isVisible) {
    console.log("ResultsDisplay not visible, returning null");
    return null;
  }

  console.log("ResultsDisplay rendering modal with results:", results.length);

  return (
    <div className="results-overlay">
      <div className="results-modal">
        <div className="results-header">
          <h2>Wheel Results</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="results-tabs">
          <button 
            className={`tab ${activeTab === 'recent' ? 'active' : ''}`}
            onClick={() => setActiveTab('recent')}
          >
            Recent Results
          </button>
          <button 
            className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            Statistics
          </button>
          <button 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Full History
          </button>
        </div>

        <div className="results-content">
          {loading && results.length === 0 && (
            <div className="loading">Loading...</div>
          )}

          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ background: '#333', padding: '10px', margin: '10px 0', borderRadius: '4px', fontSize: '12px' }}>
              <strong>Debug Info:</strong><br/>
              Active Tab: {activeTab}<br/>
              Results Length: {results.length}<br/>
              Loading: {loading.toString()}<br/>
              WheelId: {wheelId}
            </div>
          )}

          {/* Recent Results Tab */}
          {activeTab === 'recent' && (
            <div className="recent-results">
              <h3>Last {results.length} Spins</h3>
              <div className="results-list">
                {results.map((result, index) => (
                  <div key={result._id} className="result-item recent">
                    <div className="result-number">#{result.spinNumber || (results.length - index)}</div>
                    <div className="result-content">
                      <span className="result-label">{result.elementLabel}</span>
                      <div className="result-meta">
                        <span className="result-weight">Weight: {result.elementWeight}</span>
                        <span className="result-time">{formatDate(result.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {results.length === 0 && !loading && (
                <div className="no-results">
                  <p>No results yet. Start spinning to see results!</p>
                </div>
              )}
            </div>
          )}

          {/* Statistics Tab */}
          {activeTab === 'stats' && stats && (
            <div className="stats-results">
              <div className="stats-overview">
                <h3>Overview</h3>
                <div className="stats-cards">
                  <div className="stat-card">
                    <div className="stat-number">{stats.totalSpins}</div>
                    <div className="stat-label">Total Spins</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{stats.elementStats.length}</div>
                    <div className="stat-label">Different Results</div>
                  </div>
                </div>
              </div>

              <h3>Element Statistics</h3>
              <div className="element-stats">
                {stats.elementStats.map((stat) => (
                  <div key={stat._id} className="element-stat">
                    <div className="element-info">
                      <span className="element-name">{stat.label}</span>
                      <span className="element-details">
                        Weight: {stat.weight} | Expected: {((stat.weight / stats.elementStats.reduce((sum, s) => sum + s.weight, 0)) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="element-stats-bar">
                      <div className="stats-bar">
                        <div 
                          className="stats-fill"
                          style={{ width: `${stat.percentage}%` }}
                        ></div>
                      </div>
                      <div className="stats-numbers">
                        <span className="actual-percentage">{stat.percentage}%</span>
                        <span className="actual-count">({stat.count} times)</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="history-results">
              <h3>Complete History</h3>
              <div className="results-list">
                {results.map((result) => (
                  <div key={result._id} className="result-item history">
                    <div className="result-number">#{result.spinNumber}</div>
                    <div className="result-content">
                      <span className="result-label">{result.elementLabel}</span>
                      <div className="result-meta">
                        <span className="result-weight">Weight: {result.elementWeight}</span>
                        <span className="result-time">{formatDate(result.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {hasMore && (
                <button 
                  className="load-more-button"
                  onClick={loadMoreHistory}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;