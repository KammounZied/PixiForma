'use client';

import { TopSection } from "../Organisms";
import { ILayoutWrapper } from "@/interfaces";

export default function LayoutWrapper({ title, subTitle, mainSection, rightActions, leftActions }: Readonly<ILayoutWrapper>) {
    return (
        <>
            <TopSection title={title} subTitle={subTitle} rightActions={rightActions} leftActions={leftActions} />
            <div className="border-b-[0.5px] border-secondary-gris-fonce"></div>

            <div className="h-[88%]">
                {mainSection}
            </div>
        </>
    );
}
