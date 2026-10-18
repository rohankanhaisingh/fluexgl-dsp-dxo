import "./LoaderIndicator.scss";

export type LoaderIndicatorSizes = "extra-small" | "small" | "regular";
export type LoaderIndicatorTheme = "regular" | "fluexgl-dsp"

export interface LoaderIndicatorProperties {
    size?: LoaderIndicatorSizes;
    theme?: LoaderIndicatorTheme;
}

export default function LoaderIndicator({ size, theme }: LoaderIndicatorProperties) {
    return (
        <div className={`loader-indicator ${size} ${theme}`}>
            <div className="loader-indicator__container">
                <span className="loader-indicator__container__spinner"></span>
            </div>
        </div>
    )
}