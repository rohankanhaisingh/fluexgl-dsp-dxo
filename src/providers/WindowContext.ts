import { createContext, type ReactNode } from "react";

export interface WindowData {
    width: number;
    height: number;
    x: number;
    y: number;
}

export interface WindowContextValue {
    showWindow(): void;
    closeWindow(): void;
    setTitle(title: string): void;
    setIcon(icon: ReactNode): void;
    setContent(content: ReactNode): void;
    setSize(width: number, height: number): void;
    windowData: WindowData;
}

export const WindowContext = createContext<WindowContextValue | null>(null);
