import React, { useEffect, useRef, useState } from 'react';
import './CustomWheel.css';

// Utility function to convert hex color to RGB
function hexToRgb(hex) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return r + r + g + g + b + b;
    });

    const regex = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
    const result = regex.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

const pointerSize = 60; // Augmenté pour une flèche plus visible

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
    onElementHover // Nouvelle prop pour le hover
}) => {
    const canvasRef = useRef(null);
    const [rotation, setRotation] = useState(0);
    const [currentRotation, setCurrentRotation] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [hoveredElementIndex, setHoveredElementIndex] = useState(null);
    const animationRef = useRef(null);

    // Calculer les angles pour chaque élément
    const calculateAngles = () => {
        const totalElements = elements.length;
        const anglePerElement = 360 / totalElements;
        return elements.map((_, index) => index * anglePerElement);
    };

    // Fonction pour détecter quel segment est survolé
    const getHoveredElement = (mouseX, mouseY, centerX, centerY, radius, rotation) => {
        const dx = mouseX - centerX;
        const dy = mouseY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Vérifier si la souris est dans le cercle
        if (distance > radius) return null;
        
        // Calculer l'angle de la souris par rapport au centre
        let mouseAngle = Math.atan2(dy, dx) * (180 / Math.PI);
        mouseAngle = (mouseAngle + 360) % 360; // Normaliser entre 0 et 360
        
        // Ajuster pour la rotation de la roue
        const adjustedAngle = (mouseAngle - rotation + 360) % 360;
        
        // Calculer l'angle par élément
        const anglePerElement = 360 / elements.length;
        
        // Déterminer l'index de l'élément survolé
        const elementIndex = Math.floor(adjustedAngle / anglePerElement);
        
        return elementIndex < elements.length ? elementIndex : null;
    };

    // Gestionnaire de mouvement de souris
    const handleMouseMove = (event) => {
        if (isAnimating) return; // Pas de hover pendant l'animation
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;
        
        const centerX = wheelSize / 2;
        const centerY = (wheelSize / 2) + pointerSize + 10;
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
    const getSelectedElement = (rotation) => {
        // Normaliser la rotation entre 0 et 360
        const normalizedRotation = ((rotation % 360) + 360) % 360;
        
        // Calculer l'angle par élément
        const anglePerElement = 360 / elements.length;
        
        // L'angle de la flèche est à 0° (12 heures), donc on calcule quel segment est pointé
        // On ajoute la moitié d'un segment pour centrer la détection
        const adjustedAngle = (360 - normalizedRotation + (anglePerElement / 2)) % 360;
        
        // Déterminer l'index de l'élément sélectionné
        const selectedIndex = Math.floor(adjustedAngle / anglePerElement) % elements.length;
        
        return elements[selectedIndex];
    };

    // Fonction séparée pour dessiner le pointeur fixe (ne bouge jamais)
    const drawPointer = (ctx, centerX, centerY, radius) => {
        if (!showPointer) return;
        
        ctx.save();
        
        // Position du pointeur - TOUJOURS en haut, ne tourne jamais
        const pointerTipY = centerY - radius - 5; // Pointe de la flèche
        const pointerBaseY = centerY - radius - pointerSize; // Base de la flèche
        
        ctx.beginPath();
        // Triangle pointant vers le bas
        ctx.moveTo(centerX, pointerTipY); // Pointe (centre, en bas)
        ctx.lineTo(centerX - pointerSize * 0.4, pointerBaseY); // Coin gauche
        ctx.lineTo(centerX + pointerSize * 0.4, pointerBaseY); // Coin droit
        ctx.closePath();
        
        // Ombre du pointeur
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 4;
        
        // Remplir le pointeur
        ctx.fillStyle = pointerColor;
        ctx.fill();
        
        // Contour blanc pour le pointeur
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        ctx.restore();
    };

    // Dessiner la roue (segments + contour)
    const drawWheel = (ctx, rotation) => {
        const canvasWidth = wheelSize;
        const canvasHeight = wheelSize + pointerSize + 20;
        const centerX = wheelSize / 2;
        const centerY = (wheelSize / 2) + pointerSize + 10;
        const radius = (wheelSize - borderWidth * 2) / 2;
        const angles = calculateAngles();
        
        // Vider tout le canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        
        // Dessiner les segments de la roue
        elements.forEach((element, index) => {
            ctx.save();
            
            const startAngle = (angles[index] + rotation) * (Math.PI / 180);
            const endAngle = (angles[index + 1] || (360 + rotation)) * (Math.PI / 180);
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            
            // Couleur du segment avec effet de hover
            let color = customColors[index] || `hsl(${(index * 360) / elements.length}, 70%, 60%)`;
            
            // Effet de hover : assombrir ou éclaircir la couleur
            if (hoveredElementIndex === index && !isAnimating) {
                // Ajouter un effet de surbrillance
                ctx.shadowColor = color;
                ctx.shadowBlur = 15;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                
                // Légèrement éclaircir la couleur
                const rgb = hexToRgb(color) || { r: 255, g: 105, b: 180 };
                color = `rgb(${Math.min(255, rgb.r + 30)}, ${Math.min(255, rgb.g + 30)}, ${Math.min(255, rgb.b + 30)})`;
            }
            
            ctx.fillStyle = color;
            ctx.fill();
            
            // Réinitialiser l'ombre
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            
            // Ajouter le texte
            const textAngle = (startAngle + endAngle) / 2;
            const textRadius = radius * 0.7;
            const textX = centerX + Math.cos(textAngle) * textRadius;
            const textY = centerY + Math.sin(textAngle) * textRadius;
            
            ctx.save();
            ctx.translate(textX, textY);
            ctx.rotate(textAngle);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Gestion dynamique de la taille de police
            let label = element.label;
            let fontSizePx = 28;
            const maxWidth = 160;
            ctx.font = `${fontWeight} ${fontSizePx}px Arial`;
            let metrics = ctx.measureText(label);
            
            while (metrics.width > maxWidth && fontSizePx > 14) {
                fontSizePx -= 1;
                ctx.font = `${fontWeight} ${fontSizePx}px Arial`;
                metrics = ctx.measureText(label);
            }
            
            while (metrics.width > maxWidth && label.length > 0) {
                label = label.slice(0, -1);
                metrics = ctx.measureText(label + '...');
            }
            
            if (metrics.width > maxWidth) {
                label = label.slice(0, -3) + '...';
            } else if (label.length < element.label.length) {
                label = label + '...';
            }
            
            ctx.font = `${fontWeight} ${fontSizePx}px Arial`;
            const padding = 6;
            const rectWidth = Math.min(ctx.measureText(label).width + padding * 2, maxWidth + padding * 2);
            const rectHeight = fontSizePx + 8;
            
            ctx.save();
            ctx.globalAlpha = 0.75;
            ctx.fillStyle = '#fff';
            ctx.fillRect(-rectWidth / 2, -rectHeight / 2, rectWidth, rectHeight);
            ctx.restore();
            
            ctx.fillStyle = textColor;
            ctx.fillText(label, 0, 0, maxWidth);
            ctx.restore();
            ctx.restore();
        });
        
        // Dessiner le pointeur FIXE (TOUJOURS après la roue, ne tourne jamais)
        drawPointer(ctx, centerX, centerY, radius);
    };

    // Animation de rotation
    const animate = (startTime) => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / (spinDuration * 1000), 1);
        const easeOut = (t) => 1 - Math.pow(1 - t, 3);
        const newRotation = currentRotation + (rotation - currentRotation) * easeOut(progress);
        
        setCurrentRotation(newRotation);
        
        // Redessiner la roue avec la nouvelle rotation
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
            drawWheel(ctx, newRotation);
        }
        
        if (progress < 1) {
            animationRef.current = requestAnimationFrame(() => animate(startTime));
        } else {
            setIsAnimating(false);
            // Calculer l'élément sélectionné basé sur la position finale
            const selectedElement = getSelectedElement(newRotation);
            onSpinEnd && onSpinEnd(selectedElement);
        }
    };

    // Démarrer la rotation (appelé depuis l'extérieur via isSpinning)
    const startSpin = () => {
        console.log("startSpin called - disabled:", disabled, "isAnimating:", isAnimating);
        if (disabled || isAnimating) {
            console.log("Spin blocked in startSpin");
            return;
        }
        
        console.log("Starting wheel animation");
        setIsAnimating(true);
        onSpinStart && onSpinStart();
        
        const randomRotation = currentRotation + (Math.random() * 360 + 360 * spinSpeed);
        console.log("Setting rotation to:", randomRotation);
        setRotation(randomRotation);
        
        animationRef.current = requestAnimationFrame(() => animate(Date.now()));
    };

    // Effet pour déclencher le spin quand isSpinning change
    useEffect(() => {
        console.log("isSpinning changed:", isSpinning, "isAnimating:", isAnimating);
        if (isSpinning && !isAnimating) {
            console.log("Starting spin animation");
            startSpin();
        }
    }, [isSpinning, isAnimating]);

    // Nettoyage
    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Redessiner quand les éléments changent ou quand l'élément survolé change
    useEffect(() => {
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx && elements.length > 0) {
            drawWheel(ctx, currentRotation);
        }
    }, [elements, wheelSize, borderWidth, borderColor, backgroundColor, textColor, fontSize, fontWeight, showPointer, pointerColor, customColors, hoveredElementIndex]);

    const canvasWidth = wheelSize;
    const canvasHeight = wheelSize + pointerSize + 20;
    
    return (
        <div className="custom-wheel-container" style={{ width: canvasWidth, height: canvasHeight }}>
            <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className={`custom-wheel ${isAnimating ? 'spinning' : ''}`}
                style={{ cursor: disabled ? 'not-allowed' : 'default' }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            />
        </div>
    );
};

export default CustomWheel;