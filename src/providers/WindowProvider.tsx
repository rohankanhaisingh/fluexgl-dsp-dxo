import { useCallback, useState, type ReactNode } from "react";
import { AppWindow } from "lucide-react";

import Window from "../components/window/Window";
import { WindowContext, type WindowContextValue, type WindowData } from "./WindowContext";

export interface WindowProviderProperties {
    children?: React.ReactNode;
}

const DEFAULT_WINDOW_WIDTH: number = 400;
const DEFAULT_WINDOW_HEIGHT: number = 230;

export default function WindowProvider({ children }: WindowProviderProperties) {

    const [windowTitle, setWindowTitle] = useState<string>("In-browser window");
    const [windowIcon, setWindowIcon] = useState<ReactNode>(<AppWindow size={16} />);
    const [windowContent, setWindowContent] = useState<ReactNode | null>();
    const [windowIsVisible, setWindowIsVisible] = useState<boolean>(false);
    const [windowData, setWindowData] = useState<WindowData>({ width: 0, height: 0, x: 0, y: 0 });
    const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({ width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT });

    function showWindow() {
        // Reset to the default size first; callers that need more room (e.g. the
        // Analyser window) call setSize(...) right after showWindow() to override it.
        setWindowSize({ width: DEFAULT_WINDOW_WIDTH, height: DEFAULT_WINDOW_HEIGHT });
        setWindowIsVisible(true);
    }

    function closeWindow() {
        setWindowIsVisible(false);
    }

    function setTitle(title: string) {
        setWindowTitle(title);
    }

    function setIcon(icon: ReactNode) {
        setWindowIcon(icon);
    }

    function setContent(content: ReactNode) {
        setWindowContent(content);
    }

    function setSize(width: number, height: number) {
        setWindowSize({ width, height });
    }

    const setInternalWindowData = useCallback(function (data: WindowData) {
        setWindowData(data);
    }, []);

    const value: WindowContextValue = {
        showWindow,
        closeWindow,
        setTitle,
        setIcon,
        setContent,
        setSize,
        windowData
    };

    return (
        <>
            <WindowContext.Provider value={value}>
                {children}

                {windowIsVisible && (
                    <Window
                        title={windowTitle}
                        icon={windowIcon}
                        width={windowSize.width}
                        height={windowSize.height}
                        onCloseButtonClick={() => closeWindow()}
                        setInternalWindowData={setInternalWindowData}>
                        {windowContent}
                    </Window>
                )}
            </WindowContext.Provider>
        </>
    );
}