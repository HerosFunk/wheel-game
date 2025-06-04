import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import money_emoji from "../img/money_emoji.png";
import { Wheel } from "react-custom-roulette";
import { Pencil } from "lucide-react";

const API_URL = "https://wheel-game.azurewebsites.net";

const CreateWheel = () => {
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
          const data = await response.json();
          setNameValue(data.name);
          setOptions({ option1: data.removeAfterSelection, infinitySpin: data.numberOfSpins === -1 });
          setSpinLimit(data.numberOfSpins === -1 ? "" : data.numberOfSpins);
          setSegments(data.Elements.map(element => ({ name: element.label, weight: element.weight })));
        } catch (error) {
          console.error("Error fetching wheel:", error);
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
    const totalWeight = segments.reduce((sum, segment) => sum + segment.weight, 0);
    return ((weight / totalWeight) * 100).toFixed(1);
  };

  const handleAddSegment = () => {

    let segmentName = inputValue.trim();
    if (!segmentName) {
      segmentName = `${segments.length + 1}`;
    }

    const weight = parseInt(weightValue);
    if (weight < 1 || weight > 9) {
      setErrorMessage("Weight must be between 1 and 9");
      return;
    }

    const newSegment = {
      name: segmentName,
      weight: weight
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
    if (text.length <= maxCharsPerLine) return text;
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

  const handleCreateWheel = async () => {
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
        name: segment.name,
        weight: segment.weight
      }))
    };

    try {
      const response = await fetch(wheelId ? `${API_URL}/wheels/${wheelId}` : `${API_URL}/wheels`, {
        method: wheelId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(wheelData),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const createdWheel = await response.json();
      navigate(`/wheel/${createdWheel.id}`);
    } catch (error) {
      setErrorMessage(`Error creating wheel: ${error.message}`);
    }
  };

  return (
    <div className="CreateWheel">
      <div style={{ position: "absolute", top: "20px", left: "20px" }}>
        <Link to="/">
          <img
            src={money_emoji}
            alt="Home"
            style={{ width: "50px", height: "50px", cursor: "pointer" }}
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
              data={wheel.Elements.map((element) => ({
                option: splitTextIntoLines(element.label, 38),
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

      <h1>{wheelId ? "Edit Your Wheel 😈" : "Create Your Wheel 😈"}</h1>

      {errorMessage && (
        <div style={{ color: "red", marginBottom: "20px" }}>
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

<div className="input-section" style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Enter your wheel name"
          value={nameValue}
          onChange={(e) => setNameValue(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
        />
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
          <input
            type="text"
            placeholder="Enter a segment name"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-grow p-2 border rounded"
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="number"
              min="1"
              max="9"
              value={weightValue}
              onChange={(e) => setWeightValue(e.target.value)}
              style={{ width: '60px' }}
              className="p-2 border rounded"
            />
            <button 
              onClick={handleAddSegment}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <ul style={{ 
        listStyle: 'none', 
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {segments.map((segment, index) => (
          <li className="CreateWheelItem" key={index} style={{ 
            display: 'grid',
            gridTemplateColumns: 'minmax(200px, 1fr) auto auto auto auto',
            gap: '10px',
            alignItems: 'center',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
          }}>
            {editingIndex === index ? (
              <input
                type="text"
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                onBlur={() => handleEditSave(index)}
                onKeyPress={(e) => e.key === 'Enter' && handleEditSave(index)}
                className="p-1 border rounded"
                autoFocus
              />
            ) : (
              <span style={{color:'black', marginLeft:'8px'}}>{ segment.name}</span>
            )}
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="number"
                min="1"
                max="9"
                value={segment.weight}
                onChange={(e) => handleWeightChange(index, e.target.value)}
                style={{ width: '60px' }}
                className="p-1 border rounded text-center"
              />
              <span style={{ minWidth: '70px' }}>
                ({calculateProbability(segment.weight, segments)}%)
              </span>
            </div>

            <button
              onClick={() => handleEditClick(index)}
              className="p-2 text-blue-600 hover:text-blue-800"
              title="Edit"
            >
              <Pencil size={16} />
            </button>

            <button
              onClick={() => handleDeleteSegment(index)}
              className="p-2 text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <div>
        <label>
          <input
            type="checkbox"
            checked={options.option1}
            onChange={() => handleCheckboxChange("option1")}
          />
          Remove a label after selection
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={options.infinitySpin}
            onChange={() => handleCheckboxChange("infinitySpin")}
          />
          Infinity spins
        </label>
      </div>

      {!options.infinitySpin && (
        <div>
          <label>
            Set spin limit:{" "}
            <input
              type="number"
              value={spinLimit}
              placeholder="Enter spin limit"
              onChange={(e) => setSpinLimit(e.target.value)}
            />
          </label>
        </div>
      )}

      <div>
        <br />
        <button 
          style={{
            marginRight: "10px",
            color: "white",
            backgroundColor: "green",
            border: "none",
            padding: "10px",
            cursor: "pointer"
          }}
          onClick={() => {
            if (segments.length < 2) {
              setErrorMessage("At least 2 segments are required.");
              return;
            }
            const segmentObjects = segments.map((segment) => ({
              label: segment.name
            }));

            setWheel({
              Elements: assignColors(segmentObjects, colorPalette),
            });
            setIsModalOpen(true);
            setIsWheelVisible(true);
          }}>
          Preview
        </button>
        <button className="createButton" onClick={handleCreateWheel}>
          {wheelId ? "Save Changes" : "Create"}
        </button>
      </div>
    </div>
  );
};

export default CreateWheel;