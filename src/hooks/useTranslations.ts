import { useContext } from "react";

import { I18nContext } from "../providers/I18nContext";

interface TranslateFunction {
    (key: string, params?: Array<string | number>): string;
    raw: (key: string) => unknown;
}

function getByPath(obj: unknown, path: string): unknown {

    const parts: string[] = path.split(".");
    let current: unknown = obj;

    for (let i = 0; i < parts.length; i++) {
        if (current === null)
            return undefined;

        current = (current as Record<string, unknown>)[parts[i]];
    }

    return current;
}

function format(template: string, params?: Array<string | number>): string {

    if (!params || params.length === 0)
        return template;

    let i = 0;

    return template.replace(/\{\}/g, function () {
        const v = params[i++];
        return v == null ? "" : String(v);
    });
}

export function useLocale() {

    const context = useContext(I18nContext);

    if (!context)
        throw new Error("useLocale must be used inside I18nProvider");

    return {
        locale: context.locale,
        setLocale: context.setLocale,
    };
}

export default function useTranslation(): TranslateFunction {

    const context = useContext(I18nContext);

    if (!context)
        throw new Error("useT must be used inside I18nProvider");

    const dict = context.dictionaries[context.locale] || {};

    const t = Object.assign(
        function t(key: string, params?: Array<string | number>): string {

            const value = getByPath(dict, key);

            return (typeof value === "string") ? format(value, params) : key;
        },
        {
            raw(key: string): unknown {
                return getByPath(dict, key);
            }
        }
    );

    return t;
}