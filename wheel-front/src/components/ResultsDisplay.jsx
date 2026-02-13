import React, { useState, useEffect, useMemo, useCallback } from 'react';
import config from '../config/config';
import './ResultsDisplay.css';

const ResultsDisplay = ({ wheelId, isVisible, onClose }) => {
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('recent');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [elementFilter, setElementFilter] = useState('');

  const tabs = [
    { id: 'recent', label: 'Recent Results', icon: '🕐' },
    { id: 'stats', label: 'Statistics', icon: '📊' },
  ];

  const loadRecentResults = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/wheel-game-api/wheels/${wheelId}/results/recent?limit=20`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [wheelId]);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/wheel-game-api/wheels/${wheelId}/results?format=stats`, {
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
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [wheelId]);

  const loadHistory = useCallback(async (pageNum = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`${config.apiUrl}/wheel-game-api/wheels/${wheelId}/results?page=${pageNum}&limit=20`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (pageNum === 1) {
        setResults(data.results || []);
      } else {
        setResults(prev => [...prev, ...(data.results || [])]);
      }
      
      setHasMore(data.pagination?.page < data.pagination?.pages);
    } catch (error) {
      if (pageNum === 1) {
        setResults([]);
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [wheelId]);

  const filteredResults = useMemo(() => {
    if (!results) return [];
    
    return results.filter(result => {
      const matchesSearch = !searchTerm || 
        result.elementLabel?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesDate = !dateFilter || 
        new Date(result.createdAt).toDateString() === new Date(dateFilter).toDateString();
        
      const matchesElement = !elementFilter || 
        result.elementLabel === elementFilter;
        
      return matchesSearch && matchesDate && matchesElement;
    });
  }, [results, searchTerm, dateFilter, elementFilter]);

  const uniqueElements = useMemo(() => {
    if (!results) return [];
    const elements = [...new Set(results.map(r => r.elementLabel))];
    return elements.filter(Boolean);
  }, [results]);

  const exportData = useCallback((format = 'csv') => {
    if (!results || results.length === 0) return;
    
    if (format === 'csv') {
      const headers = ['Spin Number', 'Element', 'Weight', 'Date', 'Time'];
      const csvContent = [
        headers.join(','),
        ...results.map(result => [
          result.spinNumber || '',
          `"${result.elementLabel || ''}"`,
          result.elementWeight || '',
          new Date(result.createdAt).toLocaleDateString(),
          new Date(result.createdAt).toLocaleTimeString()
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wheel-results-${wheelId}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'json') {
      const jsonContent = JSON.stringify(results, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wheel-results-${wheelId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [results, wheelId]);

  const analytics = useMemo(() => {
    if (!results || results.length === 0) return null;
    
    const hourlyTrends = results.reduce((acc, result) => {
      const hour = new Date(result.createdAt).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});
    
    const sequences = [];
    for (let i = 0; i < results.length - 1; i++) {
      const current = results[i].elementLabel;
      const next = results[i + 1].elementLabel;
      if (current && next) {
        const sequence = `${current} → ${next}`;
        const existing = sequences.find(s => s.sequence === sequence);
        if (existing) {
          existing.count++;
        } else {
          sequences.push({ sequence, count: 1 });
        }
      }
    }
    
    const streaks = [];
    let currentStreak = { element: results[0]?.elementLabel, count: 1 };
    
    for (let i = 1; i < results.length; i++) {
      if (results[i].elementLabel === currentStreak.element) {
        currentStreak.count++;
      } else {
        if (currentStreak.count > 1) {
          streaks.push({ ...currentStreak });
        }
        currentStreak = { element: results[i].elementLabel, count: 1 };
      }
    }
    
    if (currentStreak.count > 1) {
      streaks.push(currentStreak);
    }
    
    return {
      hourlyTrends,
      topSequences: sequences.sort((a, b) => b.count - a.count).slice(0, 5),
      longestStreaks: streaks.sort((a, b) => b.count - a.count).slice(0, 5),
      totalSpins: results.length,
      averageSpinsPerDay: results.length / Math.max(1, Math.ceil((Date.now() - new Date(results[results.length - 1]?.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
    };
  }, [results]);

  useEffect(() => {
    if (isVisible && wheelId) {
      if (activeTab === 'recent') {
        loadRecentResults();
      } else if (activeTab === 'stats') {
        loadStats();
      } else if (activeTab === 'analytics') {
      }
    }
  }, [isVisible, wheelId, activeTab, loadRecentResults, loadStats]);

  const formatDate = useCallback((dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const formatRelativeTime = useCallback((dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  }, []);

  const loadMoreHistory = useCallback(() => {
    if (hasMore && !loading && activeTab === 'history') {
      const nextPage = page + 1;
      setPage(nextPage);
      loadHistory(nextPage);
    }
  }, [hasMore, loading, activeTab, page, loadHistory]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isVisible) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="results-overlay" onClick={onClose}>
      <div className="results-modal" onClick={e => e.stopPropagation()}>
        <div className="results-header">
          <h2>Wheel Results</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="results-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="results-content">
          {loading && results.length === 0 && (
            <div className="loading">
              <div className="loading-spinner"></div>
              Loading results...
            </div>
          )}

          {activeTab === 'recent' && (
            <div className="recent-results">
              <div className="section-header">
                <h3 className="section-title">
                  🕐 Recent Results
                </h3>
              </div>

              <div className="filters-container">
                <input
                  type="text"
                  placeholder="Search results..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="filter-input"
                />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="filter-input"
                />
                <select
                  value={elementFilter}
                  onChange={(e) => setElementFilter(e.target.value)}
                  className="filter-input"
                >
                  <option value="">All elements</option>
                  {uniqueElements.map(element => (
                    <option key={element} value={element}>{element}</option>
                  ))}
                </select>
              </div>

              <div className="results-list">
                {filteredResults.map((result, index) => (
                  <div key={result._id} className="result-item recent">
                    <div className="result-number">#{result.spinNumber || (filteredResults.length - index)}</div>
                    <div className="result-content">
                      <span className="result-label">{result.elementLabel}</span>
                      <div className="result-meta">
                        <span className="result-weight">Weight: {result.elementWeight}</span>
                        <span className="result-time">{formatRelativeTime(result.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {(!filteredResults || filteredResults.length === 0) && !loading && (
                <div className="no-results">
                  <div className="no-results-icon">🎯</div>
                  <h3>No results found</h3>
                  <p>Start spinning to see results or adjust your filters!</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="stats-results">
              {stats && (
                <>
                  <div className="stats-overview">
                    <div className="section-header">
                      <h3 className="section-title">
                        📊 Overview
                      </h3>
                    </div>
                    <div className="stats-cards">
                      <div className="stat-card">
                        <div className="stat-number">{stats.totalSpins || 0}</div>
                        <div className="stat-label">Total Spins</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number">{stats.elementStats?.length || 0}</div>
                        <div className="stat-label">Different Results</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number">
                          {stats.elementStats?.length > 0 ? 
                            Math.max(...stats.elementStats.map(s => s.count)) : 0}
                        </div>
                        <div className="stat-label">Most Frequent</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number">
                          {stats.totalSpins > 0 ? 
                            ((stats.elementStats?.reduce((max, stat) => 
                              stat.count > max.count ? stat : max, { count: 0 })?.percentage) || 0) + '%' : '0%'}
                        </div>
                        <div className="stat-label">Highest Rate</div>
                      </div>
                    </div>
                  </div>

                  <div className="section-header">
                    <h3 className="section-title">
                      📈 Element Performance
                    </h3>
                  </div>
                  <div className="element-stats">
                    {stats.elementStats?.map((stat) => {
                      const totalWeight = stats.elementStats.reduce((sum, s) => sum + s.weight, 0);
                      const expectedPercentage = ((stat.weight / totalWeight) * 100).toFixed(1);
                      const variance = (parseFloat(stat.percentage) - parseFloat(expectedPercentage)).toFixed(1);
                      
                      return (
                        <div key={stat._id} className="element-stat">
                          <div className="element-info">
                            <span className="element-name">{stat.label}</span>
                            <div className="element-details">
                              <span>Weight: {stat.weight}</span>
                              <span style={{ color: variance > 0 ? '#00b894' : variance < 0 ? '#e17055' : '#74b9ff' }}>
                              </span>
                            </div>
                          </div>
                          <div className="element-stats-bar">
                            <div className="stats-bar-container">
                              <div className="stats-bar">
                                <div 
                                  className="stats-fill"
                                  style={{ 
                                    width: `${Math.min(100, stat.percentage)}%`,
                                    '--target-width': `${Math.min(100, stat.percentage)}%`
                                  }}
                                  data-animate="true"
                                ></div>
                              </div>
                            </div>
                            <div className="stats-numbers">
                              <span className="actual-percentage">{stat.percentage}%</span>
                              <span className="expected-percentage">Expected: {expectedPercentage}%</span>
                              <span className="actual-count">({stat.count} times)</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              
              {!stats && !loading && (
                <div className="no-results">
                  <div className="no-results-icon">📊</div>
                  <h3>No statistics available</h3>
                  <p>Start spinning to generate statistics!</p>
                </div>
              )}
            </div>
          )}

          {false && (
            <div className="analytics-section">
              <div className="section-header">
                <h3 className="section-title">
                  📈 Advanced Analytics
                </h3>
              </div>

              {analytics && (
                <>
                  <div className="stats-cards">
                    <div className="stat-card">
                      <div className="stat-number">{analytics.totalSpins}</div>
                      <div className="stat-label">Total Spins</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{analytics.averageSpinsPerDay.toFixed(1)}</div>
                      <div className="stat-label">Avg/Day</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{analytics.longestStreaks[0]?.count || 0}</div>
                      <div className="stat-label">Longest Streak</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-number">{analytics.topSequences.length}</div>
                      <div className="stat-label">Unique Sequences</div>
                    </div>
                  </div>

                  <div className="chart-container">
                    <div className="chart-placeholder">
                      <h4>📅 Activity by Hour</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px', marginTop: '20px' }}>
                        {Array.from({ length: 24 }, (_, i) => (
                          <div key={i} style={{ textAlign: 'center', padding: '8px', background: 'rgba(255,179,0,0.1)', borderRadius: '4px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#ffb300' }}>{i}h</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{analytics.hourlyTrends[i] || 0}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {analytics.topSequences.length > 0 && (
                    <div className="element-stats">
                      <h4 style={{ color: '#ffb300', marginBottom: '16px' }}>🔗 Most Common Sequences</h4>
                      {analytics.topSequences.map((seq, index) => (
                        <div key={index} className="element-stat">
                          <div className="element-info">
                            <span className="element-name">{seq.sequence}</span>
                            <span className="element-details">Occurred {seq.count} times</span>
                          </div>
                          <div className="element-stats-bar">
                            <div className="stats-bar">
                              <div 
                                className="stats-fill"
                                style={{ 
                                  width: `${(seq.count / analytics.topSequences[0].count) * 100}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {analytics.longestStreaks.length > 0 && (
                    <div className="element-stats">
                      <h4 style={{ color: '#ffb300', marginBottom: '16px' }}>🔥 Longest Streaks</h4>
                      {analytics.longestStreaks.map((streak, index) => (
                        <div key={index} className="element-stat">
                          <div className="element-info">
                            <span className="element-name">{streak.element}</span>
                            <span className="element-details">{streak.count} consecutive times</span>
                          </div>
                          <div className="element-stats-bar">
                            <div className="stats-bar">
                              <div 
                                className="stats-fill"
                                style={{ 
                                  width: `${(streak.count / analytics.longestStreaks[0].count) * 100}%`
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {(!analytics || analytics.totalSpins === 0) && !loading && (
                <div className="no-results">
                  <div className="no-results-icon">📈</div>
                  <h3>No analytics data</h3>
                  <p>More spins needed to generate meaningful analytics!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsDisplay;