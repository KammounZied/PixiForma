import { ESize } from "@/Enum/Enum";

interface ITabOption {
    label: string;
    value: string;
}

export interface IMoleculeTabProps {
    options: ITabOption[];
    value: string;
    onChange: (value: string) => void;
    size?: ESize;
    buttonClassName?: string;
}
