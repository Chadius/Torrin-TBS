export interface SplashScreen {
    id: string;
    screenImageResourceKey: string;
    animationDuration: number;
}

export const SplashScreenService = {
    new: ({
              id,
              screenImageResourceKey,
              animationDuration,
          }:{
        id: string;
        screenImageResourceKey: string;
        animationDuration?: number;
    }): SplashScreen => {
        // TODO sanitize
        return {
            id,
            screenImageResourceKey,
            animationDuration: animationDuration || 0,
        }
    }
}
