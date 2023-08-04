import {Config, ProcessVariables} from "./config";

export function getProductionConfig(processVariables: ProcessVariables): Config {
    const KeyCodes = {
        "ctrl": 17,
        "x": 88,
    }

    return {
        environment: "production",
        SCREEN_WIDTH: 1280,
        SCREEN_HEIGHT: 720,
        KEYBOARD_SHORTCUTS: {
            NEXT_SQUADDIE: [KeyCodes.x, KeyCodes.ctrl]
        },
        STARTUP_MODE: "TITLE_SCREEN",
    };
}
