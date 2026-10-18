import { useContext } from "react";

import { ThemeContext } from "../providers/ThemeContext";

export default function useTheme() {

    const context = useContext(ThemeContext);

    if (!context)
        throw new Error("useTheme must be used inside ThemeProvider");

    return {
        theme: context.theme,
        accent: context.accent,
        setTheme: context.setTheme,
        setAccent: context.setAccent,
    };
}
