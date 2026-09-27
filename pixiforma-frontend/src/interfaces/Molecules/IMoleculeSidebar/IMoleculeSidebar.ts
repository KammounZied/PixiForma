import { IconComponentsEnum } from "@/Enum/Enum";

interface INavigationItem {
    id: string;
    iconName: IconComponentsEnum;
    label: string;
    href: string;
    hidden?: boolean;
}

export interface IMoleculeSidebarProps {
    navigationItems: INavigationItem[];
}