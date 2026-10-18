import { useState, useRef, type MouseEvent } from "react";
import { Ease } from "@babahgee/easings";
import "./Fader.scss";

export interface FaderProperties {
    initialValue?: number;
    /** Lowest value, at the bottom of the fader. Defaults to 0. */
    minimumValue?: number;
    maximumValue?: number;
    /** Where a middle click returns to. Defaults to 100. */
    defaultValue?: number;
    /** When set, the fader shows this value instead of its own state. */
    value?: number | null;
    step?: number;
    format?: (value: number) => string;
    onChange?: (value: number) => void;
}

export default function Fader({ initialValue, minimumValue, maximumValue, defaultValue, value, step, format, onChange }: FaderProperties) {

    const [internalValue, setInternalValue] = useState<number>(initialValue ?? 100);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [maxValue] = useState<number>(maximumValue ?? 120);
    const minValue: number = minimumValue ?? 0;
    const resetValue: number = defaultValue ?? 100;
    const stepSize: number = step ?? 0.1;

    const isControlled: boolean = value !== undefined;
    const currentValue: number = isControlled ? (value ?? minValue) : internalValue;

    const bodyRef = useRef<HTMLDivElement>(null);

    function emit(next: number) {

        const fixedValue: number = Number((Math.round(next / stepSize) * stepSize).toFixed(2));

        if (!isControlled) setInternalValue(fixedValue);
        onChange?.(fixedValue);
    }

    function handleThumbMovement(event: MouseEvent<HTMLDivElement>): void {

        if (!isDragging || !bodyRef.current) return;

        const bodyBoundary: DOMRect = bodyRef.current.getBoundingClientRect();

        const bottomOffset: number = bodyBoundary.bottom - event.clientY;

        let ratio: number = bottomOffset / bodyBoundary.height;

        if (ratio < 0) ratio = 0;
        if (ratio > 1) ratio = 1;

        emit(minValue + (maxValue - minValue) * ratio);
    }

    function handleThumbMouseDown(event: MouseEvent<HTMLDivElement>): void {

        event.preventDefault();

        if (event.button !== 1) return setIsDragging(true);

        Ease(currentValue, resetValue, "easeOutExpo", 1000, function (eased: number) {
            emit(eased);
        });

        setIsDragging(false);
    }

    const displayPercentage: number = Math.max(0, Math.min(100, (currentValue - minValue) / (maxValue - minValue) * 100));

    return (
        <div
            className={`channel-fader ${isDragging ? "is-dragging" : ""}`}
            onMouseMove={handleThumbMovement}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
        >
            <div className="channel-fader__body" ref={bodyRef}>
                <div
                    className="channel-fader__body__current"
                    style={{ height: displayPercentage + "%" }}
                >
                    <div className="channel-fader__body__current__container">
                        <div className="channel-fader__body__current__label">
                            <span>{format ? format(currentValue) : `${currentValue}%`}</span>
                        </div>
                        <div
                            className="channel-fader__body__current__thumb"
                            onMouseDown={handleThumbMouseDown}
                        >
                            <div className="channel-fader__body__current__thumb__line"></div>
                            <div className="channel-fader__body__current__thumb__line"></div>
                            <div className="channel-fader__body__current__thumb__line"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
