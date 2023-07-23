import {Config, ProcessVariables} from "./config";

export function getDevelopmentConfig(processVariables: ProcessVariables): Config {
    const KeyCodes = {
        "ctrl": 17,
        "x": 88,
    }

    return {
        environment: "development",
        SCREEN_WIDTH: 1280,
        SCREEN_HEIGHT: 720,
        KEYBOARD_SHORTCUTS: {
            NEXT_SQUADDIE: [KeyCodes.x, KeyCodes.ctrl]
        },
    };
}
