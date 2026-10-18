import { type ReactNode } from "react";
import "./Header.scss";

export type HeaderPosition = "left" | "right";

export interface HeaderProperties {
    position?: HeaderPosition;
    children?: ReactNode;
}

export default function Header({ position, children }: HeaderProperties) {
    return (
        <div className={`app-header ${position ?? ""}`}>
            {children}
        </div>
    )
}