import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import money_emoji from "../img/money_emoji.png";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Cookies from "js-cookie";
import CustomWheel from './CustomWheel';
import ResultsDisplay from './ResultsDisplay';
import { getWheel, spinWheel, updateElementStatus, setAllElementsActive, resetResults } from '../services/api';
import './WheelDetails.css';
import io from 'socket.io-client';

const notify = () => toast("Link copied!");
const API_URL = "https://wheel-game.azurewebsites.net";

const colorPalette = [
  "#ff69b4", "#e74c3c", "#9b59b6", "#3498db", "#1abc9c", "#2ecc71",
  "#f39c12", "#e67e22", "#34495e", "#95a5a6", "#fd79a8", "#6c5ce7",
  "#74b9ff", "#00b894", "#fdcb6e", "#e17055", "#81ecec", "#a29bfe",
  "#ffeaa7", "#fab1a0", "#ff7675", "#55a3ff", "#fd79a8", "#fdcb6e"
];

const assignColors = (elements, colorPalette) => {
  return elements.map((element, index) => {
    const colorIndex = index % colorPalette.length;
    return {
      ...element,
      color: colorPalette[colorIndex],
    };
  });
};

const calculateProbability = (weight, segments) => {
  const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
  return ((weight / totalWeight) * 100).toFixed(1);
};

const createColorVariations = (baseColor) => {
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgb = hexToRgb(baseColor);
  if (!rgb) return { light: baseColor, dark: baseColor, alpha: baseColor + '20' };

  const light = `rgb(${Math.min(255, rgb.r + 30)}, ${Math.min(255, rgb.g + 30)}, ${Math.min(255, rgb.b + 30)})`;
  const dark = `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`;
  const alpha = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;

  return { light, dark, alpha, original: baseColor };
};

const WheelDetails = () => {
  const { wheelId } = useParams();
  const navigate = useNavigate();
  const [wheel, setWheel] = useState(null);
  const [spinsLeft, setSpinsLeft] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [mustSpin, setMustSpin] = useState(false);
  const [results, setResults] = useState([]);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [socket, setSocket] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [hoveredElement, setHoveredElement] = useState(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [recentResults, setRecentResults] = useState([]);

  const loadRecentResults = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/wheels/${wheelId}/results/recent?limit=5`, {
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
      if (wheel && wheel.selectedElement) {
        const resultIds = wheel.selectedElement.split(',').filter(id => id.trim());
        const parsedResults = resultIds.slice(-5).map((id, index) => {
          const element = wheel.elements.find(el => el._id === id || el.id === id);
          return {
            _id: `${id}-${index}`,
            elementLabel: element ? element.label : 'Unknown',
            createdAt: new Date(Date.now() - (5 - index) * 60000).toISOString()
          };
        }).reverse();
        
        setRecentResults(parsedResults);
      }
    }
  };

  const userRole = Cookies.get("role") || "";

  const fetchWheel = async () => {
    try {
      setIsLoading(true);
      const data = await getWheel(wheelId);
      
      const elementsWithColors = assignColors(data.elements || [], colorPalette);
      
      setWheel({
        ...data,
        elements: elementsWithColors
      });
      setSpinsLeft(data.numberOfSpinsLeft === -1 ? "Unlimited" : data.numberOfSpinsLeft.toString());
      setIsSocketReady(true);
      
      await loadRecentResults();
    } catch (error) {
      setErrorMessage("Erreur lors du chargement de la roue");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3000');
    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    fetchWheel();
  }, [wheelId]);

  useEffect(() => {
    if (socket) {
      socket.on('spin', (data) => {
        if (userRole === "creator") {
          if (!wheel || !wheel.elements) {
            return;
          }
          const idElementSelected = data.result;
          
          const lastElementSelected = data.dernierResultat || null;

          const indexElementSelected = wheel.elements.findIndex(
            (element) => element.id.toString() == idElementSelected.toString()
          );

          if (lastElementSelected != null) {
            const indexLastElementSelected = wheel.elements.find(
              (element) =>
                element.id.toString() == lastElementSelected.toString()
            );

            if (indexLastElementSelected) {
            const idPrize = indexLastElementSelected.id;
              const indexPrize = wheel.elements.findIndex(
              (element) => element.id === idPrize
            );

              const prizeElement = wheel.elements[indexPrize];

            if (wheel.removeAfterSelection) {
                const updatedElements = wheel.elements.filter(
                (element) => element.id !== idPrize
              );

              setWheel({
                ...wheel,
                  elements: updatedElements.filter(
                  (element) => element.isActif === true
                ),
              });
            }
          }
          }
          
          setMustSpin(true);

          if (data.numberOfSpins === -1) {
            setSpinsLeft("Unlimited");
          } else {
            setSpinsLeft(spinsLeft - 1);
          }

          if (data.result) {
            setSelectedElement(data.result);
            if (data.dernierResultat) {
              setLastResult(data.dernierResultat);
            }
          }
        }
      });

      socket.on('wheel:updated', (data) => {
        setWheel(data);
      });

      socket.on('element:statusUpdated', (data) => {
        if (wheel) {
          setWheel(prevWheel => ({
            ...prevWheel,
            elements: prevWheel.elements.map(element =>
              element._id === data.element._id ? data.element : element
            )
          }));
        }
      });

      return () => {
        socket.off('spin');
        socket.off('wheel:updated');
        socket.off('element:statusUpdated');
      };
    }
  }, [isSocketReady, spinsLeft, userRole, wheel, socket]);

  const handleSpin = async () => {
    if (mustSpin || !wheel || spinsLeft === "0") {
      return;
    }

    try {
      setShowConfetti(false);
      setMustSpin(true);
      
      const response = await spinWheel(wheelId);
      await fetchWheel();
    } catch (error) {
      setErrorMessage("Erreur lors de la rotation de la roue");
      setMustSpin(false);
    }
  };

  const handleSpinEnd = (element) => {
    setMustSpin(false);
    setSelectedElement(element);
    setShowConfetti(true);
    
    setTimeout(() => {
      setShowConfetti(false);
    }, 3000);
  };

  const handleSpinStart = () => {
    setShowConfetti(false);
  };

  const handleToggleElement = async (elementId) => {
    try {
      await updateElementStatus(elementId);
      fetchWheel();
    } catch (error) {
      setErrorMessage("Erreur lors de la mise à jour de l'élément");
    }
  };

  const handleReset = async () => {
    try {
      await resetResults(wheelId);
      setSelectedElement(null);
      setLastResult(null);
      fetchWheel();
    } catch (error) {
      setErrorMessage("Erreur lors de la réinitialisation");
    }
  };

  const handleActivateAll = async () => {
    try {
      await setAllElementsActive(wheelId);
      fetchWheel();
      } catch (error) {
      setErrorMessage("Erreur lors de l'activation des éléments");
    }
  };

  const copyToClipboard = () => {
    const currentUrl = window.location.href;
    navigator.clipboard.writeText(currentUrl).then(() => {
      notify();
    });
  };

  if (isLoading) {
    return <div className="loading">Chargement...</div>;
  }

  if (errorMessage) {
    return (
      <div className="error-message">
        <strong>Error:</strong> {errorMessage}
      </div>
    );
  }

  if (!wheel || !wheel.elements || wheel.elements.length === 0) {
    return <div className="error-message">Roue non trouvée ou aucun élément</div>;
  }

  const canSpin = spinsLeft !== "0" && !mustSpin && wheel.elements.some(el => el.isActif);
  const wheelDisabled = !canSpin && !mustSpin;

  return (
    <div className="WheelDetails">
      <div className="back-button">
        <Link to="/">
          <img src={money_emoji} alt="Home" className="back-button-img" />
        </Link>
      </div>

      <div className="wheel-header">
        <h1 className="wheel-title">{wheel.name.toUpperCase()}</h1>
      </div>

      <div className="wheel-info-card">
        <div className="info-item">
          <div className="info-icon">🎯</div>
          <div className="info-content">
            <span className="info-label">Total Spins</span>
            <span className="info-value">{wheel.numberOfSpins === -1 ? "Unlimited" : wheel.numberOfSpins}</span>
          </div>
        </div>
        
        <div className="info-item">
          <div className="info-icon">⏳</div>
          <div className="info-content">
            <span className="info-label">Remaining</span>
            <span className="info-value">{spinsLeft === "Unlimited" ? "Unlimited" : spinsLeft}</span>
          </div>
        </div>
        
        <div className="info-item">
          <div className="info-icon">{wheel.removeAfterSelection ? "🗑️" : "🔄"}</div>
          <div className="info-content">
            <span className="info-label">Remove After Selection</span>
            <span className="info-value">{wheel.removeAfterSelection ? "Yes" : "No"}</span>
          </div>
        </div>
      </div>

      <div className="wheel-section-layout">
        <div className="wheel-container">
          <CustomWheel
            elements={wheel.elements.filter(el => el.isActif)}
            onSpinEnd={handleSpinEnd}
            onSpinStart={handleSpinStart}
            isSpinning={mustSpin}
            spinDuration={5}
            spinSpeed={10}
            wheelSize={500}
            borderWidth={0}
            customColors={wheel.elements.filter(el => el.isActif).map(element => element.color)}
            disabled={wheelDisabled}
            onElementHover={setHoveredElement}
          />
        </div>
        
        <div className="spin-controls">
          <button 
            className={`spin-button-large ${!canSpin ? 'disabled' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSpin();
            }}
            disabled={!canSpin}
            type="button"
          >
            {mustSpin ? 'SPINNING...' : 'SPIN'}
          </button>
          
          {!canSpin && spinsLeft === "0" && (
            <p className="no-spins-message">No more spins available</p>
          )}
          
          {!canSpin && !wheel.elements.some(el => el.isActif) && (
            <p className="no-active-elements">No active elements</p>
          )}
        </div>

        {selectedElement && (
          <div 
            className="selected-element-display"
            style={{
              background: selectedElement.color 
                ? `linear-gradient(135deg, ${createColorVariations(selectedElement.color).light}, ${selectedElement.color})`
                : 'linear-gradient(135deg, #ffeaa7, #fdcb6e)',
              boxShadow: selectedElement.color 
                ? `0 4px 20px ${createColorVariations(selectedElement.color).alpha}`
                : '0 4px 20px rgba(253, 203, 110, 0.3)'
            }}
          >
            <h2>Selected Element</h2>
            <div className="selected-element-label">
              {selectedElement.label}
            </div>
            
            {selectedElement.color && (
              <div className="selected-color-indicator">
                <div 
                  className="selected-color-dot"
                  style={{ backgroundColor: selectedElement.color }}
                ></div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="copy-link-button">
        <button className="copyButton" onClick={copyToClipboard}>
          Copy Wheel Link
        </button>
      </div>

      {results && results.length > 0 && (
        <div className="results-history">
          <h3>Results History</h3>
          <ul>
            {results.slice().reverse().map((res, idx) => (
              <li key={idx}>{res.label}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="elements-list">
        <h3>Wheel Elements</h3>
        <div className="elements-grid">
          {wheel.elements.filter(el => el.isActif).map((element, index) => (
            <div 
              key={element._id || element.id} 
              className={`element-card ${hoveredElement?.id === element.id || hoveredElement?._id === element._id ? 'highlighted' : ''}`}
              style={{
                borderLeft: `6px solid ${element.color || '#ccc'}`,
                backgroundColor: `${element.color}15`,
                boxShadow: hoveredElement?.id === element.id || hoveredElement?._id === element._id 
                  ? `0 8px 24px ${element.color}40, 0 0 0 2px ${element.color}80` 
                  : '0 2px 8px rgba(0, 0, 0, 0.1)',
                transform: hoveredElement?.id === element.id || hoveredElement?._id === element._id 
                  ? 'translateY(-4px) scale(1.02)' 
                  : 'translateY(0) scale(1)'
              }}
              onMouseEnter={() => setHoveredElement(element)}
              onMouseLeave={() => setHoveredElement(null)}
            >
              <div className="element-header">
                <div 
                  className="element-color-indicator"
                  style={{ backgroundColor: element.color || '#ccc' }}
                ></div>
                <span className="element-label">
                  {element.label}
                </span>
              </div>
              
              <div className="element-details">
                <div className="element-weight">
                  <span className="detail-label">Weight:</span>
                  <span className="detail-value">{element.weight}</span>
                </div>
                <div className="element-probability">
                  <span className="detail-label">Probability:</span>
                  <span className="detail-value">{calculateProbability(element.weight, wheel.elements.filter(el => el.isActif))}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {hoveredElement && (
        <div 
          className="hover-tooltip"
          style={{
            background: `linear-gradient(135deg, ${hoveredElement.color}, ${createColorVariations(hoveredElement.color).dark})`,
            borderLeft: `4px solid ${hoveredElement.color}`,
            boxShadow: `0 8px 24px ${createColorVariations(hoveredElement.color).alpha}, 0 0 0 1px ${hoveredElement.color}40`
          }}
        >
          <h4 style={{ 
            borderBottomColor: `${hoveredElement.color}40`,
            textShadow: `0 1px 2px ${createColorVariations(hoveredElement.color).dark}80`
          }}>
            {hoveredElement.label}
          </h4>
          <p><strong>Weight:</strong> {hoveredElement.weight}</p>
          <p><strong>Probability:</strong> {calculateProbability(hoveredElement.weight, wheel.elements.filter(el => el.isActif))}%</p>
          
          <div className="color-indicator-tooltip">
            <div 
              className="color-dot"
              style={{ backgroundColor: hoveredElement.color }}
            ></div>
          </div>
        </div>
      )}

      {true && (
        <div className="admin-controls">
          <div className="admin-buttons">
            <button 
              className="control-button" 
              onClick={() => setShowResultsModal(true)}
            >
              View Results & Stats
            </button>
            <button className="control-button" onClick={() => navigate(`/edit-wheel/${wheelId}`)}>
              Edit Wheel
            </button>
          </div>
        </div>
      )}

      {showConfetti && selectedElement && (
        <div className="result-overlay">
          <div className="result-content">
            <h2>Result</h2>
            <p>{selectedElement.label}</p>
          </div>
        </div>
      )}

      {lastResult && (
        <div className="last-result">
          <h3>Last Result</h3>
          <p>{wheel.elements.find(e => e._id === lastResult || e.id === lastResult)?.label}</p>
        </div>
      )}

      <ToastContainer />

      <ResultsDisplay 
        wheelId={wheelId}
        isVisible={showResultsModal}
        onClose={() => setShowResultsModal(false)}
      />
    </div>
  );
};

export default WheelDetails;