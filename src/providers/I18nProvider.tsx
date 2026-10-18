import { useMemo, useState, type ReactNode } from "react";

import { I18nContext, type Translations } from "./I18nContext";

export interface I18nProviderProperties {
    initialLocale: string;
    dictionaries: Record<string, Translations>;
    children: ReactNode;
}

export default function I18nProvider({ initialLocale, dictionaries, children }: I18nProviderProperties) {

    const [locale, setLocale] = useState<string>(initialLocale);

    const value = useMemo(function () {
        return {
            locale,
            dictionaries,
            setLocale
        }
    }, [locale, dictionaries]);

    return (
        <I18nContext.Provider value={value}>
            {children}
        </I18nContext.Provider>
    )
}
