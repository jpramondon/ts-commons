import { Env } from "./Environment";
import { IAppenderConfiguration, Logger, Layout, BaseLayout, LogEvent } from "@tsed/logger";
import { JobProfileData } from "../models/JobProfileData";
import { KafkaProfileData } from "../models/KafkaProfileData";
import { RequestProfileData } from "../models/RequestProfileData";

export namespace Loggers {

    //#region Default Logger
    export function getLogger(name: string): Logger {
        const logger = new Logger(name);
        if (!Env.isNodeDevEnvironment()) {
            logger.level = "info";
            logger.appenders.set("std-log-json", jsonAppenderConf);
        } else {
            logger.appenders.set("std-log", {
                type: "stdout",
                levels: ["debug", "trace", "info"]
            });
            logger.appenders.set("error-log", {
                type: "stderr",
                levels: ["error", "fatal", "warn"]
            });
        }
        return logger;
    }

    export const jsonAppenderConf: IAppenderConfiguration = {
        type: "console",
        layout: { type: "customJson", separator: " " },
        level: ["debug", "info", "trace"]
    };

    @Layout({ name: "customJson" })
    export class JsonLayout extends BaseLayout {
        transform(loggingEvent: LogEvent, timezoneOffset?: number): string {
            const correlator = require('express-correlation-id');
            let correlationId = correlator.getId();
            const log = {
                timestamp: loggingEvent.startTime,
                component: loggingEvent.categoryName,
                level: loggingEvent.level.toString(),
                message: this.formatMessage(loggingEvent.data),
                context: loggingEvent.context
            } as any;
            if (correlationId) {
                log.correlation_id = correlationId;
            }
            return JSON.stringify(log) + (this.config["separator"] || "");
        }

        private formatMessage(rawMsg: any[]): string {
            let msg = "";
            rawMsg.forEach((msgBit) => {
                if (typeof msgBit === "object") {
                    msg += JSON.stringify(msgBit);
                } else {
                    msg += msgBit;
                }
                msg += " ";
            });
            return msg.trim();
        }

    }
    //#endregion

    //#region Profile Logger
    export function getProfileLogger(name: string): Logger {
        const logger = new Logger(name);
        if (!Env.isNodeDevEnvironment()) {
            logger.level = "info";
        }
        logger.appenders.set("std-log-json", profileAppenderConf);
        return logger;
    }

    export const profileAppenderConf: IAppenderConfiguration = {
        type: "console",
        layout: { type: "profileLayout", separator: " " },
        level: ["debug", "info", "trace"]
    }

    @Layout({ name: "profileLayout" })
    export class ProfileLayout extends BaseLayout {
        transform(loggingEvent: LogEvent, timezoneOffset?: number): string {
            const data = loggingEvent.data.pop();
            let log = {};
            if (data instanceof RequestProfileData) {
                log = {
                    component: loggingEvent.categoryName,
                    level: loggingEvent.level.toString(),
                    requestProfileData: data.toJson()
                };
            } else if (data instanceof JobProfileData) {
                log = {
                    component: loggingEvent.categoryName,
                    level: loggingEvent.level.toString(),
                    jobProfileData: data.toJson()
                };
            } else if (data instanceof KafkaProfileData) {
                log = {
                    component: loggingEvent.categoryName,
                    level: loggingEvent.level.toString(),
                    kafkaProfileData: data.toJson()
                };
            }
            return JSON.stringify(log) + (this.config["separator"] || "");
        }
    }
    //#endregion
}