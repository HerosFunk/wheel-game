import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import money_emoji from "../img/money_emoji.png";
import { Wheel } from "react-custom-roulette";
import { Pencil } from "lucide-react";
import './EditWheel.css';

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
  const navigate = useNavigate();
  const [isWheelVisible, setIsWheelVisible] = useState(false);
  const [wheel, setWheel] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (wheelId) {
      const fetchWheel = async () => {
        try {
          const response = await fetch(`${API_URL}/wheels/${wheelId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          console.log("Données reçues:", data); // Debug
          
          setNameValue(data.name || "");
          setOptions({ 
            option1: data.removeAfterSelection || false, 
            infinitySpin: data.numberOfSpins === -1 
          });
          setSpinLimit(data.numberOfSpins === -1 ? "" : data.numberOfSpins?.toString() || "");
          
          // L'API retourne 'elements' (minuscule), pas 'Elements'
          const elements = data.elements || [];
          setSegments(elements.map(element => ({ 
            id: element._id || element.id, 
            name: element.label || element.name, 
            weight: element.weight || 1, 
            isActif: element.isActif !== false 
          })).sort((a, b) => {
            // Amélioration du tri pour gérer différents types d'ID
            const aId = a.id || 0;
            const bId = b.id || 0;
            if (typeof aId === 'string' && typeof bId === 'string') {
              return aId.localeCompare(bId);
            }
            return aId > bId ? 1 : -1;
          }));
          
          setWheel(data);
        } catch (error) {
          console.error("Error fetching wheel:", error);
          setErrorMessage("Unable to load the wheel. Please try again.");
        }
      };

      fetchWheel();
    }
  }, [wheelId]);

  const colorPalette = ["#ff69b4", "purple", "#87CEEB"];

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
      setSpinLimit(""); // Réinitialise le champ si l'utilisateur active à nouveau "Infinity Spin"
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
        id: segment.id,
        name: segment.name,
        weight: segment.weight,
        isActif: segment.isActif,
      }))
    };

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
      
      // L'API retourne 'elements' (minuscule)
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
      
      // L'API retourne 'elements' (minuscule)
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
      await setAllElementsActive();
    } catch (error) {
      console.error("Error resetting results:", error);
      setErrorMessage("Unable to reset results");
    }
  };

  return (
    <div className="EditWheel">
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

      <h1>Edit Your Wheel 🎯</h1>

      {errorMessage && (
        <div className="error-message">
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {/* Section nom de la roue */}
      <div className="input-section">
        <h3>Wheel Configuration</h3>
        <div className="wheel-name-container">
          <label className="wheel-name-label">Wheel Name</label>
          <input
            type="text"
            placeholder="Enter your wheel name"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            className="wheel-name-input"
          />
        </div>

        {/* Formulaire d'ajout de segment */}
        <div className="segment-add-container">
          <label className="segment-add-label">Add a segment</label>
          
          <div className="segment-form">
            <input
              type="text"
              placeholder="e.g: Pizza, Option A..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="segment-name-input"
              onKeyPress={(e) => e.key === 'Enter' && handleAddSegment()}
            />
            <input
              type="number"
              min="1"
              max="9"
              value={weightValue}
              onChange={(e) => setWeightValue(e.target.value)}
              className="segment-weight-input"
              placeholder="Weight"
            />
            <button 
              onClick={handleAddSegment}
              className="segment-add-button"
              type="button"
            >
              Add
            </button>
          </div>

          <div className="weight-info">
            Higher weight = more likely to be selected (1-9 scale)
          </div>
        </div>
      </div>

      {/* Section des éléments existants */}
      <div className="existing-elements-section">
        <div className="section-header">
          <h3 className="section-title">Wheel Elements ({segments.length})</h3>
          <button 
            onClick={setAllElementsActive}
            className="bulk-action-button"
          >
            Activate All
          </button>
        </div>

        {segments.length === 0 ? (
          <div className="no-elements">
            <div className="no-elements-icon">🎯</div>
            <p>No elements in this wheel</p>
            <p>Use the form above to add segments</p>
          </div>
        ) : (
          <>
            <div className="elements-list">
              {segments.map((segment, index) => (
                <div 
                  key={segment.id || index} 
                  className={`element-item ${segment.isActif === false ? 'inactive' : 'active'}`}
                >
                  <div className={`status-dot ${segment.isActif === false ? 'inactive' : 'active'}`}></div>

                  <div className="element-name-container">
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
                        className="edit-input"
                        autoFocus
                      />
                    ) : (
                      <span className="element-name">{segment.name}</span>
                    )}
                  </div>

                  <input
                    type="number"
                    min="1"
                    max="9"
                    value={segment.weight || 1}
                    onChange={(e) => handleWeightChange(index, e.target.value)}
                    className="weight-input"
                    disabled={segment.isActif === false}
                  />

                  <span className={`probability-value ${segment.isActif === false ? 'inactive' : ''}`}>
                    {segment.isActif === false ? '0%' : calculateProbability(segment.weight || 1, segments)}%
                  </span>

                  <div className="action-buttons-container">
                    <button
                      onClick={() => handleEditClick(index)}
                      className="action-button edit-button"
                      title="Edit"
                      disabled={editingIndex === index}
                    >
                      ✏️
                    </button>

                    <button
                      onClick={() => toggleElementActive(segment.id || index)}
                      className={`action-button toggle-button ${segment.isActif === false ? 'inactive' : 'active'}`}
                      title={segment.isActif === false ? 'Activate' : 'Deactivate'}
                      disabled={editingIndex === index}
                    >
                      {segment.isActif === false ? '👁️‍🗨️' : '👁️'}
                    </button>

                    <button
                      onClick={() => handleDeleteSegment(index)}
                      className="action-button delete-button"
                      title="Delete"
                      disabled={editingIndex === index}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Statistiques */}
            <div className="elements-stats">
              <div className="stat-item">
                <span className="stat-label">Total:</span>
                <span className="stat-value">{segments.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Active:</span>
                <span className="stat-value active">{segments.filter(s => s.isActif !== false).length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Inactive:</span>
                <span className="stat-value inactive">{segments.filter(s => s.isActif === false).length}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Section des options */}
      <div className="options-section">
        <h3>Wheel Options</h3>
        <div className="options-container">
          <label className="option-label">
            <input
              type="checkbox"
              checked={options.option1}
              onChange={() => handleCheckboxChange("option1")}
            />
            Remove element after selection
          </label>
          <label className="option-label">
            <input
              type="checkbox"
              checked={options.infinitySpin}
              onChange={() => handleCheckboxChange("infinitySpin")}
            />
            Infinite spins
          </label>
        </div>

        {!options.infinitySpin && (
          <div className="spin-limit-container">
            <label className="spin-limit-label">Number of spins:</label>
            <input
              type="number"
              value={spinLimit}
              min="1"
              max="10000"
              step="1"
              placeholder="e.g: 10"
              onChange={(e) => setSpinLimit(e.target.value)}
              className="spin-limit-input"
            />
            <div className="spin-limit-hint">Between 1 and 10,000 spins</div>
          </div>
        )}
      </div>

      {/* Boutons d'action */}
      <div className="action-buttons">
        <button 
          className="preview-button"
          onClick={() => {
            if (segments.length < 2) {
              setErrorMessage("At least 2 segments are required for preview.");
              return;
            }
            const segmentObjects = segments.map((segment) => ({
              label: segment.name
            }));

            setWheel({
              elements: assignColors(segmentObjects, colorPalette),
            });
            setIsModalOpen(true);
            setIsWheelVisible(true);
          }}>
          Preview
        </button>
        <button className="save-button" onClick={handleSaveChanges}>
          Save Changes
        </button>
      </div>

      {/* Section des résultats */}
      {wheel && wheel.selectedElement && (
        <div className="results-section">
          <h3>Previous Results</h3>
          <ul className="results-list">
            {wheel.selectedElement.split(",").map((result, index) => {
              const segment = segments.find(segment => segment.id === parseInt(result));
              return (
                <li key={index} className="results-list-item">
                  <span className="result-index">{index + 1}:</span>
                  <span className="result-name">{segment ? segment.name : "Unknown"}</span>
                </li>
              );
            })}
          </ul>
          <button onClick={resetResults} className="reset-results-button">
            Reset Results
          </button>
        </div>
      )}
    </div>
  );
};

export default EditWheel;