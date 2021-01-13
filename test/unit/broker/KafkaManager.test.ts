import * as chai from "chai";
import * as path from "path";
import * as sinon from "sinon";
import { Logger } from "ts-log-debug";
import { BrokerOptions, KafkaManager, Loggers } from "../../../src";

describe("KafkaManager", () => {

    const sandbox = sinon.createSandbox();
    let createProducerStub: sinon.SinonStub;

    beforeEach(() => {
        const logger = new Logger();
        sandbox.stub(logger, "debug");
        sandbox.stub(logger, "info");
        sandbox.stub(logger, "error");
        sandbox.stub(Loggers, "getLogger").returns(logger);
        createProducerStub = sandbox.stub(KafkaManager, <any>"createProducer");
    });

    afterEach(() => {
        sandbox.restore();
    })

    describe("connect", () => {

        it("should connect with valid options", async () => {
            createProducerStub.resolves(undefined);
            const options: BrokerOptions = {
                hosts: ["bacon:9092"],
                sslMode: false,
                clientId: "egg"
            };
            await KafkaManager.connect(options);
        });

        it("should connect with complete options", async () => {
            createProducerStub.resolves(undefined);
            const options: BrokerOptions = {
                hosts: ["bacon:9092", "toast:9093"],
                sslMode: true,
                clientId: "egg",
                authenticationTimeout: 5000,
                connectionTimeout: 3000,
                ca: path.normalize(`${__filename}`),
                cert: path.normalize(`${__filename}`),
                key: path.normalize(`${__filename}`)
            };
            await KafkaManager.connect(options);
        });

        it("should reject with empy hosts", async () => {
            createProducerStub.resolves(undefined);
            const options: BrokerOptions = {
                hosts: [],
                sslMode: false,
                clientId: "egg"
            };
            try {
                await KafkaManager.connect(options);
            } catch (exception) {
                chai.expect(exception.httpStatusCode).to.be.equal(500);
                chai.expect(exception.message).to.be.equal("At least one host is mandatory to connect somewhere");
            }
        });

        it("should reject with hosts without port", async () => {
            createProducerStub.resolves(undefined);
            const options: BrokerOptions = {
                hosts: ["bacon"],
                sslMode: false,
                clientId: "egg"
            };
            try {
                await KafkaManager.connect(options);
            } catch (exception) {
                chai.expect(exception.httpStatusCode).to.be.equal(500);
                chai.expect(exception.message).to.be.equal("Host must be set with its port. Sample: localhost:9092");
            }
        });

        it("should reject with invalid sslMode", async () => {
            createProducerStub.resolves(undefined);
            const options: BrokerOptions = {
                hosts: ["bacon:9092", "toast:9093"],
                sslMode: true,
                clientId: "egg",
                authenticationTimeout: 5000,
                connectionTimeout: 3000,
                key: path.normalize(`${__filename}`)
            };
            try {
                await KafkaManager.connect(options);
            } catch (exception) {
                chai.expect(exception.httpStatusCode).to.be.equal(500);
                chai.expect(exception.message).to.be.equal("You have to define 'options.ca', 'options.cert' and 'options.key' when using sslMode");
            }
        });

    });
});