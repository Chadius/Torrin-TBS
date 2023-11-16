import {config} from "../configuration/config";

export enum GameModeEnum {
    UNKNOWN = "UNKNOWN",
    TITLE_SCREEN = "TITLE_SCREEN",
    BATTLE = "BATTLE",
    LOADING_BATTLE = "LOADING_BATTLE",
}

export const StartupMode = config.STARTUP_MODE as GameModeEnum;
