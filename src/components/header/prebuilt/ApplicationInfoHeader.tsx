import { Music } from "lucide-react";

import HeaderContent from "../HeaderContent";
import HeaderTitlebar from "../HeaderTitlebar";
import HeaderDivider from "../HeaderDivider";
import HeaderCategory from "../HeaderCategory";

import useTranslation from "../../../hooks/useTranslations";

export default function ApplicationInfoHeader() {
    const translate = useTranslation();

    return (
        <HeaderContent>
            <HeaderTitlebar
                icon={<Music size={20} />}
                title={translate("application_info.title")}
            />

            <HeaderDivider />

            <HeaderCategory label={translate("application_info.about_category_title")}>
                <p>{translate("application_info.about_paragraph_1")}</p>
                <p>{translate("application_info.about_paragraph_2")}</p>
            </HeaderCategory>

            <HeaderCategory label={translate("application_info.disclaimer_category_title")}>
                <p>
                    {translate(
                        "application_info.disclaimer_text",
                    )}
                </p>
            </HeaderCategory>

            <HeaderCategory label={translate("application_info.how_to_use_category_title")}>
                <p>{translate("application_info.how_to_use_text")}</p>
            </HeaderCategory>
        </HeaderContent>
    );
}
