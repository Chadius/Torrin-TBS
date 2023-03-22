import {getDevelopmentConfig} from "./configDevelopment";
import {getProductionConfig} from "./configProduction";

export type Environment =
    | "production"
    | "development";

export interface Config {
    environment: Environment;
    SCREEN_WIDTH: number;
    SCREEN_HEIGHT: number;
}

export interface ProcessVariables {
    ENV?: Environment;
    SCREEN_WIDTH?: number;
    SCREEN_HEIGHT?: number;
}

export const config = getConfig(process.env.NODE_ENV as unknown as ProcessVariables)

export function getConfig(processVariables: ProcessVariables): Config {
    const environment: Environment = processVariables.ENV || "development";
    switch (environment) {
        case "production":
            return getProductionConfig(processVariables);
        case "development":
            return getDevelopmentConfig(processVariables);
    }
}