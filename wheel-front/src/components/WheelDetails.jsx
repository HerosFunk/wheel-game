import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import money_emoji from "../img/money_emoji.png";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Cookies from "js-cookie";
import { Wheel } from "react-custom-roulette";
import { socket } from "../socket";

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
      const response = await fetch(`${API_URL}/wheels/${wheelId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Error fetching wheel: ${response.statusText}`);
      }
      const data = await response.json();
      const elementsFiltered = data.Elements.filter(
        (element) => element.isActif === true
      );

      setWheel({
        ...data,
        Elements: assignColors(elementsFiltered, colorPalette),
      });

      let resultsAlreadySelected = data.Elements.filter(
        (element) => element.isActif === false
      );
      resultsAlreadySelected = resultsAlreadySelected.map(
        (element) => element.label
      );
      setResults(resultsAlreadySelected);

      if (data.numberOfSpins.toString() === "-1") {
        setSpinsLeft("Unlimited");
      } else {
        setSpinsLeft(data.numberOfSpinsLeft.toString());
      }

      setIsSocketReady(true); // Les données sont prêtes, autoriser les sockets
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWheel();
  }, [wheelId]);

  useEffect(() => {
    if (isSocketReady) {
      console.log("Initializing Socket.IO listeners...");
      socket.on("spin", (data) => {
        if (userRole === "creator") {

        const currentAutoFullscreen = isAutoFullscreen;
        const currentModalOpen = isModalOpen;

        console.log("Current Auto Fullscreen:", currentAutoFullscreen);

        if (!currentModalOpen && currentAutoFullscreen) {
          setIsWheelVisible(true);
          setIsModalOpen(true);
        }

          console.log("Spin event received:", data);
          if (!wheel || !wheel.Elements) {
            console.error("Wheel is not initialized yet.");
            return;
          }
          const idElementSelected = data.result;
          
          const lastElementSelected = data.dernierResultat || null;
          console.log(lastElementSelected);
          console.log(wheel.Elements)

          const indexElementSelected = wheel.Elements.findIndex(
            (element) => element.id.toString() == idElementSelected.toString()
          );

          if (lastElementSelected != null) {
            const indexLastElementSelected = wheel.Elements.find(
              (element) =>
                element.id.toString() == lastElementSelected.toString()
            );

            console.log(indexLastElementSelected);
            if (indexLastElementSelected) {


            const idPrize = indexLastElementSelected.id;
            const indexPrize = wheel.Elements.findIndex(
              (element) => element.id === idPrize
            );

            console.log("brotherito");
            const prizeElement = wheel.Elements[indexPrize];

            console.log(wheel.removeAfterSelection);
            console.log("sping");
            if (wheel.removeAfterSelection) {
              console.log("Remove after selection");
              const updatedElements = wheel.Elements.filter(
                (element) => element.id !== idPrize
              );

              setWheel({
                ...wheel,
                Elements: updatedElements.filter(
                  (element) => element.isActif === true
                ),
              });
            }
          }
          }
          
          console.log(indexElementSelected);
          setPrizeNumber(indexElementSelected);
          // si le mode plein ecran n'est pas activé, l'activer
          console.log(wheel.Elements[indexElementSelected].label);
          setTimeout(function(){
            setMustSpin(true);
        }, 500);
          console.log("spiiiiiin");

          if (data.numberOfSpins === -1) {
            setSpinsLeft("Unlimited");
          } else {
            setSpinsLeft(spinsLeft - 1);
          }
        }
      });

      return () => {
        socket.off("spin"); // Nettoyer l'écoute des sockets
      };
    }
  }, [isAutoFullscreen, isModalOpen, isSocketReady, spinsLeft, userRole, wheel]);

  const handleSpinClick = async () => {
    if (!mustSpin && wheel && spinsLeft !== "0" && userRole === "client") {
      try {
        const response = await fetch(`${API_URL}/wheels/spin/${wheelId}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (!response.ok) {
          throw new Error(`Error spinning wheel: ${response.statusText}`);
        }

        const data = await response.json();
        const idElementSelected = data.result;

        const indexElementSelected = wheel.Elements.findIndex(
          (element) => element.id === idElementSelected
        );

        if (prizeNumber !== -999) {
          const idPrize = wheel.Elements[prizeNumber].id;
          const indexPrize = wheel.Elements.findIndex(
            (element) => element.id === idPrize
          );
          const prizeElement = wheel.Elements[indexPrize];

          if (wheel.removeAfterSelection) {
            const updatedElements = wheel.Elements.filter(
              (element) => element.id !== idPrize
            );
            setWheel({
              ...wheel,
              Elements: updatedElements.filter(
                (element) => element.isActif === true
              ),
            });
          }
        }
        setPrizeNumber(indexElementSelected);
        console.log(indexElementSelected);
        setTimeout(function(){
          setMustSpin(true);
      }, 500);

        
        console.log("spiiiiiin");
        if (data.numberOfSpins === -1) {
          setSpinsLeft("Unlimited");
        } else {
          setSpinsLeft(spinsLeft - 1);
        }
      } catch (error) {
        console.error(error);
      }
    }
  };



  const splitTextIntoLines = (text, maxCharsPerLine) => {
    if (text.length <= maxCharsPerLine) return text;
    const cutIndex = text.indexOf(" ", maxCharsPerLine);
    if (cutIndex === -1) return text;
    return `${text.substring(0, cutIndex)}...`;
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (errorMessage) {
    return (
      <div className="error-message">
        <strong>Error:</strong> {errorMessage}
      </div>
    );
  }

  if (!wheel) {
    return <div className="error-message">Error: Wheel not found!</div>;
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

      <div className="wheel-container" style={{ display: "flex", gap: "20px" }}>
        <div className="wheel-segments">
          {wheel.Elements.length > 0  ? (
            <Wheel
              prizeNumber={prizeNumber}
              fontSize={14}
              spinDuration={1.5}
              data={wheel.Elements.map((element) => ({
                option: splitTextIntoLines(element.label, 13),
                style: {
                  backgroundColor: element.color,
                  textColor: "white",
                },
              }))}
              mustStartSpinning={mustSpin}
              onStopSpinning={() => {
                setMustSpin(false);
                setResults((prevResults) => {
                  const newResult = wheel.Elements[prizeNumber].label;
                  if (!prevResults.includes(newResult)) {
                    return [...prevResults, newResult]; // Ajoute uniquement si l'élément n'est pas déjà présent
                  }
                  return prevResults; // Sinon, retourne la liste existante
                });               
              }}
            />
          ) : (
            <p>No segments available.</p>
          )}
          <button
            className="fullscreen-btn"
            onClick={() => 
            {
              if (mustSpin) return; // Empêche le mode plein écran si la roue est en cours de rotation
              setIsModalOpen(true);
              setIsWheelVisible(true);}
              
            }
          >
            🔍 Fullscreen View
          </button>

          <input
            type="checkbox"
            id="wheel-auto-fullscreen"
            checked={isAutoFullscreen}
            onChange={toggleIsAutoFullscreen}
            />
          <label htmlFor="wheel-visibility">Auto Full Screen when spin</label>

          <div className="action-buttons">
            {userRole === "creator" ? (
              <>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/wheel/${wheelId}`
                    );
                    notify();
                  }}
                  className="copyButton"
                >
                  Copy Link
                </button>
                <br></br>
                <button
                  onClick={() => navigate(`/edit-wheel/${wheelId}`)}
                  className="copyButton"
                >
                  Edit
                </button>
              </>
            ) : (
              <button onClick={handleSpinClick} className="spinButton">
                Spin the Wheel
              </button>
            )}
            <ToastContainer />
          </div>
        </div>

        <div className="wheel-elements-list" style={{ marginLeft: "20px", flex: "1" }}>
          <h2 style={{ textAlign: "center" }}>Elements</h2>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {wheel.Elements.map((element, index) => (
              <li
                key={index}
                style={{
                  padding: "10px",
                  backgroundColor: element.color,
                  color: "white",
                  marginBottom: "5px",
                  borderRadius: "5px",
                  textAlign: "center",
                  position: "relative",
                  maxWidth: "500px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{element.label}</span>
                <span
                  style={{
                    padding: "5px 10px",
                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                    borderRadius: "20px",
                    fontSize: "0.8rem",
                    fontWeight: "bold",
                    color: "white",
                    cursor: "help"
                  }}
                  title={`Probability: ${calculateProbability(element.weight, wheel.Elements)}%`}
                >
                  {element.weight}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Modal pour vue plein écran */}
      <div className={`modal-overlay ${isWheelVisible ? "visible" : "hidden"}`} onClick={() => {setIsModalOpen(false); setIsWheelVisible(false);}}
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
            prizeNumber={prizeNumber}
            fontSize={8}
            spinDuration={1.5}
            data={wheel.Elements.map((element) => ({
              option: splitTextIntoLines(element.label, 38),
              style: {
                backgroundColor: element.color,
                textColor: "white",
              },
            }))}
            mustStartSpinning={mustSpin}
            onStopSpinning={() => {
              console.log("Stopped Spinning - Auto Fullscreen:", isAutoFullscreen);
              
              setMustSpin(false);
              setResults((prevResults) => {
                const newResult = wheel.Elements[prizeNumber].label;
                if (!prevResults.includes(newResult)) {
                  return [...prevResults, newResult];
                }
                return prevResults;
              });
            
              if (isModalOpen) {
                setTimeout(() => {
                  if (isAutoFullscreen) {
                    console.log("Closing modal automatically");
                    setIsModalOpen(false);
                    setIsWheelVisible(false);
                  }
                }, 500);
              }
            }}
          />
          <div className="modal-actions">
            {userRole === "creator" ? (
              <>
                
              </>
            ) : (
              <button onClick={handleSpinClick} className="spinButton">
                Spin the Wheel
              </button>
            )}
            <ToastContainer />
          </div>
        </div>
      </div>

      <div className="results-container" style={{ marginBottom: "75px" }}>
        <h2>Results:</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {results.map((result, index) => (
            <li
              key={index}
              style={{
                display: "flex",
                gap: "10px", // Espace entre les parties
                marginBottom: "10px",
              }}
            >
              <span style={{ width: "30px", textAlign: "right" }}>
                {index + 1} :
              </span>
              <span>{result}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default WheelDetails;
