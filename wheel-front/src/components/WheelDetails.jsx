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
]; // Palette étendue avec plus de couleurs variées

const assignColors = (elements, colorPalette) => {
  return elements.map((element, index) => {
    // Utiliser l'index pour choisir une couleur de façon cyclique
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

// Fonction utilitaire pour créer des variations de couleur
const createColorVariations = (baseColor) => {
  // Convertir hex en RGB
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

  // Créer des variations
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
  const [mustSpin, setMustSpin] = useState(false); // État pour contrôler le spin
  const [results, setResults] = useState([]);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [socket, setSocket] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [hoveredElement, setHoveredElement] = useState(null); // Nouvel état pour l'élément survolé
  const [showResultsModal, setShowResultsModal] = useState(false); // État pour la modal des résultats
  const [recentResults, setRecentResults] = useState([]); // Stockage des résultats récents

  // Fonction pour charger les résultats récents
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
      console.log("Recent results loaded:", data); // Debug
      setRecentResults(data);
    } catch (error) {
      console.error("Error loading recent results:", error);
      // Fallback vers l'ancien système
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

  const userRole = Cookies.get("role") || ""; // Récupérer le rôle depuis le cookie

  const fetchWheel = async () => {
    try {
      setIsLoading(true);
      const data = await getWheel(wheelId);
      
      // Assigner des couleurs aux éléments s'ils n'en ont pas
      const elementsWithColors = assignColors(data.elements || [], colorPalette);
      
      setWheel({
        ...data,
        elements: elementsWithColors
      });
      setSpinsLeft(data.numberOfSpinsLeft === -1 ? "Unlimited" : data.numberOfSpinsLeft.toString());
      setIsSocketReady(true); // Les données sont prêtes, autoriser les sockets
      
      // Charger aussi les résultats récents
      await loadRecentResults();
    } catch (error) {
      setErrorMessage("Erreur lors du chargement de la roue");
      console.error("Erreur:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initialiser le socket
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3000');
    setSocket(newSocket);

    // Nettoyer le socket lors du démontage du composant
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
      // Écouter les événements de spin
      socket.on('spin', (data) => {
        if (userRole === "creator") {
          console.log("Spin event received:", data);
          if (!wheel || !wheel.elements) {
            console.error("Wheel is not initialized yet.");
            return;
          }
          const idElementSelected = data.result;
          
          const lastElementSelected = data.dernierResultat || null;
          console.log(lastElementSelected);
          console.log(wheel.elements)

          const indexElementSelected = wheel.elements.findIndex(
            (element) => element.id.toString() == idElementSelected.toString()
          );

          if (lastElementSelected != null) {
            const indexLastElementSelected = wheel.elements.find(
              (element) =>
                element.id.toString() == lastElementSelected.toString()
            );

            console.log(indexLastElementSelected);
            if (indexLastElementSelected) {
            const idPrize = indexLastElementSelected.id;
              const indexPrize = wheel.elements.findIndex(
              (element) => element.id === idPrize
            );

            console.log("brotherito");
              const prizeElement = wheel.elements[indexPrize];

            console.log(wheel.removeAfterSelection);
            console.log("sping");
            if (wheel.removeAfterSelection) {
              console.log("Remove after selection");
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
          
          console.log(indexElementSelected);
          // Déclencher le spin visuel
          setMustSpin(true);
          console.log("spiiiiiin");

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

      // Écouter les mises à jour de la roue
      socket.on('wheel:updated', (data) => {
        setWheel(data);
      });

      // Écouter les mises à jour des éléments
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

      // Nettoyer les écouteurs lors du démontage
      return () => {
        socket.off('spin');
        socket.off('wheel:updated');
        socket.off('element:statusUpdated');
      };
    }
  }, [isSocketReady, spinsLeft, userRole, wheel, socket]);

  const handleSpin = async () => {
    console.log("handleSpin called, mustSpin:", mustSpin, "canSpin:", canSpin);
    
    if (mustSpin || !wheel || spinsLeft === "0") {
      console.log("Spin blocked - mustSpin:", mustSpin, "wheel:", !!wheel, "spinsLeft:", spinsLeft);
      return;
    }

    try {
      console.log("Starting spin...");
      setShowConfetti(false);
      
      // Déclencher directement l'animation visuelle d'abord
      setMustSpin(true);
      
      // Puis appeler l'API en arrière-plan
      const response = await spinWheel(wheelId);
      console.log("API response:", response);
      
      // Rafraîchir les données de la roue
      await fetchWheel();
    } catch (error) {
      console.error("Error during spin:", error);
      setErrorMessage("Erreur lors de la rotation de la roue");
      setMustSpin(false); // Arrêter le spin en cas d'erreur
    }
  };

  const handleSpinEnd = (element) => {
    console.log("Spin ended, selected element:", element);
    setMustSpin(false); // Arrêter le spin
    setSelectedElement(element);
    setShowConfetti(true);
    
    // Petit délai avant de cacher les confettis
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
      console.error("Erreur:", error);
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
      console.error("Erreur:", error);
    }
  };

  const handleActivateAll = async () => {
    try {
      await setAllElementsActive(wheelId);
      fetchWheel();
      } catch (error) {
      setErrorMessage("Erreur lors de l'activation des éléments");
      console.error("Erreur:", error);
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

  // Vérifier si l'utilisateur peut faire tourner la roue
  const canSpin = spinsLeft !== "0" && !mustSpin && wheel.elements.some(el => el.isActif);
  const wheelDisabled = !canSpin && !mustSpin; // Ne pas désactiver pendant l'animation

  return (
    <div className="WheelDetails">
      <div className="back-button">
        <Link to="/">
          <img src={money_emoji} alt="Home" className="back-button-img" />
        </Link>
      </div>

      <div className="wheel-header">
        <h1 className="wheel-title">{wheel.name}</h1>
        <div className="wheel-subtitle">Spin the wheel to get your result!</div>
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
            elements={wheel.elements.filter(el => el.isActif)} // Seulement les éléments actifs
            onSpinEnd={handleSpinEnd}
            onSpinStart={handleSpinStart}
            isSpinning={mustSpin}
            spinDuration={5}
            spinSpeed={10}
            wheelSize={500} // Réduit de 600 à 500
            borderWidth={0} // Suppression complète du border
            customColors={wheel.elements.filter(el => el.isActif).map(element => element.color)}
            disabled={wheelDisabled} // Utiliser la nouvelle variable
            onElementHover={setHoveredElement}
          />
        </div>
        
        {/* Bouton SPIN */}
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
            
            {/* Indicateur de couleur pour l'élément sélectionné */}
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

      {/* Bouton pour copier le lien */}
      <div className="copy-link-button">
        <button className="copyButton" onClick={copyToClipboard}>
          Copy Wheel Link
        </button>
      </div>

      {/* Historique des résultats */}
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
                // Animation de surbrillance si c'est l'élément survolé
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

      {/* Tooltip for hovered element */}
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
          
          {/* Indicateur de couleur dans le tooltip */}
          <div className="color-indicator-tooltip">
            <div 
              className="color-dot"
              style={{ backgroundColor: hoveredElement.color }}
            ></div>
            <span>Element Color</span>
          </div>
        </div>
      )}

      {/* Contrôles administrateur */}
      {true && (
        <div className="admin-controls">
          <h3>Administrator Controls</h3>
          <div className="admin-buttons">
            <button 
              className="control-button" 
              onClick={(e) => {
                e.preventDefault();
                console.log("View Results button clicked, current state:", showResultsModal);
                setShowResultsModal(true);
                console.log("showResultsModal set to true");
              }}
            >
              View Results & Stats
            </button>
            <button className="control-button" onClick={handleActivateAll}>
              Reactivate All Elements
            </button>
            <button className="control-button" onClick={handleReset}>
              Reset Results
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

      {/* Test button temporaire */}
      {process.env.NODE_ENV === 'development' && (
        <button 
          style={{
            position: 'fixed',
            top: '100px',
            left: '10px',
            background: 'red',
            color: 'white',
            padding: '10px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            zIndex: 9999
          }}
          onClick={() => {
            console.log("Force opening modal");
            setShowResultsModal(prev => !prev);
          }}
        >
          Toggle Modal (Test)
        </button>
      )}

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          position: 'fixed', 
          top: '10px', 
          left: '10px', 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '10px', 
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 9999
        }}>
          showResultsModal: {showResultsModal.toString()}<br/>
          recentResults: {recentResults.length}
        </div>
      )}

      {/* Modal des résultats */}
      <ResultsDisplay 
        wheelId={wheelId}
        isVisible={showResultsModal}
        onClose={() => setShowResultsModal(false)}
      />
    </div>
  );
};

export default WheelDetails;