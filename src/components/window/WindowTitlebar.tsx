import { type ReactNode, useCallback, useState } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";

import "./WindowTitlebar.scss";

export interface WindowTitlebarProperties {
    title?: string;
    icon?: ReactNode;
    draggable?: boolean;
    onMouseDown?: (event: React.MouseEvent<HTMLDivElement>) => void;
    onCloseButtonClick?: () => void;
    onChangeWindowSizeButtonClick?: (isExpanded: boolean) => void;
}

export default function WindowTitlebar({ title, icon, draggable, onMouseDown, onCloseButtonClick, onChangeWindowSizeButtonClick }: WindowTitlebarProperties) {

    const [isExpanded, setIsExpanded] = useState<boolean>(false);

    const onChangeWindowSizeButtonClickCallback = useCallback(function () {

        onChangeWindowSizeButtonClick?.(!isExpanded);
        setIsExpanded(!isExpanded);

    }, [isExpanded, onChangeWindowSizeButtonClick]);

    return (
        <div
            className="app-window__container__titlebar"
            onMouseDown={draggable ? onMouseDown : undefined}
        >
            <div className="app-window__container__titlebar__content">
                {icon}
                <span>{title}</span>
            </div>
            <div className="app-window__container__titlebar__controls">
                <div className="app-window__container__titlebar__controls__button" onClick={onChangeWindowSizeButtonClickCallback}>
                    {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </div>
                <div className="app-window__container__titlebar__controls__button" onClick={onCloseButtonClick}>
                    <X size={16} />
                </div>
            </div>
        </div>
    );
}