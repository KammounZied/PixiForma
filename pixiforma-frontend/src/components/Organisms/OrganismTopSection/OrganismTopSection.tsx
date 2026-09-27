import { Label } from '@/components/Atoms'
import { IOrganismTopSection } from '@/interfaces'

const OrganismTopSection = (props: IOrganismTopSection) => {

    return <div className="flex justify-between items-center h-[12%] px-6">
        <div className="flex flex-row gap-2 items-center">
            {props?.leftActions}
            <div className="flex flex-col">
                <Label weight={600} className="text-2xl">{props?.title}</Label>
                <Label weight={400} className="text-secondary-gris-fonce">
                    {props?.subTitle}
                </Label>
            </div>
        </div>
        <div className="flex flex-row">
            {props?.rightActions}
        </div>
    </div>
}

export default OrganismTopSection
