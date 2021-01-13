import { AbstractProfileData } from "./AbstractProfileData";

export class RequestProfileData extends AbstractProfileData {
    public method: string;
    public params: any;
    public path: string;
    public statusCode: number;
    public user: string;

    constructor(method: string, params: any, path: string, statusCode: number, user: string, start?: Date, end?: Date) {
        super(start, end);
        this.method = method;
        this.params = params;
        this.statusCode = statusCode;
        this.path = path;
        this.user = user;
    }

    public toJson(): any {
        return {
            durationMs: this.duration(),
            method: this.method,
            params : this.params,
            path: this.path,
            statusCode: this.statusCode,
            user: this.user
        }
    }
}