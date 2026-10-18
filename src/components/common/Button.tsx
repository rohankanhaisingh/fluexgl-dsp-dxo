import LoaderIndicator from "./LoaderIndicator";
import { type ReactNode, type RefObject } from "react";
import "./Button.scss";

export type ButtonStyle = "normal" | "red";

export interface ButtonProperties {
    icon?: ReactNode;
    text?: string;
    title?: string;
    disabled?: boolean;
    ref?: RefObject<HTMLDivElement | null>;
    style?: ButtonStyle;
    onClick?: () => void;
}

export default function Button({ icon, text, title, onClick, ref, disabled = false, style = "normal" }: ButtonProperties ) {

    return (
        <div className={`app-button ${style} ${disabled ? "disabled" : ""}`} title={title} role="button" onClick={() => !disabled && onClick?.()} ref={ref ?? null}>
            {disabled ? <LoaderIndicator size="small" theme="fluexgl-dsp" /> : icon}
            <span>{text}</span>
        </div>
    )
}