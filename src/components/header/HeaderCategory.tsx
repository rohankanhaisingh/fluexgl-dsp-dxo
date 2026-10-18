import "./HeaderCategory.scss";

import { type ReactNode } from "react";

export interface HeaderCategoryProperties {
    label?: string;
    children?: ReactNode;
}

export default function HeaderCategory({ label, children }: HeaderCategoryProperties) {
    return (
        <div className="app-header__content__category">
            <p className="app-header__content__category__label"> {label ?? "Category"}</p>
            <div className="app-header__content__category__items">
                { children }
            </div>
        </div>
    )
}