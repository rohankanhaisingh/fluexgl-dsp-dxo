import { useContext } from "react";

import { WindowContext, type WindowContextValue } from "../providers/WindowContext";

export default function useWindow(): WindowContextValue {

    const context = useContext(WindowContext);

    if(context === null) 
        throw new Error("useWindow must be used within an WindowProvider");

    return context;
}