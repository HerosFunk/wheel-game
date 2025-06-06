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
        
        // Calculer l'angle de la souris par rapport au centre
        let mouseAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        // Normaliser entre 0 et 360
        mouseAngle = (mouseAngle + 360) % 360;
        
        // Ajuster pour que 0° soit en haut (au lieu de droite)
        let adjustedAngle = (mouseAngle + 90) % 360;
        
        // Appliquer la rotation inverse pour obtenir l'angle dans le référentiel de la roue
        let relativeAngle = (adjustedAngle - rotation + 360) % 360;
        
        const anglePerElement = 360 / elements.length;
        
        // Correction importante : d'après vos observations, il y a un décalage de 2.5 segments
        // Il faut donc corriger de -2.5 segments (dans le sens anti-horaire)
        // Pour une roue de 10 éléments (36° par segment), on corrige de -90°
        // Pour une roue de 6 éléments (60° par segment), on corrige de -150°
        const correctionAngle = -2.5 * anglePerElement;
        let correctedAngle = (relativeAngle + correctionAngle);
        
        // Normaliser l'angle pour qu'il soit toujours entre 0 et 360
        correctedAngle = ((correctedAngle % 360) + 360) % 360;
        
        let elementIndex = Math.floor(correctedAngle / anglePerElement);
        
        // S'assurer que l'index est dans les limites
        elementIndex = Math.max(0, Math.min(elements.length - 1, elementIndex));
        
        console.log('Hover calculation (corrected):', {
            mouseX, mouseY,
            rawMouseAngle: mouseAngle.toFixed(1),
            adjustedAngle: adjustedAngle.toFixed(1),
            rotation: rotation.toFixed(1),
            relativeAngle: relativeAngle.toFixed(1),
            correctedAngle: correctedAngle.toFixed(1),
            anglePerElement: anglePerElement.toFixed(1),
            elementIndex,
            elementsCount: elements.length,
            correctionAngle: correctionAngle.toFixed(1)
        });
        
        return elementIndex;
    }, [elements.length]);

    const handleMouseMove = useCallback((event) => {
        // Permettre le hover seulement si pas de spin en cours ET que le dernier spin est complètement terminé
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
        
        // Correction: toujours mettre à jour même si les indices sont différents
        if (elementIndex !== hoveredElementIndex) {
            console.log('Updating hoveredElementIndex from', hoveredElementIndex, 'to', elementIndex);
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
            
            const startAngle = ((baseAngle + rotation) * Math.PI) / 180;
            const endAngle = ((nextBaseAngle + rotation) * Math.PI) / 180;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            
            let color = customColors[index] || `hsl(${(index * 360) / elements.length}, 70%, 60%)`;
            
            // Effet de hover seulement si toutes les conditions sont réunies
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
            
            const textAngle = (startAngle + endAngle) / 2;
            const textRadius = radius * 0.7;
            const textX = centerX + Math.cos(textAngle) * textRadius;
            const textY = centerY + Math.sin(textAngle) * textRadius;
            
            ctx.save();
            ctx.translate(textX, textY);
            ctx.rotate(textAngle + Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let label = element.label;
            ctx.font = `bold 20px Arial`;
            
            const textWidth = ctx.measureText(label).width;
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = '#fff';
            ctx.fillRect(-textWidth/2 - 5, -10, textWidth + 10, 20);
            ctx.restore();
            
            ctx.fillStyle = '#000';
            ctx.fillText(label, 0, 0);
            
            ctx.restore();
            ctx.restore();
        });
    }, [wheelSize, pointerSize, borderWidth, calculateAngles, elements, customColors, hoveredElementIndex, isSpinning, isInternalAnimating, lastSpinComplete, hexToRgb]);

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
        
        console.log('🔄 Animation frame:', {
            elapsed: elapsed.toFixed(0),
            progress: progress.toFixed(3),
            currentRotation: currentRotation.toFixed(1),
            targetRotation: targetRotation.toFixed(1),
            newRotation: newRotation.toFixed(1)
        });
        
        setCurrentRotation(newRotation);
        
        const wheelCtx = wheelCanvasRef.current?.getContext('2d');
        if (wheelCtx) {
            drawWheelOnly(wheelCtx, newRotation);
        }
        
        if (progress < 1) {
            animationRef.current = requestAnimationFrame(() => animate(startTime, targetRotation));
        } else {
            // Animation terminée - réinitialiser tous les états
            console.log('✅ Animation completed. Final rotation:', newRotation.toFixed(1));
            setIsInternalAnimating(false);
            
            // Reset immédiat pour réactiver le hover
            setLastSpinComplete(true);
            spinStartedRef.current = false;
            
            // Forcer un redraw pour réactiver le hover
            const wheelCtx = wheelCanvasRef.current?.getContext('2d');
            if (wheelCtx) {
                drawWheelOnly(wheelCtx, newRotation);
            }
            console.log('🎯 Hover re-enabled with rotation:', newRotation.toFixed(1));
            
            const selectedElement = getSelectedElement(newRotation);
            onSpinEnd && onSpinEnd(selectedElement);
        }
    }, [currentRotation, spinDuration, drawWheelOnly, getSelectedElement, onSpinEnd]);

    const startSpin = useCallback(() => {
        if (disabled || isInternalAnimating || elements.length === 0 || spinStartedRef.current) {
            return;
        }
        
        // Marquer le début du spin
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
            // Démarrer le spin immédiatement sans délai
            startSpin();
        }
    }, [isSpinning, lastSpinComplete, isInternalAnimating, elements.length, startSpin]);

    // Reset quand isSpinning devient false
    useEffect(() => {
        if (!isSpinning && !isInternalAnimating) {
            // Reset immédiat sans délai
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
            // Debug: vérifier la rotation actuelle
            console.log('🎨 Redrawing with rotation:', currentRotation.toFixed(1));
            drawWheelOnly(wheelCtx, currentRotation);
            drawPointerOnly(pointerCtx);
        }
    }, [elements, currentRotation, hoveredElementIndex, lastSpinComplete, drawWheelOnly, drawPointerOnly]);

    // Initialisation
    useEffect(() => {
        // Initialisation immédiate sans délai
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