import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import money_emoji from "../img/money_emoji.png";
import { Wheel } from "react-custom-roulette";
import { Pencil } from "lucide-react";

const API_URL = "http://localhost:3000/api";

const EditWheel = () => {
  const { wheelId } = useParams();
  const [segments, setSegments] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [weightValue, setWeightValue] = useState(1);
  const [nameValue, setNameValue] = useState("");
  const [options, setOptions] = useState({ option1: false, infinitySpin: true });
  const [spinLimit, setSpinLimit] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [isWheelVisible, setIsWheelVisible] = useState(false);
  const [wheel, setWheel] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recentResults, setRecentResults] = useState([]);

  const colorPalette = ["#ff69b4", "purple", "#87CEEB", "#e74c3c", "#9b59b6", "#3498db", "#1abc9c", "#2ecc71", "#f39c12", "#e67e22"];

  const loadRecentResults = async () => {
    try {
      const response = await fetch(`${API_URL}/wheels/${wheelId}/results/recent?limit=10`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setRecentResults(data);
    } catch (error) {
      console.error("Error loading recent results:", error);
      setRecentResults([]);
    }
  };

  useEffect(() => {
    if (wheelId) {
      const fetchWheel = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(`${API_URL}/wheels/${wheelId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          setNameValue(data.name || "");
          setOptions({ 
            option1: data.removeAfterSelection || false, 
            infinitySpin: data.numberOfSpins === -1 
          });
          setSpinLimit(data.numberOfSpins === -1 ? "" : data.numberOfSpins?.toString() || "");
          
          const elements = data.elements || [];
          setSegments(elements.map(element => ({ 
            id: element._id || element.id, 
            name: element.label || element.name, 
            weight: element.weight || 1, 
            isActif: element.isActif !== false 
          })).sort((a, b) => {
            const aId = a.id || 0;
            const bId = b.id || 0;
            if (typeof aId === 'string' && typeof bId === 'string') {
              return aId.localeCompare(bId);
            }
            return aId > bId ? 1 : -1;
          }));
          
          setWheel(data);
          await loadRecentResults();
        } catch (error) {
          console.error("Error fetching wheel:", error);
          setErrorMessage("Unable to load the wheel. Please try again.");
        } finally {
          setIsLoading(false);
        }
      };

      fetchWheel();
    }
  }, [wheelId]);

  const assignColors = (elements, colorPalette) => {
    let lastColor = null;
    return elements.map((element) => {
      const availableColors = colorPalette.filter((color) => color !== lastColor);
      const assignedColor =
        availableColors[Math.floor(Math.random() * availableColors.length)];
      lastColor = assignedColor;
      return {
        ...element,
        color: assignedColor,
      };
    });
  };

  const calculateProbability = (weight, segments) => {
    const activeSegments = segments.filter(segment => segment.isActif !== false);
    const totalWeight = activeSegments.reduce((sum, segment) => sum + (segment.weight || 1), 0);
    return totalWeight > 0 ? ((weight / totalWeight) * 100).toFixed(1) : 0;
  };

  const handleAddSegment = () => {
    let segmentName = inputValue.trim();
    if (!segmentName) {
      segmentName = `Element ${segments.length + 1}`;
    }

    const weight = parseInt(weightValue);
    if (weight < 1 || weight > 9) {
      setErrorMessage("Weight must be between 1 and 9");
      return;
    }

    const newSegment = {
      id: `temp_${Date.now()}`,
      name: segmentName,
      weight: weight,
      isActif: true
    };

    setSegments([...segments, newSegment]);
    setInputValue("");
    setWeightValue(1);
    setErrorMessage("");
  };

  const handleWeightChange = (index, newWeight) => {
    const weight = parseInt(newWeight);
    if (weight >= 1 && weight <= 9) {
      const updatedSegments = segments.map((segment, i) => 
        i === index ? { ...segment, weight: weight } : segment
      );
      setSegments(updatedSegments);
    }
  };

  const splitTextIntoLines = (text, maxCharsPerLine) => {
    if (!text || text.length <= maxCharsPerLine) return text;
    const cutIndex = text.indexOf(" ", maxCharsPerLine);
    if (cutIndex === -1) return text;
    return `${text.substring(0, cutIndex)}...`;
  };

  const handleCheckboxChange = (option) => {
    setOptions((prevOptions) => ({
      ...prevOptions,
      [option]: !prevOptions[option],
    }));
    if (option === "infinitySpin" && !options.infinitySpin) {
      setSpinLimit("");
    }
  };

  const handleEditClick = (index) => {
    setEditingIndex(index);
    setEditingValue(segments[index].name);
  };

  const handleEditSave = (index) => {
    if (editingValue.trim()) {
      const updatedSegments = [...segments];
      updatedSegments[index] = { ...updatedSegments[index], name: editingValue.trim() };
      setSegments(updatedSegments);
      setEditingIndex(null);
      setEditingValue("");
    }
  };

  const handleDeleteSegment = (index) => {
    setSegments(segments.filter((_, i) => i !== index));
  };

  const handleSaveChanges = async () => {
    setErrorMessage("");

    if (!nameValue.trim()) {
      setErrorMessage("Wheel name is required.");
      return;
    }

    if (segments.length < 2) {
      setErrorMessage("At least 2 segments are required.");
      return;
    }

    if (!options.infinitySpin && (!spinLimit || parseInt(spinLimit) <= 0)) {
      setErrorMessage("A valid spin limit is required if Infinity Spin is disabled.");
      return;
    }

    const wheelData = {
      name: nameValue,
      removeAfterSelection: options.option1,
      numberOfSpins: options.infinitySpin ? -1 : parseInt(spinLimit),
      elements: segments.map(segment => ({
        _id: segment.id && !segment.id.toString().startsWith('temp_') ? segment.id : undefined,
        label: segment.name,
        weight: segment.weight || 1,
        isActif: segment.isActif !== undefined ? segment.isActif : true,
      }))
    };

    console.log("Sending wheel data:", wheelData);

    try {
      const response = await fetch(`${API_URL}/wheels/${wheelId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(wheelData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`API error: ${response.statusText}`);
      }

      navigate(`/wheel/${wheelId}`);
    } catch (error) {
      setErrorMessage(`Error saving changes: ${error.message}`);
    }
  };

  const toggleElementActive = async (elementId) => {
    try {
      const response = await fetch(`${API_URL}/wheels/${wheelId}/elements/${elementId}/toggle`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const updatedWheel = await response.json();
      
      const elements = updatedWheel.elements || [];
      setSegments(elements.map(element => ({ 
        id: element._id || element.id, 
        name: element.label || element.name, 
        weight: element.weight || 1, 
        isActif: element.isActif !== false 
      })).sort((a, b) => {
        const aId = a.id || 0;
        const bId = b.id || 0;
        if (typeof aId === 'string' && typeof bId === 'string') {
          return aId.localeCompare(bId);
        }
        return aId > bId ? 1 : -1;
      }));
      
      setWheel(updatedWheel);
    } catch (error) {
      console.error("Error toggling element active:", error);
      setErrorMessage("Unable to modify element status");
    }
  };

  const setAllElementsActive = async () => {
    try {
      const response = await fetch(`${API_URL}/wheels/${wheelId}/elements/set-all-active`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const updatedWheel = await response.json();
      
      const elements = updatedWheel.elements || [];
      setSegments(elements.map(element => ({ 
        id: element._id || element.id, 
        name: element.label || element.name, 
        weight: element.weight || 1, 
        isActif: element.isActif !== false 
      })).sort((a, b) => {
        const aId = a.id || 0;
        const bId = b.id || 0;
        if (typeof aId === 'string' && typeof bId === 'string') {
          return aId.localeCompare(bId);
        }
        return aId > bId ? 1 : -1;
      }));
      
      setWheel(updatedWheel);
    } catch (error) {
      console.error("Error setting all elements active:", error);
      setErrorMessage("Unable to activate all elements");
    }
  };

  const resetResults = async () => {
    try {
      const response = await fetch(`${API_URL}/wheels/${wheelId}/results/reset`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      const updatedWheel = await response.json();
      setWheel(updatedWheel);
      setRecentResults([]);
      await setAllElementsActive();
    } catch (error) {
      console.error("Error resetting results:", error);
      setErrorMessage("Unable to reset results");
    }
  };

  if (isLoading) {
    return <div className="WheelDetails loading">Loading...</div>;
  }

  if (errorMessage && !wheel) {
    return (
      <div className="WheelDetails">
        <div className="error-message">
          <strong>Error:</strong> {errorMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="WheelDetails">
      <div className="back-button">
        <Link to="/">
          <img
            src={money_emoji}
            alt="Home"
            className="back-button-img"
          />
        </Link>
      </div>

      {wheel && (
        <div className={`modal-overlay ${isWheelVisible ? "visible" : "hidden"}`} 
          onClick={() => {setIsModalOpen(false); setIsWheelVisible(false);}}
          style={{
            transition: "opacity 0.3s ease, visibility 0.3s ease",
            opacity: isWheelVisible ? 1 : 0,
            visibility: isWheelVisible ? "visible" : "hidden",
            pointerEvents: isWheelVisible ? "auto" : "none",
          }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => {setIsModalOpen(false); setIsWheelVisible(false);}}>
              ❌
            </button>
            <Wheel
              prizeNumber={0}
              fontSize={8}
              spinDuration={0}
              data={(wheel.elements || []).map((element) => ({
                option: splitTextIntoLines(element.label || element.name, 38),
                style: {
                  backgroundColor: element.color,
                  textColor: "white",
                },
              }))}
              mustStartSpinning={false}
              onStopSpinning={() => {}}
            />
          </div>
        </div>
      )}

      <div className="wheel-header">
        <h1 className="wheel-title">EDIT WHEEL</h1>
      </div>

      {errorMessage && (
        <div className="wheel-info-card" style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)', marginBottom: '24px' }}>
          <div className="info-item">
            <div className="info-icon">⚠️</div>
            <div className="info-content">
              <span className="info-label">Error</span>
              <span className="info-value">{errorMessage}</span>
            </div>
          </div>
        </div>
      )}

      <div className="wheel-info-card">
        <div className="info-item">
          <div className="info-icon">🎯</div>
          <div className="info-content">
            <span className="info-label">Wheel Name</span>
            <input
              type="text"
              placeholder="Enter your wheel name"
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              className="info-value"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '1.3rem',
                fontWeight: 'bold',
                outline: 'none',
                width: '100%'
              }}
            />
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon">📊</div>
          <div className="info-content">
            <span className="info-label">Total Elements</span>
            <span className="info-value">{segments.length}</span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon">✅</div>
          <div className="info-content">
            <span className="info-label">Active Elements</span>
            <span className="info-value">{segments.filter(s => s.isActif !== false).length}</span>
          </div>
        </div>
      </div>

      <div className="elements-list">
        <h3>Add New Element</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Element name"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddSegment()}
            style={{
              flex: 1,
              minWidth: '200px',
              background: '#34363c',
              border: '1px solid #444',
              borderRadius: '8px',
              padding: '12px',
              color: '#fff',
              fontSize: '1rem'
            }}
          />
          <input
            type="number"
            min="1"
            max="9"
            value={weightValue}
            onChange={(e) => setWeightValue(e.target.value)}
            placeholder="Weight"
            style={{
              width: '80px',
              background: '#34363c',
              border: '1px solid #444',
              borderRadius: '8px',
              padding: '12px',
              color: '#fff',
              fontSize: '1rem',
              textAlign: 'center'
            }}
          />
          <button 
            onClick={handleAddSegment}
            className="control-button"
            style={{ whiteSpace: 'nowrap' }}
          >
            Add Element
          </button>
        </div>
        <div style={{ color: '#a0a0a0', fontSize: '0.9rem', marginBottom: '20px' }}>
          Higher weight = more likely to be selected (1-9 scale)
        </div>
      </div>

      <div className="elements-list">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3>Wheel Elements ({segments.length})</h3>
          <button 
            onClick={setAllElementsActive}
            className="control-button"
          >
            Activate All
          </button>
        </div>

        {segments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#a0a0a0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎯</div>
            <p>No elements in this wheel</p>
            <p>Use the form above to add segments</p>
          </div>
        ) : (
          <div className="elements-grid" style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '12px 24px',
            rowGap: '40px',
            padding: '20px 0'
          }}>
            {segments.map((segment, index) => (
              <div 
                key={segment.id || index} 
                className={`element-card ${segment.isActif === false ? 'disabled' : ''}`}
                style={{
                  borderLeft: `6px solid ${segment.isActif === false ? '#666' : '#ffb300'}`,
                  opacity: segment.isActif === false ? 0.6 : 1,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}
              >
                <div className="element-header" style={{ marginBottom: '20px' }}>
                  <div 
                    className="element-color-indicator" 
                    style={{ 
                      backgroundColor: segment.isActif === false ? '#666' : '#ffb300',
                      width: '12px',
                      height: '12px'
                    }}
                  ></div>
                  
                  {editingIndex === index ? (
                    <input
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => handleEditSave(index)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') handleEditSave(index);
                        if (e.key === 'Escape') {
                          setEditingIndex(null);
                          setEditingValue("");
                        }
                      }}
                      style={{
                        background: 'transparent',
                        border: '1px solid #ffb300',
                        borderRadius: '4px',
                        padding: '4px 8px',
                        color: '#fff',
                        fontSize: '1rem',
                        flex: 1
                      }}
                      autoFocus
                    />
                  ) : (
                    <span className="element-label">{segment.name}</span>
                  )}
                </div>

                <div className="element-details">
                  <div className="element-weight">
                    <span className="detail-label">Weight:</span>
                    <input
                      type="number"
                      min="1"
                      max="9"
                      value={segment.weight || 1}
                      onChange={(e) => handleWeightChange(index, e.target.value)}
                      disabled={segment.isActif === false || editingIndex === index}
                      style={{
                        width: '60px',
                        background: '#444',
                        border: '1px solid #666',
                        borderRadius: '4px',
                        padding: '4px',
                        color: '#fff',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                  <div className="element-probability">
                    <span className="detail-label">Probability:</span>
                    <span className="detail-value">
                      {segment.isActif === false ? '0' : calculateProbability(segment.weight || 1, segments)}%
                    </span>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '8px', 
                  marginTop: 'auto'
                }}>
                  <button
                    onClick={() => handleEditClick(index)}
                    disabled={editingIndex === index}
                    style={{
                      background: '#6c5ce7',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      cursor: editingIndex === index ? 'not-allowed' : 'pointer',
                      opacity: editingIndex === index ? 0.5 : 1,
                      width: '100%'
                    }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => toggleElementActive(segment.id || index)}
                    disabled={editingIndex === index || (segment.id && segment.id.toString().startsWith('temp_'))}
                    style={{
                      background: segment.isActif === false ? '#00b894' : '#e17055',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      cursor: (editingIndex === index || (segment.id && segment.id.toString().startsWith('temp_'))) ? 'not-allowed' : 'pointer',
                      opacity: (editingIndex === index || (segment.id && segment.id.toString().startsWith('temp_'))) ? 0.5 : 1,
                      width: '100%'
                    }}
                    title={segment.id && segment.id.toString().startsWith('temp_') ? 'Save the wheel first to activate/deactivate this element' : ''}
                  >
                    {segment.isActif === false ? 'Activate' : 'Deactivate'}
                  </button>

                  <button
                    onClick={() => handleDeleteSegment(index)}
                    disabled={editingIndex === index}
                    style={{
                      background: '#e74c3c',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      cursor: editingIndex === index ? 'not-allowed' : 'pointer',
                      opacity: editingIndex === index ? 0.5 : 1,
                      width: '100%'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="elements-list">
        <h3>Wheel Options</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', fontSize: '1rem' }}>
            <input
              type="checkbox"
              checked={options.option1}
              onChange={() => handleCheckboxChange("option1")}
              style={{ transform: 'scale(1.2)' }}
            />
            Remove element after selection
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#fff', fontSize: '1rem' }}>
            <input
              type="checkbox"
              checked={options.infinitySpin}
              onChange={() => handleCheckboxChange("infinitySpin")}
              style={{ transform: 'scale(1.2)' }}
            />
            Infinite spins
          </label>

          {!options.infinitySpin && (
            <div style={{ marginLeft: '32px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <label style={{ color: '#fff', fontSize: '1rem' }}>Number of spins:</label>
              <input
                type="number"
                value={spinLimit}
                min="1"
                max="10000"
                step="1"
                placeholder="e.g: 10"
                onChange={(e) => setSpinLimit(e.target.value)}
                style={{
                  width: '120px',
                  background: '#34363c',
                  border: '1px solid #444',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '1rem'
                }}
              />
              <span style={{ color: '#a0a0a0', fontSize: '0.9rem' }}>
                (1-10,000)
              </span>
            </div>
          )}
        </div>
      </div>

      {recentResults.length > 0 && (
        <div className="recent-results-preview">
          <div className="recent-results-header">
            <h3>Recent Results</h3>
            <button onClick={resetResults} className="control-button">
              Reset Results
            </button>
          </div>
          <div className="recent-results-list">
            {recentResults.slice(0, 5).map((result, index) => (
              <div key={result._id || index} className="recent-result-item">
                <div className="result-position">#{result.spinNumber || (index + 1)}</div>
                <div className="result-name">{result.elementLabel || 'Unknown'}</div>
                <div className="result-time">
                  {result.createdAt ? new Date(result.createdAt).toLocaleString() : 'Unknown time'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="admin-controls">
        <div className="admin-buttons">
          <button 
            className="control-button"
            onClick={() => {
              if (segments.length < 2) {
                setErrorMessage("At least 2 segments are required for preview.");
                return;
              }
              const segmentObjects = segments.filter(s => s.isActif !== false).map((segment) => ({
                label: segment.name
              }));

              setWheel({
                elements: assignColors(segmentObjects, colorPalette),
              });
              setIsModalOpen(true);
              setIsWheelVisible(true);
            }}
          >
            Preview Wheel
          </button>
          
          <button 
            className="control-button" 
            onClick={handleSaveChanges}
            style={{ 
              background: 'linear-gradient(135deg, #00b894, #00a085)',
              boxShadow: '0 4px 15px rgba(0, 184, 148, 0.3)'
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditWheel;