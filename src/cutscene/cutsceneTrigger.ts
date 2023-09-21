export enum TriggeringEvent {
    MISSION_VICTORY = "MISSION_VICTORY",
    MISSION_DEFEAT = "MISSION_DEFEAT",
    START_OF_TURN = "START_OF_TURN",
}

export interface CutsceneTrigger {
    get triggeringEvent(): TriggeringEvent;

    get systemReactedToTrigger(): boolean;

    set systemReactedToTrigger(reacted: boolean);

    get cutsceneId(): string;

    set cutsceneId(id: string);
}

export class MissionDefeatCutsceneTrigger implements CutsceneTrigger {
    private readonly _cutsceneId: string;

    constructor({cutsceneId}: { cutsceneId: string }) {
        this._cutsceneId = cutsceneId;
    }

    private _systemReactedToTrigger: boolean;

    get systemReactedToTrigger(): boolean {
        return this._systemReactedToTrigger;
    }

    set systemReactedToTrigger(reacted: boolean) {
        this._systemReactedToTrigger = reacted;
    }

    get cutsceneId(): string {
        return this._cutsceneId;
    }

    get triggeringEvent(): TriggeringEvent {
        return TriggeringEvent.MISSION_DEFEAT;
    }
}
