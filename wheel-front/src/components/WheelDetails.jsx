import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import money_emoji from "../img/money_emoji.png";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Cookies from "js-cookie";
import CustomWheel from "./CustomWheel";
import ResultsDisplay from "./ResultsDisplay";
import { getWheel, spinWheel, updateElementStatus, setAllElementsActive, resetResults } from "../services/api";
import "./WheelDetails.css";
import io from "socket.io-client";

const notify = () => toast("Link copied!");
const API_URL = "https://wheel-game.azurewebsites.net";

const colorPalette = [
	"#ff69b4",
	"#e74c3c",
	"#9b59b6",
	"#3498db",
	"#1abc9c",
	"#2ecc71",
	"#f39c12",
	"#e67e22",
	"#34495e",
	"#95a5a6",
	"#fd79a8",
	"#6c5ce7",
	"#74b9ff",
	"#00b894",
	"#fdcb6e",
	"#e17055",
	"#81ecec",
	"#a29bfe",
	"#ffeaa7",
	"#fab1a0",
	"#ff7675",
	"#55a3ff",
	"#fd79a8",
	"#fdcb6e",
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
		return result
			? {
					r: parseInt(result[1], 16),
					g: parseInt(result[2], 16),
					b: parseInt(result[3], 16),
			  }
			: null;
	};

	const rgb = hexToRgb(baseColor);
	if (!rgb) return { light: baseColor, dark: baseColor, alpha: baseColor + "20" };

	const light = `rgb(${Math.min(255, rgb.r + 30)}, ${Math.min(255, rgb.g + 30)}, ${Math.min(255, rgb.b + 30)})`;
	const dark = `rgb(${Math.max(0, rgb.r - 30)}, ${Math.max(0, rgb.g - 30)}, ${Math.max(0, rgb.b - 30)})`;
	const alpha = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`;

	return { light, dark, alpha, original: baseColor };
};

// Composant Tooltip amélioré avec support multi-lignes
const EnhancedTooltip = ({ element, mousePosition, wheelSize, isVisible, elements }) => {
	const [tooltipStyle, setTooltipStyle] = useState({});
	const tooltipRef = useRef(null);

	// Fonction pour formater le texte sur plusieurs lignes
	const formatMultilineText = useCallback((text, maxCharsPerLine = 25) => {
		if (!text || text.length <= maxCharsPerLine) {
			return text;
		}
		
		const words = text.split(' ');
		const lines = [];
		let currentLine = '';
		
		for (let word of words) {
			const testLine = currentLine + (currentLine ? ' ' : '') + word;
			if (testLine.length <= maxCharsPerLine) {
				currentLine = testLine;
			} else {
				if (currentLine) {
					lines.push(currentLine);
					currentLine = word;
				} else {
					// Si un seul mot est trop long, le couper intelligemment
					if (word.length > maxCharsPerLine) {
						lines.push(word.substring(0, maxCharsPerLine - 3) + '...');
						currentLine = '';
					} else {
						currentLine = word;
					}
				}
			}
		}
		
		if (currentLine) {
			lines.push(currentLine);
		}
		
		return lines.join('\n');
	}, []);

	// Calculer la position optimale du tooltip
	useEffect(() => {
		if (!isVisible || !element || !mousePosition || !tooltipRef.current) {
			return;
		}

		const tooltip = tooltipRef.current;
		const tooltipRect = tooltip.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;
		
		let newStyle = {
			position: 'fixed',
			zIndex: 1000,
			opacity: 1,
			transform: 'translateY(0) scale(1)',
			transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
		};

		// Position horizontale
		const spaceRight = viewportWidth - mousePosition.x;
		const spaceLeft = mousePosition.x;
		
		if (spaceRight >= tooltipRect.width + 20) {
			// Placer à droite
			newStyle.left = mousePosition.x + 15;
			newStyle.transformOrigin = 'left center';
		} else if (spaceLeft >= tooltipRect.width + 20) {
			// Placer à gauche
			newStyle.right = viewportWidth - mousePosition.x + 15;
			newStyle.transformOrigin = 'right center';
		} else {
			// Centrer horizontalement
			newStyle.left = '50%';
			newStyle.transform = 'translateX(-50%) translateY(0) scale(1)';
			newStyle.transformOrigin = 'center center';
		}

		// Position verticale
		const spaceBelow = viewportHeight - mousePosition.y;
		const spaceAbove = mousePosition.y;
		
		if (spaceBelow >= tooltipRect.height + 20) {
			// Placer en dessous
			newStyle.top = mousePosition.y + 15;
		} else if (spaceAbove >= tooltipRect.height + 20) {
			// Placer au dessus
			newStyle.bottom = viewportHeight - mousePosition.y + 15;
		} else {
			// Centrer verticalement
			newStyle.top = '50%';
			if (newStyle.transform) {
				newStyle.transform = 'translateX(-50%) translateY(-50%) scale(1)';
			} else {
				newStyle.transform = 'translateY(-50%) scale(1)';
			}
		}

		setTooltipStyle(newStyle);
	}, [isVisible, element, mousePosition, wheelSize]);

	if (!isVisible || !element) {
		return null;
	}

	const formattedTitle = formatMultilineText(element.label, 30);
	const probability = element.weight && elements ? 
		((element.weight / elements.reduce((sum, el) => sum + (el.weight || 1), 0)) * 100).toFixed(1) : 
		'N/A';

	return (
		<div 
			ref={tooltipRef}
			className="wheel-tooltip visible animate-in"
			style={tooltipStyle}
		>
			<div className="wheel-tooltip-color">
				<div 
					className="wheel-tooltip-color-dot active"
					style={{ backgroundColor: element.color || '#ccc' }}
				></div>
			</div>
			
			<div 
				className="wheel-tooltip-title"
				style={{
					whiteSpace: 'pre-line', // Permet les retours à la ligne avec \n
					wordBreak: 'break-word'  // Coupe les mots trop longs
				}}
			>
				{formattedTitle}
			</div>
			
			<div className="wheel-tooltip-content">
				<div className="wheel-tooltip-stat">
					<span className="wheel-tooltip-label">Weight:</span>
					<span className="wheel-tooltip-value">{element.weight || 1}</span>
				</div>
				
				<div className="wheel-tooltip-stat">
					<span className="wheel-tooltip-label">Probability:</span>
					<span className="wheel-tooltip-value">{probability}%</span>
				</div>
				
				{element.isActif !== undefined && (
					<div className="wheel-tooltip-stat">
						<span className="wheel-tooltip-label">Status:</span>
						<span className="wheel-tooltip-value" style={{ 
							color: element.isActif ? '#00b894' : '#e17055' 
						}}>
							{element.isActif ? 'Active' : 'Inactive'}
						</span>
					</div>
				)}
			</div>
		</div>
	);
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
	
	// Nouveaux states pour le tooltip amélioré
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const [showTooltip, setShowTooltip] = useState(false);

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
				const resultIds = wheel.selectedElement.split(",").filter((id) => id.trim());
				const parsedResults = resultIds
					.slice(-5)
					.map((id, index) => {
						const element = wheel.elements.find((el) => el._id === id || el.id === id);
						return {
							_id: `${id}-${index}`,
							elementLabel: element ? element.label : "Unknown",
							createdAt: new Date(Date.now() - (5 - index) * 60000).toISOString(),
						};
					})
					.reverse();

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
				elements: elementsWithColors,
			});
			setSpinsLeft(data.numberOfSpinsLeft === -1 ? "Unlimited" : data.numberOfSpinsLeft.toString());
			setIsSocketReady(true);

			await loadRecentResults();
		} catch (error) {
			setErrorMessage("Error loading wheel");
		} finally {
			setIsLoading(false);
		}
	};

	// Gestionnaire pour l'hover d'élément avec tooltip amélioré
	const handleElementHover = useCallback((element) => {
		setHoveredElement(element);
		setShowTooltip(!!element);
	}, []);

	// Gestionnaire de mouvement de souris pour positionner le tooltip
	const handleMouseMove = useCallback((event) => {
		setMousePosition({
			x: event.clientX,
			y: event.clientY
		});
	}, []);

	// Gestionnaire pour quitter l'hover
	const handleMouseLeave = useCallback(() => {
		setHoveredElement(null);
		setShowTooltip(false);
	}, []);

	useEffect(() => {
		const newSocket = io(process.env.REACT_APP_API_URL || "http://localhost:3000");
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
			socket.on("spin", (data) => {
				if (true) {
					if (!wheel || !wheel.elements) {
						return;
					}
					const idElementSelected = data.result;
					const lastElementSelected = data.dernierResultat || null;

					const indexElementSelected = wheel.elements.findIndex(
						(element) => (element._id || element.id)?.toString() === idElementSelected.toString()
					);

					if (lastElementSelected != null) {
						const indexLastElementSelected = wheel.elements.find(
							(element) => (element._id || element.id)?.toString() === lastElementSelected.toString()
						);

						if (indexLastElementSelected) {
							const idPrize = indexLastElementSelected._id || indexLastElementSelected.id;
							const indexPrize = wheel.elements.findIndex((element) => (element._id || element.id) === idPrize);

							const prizeElement = wheel.elements[indexPrize];

							if (wheel.removeAfterSelection) {
								const updatedElements = wheel.elements.filter((element) => (element._id || element.id) !== idPrize);

								setWheel({
									...wheel,
									elements: updatedElements.filter((element) => element.isActif === true),
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

			socket.on("wheel:updated", (data) => {
				setWheel(data);
			});

			socket.on("element:statusUpdated", (data) => {
				if (wheel) {
					setWheel((prevWheel) => ({
						...prevWheel,
						elements: prevWheel.elements.map((element) =>
							(element._id || element.id) === (data.element._id || data.element.id) ? data.element : element
						),
					}));
				}
			});

			return () => {
				socket.off("spin");
				socket.off("wheel:updated");
				socket.off("element:statusUpdated");
			};
		}
	}, [isSocketReady, spinsLeft, userRole, wheel, socket]);

	const playSpinSound = () => {
		try {
			const audioContext = new (window.AudioContext || window.webkitAudioContext)();
			const masterGain = audioContext.createGain();
			masterGain.connect(audioContext.destination);
			masterGain.gain.setValueAtTime(0.4, audioContext.currentTime);
			
			const currentTime = audioContext.currentTime;
			const duration = 4; // Durée totale du son
			
			// 🎵 Son principal : effet "whoosh" rotatif
			const createWhooshSound = () => {
				const oscillator = audioContext.createOscillator();
				const gain = audioContext.createGain();
				const filter = audioContext.createBiquadFilter();
				
				oscillator.type = 'sawtooth';
				oscillator.frequency.setValueAtTime(80, currentTime);
				oscillator.frequency.exponentialRampToValueAtTime(300, currentTime + 0.5);
				oscillator.frequency.exponentialRampToValueAtTime(120, currentTime + duration);
				
				filter.type = 'lowpass';
				filter.frequency.setValueAtTime(800, currentTime);
				filter.frequency.exponentialRampToValueAtTime(2000, currentTime + 1);
				filter.frequency.exponentialRampToValueAtTime(400, currentTime + duration);
				
				gain.gain.setValueAtTime(0.6, currentTime);
				gain.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);
				
				oscillator.connect(filter);
				filter.connect(gain);
				gain.connect(masterGain);
				
				oscillator.start(currentTime);
				oscillator.stop(currentTime + duration);
			};
			
			// 🎪 Son secondaire : clics rythmés (comme une roue qui tourne)
			const createTickingSound = () => {
				const tickCount = 20; // Nombre de clics
				for (let i = 0; i < tickCount; i++) {
					const tickTime = currentTime + (i * duration / tickCount);
					const oscillator = audioContext.createOscillator();
					const gain = audioContext.createGain();
					
					oscillator.type = 'square';
					oscillator.frequency.setValueAtTime(800 + (i * 20), tickTime);
					
					gain.gain.setValueAtTime(0, tickTime);
					gain.gain.linearRampToValueAtTime(0.3, tickTime + 0.01);
					gain.gain.exponentialRampToValueAtTime(0.01, tickTime + 0.05);
					
					oscillator.connect(gain);
					gain.connect(masterGain);
					
					oscillator.start(tickTime);
					oscillator.stop(tickTime + 0.05);
				}
			};
			
			// 🎊 Son d'effet : montée dramatique
			const createDramaticRise = () => {
				const oscillator = audioContext.createOscillator();
				const gain = audioContext.createGain();
				const filter = audioContext.createBiquadFilter();
				
				oscillator.type = 'triangle';
				oscillator.frequency.setValueAtTime(150, currentTime + 2);
				oscillator.frequency.exponentialRampToValueAtTime(600, currentTime + duration);
				
				filter.type = 'highpass';
				filter.frequency.setValueAtTime(100, currentTime + 2);
				filter.frequency.exponentialRampToValueAtTime(400, currentTime + duration);
				
				gain.gain.setValueAtTime(0, currentTime + 2);
				gain.gain.linearRampToValueAtTime(0.4, currentTime + 2.5);
				gain.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);
				
				oscillator.connect(filter);
				filter.connect(gain);
				gain.connect(masterGain);
				
				oscillator.start(currentTime + 2);
				oscillator.stop(currentTime + duration);
			};
			
			// 🎆 Son final : "ding" de fin
			const createEndDing = () => {
				setTimeout(() => {
					const oscillator = audioContext.createOscillator();
					const gain = audioContext.createGain();
					
					oscillator.type = 'sine';
					oscillator.frequency.setValueAtTime(800, currentTime + duration - 0.3);
					oscillator.frequency.exponentialRampToValueAtTime(1200, currentTime + duration - 0.1);
					
					gain.gain.setValueAtTime(0.5, currentTime + duration - 0.3);
					gain.gain.exponentialRampToValueAtTime(0.01, currentTime + duration + 0.5);
					
					oscillator.connect(gain);
					gain.connect(masterGain);
					
					oscillator.start(currentTime + duration - 0.3);
					oscillator.stop(currentTime + duration + 0.5);
				}, 3700); // Délai pour synchroniser avec la fin du spin
			};
			
			// Jouer tous les sons ensemble
			createWhooshSound();
			createTickingSound();
			createDramaticRise();
			createEndDing();
			
		} catch (error) {
			console.log("Audio not supported or blocked:", error);
		}
	};

	const handleSpin = async () => {
		console.log("handleSpin called, mustSpin:", mustSpin, "canSpin:", canSpin);

		if (mustSpin || !wheel || spinsLeft === "0") {
			console.log("Spin blocked - mustSpin:", mustSpin, "wheel:", !!wheel, "spinsLeft:", spinsLeft);
			return;
		}

		try {
			console.log("Starting spin...");
			setShowConfetti(false);

			playSpinSound();

			setMustSpin(true);

			const response = await spinWheel(wheelId);
			console.log("API response:", response);

			if (response.data) {
				if (wheel.numberOfSpins !== -1) {
					setSpinsLeft((prev) => (prev === "Unlimited" ? "Unlimited" : Math.max(0, parseInt(prev) - 1)));
				}

				await loadRecentResults();
			}
		} catch (error) {
			console.error("Error during spin:", error);
			setErrorMessage("Error during spin");
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
			setErrorMessage("Error updating element");
		}
	};

	const handleReset = async () => {
		try {
			await resetResults(wheelId);
			setSelectedElement(null);
			setLastResult(null);
			fetchWheel();
		} catch (error) {
			setErrorMessage("Error during reset");
		}
	};

	const handleActivateAll = async () => {
		try {
			await setAllElementsActive(wheelId);
			fetchWheel();
		} catch (error) {
			setErrorMessage("Error activating elements");
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
		return <div className="error-message">Wheel not found or no elements</div>;
	}

	const canSpin = spinsLeft !== "0" && !mustSpin && wheel.elements.some((el) => el.isActif);
	const wheelDisabled = !canSpin && !mustSpin;

	return (
		<div className="WheelDetails" onMouseMove={handleMouseMove}>
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
				<div 
					className="wheel-container"
					onMouseLeave={handleMouseLeave}
				>
					<CustomWheel
						elements={wheel.elements.filter((el) => el.isActif)}
						onSpinEnd={handleSpinEnd}
						onSpinStart={handleSpinStart}
						isSpinning={mustSpin}
						spinDuration={5}
						spinSpeed={10}
						wheelSize={500}
						borderWidth={0}
						customColors={wheel.elements.filter((el) => el.isActif).map((element) => element.color)}
						disabled={wheelDisabled}
						onElementHover={handleElementHover}
					/>
				</div>

				<div className="spin-controls">
					<button
						className={`spin-button-large ${!canSpin ? "disabled" : ""}`}
						onClick={(e) => {
							e.preventDefault();
							e.stopPropagation();
							handleSpin();
						}}
						disabled={!canSpin}
						type="button"
					>
						{mustSpin ? "SPINNING..." : "SPIN"}
					</button>

					{!canSpin && spinsLeft === "0" && <p className="no-spins-message">No more spins available</p>}

					{!canSpin && !wheel.elements.some((el) => el.isActif) && (
						<p className="no-active-elements">No active elements</p>
					)}
				</div>

				{selectedElement && (
					<div
						className="selected-element-display"
						style={{
							background: selectedElement.color
								? `linear-gradient(135deg, ${createColorVariations(selectedElement.color).light}, ${
										selectedElement.color
								  })`
								: "linear-gradient(135deg, #ffeaa7, #fdcb6e)",
							boxShadow: selectedElement.color
								? `0 4px 20px ${createColorVariations(selectedElement.color).alpha}`
								: "0 4px 20px rgba(253, 203, 110, 0.3)",
						}}
					>
						<h2>Selected Element</h2>
						<div className="selected-element-label">{selectedElement.label}</div>

						{selectedElement.color && (
							<div className="selected-color-indicator">
								<div className="selected-color-dot" style={{ backgroundColor: selectedElement.color }}></div>
							</div>
						)}
					</div>
				)}
			</div>

			{/* Tooltip amélioré avec support multi-lignes */}
			<EnhancedTooltip
				element={hoveredElement}
				mousePosition={mousePosition}
				wheelSize={500}
				isVisible={showTooltip && hoveredElement && !mustSpin}
				elements={wheel.elements.filter((el) => el.isActif)}
			/>

			<div className="copy-link-button">
				<button className="copyButton" onClick={copyToClipboard}>
					Copy Wheel Link
				</button>
			</div>

			{results && results.length > 0 && (
				<div className="results-history">
					<h3>Results History</h3>
					<ul>
						{results
							.slice()
							.reverse()
							.map((res, idx) => (
								<li key={idx}>{res.label}</li>
							))}
					</ul>
				</div>
			)}

			<div className="elements-list">
				<h3>Wheel Elements</h3>
				<div className="elements-grid">
					{wheel.elements
						.filter((el) => el.isActif)
						.map((element, index) => (
							<div
								key={element._id || element.id}
								className={`element-card ${
									hoveredElement?.id === element.id || hoveredElement?._id === element._id ? "highlighted" : ""
								}`}
								style={{
									borderLeft: `6px solid ${element.color || "#ccc"}`,
									backgroundColor: `${element.color}15`,
									boxShadow:
										hoveredElement?.id === element.id || hoveredElement?._id === element._id
											? `0 8px 24px ${element.color}40, 0 0 0 2px ${element.color}80`
											: "0 2px 8px rgba(0, 0, 0, 0.1)",
									transform:
										hoveredElement?.id === element.id || hoveredElement?._id === element._id
											? "translateY(-4px) scale(1.02)"
											: "translateY(0) scale(1)",
								}}
								onMouseEnter={() => setHoveredElement(element)}
								onMouseLeave={() => setHoveredElement(null)}
							>
								<div className="element-header">
									<div className="element-color-indicator" style={{ backgroundColor: element.color || "#ccc" }}></div>
									<span className="element-label">{element.label}</span>
								</div>

								<div className="element-details">
									<div className="element-weight">
										<span className="detail-label">Weight:</span>
										<span className="detail-value">{element.weight}</span>
									</div>
									<div className="element-probability">
										<span className="detail-label">Probability:</span>
										<span className="detail-value">
											{calculateProbability(
												element.weight,
												wheel.elements.filter((el) => el.isActif)
											)}
											%
										</span>
									</div>
								</div>
							</div>
						))}
				</div>
			</div>

			{true && (
				<div className="admin-controls">
					<div className="admin-buttons">
						<button className="control-button" onClick={() => setShowResultsModal(true)}>
							View Results & Stats
						</button>
						<button className="control-button" onClick={() => navigate(`/edit-wheel/${wheelId}`)}>
							Edit Wheel
						</button>
					</div>
				</div>
			)}

			{showConfetti && selectedElement && (
				<div className="result-overlay" onClick={() => setShowConfetti(false)} style={{ cursor: "pointer" }}>
					<div className="result-content" onClick={(e) => e.stopPropagation()}>
						<h2>Result</h2>
						<p>{selectedElement.label}</p>
						<button
							onClick={() => setShowConfetti(false)}
							style={{
								marginTop: "16px",
								padding: "8px 16px",
								background: "#ff69b4",
								color: "white",
								border: "none",
								borderRadius: "4px",
								cursor: "pointer",
							}}
						>
							Close
						</button>
					</div>
				</div>
			)}

			<ToastContainer />

			<ResultsDisplay wheelId={wheelId} isVisible={showResultsModal} onClose={() => setShowResultsModal(false)} />
		</div>
	);
};

export default WheelDetails;