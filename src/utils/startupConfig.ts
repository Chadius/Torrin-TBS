import {config} from "../configuration/config";
import {KeyButtonName} from "./keyboardConfig";

export enum StartupModeEnum {
    UNKNOWN = "UNKNOWN",
    TITLE_SCREEN = "TITLE_SCREEN",
    BATTLE = "BATTLE",
}

export const StartupMode = config.STARTUP_MODE as StartupModeEnum;
