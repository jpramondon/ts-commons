import { AbstractProfileData } from "./AbstractProfileData";

export class JobProfileData extends AbstractProfileData {
    public name: string;
    
    constructor(name: string, start?: Date, end?: Date, metas?: any) {
        super(start, end, metas);
        this.name = name;
    }

    public toJson(): any {
        return {
            name: this.name,
            startDate: this.start,
            endDate: this.end,
            duration: this.duration(),
            metas: this.metas
        }
    }
}