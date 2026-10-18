import React, { useEffect, useRef, useState } from "react";
import { Ease } from "@babahgee/easings";

import "./Knob.scss";

export interface KnobProperties {
    min: number;
    max: number;
    step: number;
    value?: number;
    defaultValue?: number;
    onChange?: (value: number) => void;
}

export default function Knob({ min, max, step, value, defaultValue, onChange }: KnobProperties) {

    const [internalValue, setInternalValue] = useState<number>(defaultValue ?? min);
    const isControlled = value !== undefined;
    const currentValue = isControlled ? (value as number) : internalValue;

    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef<number>(0);
    const startValueRef = useRef<number>(currentValue);

    useEffect(() => {
        if (!isControlled && defaultValue !== undefined)
            // eslint-disable-next-line react-hooks/set-state-in-effect -- resyncs internal state when the uncontrolled defaultValue prop changes
            setInternalValue(defaultValue);
    }, [defaultValue, isControlled]);

    function updateValue(next: number) {

        let clamped = Math.min(Math.max(next, min), max);
        const safeStep = step || 1;

        clamped = Math.round(clamped / safeStep) * safeStep;

        if (!isControlled) setInternalValue(clamped);
        
        onChange?.(clamped);
    }

    function handleDragStart(clientY: number) {
        
        setIsDragging(true);

        startYRef.current = clientY;
        startValueRef.current = currentValue;

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("touchmove", handleTouchMove);
        window.addEventListener("touchend", handleTouchEnd);
    }

    function handleMouseDown(e: React.MouseEvent<HTMLDivElement>) {
        e.preventDefault();

        if (e.button === 1)
            return resetValuesOnMiddleMouseClick();

        handleDragStart(e.clientY);
    }

    function handleTouchStart(e: React.TouchEvent<HTMLDivElement>) {
        e.preventDefault();
        const touch = e.touches[0];
        handleDragStart(touch.clientY);
    }

    function handleMouseMove(e: MouseEvent) {
        e.preventDefault();
        handleDragMove(e.clientY);
    }

    function handleTouchMove(e: TouchEvent) {
        e.preventDefault();
        const touch = e.touches[0] ?? e.changedTouches[0];
        if (!touch) return;
        handleDragMove(touch.clientY);
    }

    function handleDragMove(clientY: number) {

        const deltaY = startYRef.current - clientY,
            pixelsForFullRange = 150,
            range = max - min,
            deltaValue = (deltaY / pixelsForFullRange) * range,
            next = startValueRef.current + deltaValue;

        updateValue(next);
    }

    function stopDragging() {

        setIsDragging(false);

        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
    }

    function handleMouseUp() {
        stopDragging();
    }

    function handleTouchEnd() {
        stopDragging();
    }

    function resetValuesOnMiddleMouseClick() {

        Ease(internalValue, defaultValue ?? 0, "easeOutExpo", 350, function (easedValue: number) {
            setInternalValue(easedValue);
            onChange?.(easedValue);
        });
    }

    const normalized: number = (currentValue - min) / (max - min || 1),
        minAngle: number = 130,
        maxAngle: number = 410,
        angle: number = minAngle + normalized * (maxAngle - minAngle);

    return (
        <div className={`knob ${isDragging ? "is-dragging" : ""}`} onMouseDown={handleMouseDown} onTouchStart={handleTouchStart} >
            <div className="knob__body">
                <div className="knob__body__center"></div>
                <div className="knob__body__handle" style={{ transform: `rotate(${angle}deg)` }}></div>
            </div>
        </div>
    );
}