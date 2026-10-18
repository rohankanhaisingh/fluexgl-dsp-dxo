import "./HeaderContent.scss";

import { type PropsWithChildren } from "react";

export default function HeaderContent({ children }: PropsWithChildren) {
    return (
        <div className="app-header__content">
            {children}
        </div>
    )
}