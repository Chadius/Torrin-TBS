import {MissionObjective, MissionObjectiveHelper} from "../battle/missionResult/missionObjective";
import {LoadFileIntoFormat} from "./dataLoader";
import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";
import {TeamStrategy} from "../battle/teamStrategy/teamStrategy";
import {PlayerArmy, PlayerArmyHelper} from "../campaign/playerArmy";
import {SquaddieDeployment, SquaddieDeploymentHelper} from "../missionMap/squaddieDeployment";
import {isValidValue} from "../utils/validityCheck";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";

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
    iconResourceKey: string,
}

export interface MissionFileFormat {
    id: string,
    terrain: string[],
    objectives: MissionObjective[],
    player: {
        deployment: SquaddieDeployment,
        teamId: string,
        teamName: string,
        iconResourceKey: string,
    },
    enemy: {
        templateIds: string[],
        mapPlacements: MapPlacement[],
        teams: NpcTeam[],
    },
    phaseBannersByAffiliation: { [affiliation in SquaddieAffiliation]?: string },
}

export const MissionFileFormatHelper = {
    new: ({
              id,
              terrain,
              objectives,
              player,
              enemy,
              phaseBannersByAffiliation,
          }: {
        id: string,
        terrain?: string[],
        objectives?: MissionObjective[],
        player?: {
            deployment: SquaddieDeployment,
            teamId: string,
            teamName: string,
            iconResourceKey: string,
        },
        enemy?: {
            templateIds: string[],
            mapPlacements: MapPlacement[],
            teams: NpcTeam[],
        },
        phaseBannersByAffiliation?: { [affiliation in SquaddieAffiliation]?: string },
    }): MissionFileFormat => {
        const data = {
            id,
            terrain,
            objectives,
            player,
            enemy,
            phaseBannersByAffiliation,
        };
        sanitize(data);
        return data;
    },
    sanitize: (data: MissionFileFormat): MissionFileFormat => {
        return sanitize(data);
    },
};

const sanitize = (data: MissionFileFormat): MissionFileFormat => {
    if (!isValidValue(data.id)) {
        throw new Error('cannot sanitize mission file, missing id');
    }

    if (!isValidValue(data.player)) {
        throw new Error('cannot sanitize mission file, missing player');
    }

    if (isValidValue(data.player)) {
        if (!isValidValue(data.player.teamId)) {
            throw new Error('cannot sanitize mission file, missing player teamId');
        }

        if (!isValidValue(data.player.teamName)) {
            throw new Error('cannot sanitize mission file, missing player teamName');
        }

        if (!isValidValue(data.player.deployment)) {
            data.player.deployment = SquaddieDeploymentHelper.default();
        }
    }

    data.terrain = isValidValue(data.terrain) ? data.terrain : ["1 "];
    data.objectives = isValidValue(data.objectives) ? data.objectives.map(obj => MissionObjectiveHelper.validateMissionObjective(obj)) : [];
    data.enemy = isValidValue(data.enemy) ? data.enemy : {
        templateIds: [],
        mapPlacements: [],
        teams: [],
    };
    data.phaseBannersByAffiliation = isValidValue(data.phaseBannersByAffiliation)
        ? data.phaseBannersByAffiliation
        : {};

    return data;
}

export const LoadMissionFromFile = async (missionId: string): Promise<MissionFileFormat> => {
    try {
        const missionData: MissionFileFormat = await LoadFileIntoFormat<MissionFileFormat>(`assets/mission/${missionId}.json`);
        return sanitize(missionData);
    } catch (e) {
        console.error("Error while loading mission from file");
        console.error(e);
        return undefined;
    }
}

export const LoadPlayerArmyFromFile = async (): Promise<PlayerArmy> => {
    try {
        const army: PlayerArmy = await LoadFileIntoFormat<PlayerArmy>(`assets/playerArmy/playerArmy.json`);
        return PlayerArmyHelper.sanitize(army);
    } catch (e) {
        console.error("Error while loading player army from file");
        console.error(e);
        return undefined;
    }
}
