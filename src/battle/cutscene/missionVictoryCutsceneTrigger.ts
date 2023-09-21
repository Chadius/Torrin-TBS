import {CutsceneTrigger, TriggeringEvent} from "../../cutscene/cutsceneTrigger";

export class MissionVictoryCutsceneTrigger implements CutsceneTrigger {
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
        return TriggeringEvent.MISSION_VICTORY;
    }
}
