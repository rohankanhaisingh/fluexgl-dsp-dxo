import "./HeaderTitlebar.scss";

import { type ReactNode } from "react";

export interface HeaderTitlebarProperties {
    icon?: ReactNode;
    title?: string;
}

export default function HeaderTitlebar({ icon, title }: HeaderTitlebarProperties) {
    return (
        <div className="app-header__content__titlebar">
            {icon}
            <span>{title}</span>
        </div>
    )
}