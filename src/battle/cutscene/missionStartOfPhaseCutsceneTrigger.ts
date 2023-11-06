import {CutsceneTrigger, TriggeringEvent} from "../../cutscene/cutsceneTrigger";

export class MissionStartOfPhaseCutsceneTrigger implements CutsceneTrigger {
    public readonly triggeringEvent: TriggeringEvent.START_OF_TURN;
    public systemReactedToTrigger: boolean;
    public cutsceneId: string;

    public turn: number;
}
