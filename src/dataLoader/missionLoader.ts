import {MissionObjective} from "../battle/missionResult/missionObjective";
import {LoadFileIntoFormat} from "./dataLoader";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {TeamStrategy} from "../battle/teamStrategy/teamStrategy";

export interface MapPlacement {
    battleSquaddieId: string,
    location: HexCoordinate,
    squaddieTemplateId: string,
}

export interface NpcTeam {
    name: string,
    battleSquaddieIds: string[]
    strategies: TeamStrategy[],
}

export interface MissionFileFormat {
    id: string,
    terrain: string[],
    objectives: MissionObjective[],
    enemy: {
        templateIds: string[],
        mapPlacements: MapPlacement[],
        teams: NpcTeam[],
    },
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
