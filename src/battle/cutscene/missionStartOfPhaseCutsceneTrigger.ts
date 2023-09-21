import {CutsceneTrigger, TriggeringEvent} from "../../cutscene/cutsceneTrigger";

export class MissionStartOfPhaseCutsceneTrigger implements CutsceneTrigger {
    private readonly _cutsceneId: string;
    private readonly _phase: number;

    constructor({cutsceneId, turn}: { cutsceneId: string, turn: number }) {
        this._cutsceneId = cutsceneId;
        this._phase = turn;
    }

    get phase(): number {
        return this._phase;
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
        return TriggeringEvent.START_OF_TURN;
    }
}
