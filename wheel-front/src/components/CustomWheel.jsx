import React, { useEffect, useRef, useState } from 'react';
import './CustomWheel.css';

const pointerSize = 80;

const CustomWheel = ({ 
    elements, 
    onSpinEnd, 
    isSpinning, 
    spinDuration = 5,
    spinSpeed = 10,
    wheelSize = 800,
    borderWidth = 2,
    borderColor = '#000',
    backgroundColor = '#fff',
    textColor = '#000',
    fontSize = '5px',
    fontWeight = 'bold',
    showPointer = true,
    pointerColor = '#ff0000',
    customColors = [],
    onSpinStart,
    disabled = false
}) => {
    const canvasRef = useRef(null);
    const [rotation, setRotation] = useState(0);
    const [currentRotation, setCurrentRotation] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const animationRef = useRef(null);

    // Calculer les angles pour chaque élément
    const calculateAngles = () => {
        const totalElements = elements.length;
        const anglePerElement = 360 / totalElements;
        return elements.map((_, index) => index * anglePerElement);
    };

    // Dessiner la roue
    const drawWheel = (ctx, rotation) => {
        const canvasWidth = wheelSize;
        const canvasHeight = wheelSize + pointerSize;
        const centerX = wheelSize / 2;
        const centerY = (wheelSize / 2) + pointerSize;
        const radius = (wheelSize - borderWidth * 2) / 2;
        const angles = calculateAngles();
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        // Dessiner les segments
        elements.forEach((element, index) => {
            ctx.save();
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
            const startAngle = (angles[index] + rotation) * (Math.PI / 180);
            const endAngle = (angles[index + 1] || 360 + rotation) * (Math.PI / 180);
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            ctx.closePath();
            const color = customColors[index] || `hsl(${(index * 360) / elements.length}, 70%, 60%)`;
            ctx.fillStyle = color;
            ctx.fill();
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
        // Dessiner le cercle extérieur (même rayon que les segments)
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.lineWidth = borderWidth;
        ctx.strokeStyle = borderColor;
        ctx.stroke();
        ctx.restore();
        // Dessiner le pointeur
        if (showPointer) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - radius - pointerSize / 2);
            ctx.lineTo(centerX - pointerSize, centerY - radius - pointerSize * 1.2);
            ctx.lineTo(centerX + pointerSize, centerY - radius - pointerSize * 1.2);
            ctx.closePath();
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 18;
            ctx.fillStyle = pointerColor;
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 10;
            ctx.stroke();
            ctx.fill();
            ctx.restore();
        }
    };

    // Animation de rotation
    const animate = (startTime) => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / (spinDuration * 1000), 1);
        const easeOut = (t) => 1 - Math.pow(1 - t, 3);
        const newRotation = currentRotation + (rotation - currentRotation) * easeOut(progress);
        setCurrentRotation(newRotation);
        if (progress < 1) {
            animationRef.current = requestAnimationFrame(() => animate(startTime));
        } else {
            setIsAnimating(false);
            onSpinEnd && onSpinEnd(elements[Math.floor(((360 - (newRotation % 360)) / 360) * elements.length)]);
        }
        const ctx = canvasRef.current.getContext('2d');
        drawWheel(ctx, newRotation);
    };

    // Démarrer la rotation
    const startSpin = () => {
        if (disabled || isAnimating) return;
        setIsAnimating(true);
        onSpinStart && onSpinStart();
        const randomRotation = Math.random() * 360 + 360 * spinSpeed;
        setRotation(randomRotation);
        animationRef.current = requestAnimationFrame(() => animate(Date.now()));
    };

    useEffect(() => {
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const ctx = canvasRef.current.getContext('2d');
        drawWheel(ctx, currentRotation);
    }, [elements, currentRotation, wheelSize, borderWidth, borderColor, backgroundColor, textColor, fontSize, fontWeight, showPointer, pointerColor, customColors]);

    const canvasWidth = wheelSize;
    const canvasHeight = wheelSize + pointerSize;
    return (
        <div className="custom-wheel-container" style={{ width: canvasWidth, height: canvasHeight }}>
            <canvas
                ref={canvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className={`custom-wheel ${isAnimating ? 'spinning' : ''}`}
                onClick={startSpin}
                style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
            />
            {isSpinning && !isAnimating && (
                <div className="spin-button" onClick={startSpin}>
                    SPIN
                </div>
            )}
        </div>
    );
};

export default CustomWheel; 