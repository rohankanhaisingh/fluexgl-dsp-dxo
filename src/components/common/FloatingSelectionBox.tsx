import "./FloatingSelectionBox.scss";

import { type ReactNode, useEffect, useState, useRef } from "react";
import { Ease } from "@babahgee/easings";

import Button from "./Button";

export interface FloatingSelectionBoxItem<T> {
    icon: ReactNode;
    label: string;
    data: T;
}

export interface FloatingSelectionBoxProperties<T> {
    items: FloatingSelectionBoxItem<T>[];
    title: string;
    anchor?: HTMLElement;
    onSelect?: (data: T) => void;
    onCancel?: () => void;
}

export default function FloatingSelectionBox<T>({ title, items, anchor, onCancel, onSelect }: FloatingSelectionBoxProperties<T>) {

    const [selectionBoxHorizontalPosition, setSelectionBoxHorizontalPosition] = useState<number>(20);
    const [selectionBoxVerticalPosition, setSelectionBoxVerticalPostition] = useState<number>(20);

    const [scale, setScale] = useState<number>(0.95);
    const [opacity, setOpacity] = useState<number>(0);

    const selectionBoxRef = useRef<HTMLDivElement>(null);

    useEffect(function () {

        if (!anchor || !selectionBoxRef.current) return;

        const anchorBoundary: DOMRect = anchor.getBoundingClientRect();
        const selectionBoxBoundary: DOMRect = selectionBoxRef.current.getBoundingClientRect();

        const padding = 8;

        let desiredTop = anchorBoundary.top + (anchorBoundary.height / 2) - (selectionBoxBoundary.height / 2);
        let desiredLeft = anchorBoundary.left;

        const maxTop = window.innerHeight - selectionBoxBoundary.height - padding;
        const maxLeft = window.innerWidth - selectionBoxBoundary.width - padding;

        if (desiredTop < padding)
            desiredTop = padding;

        if (desiredTop > maxTop)
            desiredTop = maxTop;

        if (desiredLeft < padding)
            desiredLeft = padding;

        if (desiredLeft > maxLeft)
            desiredLeft = maxLeft;

        // eslint-disable-next-line react-hooks/set-state-in-effect -- position is derived from DOM measurements (anchor/selectionBoxRef) only available after render
        setSelectionBoxVerticalPostition(desiredTop);
        setSelectionBoxHorizontalPosition(desiredLeft);

        Ease(0, 1, "easeOutExpo", 350, _scale => setScale(_scale));
        setOpacity(1);

    }, [anchor, selectionBoxRef]);

    return (
        <div className="app-floating-selection-box">
            <div className="app-floating-selection-box__backdrop" onClick={onCancel}></div>
            <div className="app-floating-selection-box__box" ref={selectionBoxRef} style={{
                left: selectionBoxHorizontalPosition + "px",
                top: selectionBoxVerticalPosition + "px",
                transform: `scale(${scale})`,
                opacity
            }}>
                <div className="app-floating-selection-box__box__container">
                    <p className="app-floating-selection-box__box__container__title">{title}</p>
                    <div className="app-floating-selection-box__box__container__buttons">
                        {items.map(function (item: FloatingSelectionBoxItem<T>, index: number) {
                            return (
                                <Button icon={item.icon} title={item.label} text={item.label} key={index} onClick={() => onSelect?.(item.data)} />
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}