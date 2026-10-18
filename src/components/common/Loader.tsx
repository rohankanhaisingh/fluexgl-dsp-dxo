import LoaderIndicator from "./LoaderIndicator";
import "./Loader.scss";

import fluexLogo from "../../../public/images/fluex-logo.png";

export interface LoaderProperties {
    isFadingOut: boolean;
    loadingText: string;
}

export default function Loader({ isFadingOut, loadingText }: LoaderProperties) {
    return (
        <div className={`app-loader ${isFadingOut ? "fade-out" : ""}`}>
            <div className="app-loader__container">
                <div className="app-loader__logo">
                    <div className="app-loader__logo__icon">
                        <img src={fluexLogo} alt="Fluex" />
                    </div>
                    <span>fluexgl.org</span>
                </div>
                <p className="app-loader__loading-text">{loadingText}</p>
                <LoaderIndicator />
            </div>
        </div>
    )
}