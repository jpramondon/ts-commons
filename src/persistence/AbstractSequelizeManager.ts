import { DatabaseManager, ConnectionOptions } from "./DatabaseManager";

export abstract class AbstractSequelizeManager extends DatabaseManager {

    public connect(options: ConnectionOptions): Promise<void> {
        return super.connect(options).then( () => {
            this.initModels();
        });
    }

    protected abstract initModels(): Promise<void>;
}
