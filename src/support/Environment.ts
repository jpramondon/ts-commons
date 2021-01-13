import * as path from "path";

export namespace Env {

    const versionFile = require(path.resolve("version.json"));

    export const DEFAULT_OUT_MEDIA_TYPE = "application/json";

    export function isNodeDevEnvironment() {
        return "production" !== process.env.NODE_ENV;
    }

    export function getVersion(): string {
        return versionFile.version;
    }

    export function getCommitHash() {
        return versionFile.hash;
    }

    export function getEnv(): string {
        return process.env.ENV ?? "dev";
    }

    export function getProjectName(): string {
        return versionFile.project;
    }

    export function getProjectDesc(): string {
        return versionFile.description;
    }
    
}