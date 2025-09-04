import { isValidValue } from "../utils/objectValidityCheck"
import {
    CutsceneActionPlayerType,
    TCutsceneActionPlayerType,
} from "./cutsceneAction"
import { ResourceLocator, Resource } from "../resource/resourceHandler"

export interface SplashScreen {
    type: TCutsceneActionPlayerType
    id: string
    screenImageResourceKey: string
    animationDuration?: number
    backgroundColor?: [number, number, number]
}

export const SplashScreenService = {
    new: ({
        id,
        screenImageResourceKey,
        animationDuration,
        backgroundColor,
    }: {
        id: string
        screenImageResourceKey: string
        animationDuration?: number
        backgroundColor?: [number, number, number]
    }): SplashScreen => {
        return {
            type: CutsceneActionPlayerType.SPLASH_SCREEN,
            id,
            screenImageResourceKey,
            animationDuration:
                isValidValue(animationDuration) || animationDuration === 0
                    ? animationDuration
                    : 0,
            backgroundColor,
        }
    },
    getResourceLocators: (state: SplashScreen): ResourceLocator[] => {
        return [
            {
                type: Resource.IMAGE,
                key: state.screenImageResourceKey,
            },
        ]
    },
}
