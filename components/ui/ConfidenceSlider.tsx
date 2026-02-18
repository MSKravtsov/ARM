'use client';

import { useRef, useState, useEffect } from 'react';

interface ConfidenceSliderProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
}

export default function ConfidenceSlider({
    value,
    onChange,
    min = 1,
    max = 10,
}: ConfidenceSliderProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    // Calculate percentage and derived values
    const percentage = ((value - min) / (max - min)) * 100;

    // Color based on confidence level
    const getColor = (val: number) => {
        if (val <= 4) return { fill: 'bg-red-500', border: 'border-red-500' };
        if (val <= 7) return { fill: 'bg-amber-500', border: 'border-amber-500' };
        return { fill: 'bg-emerald-500', border: 'border-emerald-500' };
    };

    const colors = getColor(value);

    // Calculate value from mouse/touch position
    const calculateValue = (clientX: number) => {
        if (!trackRef.current) return value;

        const rect = trackRef.current.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, offsetX / rect.width));
        const newValue = Math.round(min + percentage * (max - min));

        return Math.max(min, Math.min(max, newValue));
    };

    // Mouse handlers
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setShowTooltip(true);
        const newValue = calculateValue(e.clientX);
        onChange(newValue);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const newValue = calculateValue(e.clientX);
        onChange(newValue);
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setTimeout(() => setShowTooltip(false), 200);
    };

    // Touch handlers
    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        setShowTooltip(true);
        const touch = e.touches[0];
        const newValue = calculateValue(touch.clientX);
        onChange(newValue);
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (!isDragging) return;
        const touch = e.touches[0];
        const newValue = calculateValue(touch.clientX);
        onChange(newValue);
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        setTimeout(() => setShowTooltip(false), 200);
    };

    // Effect for global event listeners
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            window.addEventListener('touchmove', handleTouchMove);
            window.addEventListener('touchend', handleTouchEnd);

            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
                window.removeEventListener('touchmove', handleTouchMove);
                window.removeEventListener('touchend', handleTouchEnd);
            };
        }
    }, [isDragging]);

    return (
        <div className="space-y-3">
            {/* Slider Track Container */}
            <div
                ref={trackRef}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className="relative h-6 cursor-pointer select-none touch-none"
            >
                {/* Background Track */}
                <div
                    className="absolute inset-x-0 h-3 bg-slate-200 rounded-full"
                    style={{
                        top: '50%',
                        transform: 'translateY(-50%)',
                    }}
                />

                {/* Active Fill Bar */}
                <div
                    className={`absolute left-0 h-3 rounded-full transition-all duration-150 ${colors.fill}`}
                    style={{
                        width: `${percentage}%`,
                        top: '50%',
                        transform: 'translateY(-50%)',
                    }}
                />

                {/* Handle (Knob) */}
                <div
                    className="absolute h-6 w-6 z-10"
                    style={{
                        left: `${percentage}%`,
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                    }}
                >
                    {/* Tooltip Bubble */}
                    {(showTooltip || isDragging) && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none">
                            <div className="bg-gray-800 text-white text-xs font-bold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
                                {value}
                                {/* Arrow */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                                    <div className="border-4 border-transparent border-t-gray-800" />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Handle Circle */}
                    <div
                        className={`w-6 h-6 rounded-full bg-white shadow-md border-2 ${colors.border}
                            transition-transform duration-150
                            ${isDragging ? 'scale-125' : 'scale-100 hover:scale-110'}`}
                    />
                </div>
            </div>

            {/* Static Labels */}
            <div className="flex justify-between text-xs text-slate-400">
                <span>Low</span>
                <span>High</span>
            </div>
        </div>
    );
}
