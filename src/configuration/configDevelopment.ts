import {Config, ProcessVariables} from "./config";

export function getDevelopmentConfig(processVariables: ProcessVariables): Config {
    return {
        environment: "development",
        SCREEN_WIDTH: 1280,
        SCREEN_HEIGHT: 720,
    };
}