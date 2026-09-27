import { Label } from "@/components/Atoms";
import { ETypographyType } from "@/Enum/Enum";

interface ILicenseCardProps {
    name: string;
    packs?: number;
    distributed: number;
    active: number;
}

export default function MoleculeLicenseCard({
    name,
    packs,
    distributed,
    active,
}: Readonly<ILicenseCardProps>) {
    return (
        <div className={"rounded-lg border-[0.5px] border-secondary-gris-fonce p-4"}>
            <div className="flex justify-between items-center mb-3">
                <Label typeStyle={ETypographyType.BodyMediumBold} >{name}</Label>
                <Label weight={400} className="text-sm text-secondary-gris-fonce" >Packs
                    <Label weight={600} className="ml-2 text-base text-black" >{packs}</Label>
                </Label>
            </div>
            <div className="space-y-2">
                <div className="flex justify-between">
                    <Label weight={400} className="text-sm text-secondary-gris-fonce" >
                        Licences distribuées
                    </Label>
                    <Label weight={600} className="text-base text-black" >{distributed}</Label>
                </div>
                <div className="flex justify-between">
                    <Label weight={400} className="text-sm text-secondary-gris-fonce" >
                        Licences actives
                    </Label>
                    <Label weight={600} className="text-base text-black" >{active}</Label>
                </div>
            </div>
        </div>
    );
}
