export const ACTION_ANIMATION_BEFORE_ACTION_TIME = 500
export const ACTION_ANIMATION_ACTION_TIME = 500
export const ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME = 500
export const ACTION_ANIMATION_SHOW_RESULTS_TIME = 2000
export const ActionAnimationFontColor = [0, 5, 10]

export const TimeElapsedSinceAnimationStarted = (animationStartTime: number) =>
    Math.min(
        Date.now() - animationStartTime,
        ACTION_ANIMATION_BEFORE_ACTION_TIME +
            ACTION_ANIMATION_ACTION_TIME +
            ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME +
            ACTION_ANIMATION_SHOW_RESULTS_TIME
    )

export const ActionAnimationPhase = {
    INITIALIZED: "INITIALIZED",
    BEFORE_ACTION: "BEFORE_ACTION",
    DURING_ACTION: "DURING_ACTION",
    TARGET_REACTS: "TARGET_REACTS",
    SHOWING_RESULTS: "SHOWING_RESULTS",
    FINISHED_SHOWING_RESULTS: "FINISHED_SHOWING_RESULTS",
} as const satisfies Record<string, string>
export type TActionAnimationPhase = EnumLike<typeof ActionAnimationPhase>

export const SquaddieEmotion = {
    NEUTRAL: "NEUTRAL",
    ATTACK: "ATTACK",
    TARGETED: "TARGETED",
    DAMAGED: "DAMAGED",
    DEAD: "DEAD",
    ASSISTING: "ASSISTING",
    THANKFUL: "THANKFUL",
} as const satisfies Record<string, string>
export type TSquaddieEmotion = EnumLike<typeof SquaddieEmotion>
