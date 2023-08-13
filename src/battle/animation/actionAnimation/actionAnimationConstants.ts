export const ACTION_ANIMATION_DELAY_TIME = 500;
export const ACTION_ANIMATION_ATTACK_TIME = 1500;
export const ACTION_ANIMATION_FINISH_TIME = 2000;
export const ActionAnimationFontColor = [0, 5, 10];

export const TimeElapsedSinceAnimationStarted = (animationStartTime: number) => Math.min(
    Date.now() - animationStartTime,
    (ACTION_ANIMATION_DELAY_TIME + ACTION_ANIMATION_ATTACK_TIME + ACTION_ANIMATION_FINISH_TIME)
);

export enum ActionAnimationPhase{
    INITIALIZED = "INITIALIZED",
    BEFORE_ACTION = "BEFORE_ACTION",
    DURING_ACTION = "DURING_ACTION",
    AFTER_ACTION = "AFTER_ACTION",
    FINISHED_SHOWING_RESULTS = "FINISHED_SHOWING_RESULTS",
}
