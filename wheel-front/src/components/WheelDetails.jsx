import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import money_emoji from "../img/money_emoji.png";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Cookies from "js-cookie";
import CustomWheel from './CustomWheel';
import { getWheel, spinWheel, updateElementStatus, setAllElementsActive, resetResults } from '../services/api';
import './WheelDetails.css';
import io from 'socket.io-client';

const notify = () => toast("Link copied!");
const API_URL = "https://wheel-game.azurewebsites.net";

const colorPalette = ["#ff69b4", "purple", "#87CEEB"]; // Palette des couleurs

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
  const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
  return ((weight / totalWeight) * 100).toFixed(1);
};

const WheelDetails = () => {
  const { wheelId } = useParams();
  const navigate = useNavigate();
  const [wheel, setWheel] = useState(null);
  const [spinsLeft, setSpinsLeft] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [prizeNumber, setPrizeNumber] = useState(-999);
  const [mustSpin, setMustSpin] = useState(false);
  const [results, setResults] = useState([]);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // Nouvel état pour la modal
  const [isWheelVisible, setIsWheelVisible] = useState(false);
  const [isAutoFullscreen, setIsAutoFullscreen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedElement, setSelectedElement] = useState(null);
  const [socket, setSocket] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const toggleWheelVisibility = () => {
    setIsWheelVisible((prev) => !prev);
  };

  const toggleIsAutoFullscreen = () => {
    if (mustSpin) return;
    console.log("Toggling Auto Fullscreen, current state:", isAutoFullscreen);
    setIsAutoFullscreen((prev) => {
      console.log("New Auto Fullscreen state:", !prev);
      return !prev;
    });
  };

  const userRole = Cookies.get("role") || ""; // Récupérer le rôle depuis le cookie

  const fetchWheel = async () => {
    try {
      setIsLoading(true);
      const data = await getWheel(wheelId);
      setWheel(data);
      setSpinsLeft(data.numberOfSpinsLeft === -1 ? "Unlimited" : data.numberOfSpinsLeft.toString());
      setIsSocketReady(true); // Les données sont prêtes, autoriser les sockets
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
          setPrizeNumber(indexElementSelected);
          // si le mode plein ecran n'est pas activé, l'activer
          console.log(wheel.elements[indexElementSelected].label);
          setTimeout(function(){
            setMustSpin(true);
        }, 500);
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
  }, [isAutoFullscreen, isModalOpen, isSocketReady, spinsLeft, userRole, wheel, socket]);

  const handleSpin = async () => {
    if (mustSpin || !wheel || spinsLeft === "0") return;

    try {
      setMustSpin(true);
      setShowConfetti(false);
      await spinWheel(wheelId);
      fetchWheel(); // Rafraîchir les données de la roue
    } catch (error) {
      setErrorMessage("Erreur lors de la rotation de la roue");
      console.error("Erreur:", error);
    } finally {
      setMustSpin(false);
    }
  };

  const handleSpinEnd = (element) => {
    setSelectedElement(element);
    setShowConfetti(true);
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

  const splitTextIntoLines = (text, maxCharsPerLine) => {
    if (text.length <= maxCharsPerLine) return text;
    const cutIndex = text.indexOf(" ", maxCharsPerLine);
    if (cutIndex === -1) return text;
    return `${text.substring(0, cutIndex)}...`;
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

  if (!wheel) {
    return <div className="error-message">Roue non trouvée</div>;
  }

  return (
    <div className="WheelDetails">
      <div className="back-button">
        <Link to="/">
          <img src={money_emoji} alt="Home" className="back-button-img" />
        </Link>
      </div>

      <h1 className="wheel-title">{wheel.name}</h1>

      <div className="wheel-info">
        <p>
          <strong>Number of Spins:</strong>{" "}
          {wheel.numberOfSpins === -1 ? "Unlimited" : wheel.numberOfSpins}
        </p>
        <p>
          <strong>Remaining Spins:</strong> {spinsLeft}
        </p>
        <p>
          <strong>Remove After Selection:</strong>{" "}
          {wheel.removeAfterSelection
            ? "Yes"
            : "No"}
        </p>
      </div>

      <div className="wheel-section-layout">
        <div className="wheel-container">
          <CustomWheel
            elements={wheel.elements}
            onSpinEnd={handleSpinEnd}
            onSpinStart={handleSpinStart}
            isSpinning={mustSpin}
            spinDuration={5}
            spinSpeed={10}
            wheelSize={600}
            customColors={wheel.elements.map(element => element.color)}
            disabled={wheel.numberOfSpinsLeft === 0}
            selectedElement={selectedElement}
          />
        </div>
        {selectedElement && (
          <div className="selected-element-display">
            <h2>Élément sélectionné</h2>
            <div className="selected-element-label">
              {selectedElement.label}
            </div>
          </div>
        )}
        </div>

      {/* Historique des résultats */}
      {results && results.length > 0 && (
        <div className="results-history">
          <h3>Historique des résultats</h3>
          <ul>
            {results.slice().reverse().map((res, idx) => (
              <li key={idx}>{res.label}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="elements-list">
        <h3>Éléments</h3>
        {wheel.elements.map((element) => (
          <div 
            key={element._id} 
            className={`element-item${!element.isActif ? ' disabled' : ''}`}
            title={element.label.length > 32 ? element.label : ''}
          >
            <span className="element-label">
              {element.label.length > 32 ? element.label.slice(0, 30) + '…' : element.label}
            </span>
            <span className={`element-status ${element.isActif ? 'active' : 'inactive'}`}
              title={element.isActif ? 'Actif' : 'Inactif'}
            >
              {element.isActif ? '●' : '○'}
            </span>
          </div>
        ))}
      </div>

      {showConfetti && selectedElement && (
        <div className="result-overlay">
          <div className="result-content">
            <h2>Résultat</h2>
            <p>{selectedElement.label}</p>
          </div>
        </div>
      )}

      {lastResult && (
        <div className="last-result">
          <h3>Dernier résultat</h3>
          <p>{wheel.elements.find(e => e._id === lastResult)?.label}</p>
      </div>
      )}
    </div>
  );
};

export default WheelDetails;
