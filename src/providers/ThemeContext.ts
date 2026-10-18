import { createContext } from "react";

export type ThemeName = "dark" | "light";
export type AccentName = "orange" | "blue" | "purple" | "green" | "pink";

export interface ThemeContextValue {
    theme: ThemeName;
    accent: AccentName;
    setTheme: (theme: ThemeName) => void;
    setAccent: (accent: AccentName) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);
