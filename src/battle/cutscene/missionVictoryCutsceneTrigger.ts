import {
    CutsceneTrigger,
    TriggeringEvent,
} from "../../cutscene/cutsceneTrigger"

export class MissionVictoryCutsceneTrigger implements CutsceneTrigger {
    public readonly triggeringEvent: TriggeringEvent.MISSION_VICTORY
    public systemReactedToTrigger: boolean
    public cutsceneId: string
}
