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
		const totalElements = elements.length;
		const anglePerElement = 360 / totalElements;
		return elements.map((_, index) => index * anglePerElement);
	}, [elements.length]);

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

	const getSelectedElement = useCallback((rotation) => {
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const anglePerElement = 360 / elements.length;
    
    let relativeAngle = (270 - normalizedRotation) % 360;
    if (relativeAngle < 0) relativeAngle += 360;
    
    const selectedIndex = Math.floor(relativeAngle / anglePerElement) % elements.length;
    
    console.log('🔍 getSelectedElement - Rotation:', rotation.toFixed(2));
    console.log('🔍 getSelectedElement - Normalized:', normalizedRotation.toFixed(2));
    console.log('🔍 getSelectedElement - Relative angle:', relativeAngle.toFixed(2));
    console.log('🔍 getSelectedElement - Selected index:', selectedIndex);
    console.log('🔍 getSelectedElement - Selected element:', elements[selectedIndex]?.label);
    
    return elements[selectedIndex];
}, [elements]);

	const getHoveredElement = useCallback(
		(mouseX, mouseY, centerX, centerY, radius, rotation) => {
			const dx = mouseX - centerX;
			const dy = mouseY - centerY;
			const distance = Math.sqrt(dx * dx + dy * dy);

			if (distance > radius || distance < 20) return null;

			let mouseAngle = Math.atan2(dy, dx) * (180 / Math.PI);
			mouseAngle = (mouseAngle + 360) % 360;

			let adjustedAngle = (360 - mouseAngle) % 360;
			let relativeAngle = (rotation - adjustedAngle + 360) % 360;

			const anglePerElement = 360 / elements.length;
			const elementIndex = Math.floor(relativeAngle / anglePerElement);

			return Math.max(0, Math.min(elements.length - 1, elementIndex));
		},
		[elements.length]
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

	const formatTooltipText = useCallback((text, maxCharsPerLine = 25) => {
		if (!text || text.length <= maxCharsPerLine) {
			return [text];
		}

		const words = text.split(" ");
		const lines = [];
		let currentLine = "";

		for (let word of words) {
			const testLine = currentLine + (currentLine ? " " : "") + word;
			if (testLine.length <= maxCharsPerLine) {
				currentLine = testLine;
			} else {
				if (currentLine) {
					lines.push(currentLine);
					currentLine = word;
				} else {
					if (word.length > maxCharsPerLine) {
						lines.push(word.substring(0, maxCharsPerLine - 3) + "...");
						currentLine = "";
					} else {
						currentLine = word;
					}
				}
			}
		}

		if (currentLine) {
			lines.push(currentLine);
		}

		return lines;
	}, []);

	const drawWheelOnly = useCallback(
		(ctx, rotation) => {
			const centerX = wheelSize / 2;
			const centerY = wheelSize / 2 + pointerSize + 10;
			const radius = (wheelSize - borderWidth * 2) / 2;
			const angles = calculateAngles();

			ctx.clearRect(0, 0, wheelSize, wheelSize + pointerSize + 20);

			elements.forEach((element, index) => {
				ctx.save();

				const baseAngle = angles[index];
				const nextBaseAngle = angles[index + 1] || 360;
				const sectionAngle = nextBaseAngle - baseAngle;

				const startAngle = ((baseAngle + rotation) * Math.PI) / 180;
				const endAngle = ((nextBaseAngle + rotation) * Math.PI) / 180;

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

				const textAngle = (startAngle + endAngle) / 2;
				const textRadius = radius * 0.65;
				const textX = centerX + Math.cos(textAngle) * textRadius;
				const textY = centerY + Math.sin(textAngle) * textRadius;

				const sectionRadians = (sectionAngle * Math.PI) / 180;
				const maxTextWidth = Math.min(radius * 0.6, Math.abs(2 * Math.sin(sectionRadians / 2) * textRadius * 0.8));
				const maxTextHeight = radius * 0.3;

				const textInfo = adjustTextToSection(ctx, element.label, maxTextWidth, maxTextHeight);

				ctx.save();
				ctx.translate(textX, textY);
				ctx.rotate(textAngle + Math.PI / 2);
				ctx.textAlign = "center";
				ctx.textBaseline = "middle";

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

				ctx.fillStyle = "#000";
				ctx.font = `bold ${textInfo.fontSize}px Arial`;

				const startY = (-(textInfo.lines.length - 1) * lineHeight) / 2;
				textInfo.lines.forEach((line, lineIndex) => {
					const lineY = startY + lineIndex * lineHeight;
					ctx.fillText(line, 0, lineY);
				});

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
        console.log("🎯 Total elements:", elements.length);
        console.log("🎯 Current rotation:", currentRotation);

        const totalElements = elements.length;
        const anglePerElement = 360 / totalElements;

        console.log("🎯 Angle per element:", anglePerElement);

        // Fonction pour calculer quel index sera sélectionné avec une rotation donnée
        const getIndexForRotation = (rotation) => {
            const normalizedRotation = ((rotation % 360) + 360) % 360;
            let relativeAngle = (270 - normalizedRotation) % 360;
            if (relativeAngle < 0) relativeAngle += 360;
            return Math.floor(relativeAngle / anglePerElement) % totalElements;
        };

        // Méthode empirique : tester toutes les rotations possibles
        let foundRotation = null;

        // Tester chaque degré de 0 à 359 depuis la position actuelle
        for (let testRotation = 0; testRotation < 360; testRotation += 1) {
            const totalTestRotation = currentRotation + (360 * spinSpeed) + testRotation;
            const calculatedIndex = getIndexForRotation(totalTestRotation);

            if (calculatedIndex === targetIndex) {
                foundRotation = totalTestRotation;
                console.log("✅ Found working rotation:", testRotation, "-> total:", totalTestRotation, "-> index:", calculatedIndex);
                break;
            }
        }

        // Si on n'a pas trouvé avec les degrés entiers, tester avec plus de précision
        if (foundRotation === null) {
            for (let testRotation = 0; testRotation < 360; testRotation += 0.1) {
                const totalTestRotation = currentRotation + (360 * spinSpeed) + testRotation;
                const calculatedIndex = getIndexForRotation(totalTestRotation);

                if (calculatedIndex === targetIndex) {
                    foundRotation = totalTestRotation;
                    console.log("✅ Found working rotation (precise):", testRotation, "-> total:", totalTestRotation, "-> index:", calculatedIndex);
                    break;
                }
            }
        }

        if (foundRotation === null) {
            console.error("❌ Could not find rotation for target index:", targetIndex);
            return null;
        }

        console.log("🎯 Final rotation:", foundRotation);

        // Vérification finale
        const verificationIndex = getIndexForRotation(foundRotation);
        console.log(
            "🔍 Final verification - Will select index:",
            verificationIndex,
            "element:",
            elements[verificationIndex]?.label
        );

        if (verificationIndex !== targetIndex) {
            console.error("❌ Verification failed! Expected index:", targetIndex, "Got index:", verificationIndex);
        } else {
            console.log("✅ Verification passed!");
        }

        return foundRotation;
    },
    [elements, spinSpeed, currentRotation]
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
            console.log('🎯 Starting targeted spin for element ID:', targetId);
            
            // calculateRotationForElement retourne déjà une rotation absolue
            const targetRotation = calculateRotationForElement(targetId);
            if (targetRotation !== null) {
                // CORRECTION: Ne pas ajouter currentRotation car calculateRotationForElement 
                // calcule déjà depuis la position actuelle
                totalRotation = targetRotation;
                console.log('🎯 Using calculated rotation:', totalRotation);
            } else {
                console.log('❌ Fallback to random rotation');
                // Fallback: rotation aléatoire si l'élément n'est pas trouvé
                const baseRotation = 360 * spinSpeed;
                const randomExtra = Math.random() * 360;
                totalRotation = currentRotation + baseRotation + randomExtra;
            }
        } else {
            console.log('🎯 Starting random spin');
            // Rotation aléatoire normale
            const baseRotation = 360 * spinSpeed;
            const randomExtra = Math.random() * 360;
            totalRotation = currentRotation + baseRotation + randomExtra;
        }

        console.log('🎯 Final total rotation for animation:', totalRotation);
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
        spinSpeed
    ]
);

	useEffect(() => {
    // Attendre que targetElementId soit défini avant de démarrer la rotation
    if (isSpinning && lastSpinComplete && !isInternalAnimating && elements.length > 0 && targetElementId) {
        console.log('🎯 CustomWheel: Starting spin with target ID:', targetElementId);
        startSpin(targetElementId);
    } else if (isSpinning && targetElementId === null) {
        console.log('⏳ CustomWheel: Waiting for target element ID...');
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
