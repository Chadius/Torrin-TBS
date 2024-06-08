export enum TriggeringEvent {
    MISSION_VICTORY = "MISSION_VICTORY",
    MISSION_DEFEAT = "MISSION_DEFEAT",
    START_OF_TURN = "START_OF_TURN",
    SQUADDIE_IS_INJURED = "SQUADDIE_IS_INJURED",
}

export interface CutsceneTrigger {
    triggeringEvent: TriggeringEvent
    systemReactedToTrigger: boolean
    cutsceneId: string

    turn?: number
}

export interface MissionDefeatCutsceneTrigger extends CutsceneTrigger {
    readonly triggeringEvent: TriggeringEvent.MISSION_DEFEAT
    systemReactedToTrigger: boolean
    cutsceneId: string
}

export interface SquaddieIsInjuredTrigger extends CutsceneTrigger {
    readonly triggeringEvent: TriggeringEvent.SQUADDIE_IS_INJURED
    cutsceneId: string
    systemReactedToTrigger: boolean
    minimumTurns?: number
    maximumTurns?: number
    battleSquaddieIdsToCheckForInjury: string[]
}
