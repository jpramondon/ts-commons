import { Config } from "@gearedminds/ext-conf";
import * as _ from "lodash";
import { Options, Sequelize } from "sequelize";
import { Errors } from "../models/Errors";
import { Env } from "../support/Environment";
import { Loggers } from "../support/LoggerFactory";
import { sleep } from "../support/Sleep";

export class DatabaseManager {

    protected logger = Loggers.getLogger("DatabaseManager");
    public sequelize: Sequelize;

    public connect(options: ConnectionOptions): Promise<void> {
        if (!this.sequelize) {
            const sequelOptions: Options = {
                dialect: "postgres",
                logging: this.logQueries(),
                benchmark: true
            };
            const forceSSL = (!_.isNil(options.sslMode) ? options.sslMode : false);
            if (!Env.isNodeDevEnvironment() || forceSSL) {
                if (_.isEmpty(options.certPath)) {
                    throw new Errors.TechnicalError(`certPath is mandatory when using sslMode`);
                }
                sequelOptions.dialectOptions = {
                    ssl: {
                        sslmode: "verify-ca",
                        sslrootcert: options.certPath
                    }
                };
                sequelOptions.ssl = true;
                sequelOptions.pool = {
                    max: 4,
                    min: 0
                };
            }
            let dbName = options.database;
            if (options.databaseModifierEnvVar) {
                const modifier = Config.getConfItem(options.databaseModifierEnvVar);
                dbName = `${dbName}-${modifier}`;
            }
            const { password, ...debuggableOptions } = options;
            if (options.useReadReplicas) {
                if (_.isEmpty(options.readHosts) || (_.isEmpty(options.writeHost))) {
                    throw new Errors.TechnicalError(`readHosts AND writeHost are mandatory when using useReadReplicas`);
                }
                const readReplicas = options.readHosts.map(readHost => {
                    return { host: readHost, port: options.port, username: options.user, password: options.password };
                });
                sequelOptions.replication = {
                    read: readReplicas,
                    write: { host: options.writeHost, port: options.port, username: options.user, password: options.password }
                };
                this.logger.info(`DbManager will now try to connect to read / write replicas using the following options ${JSON.stringify(debuggableOptions)}`);
                this.sequelize = new Sequelize(dbName, null, null, sequelOptions);
            } else {
                sequelOptions.host = options.host;
                sequelOptions.port = options.port;
                this.logger.info(`DbManager will now try to connect to ${options.host} as ${options.user} on database ${dbName} using the following options ${JSON.stringify(debuggableOptions)}`);
                this.sequelize = new Sequelize(dbName, options.user, options.password, sequelOptions);
            }
        }
        const maxRetries = Config.getConfItem("PG_CONNECT_MAX_RETRIES") ?? 1;
        const retryDelay = Config.getConfItem("PG_CONNECT_RETRY_DELAY") ?? 3000;
        return this.connectRetry(maxRetries, retryDelay);
    }

    public disconnect(): Promise<void> {
        return this.sequelize.close()
            .then(() => {
                delete this.sequelize;
            })
    }

    public ping(): Promise<number> {
        const pingStart = process.hrtime();
        return new Promise((resolve) => {
            this.sequelize.query("select max(table_catalog) as x from information_schema.tables")
                .then(() => resolve(process.hrtime(pingStart)["1"] / 1000000))
                .catch((error: any) => {
                    this.logger.error(`There was an error pinging: ${error}`);
                    return resolve(-1);
                });
        });
    }

    protected logQueries(): boolean | ((sql: string, timing?: number) => void) {
        const shouldLogQueries = (Config.getConfItem("LOG_DB_QUERIES") !== undefined ? Config.getConfItem("LOG_DB_QUERIES") as boolean : true);
        const logger = this.logger;
        if (shouldLogQueries) {
            return ((sql: string, timing?: number) => logger.info(`{sql:${sql}`));
        }
        return false;
    }

    private async connectRetry(maxRetries: number, retryDelay: number): Promise<void> {
        let currentAttempt = 1;
        do {
            this.logger.info(`Database connection attempt #${currentAttempt})`);
            try {
                await this.sequelize.authenticate();
                this.logger.info("Sequelize pool is successfully connected");
                return;
            }
            catch (err) {
                this.logger.error(`Database connection attempt ${currentAttempt} failed: ${err}`);
                await sleep(retryDelay);
                currentAttempt++;
            }
        } while (currentAttempt <= maxRetries);
        throw new Errors.TechnicalError(`All attempts to connect to the database are now expired`);
    }
}

export interface ConnectionOptions {
    host: string;
    port: number;
    database: string;
    databaseModifierEnvVar?: string;
    user: string;
    password: string;
    sslMode: boolean;
    certPath?: string;
    maxRetries?: number;
    retryDelay?: number;
    useReadReplicas?: boolean;
    writeHost?: string;
    readHosts?: string[];
}
