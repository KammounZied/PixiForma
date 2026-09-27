import { ERadioStatus, ESizeRadio } from "@/Enum/Enum";
import { MouseEventHandler } from "react";

interface IAtomRadio {
    id: string;
    status: ERadioStatus;
    size?: keyof typeof ESizeRadio;
    onClick?: MouseEventHandler<HTMLDivElement>;
    disabled?: boolean;
}

export type { IAtomRadio };