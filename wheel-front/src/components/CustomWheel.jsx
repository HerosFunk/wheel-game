import React, { useEffect, useRef, useState, useCallback } from 'react';
import './CustomWheel.css';

const pointerSize = 60;

const CustomWheel = ({ 
    elements, 
    onSpinEnd, 
    isSpinning, 
    spinDuration = 5,
    spinSpeed = 10,
    wheelSize = 800,
    borderWidth = 4,
    borderColor = '#000',
    backgroundColor = '#fff',
    textColor = '#000',
    fontSize = '5px',
    fontWeight = 'bold',
    showPointer = true,
    pointerColor = '#ff0000',
    customColors = [],
    onSpinStart,
    disabled = false,
    onElementHover
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
        if (hex.startsWith('#')) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        }
        return { r: 255, g: 105, b: 180 };
    }, []);

    // Fonction pour ajuster le texte à la section
    const adjustTextToSection = useCallback((ctx, text, maxWidth, maxHeight) => {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        let fontSize = 18; // Taille de départ
        
        // Commencer par une taille raisonnable et ajuster si nécessaire
        ctx.font = `bold ${fontSize}px Arial`;
        
        // Fonction pour calculer les lignes avec une taille donnée
        const calculateLines = (size) => {
            ctx.font = `bold ${size}px Arial`;
            const testLines = [];
            let testLine = '';
            
            for (let word of words) {
                const testWidth = ctx.measureText(testLine + word + ' ').width;
                if (testWidth > maxWidth && testLine !== '') {
                    testLines.push(testLine.trim());
                    testLine = word + ' ';
                } else {
                    testLine += word + ' ';
                }
            }
            if (testLine.trim() !== '') {
                testLines.push(testLine.trim());
            }
            return testLines;
        };
        
        // Ajuster la taille jusqu'à ce que tout rentre
        let testLines = calculateLines(fontSize);
        while ((testLines.length * (fontSize + 2)) > maxHeight && fontSize > 10) {
            fontSize -= 1;
            testLines = calculateLines(fontSize);
        }
        
        // Si le texte est encore trop long, le tronquer intelligemment
        if (testLines.length * (fontSize + 2) > maxHeight) {
            const maxLines = Math.floor(maxHeight / (fontSize + 2));
            testLines = testLines.slice(0, maxLines);
            if (testLines.length > 0) {
                const lastLine = testLines[testLines.length - 1];
                if (lastLine.length > 15) {
                    testLines[testLines.length - 1] = lastLine.substring(0, 12) + '...';
                }
            }
        }
        
        return {
            lines: testLines,
            fontSize: fontSize
        };
    }, []);

    const getSelectedElement = useCallback((rotation) => {
        const normalizedRotation = ((rotation % 360) + 360) % 360;
        const anglePerElement = 360 / elements.length;
        
        const flècheAngle = 270;
        const segmentAtPointer = (flècheAngle - normalizedRotation + 360) % 360;
        const selectedIndex = Math.floor(segmentAtPointer / anglePerElement) % elements.length;
        
        return elements[selectedIndex];
    }, [elements]);

    const getHoveredElement = useCallback((mouseX, mouseY, centerX, centerY, radius, rotation) => {
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > radius || distance < 20) return null;
        
        let mouseAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        mouseAngle = (mouseAngle + 360) % 360;
        
        let adjustedAngle = (mouseAngle + 90) % 360;
        let relativeAngle = (adjustedAngle - rotation + 360) % 360;
        
        const anglePerElement = 360 / elements.length;
        const correctionAngle = -2.5 * anglePerElement;
        let correctedAngle = (relativeAngle + correctionAngle);
        correctedAngle = ((correctedAngle % 360) + 360) % 360;
        
        let elementIndex = Math.floor(correctedAngle / anglePerElement);
        elementIndex = Math.max(0, Math.min(elements.length - 1, elementIndex));
        
        return elementIndex;
    }, [elements.length]);

    const handleMouseMove = useCallback((event) => {
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
    }, [isSpinning, isInternalAnimating, lastSpinComplete, wheelSize, borderWidth, currentRotation, hoveredElementIndex, onElementHover, elements, getHoveredElement]);

    const handleMouseLeave = useCallback(() => {
        if (!isSpinning && !isInternalAnimating && lastSpinComplete) {
            setHoveredElementIndex(null);
            if (onElementHover) {
                onElementHover(null);
            }
        }
    }, [isSpinning, isInternalAnimating, lastSpinComplete, onElementHover]);

    const drawWheelOnly = useCallback((ctx, rotation) => {
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
            
            // Dessiner la section
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            
            let color = customColors[index] || `hsl(${(index * 360) / elements.length}, 70%, 60%)`;
            
            // Effet de hover
            if (hoveredElementIndex === index && !isSpinning && !isInternalAnimating && lastSpinComplete) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 15;
                const rgb = hexToRgb(color) || { r: 255, g: 105, b: 180 };
                color = `rgb(${Math.min(255, rgb.r + 30)}, ${Math.min(255, rgb.g + 30)}, ${Math.min(255, rgb.b + 30)})`;
            }
            
            ctx.fillStyle = color;
            ctx.fill();
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            
            // Calculer la position et les dimensions pour le texte
            const textAngle = (startAngle + endAngle) / 2;
            const textRadius = radius * 0.65; // Un peu plus près du centre
            const textX = centerX + Math.cos(textAngle) * textRadius;
            const textY = centerY + Math.sin(textAngle) * textRadius;
            
            // Calculer les dimensions disponibles pour le texte
            const sectionRadians = (sectionAngle * Math.PI) / 180;
            const maxTextWidth = Math.min(
                radius * 0.6, // Largeur maximum basée sur le rayon
                Math.abs(2 * Math.sin(sectionRadians / 2) * textRadius * 0.8) // Largeur de la section
            );
            const maxTextHeight = radius * 0.3; // Hauteur maximum
            
            // Ajuster le texte à la section
            const textInfo = adjustTextToSection(ctx, element.label, maxTextWidth, maxTextHeight);
            
            ctx.save();
            ctx.translate(textX, textY);
            ctx.rotate(textAngle + Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Dessiner l'arrière-plan du texte
            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = '#fff';
            const lineHeight = textInfo.fontSize + 2;
            const totalHeight = textInfo.lines.length * lineHeight;
            const backgroundPadding = 6;
            
            // Trouver la largeur maximum des lignes
            ctx.font = `bold ${textInfo.fontSize}px Arial`;
            let maxLineWidth = 0;
            textInfo.lines.forEach(line => {
                const lineWidth = ctx.measureText(line).width;
                if (lineWidth > maxLineWidth) {
                    maxLineWidth = lineWidth;
                }
            });
            
            ctx.fillRect(
                -maxLineWidth/2 - backgroundPadding, 
                -totalHeight/2 - backgroundPadding/2, 
                maxLineWidth + backgroundPadding * 2, 
                totalHeight + backgroundPadding
            );
            ctx.restore();
            
            // Dessiner le texte ligne par ligne
            ctx.fillStyle = '#000';
            ctx.font = `bold ${textInfo.fontSize}px Arial`;
            
            const startY = -(textInfo.lines.length - 1) * lineHeight / 2;
            textInfo.lines.forEach((line, lineIndex) => {
                const lineY = startY + lineIndex * lineHeight;
                ctx.fillText(line, 0, lineY);
            });
            
            ctx.restore();
            ctx.restore();
        });
    }, [wheelSize, pointerSize, borderWidth, calculateAngles, elements, customColors, hoveredElementIndex, isSpinning, isInternalAnimating, lastSpinComplete, hexToRgb, adjustTextToSection]);

    const drawPointerOnly = useCallback((ctx) => {
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
        
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        
        ctx.fillStyle = pointerColor;
        ctx.fill();
        
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.restore();
    }, [showPointer, wheelSize, pointerSize, borderWidth, pointerColor]);

    const animate = useCallback((startTime, targetRotation) => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / (spinDuration * 1000), 1);
        const easeOut = (t) => 1 - Math.pow(1 - t, 3);
        const newRotation = currentRotation + (targetRotation - currentRotation) * easeOut(progress);
        
        setCurrentRotation(newRotation);
        
        const wheelCtx = wheelCanvasRef.current?.getContext('2d');
        if (wheelCtx) {
            drawWheelOnly(wheelCtx, newRotation);
        }
        
        if (progress < 1) {
            animationRef.current = requestAnimationFrame(() => animate(startTime, targetRotation));
        } else {
            setIsInternalAnimating(false);
            setLastSpinComplete(true);
            spinStartedRef.current = false;
            
            const wheelCtx = wheelCanvasRef.current?.getContext('2d');
            if (wheelCtx) {
                drawWheelOnly(wheelCtx, newRotation);
            }
            
            const selectedElement = getSelectedElement(newRotation);
            onSpinEnd && onSpinEnd(selectedElement);
        }
    }, [currentRotation, spinDuration, drawWheelOnly, getSelectedElement, onSpinEnd]);

    const startSpin = useCallback(() => {
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
        
        const baseRotation = 360 * spinSpeed;
        const randomExtra = Math.random() * 360;
        const totalRotation = currentRotation + baseRotation + randomExtra;
        
        animationRef.current = requestAnimationFrame(() => animate(Date.now(), totalRotation));
    }, [disabled, isInternalAnimating, elements.length, onElementHover, onSpinStart, spinSpeed, currentRotation, animate]);

    // Gérer le déclenchement du spin depuis l'extérieur
    useEffect(() => {
        if (isSpinning && lastSpinComplete && !isInternalAnimating && elements.length > 0) {
            startSpin();
        }
    }, [isSpinning, lastSpinComplete, isInternalAnimating, elements.length, startSpin]);

    // Reset quand isSpinning devient false
    useEffect(() => {
        if (!isSpinning && !isInternalAnimating) {
            setLastSpinComplete(true);
            spinStartedRef.current = false;
        }
    }, [isSpinning, isInternalAnimating]);

    // Nettoyage des animations
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Redessiner quand nécessaire
    useEffect(() => {
        const wheelCtx = wheelCanvasRef.current?.getContext('2d');
        const pointerCtx = pointerCanvasRef.current?.getContext('2d');
        
        if (wheelCtx && pointerCtx && elements.length > 0) {
            drawWheelOnly(wheelCtx, currentRotation);
            drawPointerOnly(pointerCtx);
        }
    }, [elements, currentRotation, hoveredElementIndex, lastSpinComplete, drawWheelOnly, drawPointerOnly]);

    // Initialisation
    useEffect(() => {
        const wheelCtx = wheelCanvasRef.current?.getContext('2d');
        const pointerCtx = pointerCanvasRef.current?.getContext('2d');
        
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
            style={{ width: canvasWidth, height: canvasHeight, position: 'relative' }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <canvas
                ref={wheelCanvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="custom-wheel-canvas"
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0,
                    cursor: disabled ? 'not-allowed' : (lastSpinComplete && !isSpinning ? 'default' : 'wait'),
                    zIndex: 1
                }}
            />
            
            <canvas
                ref={pointerCanvasRef}
                width={canvasWidth}
                height={canvasHeight}
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0,
                    pointerEvents: 'none',
                    zIndex: 2
                }}
            />
        </div>
    );
};

export default CustomWheel;