import { type  ReactNode } from "react";
import "./WindowContent.scss";

export interface WindowContentProperties {
    children?: ReactNode;
}

export default function WindowContent({ children }: WindowContentProperties) {
    return (
        <div className="app-window__container__content">
            {children}
        </div>
    )
}