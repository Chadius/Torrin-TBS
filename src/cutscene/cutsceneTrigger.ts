export enum TriggeringEvent {
    MISSION_VICTORY = "MISSION_VICTORY",
    MISSION_DEFEAT = "MISSION_DEFEAT",
    START_OF_TURN = "START_OF_TURN",
    SQUADDIE_IS_INJURED = "SQUADDIE_IS_INJURED",
    SQUADDIE_IS_DEFEATED = "SQUADDIE_IS_DEFEATED",
}

export interface CutsceneTrigger {
    triggeringEvent: TriggeringEvent
    systemReactedToTrigger: boolean
    cutsceneId: string

    turn?: number
}

export const CutsceneTriggerService = {
    sanitize: (cutscene: CutsceneTrigger) => {
        if (!cutscene.triggeringEvent) {
            throw new Error("Cutscene triggeringEvent is undefined")
        }
        if (!cutscene.cutsceneId) {
            throw new Error("Cutscene cutsceneId is undefined")
        }
        cutscene.systemReactedToTrigger ||= false

        switch (cutscene.triggeringEvent) {
            case TriggeringEvent.SQUADDIE_IS_INJURED:
                return sanitizeSquaddieIsInjured(
                    cutscene as SquaddieIsInjuredTrigger
                )
            case TriggeringEvent.SQUADDIE_IS_DEFEATED:
                return sanitizeSquaddieIsDefeated(
                    cutscene as SquaddieIsDefeatedTrigger
                )
            default:
                return cutscene
        }
    },
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
    battleSquaddieIds: string[]
}

const sanitizeSquaddieIsInjured = (cutscene: SquaddieIsInjuredTrigger) => {
    cutscene.battleSquaddieIds = cutscene.battleSquaddieIds ?? []
}

export interface SquaddieIsDefeatedTrigger extends CutsceneTrigger {
    readonly triggeringEvent: TriggeringEvent.SQUADDIE_IS_DEFEATED
    cutsceneId: string
    systemReactedToTrigger: boolean
    minimumTurns?: number
    maximumTurns?: number
    battleSquaddieIds: string[]
    squaddieTemplateIds: string[]
}

const sanitizeSquaddieIsDefeated = (cutscene: SquaddieIsDefeatedTrigger) => {
    cutscene.battleSquaddieIds = cutscene.battleSquaddieIds ?? []
    cutscene.squaddieTemplateIds = cutscene.squaddieTemplateIds ?? []
}
