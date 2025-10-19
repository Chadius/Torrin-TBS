import {
    MissionObjective,
    MissionObjectiveService,
} from "../battle/missionResult/missionObjective"
import { LoadFileIntoFormat } from "./dataLoader"
import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"
import { TeamStrategy } from "../battle/teamStrategy/teamStrategy"
import { PlayerArmy, PlayerArmyService } from "../campaign/playerArmy"
import {
    SquaddieDeployment,
    SquaddieDeploymentService,
} from "../missionMap/squaddieDeployment"
import { isValidValue } from "../utils/objectValidityCheck"
import { TSquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import { Cutscene, CutsceneService } from "../cutscene/cutscene"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../campaign/squaddieTemplate"
import { BattleEvent } from "../battle/event/battleEvent"

export interface MapPlacement {
    battleSquaddieId: string
    coordinate: HexCoordinate | undefined
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
    new: (p: Partial<NpcTeamMissionDeployment>): NpcTeamMissionDeployment => {
        return {
            templateIds: [...(p.templateIds ?? [])],
            mapPlacements: [...(p.mapPlacements ?? [])],
            teams: [...(p.teams ?? [])],
        }
    },
    null: (): NpcTeamMissionDeployment => {
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
    phaseBannersByAffiliation: {
        [affiliation in TSquaddieAffiliation]?: string
    }
    cutscene: {
        cutsceneById: { [id: string]: Cutscene }
    }
    battleEvents: BattleEvent[]
}

export const MissionFileFormatService = {
    new: ({
        id,
        terrain,
        objectives,
        player,
        npcDeployments,
        phaseBannersByAffiliation,
        battleEvents,
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
            [affiliation in TSquaddieAffiliation]?: string
        }
        battleEvents?: BattleEvent[]
    }): MissionFileFormat => {
        return sanitize({
            id,
            terrain,
            objectives,
            player,
            npcDeployments,
            phaseBannersByAffiliation,
            cutscene: {
                cutsceneById: {},
            },
            battleEvents,
        })
    },
    sanitize: (data: Partial<MissionFileFormat>): MissionFileFormat => {
        return sanitize(data)
    },
    getAllResourceKeys: (missionFileFormat: MissionFileFormat): string[] => {
        return [
            missionFileFormat.player.iconResourceKey,
            ...(missionFileFormat.npcDeployments.enemy?.teams.map(
                (t) => t.iconResourceKey
            ) ?? []),
            ...(missionFileFormat.npcDeployments.ally?.teams.map(
                (t) => t.iconResourceKey
            ) ?? []),
            ...(missionFileFormat.npcDeployments.noAffiliation?.teams.map(
                (t) => t.iconResourceKey
            ) ?? []),
            ...Object.values(
                missionFileFormat.phaseBannersByAffiliation
            ).filter((x) => x != undefined),
        ]
    },
    hydrateCutscenesFromLoadedData: (missionData: MissionFileFormat) => {
        missionData.cutscene.cutsceneById = Object.fromEntries(
            Object.entries(missionData.cutscene.cutsceneById).map(
                ([key, rawCutscene]) => {
                    const cutscene = CutsceneService.new(rawCutscene)
                    return [key, cutscene]
                }
            )
        )
    },
}

const sanitize = (data: Partial<MissionFileFormat>): MissionFileFormat => {
    if (data.id == undefined || !isValidValue(data.id)) {
        throw new Error(
            "[MissionFileFormatService.sanitize] cannot sanitize mission file, missing id"
        )
    }

    data = sanitizePlayerData(data)
    data = sanitizeCutscenes(data)

    data.terrain = data.terrain ?? ["1 "]
    data.objectives =
        isValidValue(data.objectives) && data.objectives != undefined
            ? data.objectives.map((obj) =>
                  MissionObjectiveService.validateMissionObjective(obj)
              )
            : []

    data.npcDeployments = data.npcDeployments ?? {}
    data.npcDeployments.enemy =
        data.npcDeployments?.enemy ?? NpcTeamMissionDeploymentService.null()

    data.npcDeployments.ally =
        data.npcDeployments?.ally ?? NpcTeamMissionDeploymentService.null()

    data.npcDeployments.noAffiliation =
        data.npcDeployments?.noAffiliation ??
        NpcTeamMissionDeploymentService.null()

    data.phaseBannersByAffiliation = data.phaseBannersByAffiliation ?? {}

    if (data.id == undefined) {
        throw new Error(
            "[MissionFileFormatService.sanitize] cannot sanitize mission file, missing id"
        )
    }
    if (data.player == undefined) {
        throw new Error(
            "[MissionFileFormatService.sanitize] cannot sanitize mission file, missing player"
        )
    }
    if (data.cutscene == undefined) {
        throw new Error(
            "[MissionFileFormatService.sanitize] cannot sanitize mission file, missing cutscene"
        )
    }
    if (data.battleEvents == undefined) {
        throw new Error(
            "[MissionFileFormatService.sanitize] cannot sanitize mission file, missing battleEvents"
        )
    }

    return {
        id: data.id,
        terrain: data.terrain,
        objectives: data.objectives,
        player: data.player,
        npcDeployments: data.npcDeployments,
        phaseBannersByAffiliation: data.phaseBannersByAffiliation,
        cutscene: data.cutscene,
        battleEvents: data.battleEvents,
    }
}

const sanitizePlayerData = (data: Partial<MissionFileFormat>) => {
    if (!isValidValue(data.player) || data.player == undefined) {
        throw new Error("cannot sanitize mission file, missing player")
    }

    if (!isValidValue(data.player.teamId) || data.player.teamId == undefined) {
        throw new Error("cannot sanitize mission file, missing player teamId")
    }

    if (
        !isValidValue(data.player.teamName) ||
        data.player.teamName == undefined
    ) {
        throw new Error("cannot sanitize mission file, missing player teamName")
    }

    if (
        !isValidValue(data.player.deployment) ||
        data.player.deployment == undefined
    ) {
        data.player.deployment = SquaddieDeploymentService.default()
    }
    return data
}

const sanitizeCutscenes = (data: Partial<MissionFileFormat>) => {
    if (!isValidValue(data.cutscene) || data.cutscene == undefined) {
        data.cutscene = {
            cutsceneById: {},
        }
    }

    if (
        !isValidValue(data.cutscene.cutsceneById) ||
        data.cutscene.cutsceneById == undefined
    ) {
        data.cutscene.cutsceneById = {}
    }

    if (!isValidValue(data.battleEvents) || data.battleEvents == undefined) {
        data.battleEvents = []
    }

    return data
}

export const LoadMissionFromFile = async (
    campaignId: string,
    missionId: string
): Promise<MissionFileFormat | undefined> => {
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

export const LoadPlayerArmyFromFile = async (): Promise<
    PlayerArmy | undefined
> => {
    try {
        const army: PlayerArmy = await LoadFileIntoFormat<PlayerArmy>(
            `assets/playerArmy/playerArmy.json`
        )
        return PlayerArmyService.sanitize(army)
    } catch (e) {
        console.error("Error while loading player army from file")
        console.error(e)
        return undefined
    }
}

export const MissionLoaderService = {
    loadBaseSquaddieTemplateBySquaddieTemplateId: async (
        squaddieTemplateId: string | undefined
    ): Promise<SquaddieTemplate | undefined> => {
        try {
            const template: SquaddieTemplate =
                await LoadFileIntoFormat<SquaddieTemplate>(
                    `assets/playerArmy/${squaddieTemplateId}/base-squaddie-template.json`
                )
            return SquaddieTemplateService.sanitize(template)
        } catch (e) {
            console.error(
                `console.error([MissionLoaderService.loadBaseSquaddieTemplateBySquaddieTemplateId] Error while loading ${squaddieTemplateId} from file`
            )
            console.error(e)
            return undefined
        }
    },
}
