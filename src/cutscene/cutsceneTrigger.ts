export enum TriggeringEvent {
    MISSION_VICTORY = "MISSION_VICTORY",
    MISSION_DEFEAT = "MISSION_DEFEAT",
    START_OF_TURN = "START_OF_TURN",
}

export interface CutsceneTrigger {
    triggeringEvent: TriggeringEvent;
    systemReactedToTrigger: boolean;
    cutsceneId: string;

    turn?: number;
}

export class MissionDefeatCutsceneTrigger implements CutsceneTrigger {
    public readonly triggeringEvent: TriggeringEvent.MISSION_DEFEAT;
    public systemReactedToTrigger: boolean;
    public cutsceneId: string;
}
