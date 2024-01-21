import {TODODeleteMeCutscene} from "../../cutscene/cutscene";
import {ResourceHandler} from "../../resource/resourceHandler";

export const DEFAULT_VICTORY_CUTSCENE_ID = "default_victory";
export const DEFAULT_DEFEAT_CUTSCENE_ID = "default_defeat";

export interface MissionCutsceneCollection {
    cutsceneById: {
        [id: string]: TODODeleteMeCutscene
    }
}

export const MissionCutsceneCollectionHelper = {
    new: ({
              cutsceneById,
          }: {
              cutsceneById: {
                  [id: string]: TODODeleteMeCutscene
              },
          }
    ): MissionCutsceneCollection => {
        const newCollection: MissionCutsceneCollection = {
            cutsceneById,
        }
        if (!(DEFAULT_VICTORY_CUTSCENE_ID in newCollection.cutsceneById)) {
            newCollection.cutsceneById[DEFAULT_VICTORY_CUTSCENE_ID] = new TODODeleteMeCutscene({});
        }
        return newCollection;
    }
};
