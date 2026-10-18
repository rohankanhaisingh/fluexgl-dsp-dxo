import { useEffect, useMemo, useState, type ReactNode } from "react";

import { ThemeContext, type ThemeName, type AccentName } from "./ThemeContext";

export interface ThemeProviderProperties {
    initialTheme?: ThemeName;
    initialAccent?: AccentName;
    children: ReactNode;
}

export default function ThemeProvider({ initialTheme = "dark", initialAccent = "orange", children }: ThemeProviderProperties) {

    const [theme, setTheme] = useState<ThemeName>(initialTheme);
    const [accent, setAccent] = useState<AccentName>(initialAccent);

    useEffect(function () {
        document.documentElement.setAttribute("data-theme", theme);
    }, [theme]);

    useEffect(function () {
        document.documentElement.setAttribute("data-accent", accent);
    }, [accent]);

    const value = useMemo(function () {
        return {
            theme,
            accent,
            setTheme,
            setAccent
        }
    }, [theme, accent]);

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    )
}
