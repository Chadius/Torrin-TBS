import {
    MissionObjective,
    MissionObjectiveHelper,
} from "../battle/missionResult/missionObjective"
import { LoadFileIntoFormat } from "./dataLoader"
import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"
import { TeamStrategy } from "../battle/teamStrategy/teamStrategy"
import { PlayerArmy, PlayerArmyHelper } from "../campaign/playerArmy"
import {
    SquaddieDeployment,
    SquaddieDeploymentService,
} from "../missionMap/squaddieDeployment"
import { getValidValueOrDefault, isValidValue } from "../utils/validityCheck"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import { CutsceneTrigger } from "../cutscene/cutsceneTrigger"
import { Cutscene } from "../cutscene/cutscene"

export interface MapPlacement {
    battleSquaddieId: string
    coordinate: HexCoordinate
    squaddieTemplateId: string
}

export interface NpcTeam {
    id: string
    name: string
    battleSquaddieIds: string[]
    strategies: TeamStrategy[]
    iconResourceKey: string
}

export interface NpcTeamMissionDeployment {
    templateIds: string[]
    mapPlacements: MapPlacement[]
    teams: NpcTeam[]
}

export const NpcTeamMissionDeploymentService = {
    new: (): NpcTeamMissionDeployment => {
        return {
            templateIds: [],
            mapPlacements: [],
            teams: [],
        }
    },
}

export interface MissionFileFormat {
    id: string
    terrain: string[]
    objectives: MissionObjective[]
    player: {
        deployment: SquaddieDeployment
        teamId: string
        teamName: string
        iconResourceKey: string
    }
    npcDeployments: {
        enemy?: NpcTeamMissionDeployment
        ally?: NpcTeamMissionDeployment
        noAffiliation?: NpcTeamMissionDeployment
    }
    phaseBannersByAffiliation: { [affiliation in SquaddieAffiliation]?: string }
    cutscene: {
        cutsceneTriggers: CutsceneTrigger[]
        cutsceneById: { [id: string]: Cutscene }
    }
}

export const MissionFileFormatService = {
    new: ({
        id,
        terrain,
        objectives,
        player,
        npcDeployments,
        phaseBannersByAffiliation,
    }: {
        id: string
        terrain?: string[]
        objectives?: MissionObjective[]
        player: {
            deployment: SquaddieDeployment
            teamId: string
            teamName: string
            iconResourceKey: string
        }
        npcDeployments?: {
            enemy: NpcTeamMissionDeployment
            ally: NpcTeamMissionDeployment
            noAffiliation: NpcTeamMissionDeployment
        }
        phaseBannersByAffiliation?: {
            [affiliation in SquaddieAffiliation]?: string
        }
    }): MissionFileFormat => {
        const data: MissionFileFormat = {
            id,
            terrain,
            objectives,
            player,
            npcDeployments,
            phaseBannersByAffiliation,
            cutscene: {
                cutsceneTriggers: [],
                cutsceneById: {},
            },
        }
        sanitize(data)
        return data
    },
    sanitize: (data: MissionFileFormat): MissionFileFormat => {
        return sanitize(data)
    },
}

const sanitize = (data: MissionFileFormat): MissionFileFormat => {
    if (!isValidValue(data.id)) {
        throw new Error("cannot sanitize mission file, missing id")
    }

    sanitizePlayerData(data)
    sanitizeCutscenes(data)

    data.terrain = getValidValueOrDefault(data.terrain, ["1 "])
    data.objectives = isValidValue(data.objectives)
        ? data.objectives.map((obj) =>
              MissionObjectiveHelper.validateMissionObjective(obj)
          )
        : []

    data.npcDeployments = getValidValueOrDefault(data.npcDeployments, {})
    data.npcDeployments.enemy = getValidValueOrDefault(
        data.npcDeployments?.enemy,
        NpcTeamMissionDeploymentService.new()
    )
    data.npcDeployments.ally = getValidValueOrDefault(
        data.npcDeployments?.ally,
        NpcTeamMissionDeploymentService.new()
    )
    data.npcDeployments.noAffiliation = getValidValueOrDefault(
        data.npcDeployments?.noAffiliation,
        NpcTeamMissionDeploymentService.new()
    )

    data.phaseBannersByAffiliation = getValidValueOrDefault(
        data.phaseBannersByAffiliation,
        {}
    )

    return data
}

const sanitizePlayerData = (data: MissionFileFormat) => {
    if (!isValidValue(data.player)) {
        throw new Error("cannot sanitize mission file, missing player")
    }

    if (!isValidValue(data.player.teamId)) {
        throw new Error("cannot sanitize mission file, missing player teamId")
    }

    if (!isValidValue(data.player.teamName)) {
        throw new Error("cannot sanitize mission file, missing player teamName")
    }

    if (!isValidValue(data.player.deployment)) {
        data.player.deployment = SquaddieDeploymentService.default()
    }
}
const sanitizeCutscenes = (data: MissionFileFormat) => {
    if (!isValidValue(data.cutscene)) {
        data.cutscene = {
            cutsceneById: {},
            cutsceneTriggers: [],
        }
    }

    if (!isValidValue(data.cutscene.cutsceneById)) {
        data.cutscene.cutsceneById = {}
    }

    if (!isValidValue(data.cutscene.cutsceneTriggers)) {
        data.cutscene.cutsceneTriggers = []
    }
}

export const LoadMissionFromFile = async (
    campaignId: string,
    missionId: string
): Promise<MissionFileFormat> => {
    try {
        const missionData: MissionFileFormat =
            await LoadFileIntoFormat<MissionFileFormat>(
                `assets/campaign/${campaignId}/missions/${missionId}.json`
            )
        return sanitize(missionData)
    } catch (e) {
        console.error("Error while loading mission from file")
        console.error(e)
        return undefined
    }
}

export const LoadPlayerArmyFromFile = async (): Promise<PlayerArmy> => {
    try {
        const army: PlayerArmy = await LoadFileIntoFormat<PlayerArmy>(
            `assets/playerArmy/playerArmy.json`
        )
        return PlayerArmyHelper.sanitize(army)
    } catch (e) {
        console.error("Error while loading player army from file")
        console.error(e)
        return undefined
    }
}
