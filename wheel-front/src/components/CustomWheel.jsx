import React, { useEffect, useRef, useState, useCallback } from "react";
import "./CustomWheel.css";

const pointerSize = 60;

const CustomWheel = ({
	elements,
	onSpinEnd,
	isSpinning,
	spinDuration = 5,
	spinSpeed = 10,
	wheelSize = 800,
	borderWidth = 4,
	borderColor = "#000",
	backgroundColor = "#fff",
	textColor = "#000",
	fontSize = "5px",
	fontWeight = "bold",
	showPointer = true,
	pointerColor = "#ff0000",
	customColors = [],
	onSpinStart,
	disabled = false,
	onElementHover,
	selectedElement,
	result,
	targetElementId = null,
}) => {
	const wheelCanvasRef = useRef(null);
	const pointerCanvasRef = useRef(null);
	const containerRef = useRef(null);

	const [currentRotation, setCurrentRotation] = useState(0);
	const [isInternalAnimating, setIsInternalAnimating] = useState(false);
	const [hoveredElementIndex, setHoveredElementIndex] = useState(null);
	const [lastSpinComplete, setLastSpinComplete] = useState(true);
	const animationRef = useRef(null);
	const spinStartedRef = useRef(false);

	const calculateAngles = useCallback(() => {
		if (elements.length === 0) return [];

		// Calculer le poids total
		const totalWeight = elements.reduce((sum, element) => sum + (element.weight || 1), 0);

		console.log("📏 Total weight:", totalWeight);
		console.log(
			"📏 Elements weights:",
			elements.map((el) => ({ label: el.label, weight: el.weight || 1 }))
		);

		// Calculer les angles cumulatifs
		let currentAngle = 0;
		const angles = [];

		elements.forEach((element, index) => {
			const weight = element.weight || 1;
			const angleSize = (weight / totalWeight) * 360;

			angles.push({
				startAngle: currentAngle,
				endAngle: currentAngle + angleSize,
				angleSize: angleSize,
				weight: weight,
			});

			console.log(
				`📏 Element ${index} (${element.label}): ${currentAngle.toFixed(2)}° -> ${(currentAngle + angleSize).toFixed(
					2
				)}° (size: ${angleSize.toFixed(2)}°)`
			);

			currentAngle += angleSize;
		});

		return angles;
	}, [elements]);

	const getElementInfo = useCallback(
		(index) => {
			const angles = calculateAngles();
			if (index < 0 || index >= angles.length) return null;

			return {
				...elements[index],
				...angles[index],
			};
		},
		[elements, calculateAngles]
	);

	const hexToRgb = useCallback((hex) => {
		if (!hex) return null;
		if (hex.startsWith("#")) {
			const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
			return result
				? {
						r: parseInt(result[1], 16),
						g: parseInt(result[2], 16),
						b: parseInt(result[3], 16),
				  }
				: null;
		}
		return { r: 255, g: 105, b: 180 };
	}, []);

	const adjustTextToSection = useCallback((ctx, text, maxWidth, maxHeight) => {
		const words = text.split(" ");
		const lines = [];
		let currentLine = "";
		let fontSize = 18;

		ctx.font = `bold ${fontSize}px Arial`;

		const calculateLines = (size) => {
			ctx.font = `bold ${size}px Arial`;
			const testLines = [];
			let testLine = "";

			for (let word of words) {
				const testWidth = ctx.measureText(testLine + word + " ").width;
				if (testWidth > maxWidth && testLine !== "") {
					testLines.push(testLine.trim());
					testLine = word + " ";
				} else {
					testLine += word + " ";
				}
			}
			if (testLine.trim() !== "") {
				testLines.push(testLine.trim());
			}
			return testLines;
		};

		let testLines = calculateLines(fontSize);
		while (testLines.length * (fontSize + 2) > maxHeight && fontSize > 10) {
			fontSize -= 1;
			testLines = calculateLines(fontSize);
		}

		if (testLines.length * (fontSize + 2) > maxHeight) {
			const maxLines = Math.floor(maxHeight / (fontSize + 2));
			testLines = testLines.slice(0, maxLines);
			if (testLines.length > 0) {
				const lastLine = testLines[testLines.length - 1];
				if (lastLine.length > 15) {
					testLines[testLines.length - 1] = lastLine.substring(0, 12) + "...";
				}
			}
		}

		return {
			lines: testLines,
			fontSize: fontSize,
		};
	}, []);

    const getElementIndexAtAngle = useCallback(
		(angle) => {
			const angles = calculateAngles();

			// Normaliser l'angle
			const normalizedAngle = ((angle % 360) + 360) % 360;

			// Trouver dans quelle section se trouve cet angle
			for (let i = 0; i < angles.length; i++) {
				const angleInfo = angles[i];

				if (angleInfo.startAngle <= angleInfo.endAngle) {
					// Section normale
					if (normalizedAngle >= angleInfo.startAngle && normalizedAngle < angleInfo.endAngle) {
						return i;
					}
				} else {
					// Section qui traverse 0°
					if (normalizedAngle >= angleInfo.startAngle || normalizedAngle < angleInfo.endAngle) {
						return i;
					}
				}
			}

			return 0; // Fallback
		},
		[calculateAngles]
	);

	const getSelectedElement = useCallback((rotation) => {
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    
    // L'angle où la flèche pointe (270° = haut)
    const arrowAngle = 270;
    
    // Angle relatif de la flèche par rapport à la roue tournée
    let relativeAngle = (arrowAngle - normalizedRotation) % 360;
    if (relativeAngle < 0) relativeAngle += 360;
    
    const selectedIndex = getElementIndexAtAngle(relativeAngle);
    
    console.log('🔍 getSelectedElement - Rotation:', rotation.toFixed(2));
    console.log('🔍 getSelectedElement - Relative angle:', relativeAngle.toFixed(2));
    console.log('🔍 getSelectedElement - Selected index:', selectedIndex);
    console.log('🔍 getSelectedElement - Selected element:', elements[selectedIndex]?.label);
    
    return elements[selectedIndex];
}, [elements, getElementIndexAtAngle]);

	const getHoveredElement = useCallback(
		(mouseX, mouseY, centerX, centerY, radius, rotation) => {
			const dx = mouseX - centerX;
			const dy = mouseY - centerY;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance > radius || distance < 20) return null;

			// Calculer l'angle de la souris par rapport au centre
			let mouseAngle = Math.atan2(dy, dx) * (180 / Math.PI);
			mouseAngle = (mouseAngle + 360) % 360;

			// UTILISER LA MÊME LOGIQUE QUE getSelectedElement
			// Simuler comme si une flèche était à la position de la souris
			// et trouver quel élément elle pointerait

			// L'angle "flèche" est maintenant l'angle de la souris
			const virtualArrowAngle = mouseAngle;

			// Angle relatif par rapport à la roue tournée
			let relativeAngle = (virtualArrowAngle - rotation) % 360;
			if (relativeAngle < 0) relativeAngle += 360;

			const hoveredIndex = getElementIndexAtAngle(relativeAngle);

			console.log(
				"🖱️ Mouse angle:",
				mouseAngle.toFixed(2),
				"Relative:",
				relativeAngle.toFixed(2),
				"Hovered element:",
				elements[hoveredIndex]?.label
			);

			return hoveredIndex;
		},
		[getElementIndexAtAngle, elements]
	);

	const handleMouseMove = useCallback(
		(event) => {
			if (isSpinning || isInternalAnimating || !lastSpinComplete) return;

			const container = containerRef.current;
			if (!container) return;

			const rect = container.getBoundingClientRect();
			const mouseX = event.clientX - rect.left;
			const mouseY = event.clientY - rect.top;

			const centerX = wheelSize / 2;
			const centerY = wheelSize / 2 + pointerSize + 10;
			const radius = (wheelSize - borderWidth * 2) / 2;

			const elementIndex = getHoveredElement(mouseX, mouseY, centerX, centerY, radius, currentRotation);

			if (elementIndex !== hoveredElementIndex) {
				setHoveredElementIndex(elementIndex);

				if (elementIndex !== null && elementIndex >= 0 && onElementHover) {
					onElementHover(elements[elementIndex]);
				} else if ((elementIndex === null || elementIndex < 0) && onElementHover) {
					onElementHover(null);
				}
			}
		},
		[
			isSpinning,
			isInternalAnimating,
			lastSpinComplete,
			wheelSize,
			borderWidth,
			currentRotation,
			hoveredElementIndex,
			onElementHover,
			elements,
			getHoveredElement,
		]
	);

	const handleMouseLeave = useCallback(() => {
		if (!isSpinning && !isInternalAnimating && lastSpinComplete) {
			setHoveredElementIndex(null);
			if (onElementHover) {
				onElementHover(null);
			}
		}
	}, [isSpinning, isInternalAnimating, lastSpinComplete, onElementHover]);

	const drawWheelOnly = useCallback(
		(ctx, rotation) => {
			const centerX = wheelSize / 2;
			const centerY = wheelSize / 2 + pointerSize + 10;
			const radius = (wheelSize - borderWidth * 2) / 2;
			const angles = calculateAngles();

			ctx.clearRect(0, 0, wheelSize, wheelSize + pointerSize + 20);

			elements.forEach((element, index) => {
				if (index >= angles.length) return;

				ctx.save();

				const angleInfo = angles[index];
				const startAngle = ((angleInfo.startAngle + rotation) * Math.PI) / 180;
				const endAngle = ((angleInfo.endAngle + rotation) * Math.PI) / 180;

				ctx.beginPath();
				ctx.moveTo(centerX, centerY);
				ctx.arc(centerX, centerY, radius, startAngle, endAngle);
				ctx.closePath();

				let color = customColors[index] || `hsl(${(index * 360) / elements.length}, 70%, 60%)`;

				if (hoveredElementIndex === index && !isSpinning && !isInternalAnimating && lastSpinComplete) {
					ctx.shadowColor = color;
					ctx.shadowBlur = 15;
					const rgb = hexToRgb(color) || { r: 255, g: 105, b: 180 };
					color = `rgb(${Math.min(255, rgb.r + 30)}, ${Math.min(255, rgb.g + 30)}, ${Math.min(255, rgb.b + 30)})`;
				}

				ctx.fillStyle = color;
				ctx.fill();

				ctx.shadowColor = "transparent";
				ctx.shadowBlur = 0;

				// Calculer la position du texte au centre de la section
				const centerAngle = (startAngle + endAngle) / 2;
				const textRadius = radius * 0.65;
				const textX = centerX + Math.cos(centerAngle) * textRadius;
				const textY = centerY + Math.sin(centerAngle) * textRadius;

				// Adapter la taille du texte à la taille de la section
				const sectionAngleRadians = Math.abs(endAngle - startAngle);
				const maxTextWidth = Math.min(radius * 0.6, Math.abs(2 * Math.sin(sectionAngleRadians / 2) * textRadius * 0.8));

				// Plus la section est grande, plus le texte peut être grand
				const baseFontSize = 18;
				const weightMultiplier = Math.sqrt(element.weight || 1); // Racine carrée pour éviter que ce soit trop gros
				const adjustedMaxHeight = radius * 0.3 * Math.min(weightMultiplier, 2); // Limiter à 2x la taille normale

				const textInfo = adjustTextToSection(ctx, element.label, maxTextWidth, adjustedMaxHeight);

				ctx.save();
				ctx.translate(textX, textY);
				ctx.rotate(centerAngle + Math.PI / 2);
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";

				// Fond du texte
				ctx.save();
				ctx.globalAlpha = 0.85;
				ctx.fillStyle = "#fff";
				const lineHeight = textInfo.fontSize + 2;
				const totalHeight = textInfo.lines.length * lineHeight;
				const backgroundPadding = 6;

				ctx.font = `bold ${textInfo.fontSize}px Arial`;
				let maxLineWidth = 0;
				textInfo.lines.forEach((line) => {
					const lineWidth = ctx.measureText(line).width;
					if (lineWidth > maxLineWidth) {
						maxLineWidth = lineWidth;
					}
				});

				ctx.fillRect(
					-maxLineWidth / 2 - backgroundPadding,
					-totalHeight / 2 - backgroundPadding / 2,
					maxLineWidth + backgroundPadding * 2,
					totalHeight + backgroundPadding
				);
				ctx.restore();

				// Texte
				ctx.fillStyle = "#000";
				ctx.font = `bold ${textInfo.fontSize}px Arial`;

				const startY = (-(textInfo.lines.length - 1) * lineHeight) / 2;
				textInfo.lines.forEach((line, lineIndex) => {
					const lineY = startY + lineIndex * lineHeight;
					ctx.fillText(line, 0, lineY);
				});

				// Afficher le weight si > 1
				if ((element.weight || 1) > 1) {
					ctx.fillStyle = "#ff0000";
					ctx.font = `bold ${Math.max(12, textInfo.fontSize * 0.7)}px Arial`;
				}

				ctx.restore();
				ctx.restore();
			});
		},
		[
			wheelSize,
			pointerSize,
			borderWidth,
			calculateAngles,
			elements,
			customColors,
			hoveredElementIndex,
			isSpinning,
			isInternalAnimating,
			lastSpinComplete,
			hexToRgb,
			adjustTextToSection,
		]
	);

	const drawPointerOnly = useCallback(
		(ctx) => {
			if (!showPointer) return;

			const centerX = wheelSize / 2;
			const centerY = wheelSize / 2 + pointerSize + 10;
			const radius = (wheelSize - borderWidth * 2) / 2;

			ctx.clearRect(0, 0, wheelSize, wheelSize + pointerSize + 20);

			ctx.save();

			const pointerTipY = centerY - radius - 5;
			const pointerBaseY = centerY - radius - pointerSize;

			ctx.beginPath();
			ctx.moveTo(centerX, pointerTipY);
			ctx.lineTo(centerX - pointerSize * 0.4, pointerBaseY);
			ctx.lineTo(centerX + pointerSize * 0.4, pointerBaseY);
			ctx.closePath();

			ctx.shadowColor = "#000000";
			ctx.shadowBlur = 8;
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 4;

			ctx.fillStyle = pointerColor;
			ctx.fill();

			ctx.shadowColor = "transparent";
			ctx.strokeStyle = "#ffffff";
			ctx.lineWidth = 3;
			ctx.stroke();

			ctx.restore();
		},
		[showPointer, wheelSize, pointerSize, borderWidth, pointerColor]
	);

	const animate = useCallback(
		(startTime, targetRotation) => {
			const now = Date.now();
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / (spinDuration * 1000), 1);
			const easeOut = (t) => 1 - Math.pow(1 - t, 3);
			const newRotation = currentRotation + (targetRotation - currentRotation) * easeOut(progress);

			setCurrentRotation(newRotation);

			const wheelCtx = wheelCanvasRef.current?.getContext("2d");
			if (wheelCtx) {
				drawWheelOnly(wheelCtx, newRotation);
			}

			if (progress < 1) {
				animationRef.current = requestAnimationFrame(() => animate(startTime, targetRotation));
			} else {
				setIsInternalAnimating(false);
				setLastSpinComplete(true);
				spinStartedRef.current = false;

				const wheelCtx = wheelCanvasRef.current?.getContext("2d");
				if (wheelCtx) {
					drawWheelOnly(wheelCtx, newRotation);
				}

				const finalElement = result || getSelectedElement(newRotation);
				onSpinEnd && onSpinEnd(finalElement);
			}
		},
		[currentRotation, spinDuration, drawWheelOnly, getSelectedElement, onSpinEnd, result]
	);

	const calculateRotationForElement = useCallback(
		(targetElementId) => {
			if (!targetElementId || elements.length === 0) return null;

			// Trouver l'index de l'élément ciblé
			const targetIndex = elements.findIndex((el) => el._id === targetElementId || el.id === targetElementId);
			if (targetIndex === -1) {
				console.error("❌ Element not found with ID:", targetElementId);
				return null;
			}

			console.log("🎯 Target element:", elements[targetIndex].label, "at index:", targetIndex);
			console.log("🎯 Current rotation:", currentRotation.toFixed(2));

			const angles = calculateAngles();
			const targetAngleInfo = angles[targetIndex];

			if (!targetAngleInfo) {
				console.error("❌ No angle info for target index:", targetIndex);
				return null;
			}

			console.log(
				"🎯 Target section:",
				targetAngleInfo.startAngle.toFixed(2),
				"->",
				targetAngleInfo.endAngle.toFixed(2)
			);

			// Générer un angle aléatoire dans cette section
			const margin = targetAngleInfo.angleSize * 0.15;
			const effectiveStart = targetAngleInfo.startAngle + margin;
			const effectiveEnd = targetAngleInfo.endAngle - margin;
			const randomAngleInSection = effectiveStart + Math.random() * (effectiveEnd - effectiveStart);

			console.log("🎲 Random angle in section:", randomAngleInSection.toFixed(2));

			// CORRECTION: Calculer la rotation absolue nécessaire
			// On veut que la flèche (270°) pointe sur randomAngleInSection
			let targetAbsoluteRotation = 270 - randomAngleInSection;

			// Normaliser entre 0 et 360
			while (targetAbsoluteRotation < 0) {
				targetAbsoluteRotation += 360;
			}
			targetAbsoluteRotation = targetAbsoluteRotation % 360;

			// Ajouter assez de tours complets pour faire une belle animation
			const minSpins = spinSpeed; // Tours minimum
			const currentNormalized = currentRotation % 360;

			// Calculer combien de degrés on doit tourner depuis la position actuelle
			let rotationNeeded = targetAbsoluteRotation - currentNormalized;
			if (rotationNeeded < 0) {
				rotationNeeded += 360;
			}

			// Ajouter les tours complets
			const totalRotationNeeded = 360 * minSpins + rotationNeeded;
			const finalAbsoluteRotation = currentRotation + totalRotationNeeded;

			console.log("🎯 Current normalized:", currentNormalized.toFixed(2));
			console.log("🎯 Target absolute rotation:", targetAbsoluteRotation.toFixed(2));
			console.log("🎯 Rotation needed:", rotationNeeded.toFixed(2));
			console.log("🎯 Total rotation needed:", totalRotationNeeded.toFixed(2));
			console.log("🎯 Final absolute rotation:", finalAbsoluteRotation.toFixed(2));

			// Vérification
			const finalNormalized = finalAbsoluteRotation % 360;
			const getIndexForRotation = (rotation) => {
				const normalizedRotation = ((rotation % 360) + 360) % 360;
				let relativeAngle = (270 - normalizedRotation) % 360;
				if (relativeAngle < 0) relativeAngle += 360;

				for (let i = 0; i < angles.length; i++) {
					const angleInfo = angles[i];
					if (relativeAngle >= angleInfo.startAngle && relativeAngle < angleInfo.endAngle) {
						return i;
					}
				}
				return 0;
			};

			const verificationIndex = getIndexForRotation(finalAbsoluteRotation);
			console.log("🔍 Final normalized:", finalNormalized.toFixed(2));
			console.log(
				"🔍 Verification - Will select index:",
				verificationIndex,
				"element:",
				elements[verificationIndex]?.label
			);

			if (verificationIndex !== targetIndex) {
				console.error("❌ Verification failed! Expected index:", targetIndex, "Got index:", verificationIndex);

				// Debug supplémentaire
				const debugRelativeAngle = (270 - finalNormalized) % 360;
				console.log("🐛 Debug - Arrow points to angle:", debugRelativeAngle.toFixed(2));
				angles.forEach((angleInfo, idx) => {
					console.log(`🐛 Section ${idx}: ${angleInfo.startAngle.toFixed(2)}-${angleInfo.endAngle.toFixed(2)}`);
				});

				return null;
			} else {
				console.log("✅ Verification passed!");
			}

			return finalAbsoluteRotation;
		},
		[elements, calculateAngles, currentRotation, spinSpeed]
	);
	const startSpin = useCallback(
		(targetId = null) => {
			if (disabled || isInternalAnimating || elements.length === 0 || spinStartedRef.current) {
				return;
			}

			spinStartedRef.current = true;
			setLastSpinComplete(false);
			setIsInternalAnimating(true);
			setHoveredElementIndex(null);

			if (onElementHover) {
				onElementHover(null);
			}

			onSpinStart && onSpinStart();

			let totalRotation;

			if (targetId) {
				console.log("🎯 Starting targeted spin for element ID:", targetId);

				// calculateRotationForElement retourne déjà une rotation absolue
				const targetRotation = calculateRotationForElement(targetId);
				if (targetRotation !== null) {
					// CORRECTION: Ne pas ajouter currentRotation car calculateRotationForElement
					// calcule déjà depuis la position actuelle
					totalRotation = targetRotation;
					console.log("🎯 Using calculated rotation:", totalRotation);
				} else {
					console.log("❌ Fallback to random rotation");
					// Fallback: rotation aléatoire si l'élément n'est pas trouvé
					const baseRotation = 360 * spinSpeed;
					const randomExtra = Math.random() * 360;
					totalRotation = currentRotation + baseRotation + randomExtra;
				}
			} else {
				console.log("🎯 Starting random spin");
				// Rotation aléatoire normale
				const baseRotation = 360 * spinSpeed;
				const randomExtra = Math.random() * 360;
				totalRotation = currentRotation + baseRotation + randomExtra;
			}

			console.log("🎯 Final total rotation for animation:", totalRotation);
			animationRef.current = requestAnimationFrame(() => animate(Date.now(), totalRotation));
		},
		[
			disabled,
			isInternalAnimating,
			elements.length,
			onElementHover,
			onSpinStart,
			currentRotation,
			animate,
			calculateRotationForElement,
			spinSpeed,
		]
	);

	useEffect(() => {
		// Attendre que targetElementId soit défini avant de démarrer la rotation
		if (isSpinning && lastSpinComplete && !isInternalAnimating && elements.length > 0 && targetElementId) {
			console.log("🎯 CustomWheel: Starting spin with target ID:", targetElementId);
			startSpin(targetElementId);
		} else if (isSpinning && targetElementId === null) {
			console.log("⏳ CustomWheel: Waiting for target element ID...");
		}
	}, [isSpinning, lastSpinComplete, isInternalAnimating, elements.length, startSpin, targetElementId]);

	useEffect(() => {
		if (!isSpinning && !isInternalAnimating) {
			setLastSpinComplete(true);
			spinStartedRef.current = false;
		}
	}, [isSpinning, isInternalAnimating]);

	useEffect(() => {
		return () => {
			if (animationRef.current) {
				cancelAnimationFrame(animationRef.current);
			}
		};
	}, []);

	useEffect(() => {
		const wheelCtx = wheelCanvasRef.current?.getContext("2d");
		const pointerCtx = pointerCanvasRef.current?.getContext("2d");

		if (wheelCtx && pointerCtx && elements.length > 0) {
			drawWheelOnly(wheelCtx, currentRotation);
			drawPointerOnly(pointerCtx);
		}
	}, [elements, currentRotation, hoveredElementIndex, lastSpinComplete, drawWheelOnly, drawPointerOnly]);

	useEffect(() => {
		const wheelCtx = wheelCanvasRef.current?.getContext("2d");
		const pointerCtx = pointerCanvasRef.current?.getContext("2d");

		if (wheelCtx && pointerCtx && elements.length > 0) {
			drawWheelOnly(wheelCtx, currentRotation);
			drawPointerOnly(pointerCtx);
		}
	}, [drawWheelOnly, drawPointerOnly, currentRotation, elements.length]);

	const canvasWidth = wheelSize;
	const canvasHeight = wheelSize + pointerSize + 20;

	return (
		<div
			ref={containerRef}
			className="custom-wheel-container"
			style={{ width: canvasWidth, height: canvasHeight, position: "relative" }}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
		>
			<canvas
				ref={wheelCanvasRef}
				width={canvasWidth}
				height={canvasHeight}
				className="custom-wheel-canvas"
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					cursor: disabled ? "not-allowed" : lastSpinComplete && !isSpinning ? "default" : "wait",
					zIndex: 1,
				}}
			/>

			<canvas
				ref={pointerCanvasRef}
				width={canvasWidth}
				height={canvasHeight}
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					pointerEvents: "none",
					zIndex: 2,
				}}
			/>
		</div>
	);
};

export default CustomWheel;
