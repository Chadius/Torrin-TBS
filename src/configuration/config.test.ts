import {getConfig} from "./config";

jest.mock("./configDevelopment.ts", () => ({
    getDevelopmentConfig: () => ({environment: "development"}),
}));
jest.mock("./configProduction.ts", () => ({
    getProductionConfig: () => ({environment: "production"}),
}));

describe("configuration by process environment", () => {
    it("defaults to the development environment", () => {
        expect(getConfig({})).toHaveProperty("environment", "development");
    });

    it("returns the development config for a development environment", () => {
        expect(getConfig({ENV: "development"})).toHaveProperty("environment", "development");
    });

    it("returns the production config for a production environment", () => {
        expect(getConfig({ENV: "production"})).toHaveProperty(
            "environment",
            "production"
        );
    });
});
