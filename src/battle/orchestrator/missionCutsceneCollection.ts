import {Cutscene} from "../../cutscene/cutscene";

export const DEFAULT_VICTORY_CUTSCENE_ID = "default_victory";

export class MissionCutsceneCollection {
    private readonly _cutsceneById: {
        [id: string]: Cutscene
    }

    constructor({cutsceneById}: {
        cutsceneById: { [id: string]: Cutscene }
    }) {
        if (cutsceneById) {
            this._cutsceneById = {...cutsceneById};
        } else {
            this._cutsceneById = {};
        }

        this.createDefaultCutscenes();
    }

    get cutsceneById(): { [p: string]: Cutscene } {
        return this._cutsceneById;
    }

    private createDefaultCutscenes() {
        if (!(DEFAULT_VICTORY_CUTSCENE_ID in this.cutsceneById)) {
            this.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID] = new Cutscene({});
        }
    }
}