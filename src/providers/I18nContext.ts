import { createContext } from "react";

export type Translations = { [key: string]: string | Translations };

export interface I18nContextValue {
    locale: string;
    dictionaries: Record<string, Translations>;
    setLocale: (locale: string) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
