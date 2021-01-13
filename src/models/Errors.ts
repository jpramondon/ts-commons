export namespace Errors {

    export class HttpableError extends Error {
        public name: string;
        public message: string;
        public stack?: string;
        public httpStatusCode: number = 500;

        constructor(message?: string) {
            super(message);
            if (message) {
                this.message = message;
            }
        }

        public toJson(): any {
            return {
                status: this.httpStatusCode,
                name: this.name,
                message: this.message
            };
        }

        public static isHttpableError(error: Error): error is Errors.HttpableError {
            return (error as Errors.HttpableError).httpStatusCode !== undefined;   
        }
    }

    export class NoContentFoundError extends HttpableError {
        constructor(message?: string) {
            super(message);
            this.name = "NoContentFoundError";
            this.httpStatusCode = 204;
        }
    }

    export class ValidationError extends HttpableError {
        constructor(message?: string) {
            super(message);
            this.name = "Validation error";
            this.httpStatusCode = 400;
        }
    }

    export class NotFoundError extends HttpableError {
        constructor(message?: string) {
            super(message);
            this.name = "NotFoundError";
            this.httpStatusCode = 404;
        }
    }

    export class ConflictError extends HttpableError {
        public conflict: Conflict;
        constructor(message: string, conflict: Conflict) {
            super(message);
            this.name = "ConflictError";
            this.httpStatusCode = 409;
            this.conflict = conflict;
        }

        public toJson(): any {
            return {
                ...super.toJson(),
                conflict: this.conflict
            };
        }
    }

    export class TechnicalError extends HttpableError {
        constructor(message?: string) {
            super(message);
            this.name = "TechnicalError";
        }
    }

    export class ServiceUnavailableError extends HttpableError {
        public innerError: string;
        constructor(message: string, innerError?: string) {
            super(message);
            this.name = "ServiceUnavailableError";
            this.httpStatusCode = 503;
            if (innerError) {
                this.innerError = innerError;
            }
        }

        public toJson(): any {
            return {
                ...super.toJson(),
                innerError: this.innerError
            };
        }
    }

    class Conflict {
        targetType: string;
        targetId: string;
    }
}