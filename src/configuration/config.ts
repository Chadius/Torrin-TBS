import { getDevelopmentConfig } from "./configDevelopment"
import { getProductionConfig } from "./configProduction"
import { KeyButtonName } from "../utils/keyboardConfig"
import { MouseButton } from "../utils/mouseConfig"

export type Environment = "production" | "development"

export interface Config {
    environment: Environment
    SCREEN_WIDTH: number
    SCREEN_HEIGHT: number
    KEYBOARD_SHORTCUTS: { [key in KeyButtonName]?: number[] }
    STARTUP_MODE: string
    HUD: string
    MOUSE_BUTTON_BINDINGS: { [key in MouseButton]?: string }
    LOG_MESSAGES: boolean
}

export enum BATTLE_HUD_MODE {
    BATTLE_SQUADDIE_SELECTED_HUD = "BATTLE_SQUADDIE_SELECTED_HUD",
    BATTLE_HUD_PANEL = "BATTLE_HUD_PANEL",
}

export interface ProcessVariables {
    ENV?: Environment
    SCREEN_WIDTH?: number
    SCREEN_HEIGHT?: number
    KEYBOARD_SHORTCUTS?: { [key in string]: number[] }
    STARTUP_MODE?: string
    HUD?: BATTLE_HUD_MODE
    MOUSE_BUTTON_BINDINGS?: { [key in MouseButton]?: string }
    LOG_MESSAGES?: boolean
}

export const config = getConfig(
    process.env.NODE_ENV as unknown as ProcessVariables
)

export function getConfig(processVariables: ProcessVariables): Config {
    const environment: Environment = processVariables.ENV || "development"
    switch (environment) {
        case "production":
            return getProductionConfig(processVariables)
        case "development":
            return getDevelopmentConfig(processVariables)
    }
}
