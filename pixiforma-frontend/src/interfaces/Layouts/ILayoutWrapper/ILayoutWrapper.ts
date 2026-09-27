import { IOrganismTopSection } from "@/interfaces/Organisms";
import { ReactNode } from "react";

interface ILayoutWrapper extends IOrganismTopSection {
    mainSection: ReactNode;
}

export type { ILayoutWrapper }
