import {MissionObjective} from "../battle/missionResult/missionObjective";
import {LoadFileIntoFormat} from "./dataLoader";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {TeamStrategy} from "../battle/teamStrategy/teamStrategy";
import {PlayerArmy} from "../campaign/playerArmy";
import {SquaddieDeployment} from "../missionMap/squaddieDeployment";

export interface MapPlacement {
    battleSquaddieId: string,
    location: HexCoordinate,
    squaddieTemplateId: string,
}

export interface NpcTeam {
    id: string,
    name: string,
    battleSquaddieIds: string[]
    strategies: TeamStrategy[],
}

export interface MissionFileFormat {
    id: string,
    terrain: string[],
    objectives: MissionObjective[],
    player: {
        deployment: SquaddieDeployment,
        teamId: string,
        teamName: string,
    },
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

export const LoadPlayerArmyFromFile = async (): Promise<PlayerArmy> => {
    try {
        return await LoadFileIntoFormat<PlayerArmy>(`assets/playerArmy/playerArmy.json`);
    } catch (e) {
        console.error("Error while loading player army from file");
        console.error(e);
        return undefined;
    }
}
