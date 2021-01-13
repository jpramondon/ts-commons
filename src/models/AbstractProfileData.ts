export abstract class AbstractProfileData {
    public start: Date;
    public end: Date;
    public metas: any;

    public abstract toJson(): any;

    constructor(start?: Date, end?: Date, metas?: any) {
        this.start = start ?? new Date();
        this.end = end ?? new Date();
        this.metas = metas ?? {};
    }

    public duration(): number {
        return this.end.getTime() - this.start.getTime();
    }
}