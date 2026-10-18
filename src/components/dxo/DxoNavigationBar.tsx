import "../common/NavigationBar.scss";

import { useState } from "react";
import { Grip, SlidersVertical } from "lucide-react";

import Menu from "../common/Menu";
import fluexLogo from "../../../public/images/fluex-logo.png";
import { useLinkStatus } from "../../device/deviceStore";

export default function DxoNavigationBar() {

    const [isShowingMenu, setIsShowingMenu] = useState<boolean>(false);
    const { status } = useLinkStatus();

    return (
        <>
            <div className="app-navbar">
                <div className="app-navbar__container">
                    <div className="app-navbar__logo">
                        <img src={fluexLogo} alt="Fluex" />
                        <span>DXO Mixer</span>
                    </div>
                    <div className="app-navbar__controls">
                        <div className="app-navbar__controls__button app-navbar__controls__button--active" title="Mixer">
                            <SlidersVertical size={20} />
                        </div>
                        <div className="app-navbar__controls__vl"></div>
                        <span className="dxo-navbar__status" data-state={status.state} data-live={status.writeEnabled}>
                            {status.state !== "connected" ? "Offline" : status.writeEnabled ? "Live" : "Read only"}
                        </span>
                    </div>
                    <div className="app-navbar__menu-button" onClick={() => setIsShowingMenu(true)} >
                        <Grip size={20} />
                    </div>
                </div>
            </div>

            {isShowingMenu && <Menu onClose={() => setIsShowingMenu(false)} />}
        </>
    );
}
