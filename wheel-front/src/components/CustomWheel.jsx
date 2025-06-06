import React, { useEffect, useRef, useState } from 'react';
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
    const wheelCanvasRef = useRef(null); // Canvas pour la roue uniquement
    const pointerCanvasRef = useRef(null); // Canvas pour la flèche uniquement
    const containerRef = useRef(null);
    
    const [currentRotation, setCurrentRotation] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [hoveredElementIndex, setHoveredElementIndex] = useState(null);
    const animationRef = useRef(null);
    // Suppression de la variable rotation qui créait de la confusion

    // Calculer les angles pour chaque élément
    const calculateAngles = () => {
        const totalElements = elements.length;
        const anglePerElement = 360 / totalElements;
        return elements.map((_, index) => index * anglePerElement);
    };

    // Fonction utilitaire pour convertir hex en RGB
    const hexToRgb = (hex) => {
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
    };

    // Fonction pour déterminer quel élément est sélectionné (corrigée)
    const getSelectedElement = (rotation) => {
        // La flèche pointe vers le haut (0°), donc on calcule quel segment est à cette position
        const normalizedRotation = ((rotation % 360) + 360) % 360;
        const anglePerElement = 360 / elements.length;
        
        // Calculer quel segment est en haut (où pointe la flèche)
        // La flèche est à 270° en coordonnées canvas (haut), donc on ajuste
        const flècheAngle = 270; // Position de la flèche en degrés
        const segmentAtPointer = (flècheAngle - normalizedRotation + 360) % 360;
        const selectedIndex = Math.floor(segmentAtPointer / anglePerElement) % elements.length;
        
        return elements[selectedIndex];
    };

    // Fonction pour détecter quel segment est survolé
    const getHoveredElement = (mouseX, mouseY, centerX, centerY, radius, rotation) => {
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > radius) return null;
        
        let mouseAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        mouseAngle = (mouseAngle + 360) % 360;
        
        const adjustedAngle = (mouseAngle - rotation + 360) % 360;
        const anglePerElement = 360 / elements.length;
        const elementIndex = Math.floor(adjustedAngle / anglePerElement);
        
        return elementIndex < elements.length ? elementIndex : null;
    };

    // Gestionnaire de mouvement de souris (corrigé)
    const handleMouseMove = (event) => {
        if (isAnimating) return;
        
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
            if (elementIndex !== null && onElementHover) {
                onElementHover(elements[elementIndex]);
            } else if (elementIndex === null && onElementHover) {
                onElementHover(null);
            }
        }
    };

    // Gestionnaire pour quitter la zone du canvas
    const handleMouseLeave = () => {
        setHoveredElementIndex(null);
        if (onElementHover) {
            onElementHover(null);
        }
    };

    // Dessiner UNIQUEMENT la roue (segments qui tournent) - DEBUG AJOUTÉ
    const drawWheelOnly = (ctx, rotation) => {
        console.log("drawWheelOnly called with rotation:", rotation, "elements:", elements.length);
        
        const centerX = wheelSize / 2;
        const centerY = wheelSize / 2 + pointerSize + 10;
        const radius = (wheelSize - borderWidth * 2) / 2;
        const angles = calculateAngles();
        
        // Vider le canvas de la roue
        ctx.clearRect(0, 0, wheelSize, wheelSize + pointerSize + 20);
        
        // Dessiner seulement les segments
        elements.forEach((element, index) => {
            ctx.save();
            
            // Les segments commencent à 0° et sont décalés par la rotation
            const baseAngle = angles[index];
            const nextBaseAngle = angles[index + 1] || 360;
            
            const startAngle = ((baseAngle + rotation) * Math.PI) / 180;
            const endAngle = ((nextBaseAngle + rotation) * Math.PI) / 180;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            
            // Couleur du segment
            let color = customColors[index] || `hsl(${(index * 360) / elements.length}, 70%, 60%)`;
            
            if (hoveredElementIndex === index && !isAnimating) {
                ctx.shadowColor = color;
                ctx.shadowBlur = 15;
                const rgb = hexToRgb(color) || { r: 255, g: 105, b: 180 };
                color = `rgb(${Math.min(255, rgb.r + 30)}, ${Math.min(255, rgb.g + 30)}, ${Math.min(255, rgb.b + 30)})`;
            }
            
            ctx.fillStyle = color;
            ctx.fill();
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            
            // Ajouter le texte
            const textAngle = (startAngle + endAngle) / 2;
            const textRadius = radius * 0.7;
            const textX = centerX + Math.cos(textAngle) * textRadius;
            const textY = centerY + Math.sin(textAngle) * textRadius;
            
            ctx.save();
            ctx.translate(textX, textY);
            ctx.rotate(textAngle + Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Gestion du texte simplifiée pour debug
            let label = element.label;
            ctx.font = `bold 20px Arial`;
            
            // Fond blanc pour le texte
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
        
        console.log("drawWheelOnly completed");
    };

    // Dessiner UNIQUEMENT la flèche (position absolument fixe) - DEBUG AJOUTÉ
    const drawPointerOnly = (ctx) => {
        if (!showPointer) return;
        
        console.log("drawPointerOnly called");
        
        const centerX = wheelSize / 2;
        const centerY = wheelSize / 2 + pointerSize + 10;
        const radius = (wheelSize - borderWidth * 2) / 2;
        
        // Vider complètement le canvas de la flèche
        ctx.clearRect(0, 0, wheelSize, wheelSize + pointerSize + 20);
        
        ctx.save();
        
        // Position ABSOLUMENT FIXE de la flèche
        const pointerTipY = centerY - radius - 5;
        const pointerBaseY = centerY - radius - pointerSize;
        
        ctx.beginPath();
        ctx.moveTo(centerX, pointerTipY); // Pointe
        ctx.lineTo(centerX - pointerSize * 0.4, pointerBaseY); // Gauche
        ctx.lineTo(centerX + pointerSize * 0.4, pointerBaseY); // Droite
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
        
        console.log("drawPointerOnly completed");
    };

    // Animation de rotation avec closure pour capturer la rotation cible
    const animate = (startTime, targetRotation) => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / (spinDuration * 1000), 1);
        const easeOut = (t) => 1 - Math.pow(1 - t, 3);
        const newRotation = currentRotation + (targetRotation - currentRotation) * easeOut(progress);
        
        console.log("Animation frame:", { elapsed, progress, newRotation, currentRotation, targetRotation });
        
        setCurrentRotation(newRotation);
        
        // Redessiner UNIQUEMENT la roue (la flèche ne bouge jamais)
        const wheelCtx = wheelCanvasRef.current?.getContext('2d');
        if (wheelCtx) {
            console.log("Drawing wheel with rotation:", newRotation);
            drawWheelOnly(wheelCtx, newRotation);
        } else {
            console.error("No wheel context available");
        }
        
        if (progress < 1) {
            animationRef.current = requestAnimationFrame(() => animate(startTime, targetRotation));
        } else {
            console.log("Animation completed");
            setIsAnimating(false);
            const selectedElement = getSelectedElement(newRotation);
            console.log("Selected element:", selectedElement);
            onSpinEnd && onSpinEnd(selectedElement);
        }
    };

    // Démarrer la rotation - CORRIGÉ pour passer la rotation en paramètre
    const startSpin = () => {
        console.log("startSpin called - disabled:", disabled, "isAnimating:", isAnimating, "elements:", elements.length);
        
        if (disabled || isAnimating || elements.length === 0) {
            console.log("Spin blocked in startSpin");
            return;
        }
        
        console.log("Starting wheel animation");
        setIsAnimating(true);
        onSpinStart && onSpinStart();
        
        // Calculer une rotation plus importante pour un effet plus spectaculaire
        const baseRotation = 360 * spinSpeed; // Tours complets
        const randomExtra = Math.random() * 360; // Rotation aléatoire supplémentaire
        const totalRotation = currentRotation + baseRotation + randomExtra;
        
        console.log("Rotation calculation:", {
            currentRotation,
            baseRotation,
            randomExtra,
            totalRotation
        });
        
        // Pas besoin de setRotation, on passe directement la valeur
        // setRotation(totalRotation); // Supprimé car ça crée un delay
        
        // Démarrer l'animation avec la rotation cible
        console.log("Starting animation frame with target rotation:", totalRotation);
        animationRef.current = requestAnimationFrame(() => animate(Date.now(), totalRotation));
    };

    // Effet pour déclencher le spin - AMÉLIORÉ
    useEffect(() => {
        console.log("useEffect isSpinning:", isSpinning, "isAnimating:", isAnimating, "elements:", elements.length);
        if (isSpinning && !isAnimating && elements.length > 0) {
            console.log("Conditions met, starting spin animation");
            const timer = setTimeout(() => {
                startSpin();
            }, 100); // Petit délai pour s'assurer que tout est prêt
            
            return () => clearTimeout(timer);
        }
    }, [isSpinning, isAnimating, elements.length]);

    // Nettoyage
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Redessiner les deux canvas quand nécessaire - AMÉLIORÉ
    useEffect(() => {
        console.log("useEffect redraw triggered, elements:", elements.length);
        
        const wheelCtx = wheelCanvasRef.current?.getContext('2d');
        const pointerCtx = pointerCanvasRef.current?.getContext('2d');
        
        if (wheelCtx && pointerCtx && elements.length > 0) {
            console.log("Drawing both canvases");
            // Dessiner la roue
            drawWheelOnly(wheelCtx, currentRotation);
            // Dessiner la flèche (toujours fixe)
            drawPointerOnly(pointerCtx);
        } else {
            console.log("Missing context or elements:", { 
                wheelCtx: !!wheelCtx, 
                pointerCtx: !!pointerCtx, 
                elementsLength: elements.length 
            });
        }
    }, [elements, currentRotation, hoveredElementIndex]);

    // Effect séparé pour s'assurer que les canvas sont initialisés
    useEffect(() => {
        const timer = setTimeout(() => {
            const wheelCtx = wheelCanvasRef.current?.getContext('2d');
            const pointerCtx = pointerCanvasRef.current?.getContext('2d');
            
            if (wheelCtx && pointerCtx && elements.length > 0) {
                console.log("Initial draw");
                drawWheelOnly(wheelCtx, currentRotation);
                drawPointerOnly(pointerCtx);
            }
        }, 50);
        
        return () => clearTimeout(timer);
    }, []);

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
            {/* Canvas pour la roue (qui tourne) */}
            <canvas
                ref={wheelCanvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="custom-wheel-canvas"
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0,
                    cursor: disabled ? 'not-allowed' : 'default',
                    zIndex: 1
                }}
            />
            
            {/* Canvas pour la flèche (toujours fixe) */}
            <canvas
                ref={pointerCanvasRef}
                width={canvasWidth}
                height={canvasHeight}
                style={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0,
                    pointerEvents: 'none', // La flèche ne doit pas intercepter les événements
                    zIndex: 2 // Au-dessus de la roue
                }}
            />
        </div>
    );
};

export default CustomWheel;