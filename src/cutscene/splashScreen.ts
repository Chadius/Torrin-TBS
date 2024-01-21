import {isValidValue} from "../utils/validityCheck";
import {CutsceneActionPlayerType} from "./cutsceneAction";
import {ResourceLocator, ResourceType} from "../resource/resourceHandler";

export interface SplashScreen {
    type: CutsceneActionPlayerType.SPLASH_SCREEN,
    id: string;
    screenImageResourceKey: string;
    animationDuration?: number;
}

export const SplashScreenService = {
    new: ({
              id,
              screenImageResourceKey,
              animationDuration,
          }: {
        id: string;
        screenImageResourceKey: string;
        animationDuration?: number;
    }): SplashScreen => {
        return {
            type: CutsceneActionPlayerType.SPLASH_SCREEN,
            id,
            screenImageResourceKey,
            animationDuration: isValidValue(animationDuration) || animationDuration === 0
                ? animationDuration
                : 0,
        }
    },
    getResourceLocators: (state: SplashScreen): ResourceLocator[] => {
        return [
            {
                type: ResourceType.IMAGE,
                key: state.screenImageResourceKey,
            }
        ]
    },
}
