import * as chai from "chai";
import * as sinon from "sinon";
import { Logger } from "ts-log-debug";
import { ConnectionOptions, DatabaseManager, Loggers } from "../../../src";

describe("DatabaseManager", () => {

    const sandbox = sinon.createSandbox();
    let connectRetryStub: sinon.SinonStub;

    beforeEach(() => {
        const logger = new Logger();
        sandbox.stub(logger, "debug");
        sandbox.stub(logger, "info");
        sandbox.stub(logger, "error");
        sandbox.stub(Loggers, "getLogger").returns(logger);
        connectRetryStub = sandbox.stub(DatabaseManager.prototype, <any>"connectRetry");
    });

    afterEach(() => {
        sandbox.restore();
    })

    describe("connect", () => {

        it("should connect with valid options", async () => {
            connectRetryStub.returns(null);
            const options: ConnectionOptions = {
                database: "test",
                host: "localhost",
                password: "pwd",
                port: 666,
                sslMode: false,
                user: "usr"
            }
            const dataBaseManager = new DatabaseManager();
            await dataBaseManager.connect(options);
        });

        it("should connect with complete options", async () => {
            connectRetryStub.returns(null);
            const options: ConnectionOptions = {
                database: "test",
                host: "localhost",
                password: "pwd",
                port: 666,
                sslMode: true,
                user: "usr",
                certPath: "bacon",
                useReadReplicas: true,
                readHosts: "a,b,c,d".split(","),
                writeHost: "xyz"
            }
            const dataBaseManager = new DatabaseManager();
            await dataBaseManager.connect(options);
        });

        it("should reject with invalid sslMode", async () => {
            connectRetryStub.returns(null);
            const options: ConnectionOptions = {
                database: "test",
                host: "localhost",
                password: "pwd",
                port: 666,
                sslMode: true,
                user: "usr"
            }
            const dataBaseManager = new DatabaseManager();
            try {
                await dataBaseManager.connect(options);
            } catch (exception) {
                chai.expect(exception.httpStatusCode).to.be.equal(500);
                chai.expect(exception.message).to.be.equal("certPath is mandatory when using sslMode");
            }
        });

        it("should reject with invalid useReadReplicas", async () => {
            connectRetryStub.returns(null);
            const options: ConnectionOptions = {
                database: "test",
                host: "localhost",
                password: "pwd",
                port: 666,
                sslMode: false,
                user: "usr",
                useReadReplicas: true
            }
            const dataBaseManager = new DatabaseManager();
            try {
                await dataBaseManager.connect(options);
            } catch (exception) {
                chai.expect(exception.httpStatusCode).to.be.equal(500);
                chai.expect(exception.message).to.be.equal("readHosts AND writeHost are mandatory when using useReadReplicas");
            }
        });

    });
});