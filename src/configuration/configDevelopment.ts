import { BATTLE_HUD_MODE, Config, ProcessVariables } from "./config"
import { getValidValueOrDefault } from "../utils/validityCheck"

export function getDevelopmentConfig(
    processVariables: ProcessVariables
): Config {
    const KeyCodes = {
        ctrl: 17,
        x: 88,
        enter: 13,
        c: 67,
        backspace: 8,
        delete: 46,
        escape: 27,
    }

    return {
        environment: "development",
        SCREEN_WIDTH: 1280,
        SCREEN_HEIGHT: 720,
        KEYBOARD_SHORTCUTS: {
            NEXT_SQUADDIE: [KeyCodes.x, KeyCodes.ctrl],
            ACCEPT: [KeyCodes.enter],
            SWAP_HUD: [KeyCodes.c],
            CANCEL: [KeyCodes.backspace, KeyCodes.delete, KeyCodes.escape],
        },
        MOUSE_BUTTON_BINDINGS: {
            ACCEPT: "left",
            INFO: "center",
            CANCEL: "right",
        },
        STARTUP_MODE: "TITLE_SCREEN",
        HUD: getValidValueOrDefault(
            processVariables.HUD,
            BATTLE_HUD_MODE.BATTLE_SQUADDIE_SELECTED_HUD
        ),
        LOG_MESSAGES: false,
    }
}
