import { Config } from "@gearedminds/ext-conf";
import * as _ from "lodash";
import * as Sequelize from "sequelize";
import * as Umzug from "umzug";
import { AbstractSequelizeManager } from "./AbstractSequelizeManager";
import { sleep } from "../support/Sleep";
import { Loggers } from "../support/LoggerFactory";
import { Errors } from "../models/Errors";

const dbUpdaterLogger = Loggers.getLogger("DbUpdater");

export function updateDb(sequelizeManager: AbstractSequelizeManager, migrationsPath: string, caller?: string): Promise<void> {
    dbUpdaterLogger.debug(`Will search migration files in ${migrationsPath}`);
    const umzug = new Umzug({
        migrations: {
            params: [
                sequelizeManager.sequelize.getQueryInterface(), // queryInterface
                sequelizeManager.sequelize.constructor // DataTypes
            ],
            path: migrationsPath
        },
        storage: "sequelize",
        storageOptions: {
            columnName: "migration",
            columnType: Sequelize.STRING,
            sequelize: sequelizeManager.sequelize
        }
    });
    // New plan:
    // - Put latch (now done earlier)
    // - Update database
    // - Remove latch
    return tryPutDbUpdateLatch(sequelizeManager, caller)
        .then(couldSetLatch => {
            dbUpdaterLogger.info(`Could update database latch be set by ${caller} (${process.pid}) ? ${couldSetLatch}`);
            if (!couldSetLatch) {
                // Well if the latch could not be set, it's probably because one was already set
                // Wait and retry, then:
                // - resolve when latch cannot be found in database anymore
                // - reject if no retry attempt left
                return waitForDbUpdate(sequelizeManager, caller);
            }
            return umzug.pending()
                .then((pendingMigrations: Umzug.Migration[]) => {
                    dbUpdaterLogger.info(`There are currently ${pendingMigrations.length} migration pending`);
                })
                .then(() => {
                    dbUpdaterLogger.info("Now executing pending migrations (if any)");
                    return umzug.up();
                })
                .then((executedMigrations: Umzug.Migration[]) => {
                    dbUpdaterLogger.info(`${executedMigrations.length} migration have been executed on the database`);
                })
                .then(() => {
                    return removeDbUpdateLatch(sequelizeManager, caller);
                })
                .catch(err => {
                    // Helps removing the latch if an error is thrown while updating
                    return removeDbUpdateLatch(sequelizeManager, caller).then(() => { throw err });
                });
        });
}

function isDbStillUpdating(sequelizeManager: AbstractSequelizeManager, caller?: string): Promise<boolean> {
    const checkQuery = "SELECT to_regclass('DB_UPDATE_LATCH');";
    return sequelizeManager.sequelize.query(checkQuery)
        .then(([results, metadata]) => {
            dbUpdaterLogger.debug(`${JSON.stringify(results)}`);
            const result = !_.isNil((results[0] as any).to_regclass);
            dbUpdaterLogger.info(`${caller} checks if database still being updated (by another process) ? ${result}`);
            return result;
        })
        .catch(err => {
            throw new Errors.TechnicalError(`${caller} could not check update present latch on database. Database update fails with following error: ${err}`);
        });
}

async function tryPutDbUpdateLatch(sequelizeManager: AbstractSequelizeManager, caller?: string): Promise<boolean> {
    return sequelizeManager.sequelize.query("create table DB_UPDATE_LATCH (created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);")
        .then(([results, metadata]) => {
            dbUpdaterLogger.info(`Database update latch set by ${caller} this process ${process.pid}`);
            // No need to attach this promise. It does not matter if it's executed later.
            sequelizeManager.sequelize.query("insert into DB_UPDATE_LATCH VALUES(DEFAULT);");
            return true;
        })
        .catch(err => {
            dbUpdaterLogger.info(`${caller} could not put latch on database. It might mean the database is currently being updated by another process. 
            Here's the returned error from the database ${err}`);
            return false;
        });
}

export function removeDbUpdateLatch(sequelizeManager: AbstractSequelizeManager, caller?: string): Promise<void> {
    return sequelizeManager.sequelize.query("drop table DB_UPDATE_LATCH;")
        .then(([results, metadata]) => {
            dbUpdaterLogger.info(`Database update latch removed by ${caller} (${process.pid})`);
            return Promise.resolve();
        })
        .catch(err => {
            throw new Errors.TechnicalError(`${caller} could not remove latch on database. Database update fails with following error: ${err}`);
        });
}

async function waitForDbUpdate(sequelizeManager: AbstractSequelizeManager, caller?: string): Promise<void> {
    const maxAttempts = Config.getConfItem("db_update_check_attempts") as number ?? 5;
    const pauseDuration = Config.getConfItem("db_update_pause_duration") as number ?? 5000;
    let currentAttempt = 1;
    do {
        dbUpdaterLogger.info(`${caller} waits for database update to finish (attempt ${currentAttempt})`);
        try {
            const stillUpdating = await isDbStillUpdating(sequelizeManager, caller);
            if (!stillUpdating) {
                dbUpdaterLogger.info(`Database update seems to be finished. ${caller} only waited around ${currentAttempt * pauseDuration / 1000} seconds.`);
                return;
            }
        }
        catch (err) {
            dbUpdaterLogger.error(`An error occurred when waiting: ${err}`);
        }
        finally {
            await sleep(pauseDuration);
            currentAttempt++;
        }
    } while (currentAttempt <= maxAttempts);
    dbUpdaterLogger.error(`Look, we've new been waiting ${currentAttempt * pauseDuration / 1000} seconds for this database to update. The database is still not ready, I (${caller}) am giving up.`);
    throw new Errors.TechnicalError(`All attempts to wait for the database to update are now expired`);
}