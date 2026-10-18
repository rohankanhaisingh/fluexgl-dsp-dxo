import type { ReactNode, Ref } from "react";
import { Plus } from "lucide-react";
import "./CreateChannelButton.scss";

export interface CreateChannelButtonProperties {
    icon?: ReactNode;
    title?: string;
    onClick?: () => void;
    ref?: Ref<HTMLDivElement>;
}

export default function CreateChannelButton({ icon, title, onClick, ref }: CreateChannelButtonProperties) {
    return (
        <div className="mixer-create-channel-button" title={title} onClick={ onClick } ref={ref}>
            <div className="mixer-create-channel-button__container">
                {icon ?? <Plus size={20}/>}
            </div>
        </div>
    )
}
