import {Config, ProcessVariables} from "./config";

export function getProductionConfig(processVariables: ProcessVariables): Config {
    return {
        environment: "production",
        SCREEN_WIDTH: 1280,
        SCREEN_HEIGHT: 720,
    };
}