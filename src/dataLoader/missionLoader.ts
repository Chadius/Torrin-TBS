import {MissionObjective} from "../battle/missionResult/missionObjective";
import {LoadFileIntoFormat} from "./dataLoader";

export interface MissionFileFormat {
    id: string,
    terrain: string[],
    objectives: MissionObjective[],
}

export const LoadMissionFromFile = async (missionId: string): Promise<MissionFileFormat> => {
    try {
        return await LoadFileIntoFormat<MissionFileFormat>(`assets/mission/${missionId}.json`);
    } catch (e) {
        console.error("Error while loading mission from file");
        console.error(e);
        return undefined;
    }
}
