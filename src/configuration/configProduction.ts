import {BATTLE_HUD_MODE, Config, ProcessVariables} from "./config";
import {getValidValueOrDefault} from "../utils/validityCheck";

export function getProductionConfig(processVariables: ProcessVariables): Config {
    const KeyCodes = {
        "ctrl": 17,
        "x": 88,
        "enter": 13,
    }

    return {
        environment: "production",
        SCREEN_WIDTH: 1280,
        SCREEN_HEIGHT: 720,
        KEYBOARD_SHORTCUTS: {
            NEXT_SQUADDIE: [KeyCodes.x, KeyCodes.ctrl],
            ACCEPT: [KeyCodes.enter],
        },
        STARTUP_MODE: "TITLE_SCREEN",
        HUD: getValidValueOrDefault(processVariables.HUD, BATTLE_HUD_MODE.BATTLE_SQUADDIE_SELECTED_HUD),
    };
}
