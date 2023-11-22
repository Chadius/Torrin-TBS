import {Cutscene} from "../../cutscene/cutscene";

export const DEFAULT_VICTORY_CUTSCENE_ID = "default_victory";
export const DEFAULT_DEFEAT_CUTSCENE_ID = "default_defeat";

export interface MissionCutsceneCollection {
    cutsceneById: {
        [id: string]: Cutscene
    }
}

export const MissionCutsceneCollectionHelper = {
    new: ({cutsceneById}: {
              cutsceneById: {
                  [id: string]: Cutscene
              }
          }
    ): MissionCutsceneCollection => {
        const newCollection: MissionCutsceneCollection = {
            cutsceneById,
        }
        if (!(DEFAULT_VICTORY_CUTSCENE_ID in newCollection.cutsceneById)) {
            newCollection.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID] = new Cutscene({});
        }
        return newCollection;
    }
};
