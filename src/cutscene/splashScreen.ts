import { isValidValue } from "../utils/validityCheck"
import { CutsceneActionPlayerType } from "./cutsceneAction"
import { ResourceLocator, ResourceType } from "../resource/resourceHandler"

export interface SplashScreen {
    type: CutsceneActionPlayerType.SPLASH_SCREEN
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
                type: ResourceType.IMAGE,
                key: state.screenImageResourceKey,
            },
        ]
    },
}
