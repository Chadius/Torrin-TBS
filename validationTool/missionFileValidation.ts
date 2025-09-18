import {
    MapPlacement,
    MissionFileFormat,
    MissionFileFormatService,
    NpcTeamMissionDeployment,
} from "../src/dataLoader/missionLoader"
import { TerrainTileMapService } from "../src/hexMap/terrainTileMap"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../src/hexMap/hexCoordinate/hexCoordinate"

export const MissionFileValidationService = {
    validateJSON: (json: string) => {
        try {
            JSON.parse(json)
        } catch (e) {
            if (e instanceof SyntaxError) {
                console.error("[MapValidationService] ", e)
            }
            throw e
        }
    },
    validateMissionFileFormat: (mission: MissionFileFormat) => {
        try {
            mission = MissionFileFormatService.sanitize(mission)
        } catch (e) {
            console.error("[MapValidationService] ", e)
            throw e
        }

        const validationFailures = getValidationFailures(mission)
        consoleErrorValidationFailures(validationFailures)
        throwErrorForAnyValidationFailure(validationFailures)
    },
}

export interface MissionFileValidationFailures {
    invalidOffMapNpcPlacements: MapPlacement[]
    npcPlacementsInTheSameLocation: {
        coordinate: HexCoordinate
        battleSquaddieIds: string[]
    }[]
    invalidTeamBattleSquaddieIds: { [teamId: string]: string[] }
    teamsWithTheSameIds: { [teamId: string]: string[] }
    squaddiesOnMultipleTeams: { [battleSquaddieId: string]: string[] }
}

const getValidationFailures = (mission: MissionFileFormat) => {
    const invalidOffMapNpcPlacements = findInvalidOffMapNpcPlacements(mission)

    const npcPlacementsInTheSameLocation =
        findNpcPlacementsInTheSameCoordinate(mission)

    const invalidTeamBattleSquaddieIds =
        findInvalidTeamBattleSquaddieIds(mission)

    const teamsWithTheSameIds = findTeamsWithTheSameIds(mission)

    const squaddiesOnMultipleTeams = findSquaddiesOnMultipleTeams(mission)

    return <MissionFileValidationFailures>{
        invalidOffMapNpcPlacements,
        npcPlacementsInTheSameLocation,
        invalidTeamBattleSquaddieIds,
        teamsWithTheSameIds,
        squaddiesOnMultipleTeams,
    }
}

const formatQuoteAndCommaSeparateStrings = (teamIds: string[]) =>
    teamIds.map((id) => `"${id}"`).join(", ")

const consoleErrorValidationFailures = ({
    invalidTeamBattleSquaddieIds,
    npcPlacementsInTheSameLocation,
    invalidOffMapNpcPlacements,
    teamsWithTheSameIds,
    squaddiesOnMultipleTeams,
}: MissionFileValidationFailures) => {
    if (invalidOffMapNpcPlacements.length > 0) {
        invalidOffMapNpcPlacements
            .filter((placement) => placement.coordinate != undefined)
            .forEach((placement) => {
                console.error(
                    `[MapValidationService] "${placement.battleSquaddieId}" is at coordinate (q: ${placement.coordinate!.q}, r: ${placement.coordinate!.r}) which is not on the map`
                )
            })
    }

    if (npcPlacementsInTheSameLocation.length > 0) {
        npcPlacementsInTheSameLocation.forEach((collision) => {
            console.error(
                `[MapValidationService] coordinate (q: ${collision.coordinate.q}, r: ${collision.coordinate.r}) has multiple squaddies:${formatQuoteAndCommaSeparateStrings(collision.battleSquaddieIds)}`
            )
        })
    }

    if (Object.keys(invalidTeamBattleSquaddieIds).length > 0) {
        Object.entries(invalidTeamBattleSquaddieIds).forEach(
            ([teamId, battleSquaddieIds]) => {
                console.error(
                    `[MapValidationService] team "${teamId}" uses non existent squaddies: ${formatQuoteAndCommaSeparateStrings(battleSquaddieIds)}`
                )
            }
        )
    }

    if (Object.keys(teamsWithTheSameIds).length > 0) {
        Object.entries(teamsWithTheSameIds).forEach(([teamId, teamNames]) => {
            console.error(
                `[MapValidationService] multiple teams have the same id "${teamId}": ${formatQuoteAndCommaSeparateStrings(teamNames)}`
            )
        })
    }

    if (Object.keys(squaddiesOnMultipleTeams).length > 0) {
        Object.entries(squaddiesOnMultipleTeams).forEach(
            ([battleSquaddieId, teamIds]) => {
                console.error(
                    `[MapValidationService] "${battleSquaddieId}" is on multiple teams: ${formatQuoteAndCommaSeparateStrings(teamIds)}`
                )
            }
        )
    }
}

const throwErrorForAnyValidationFailure = ({
    invalidTeamBattleSquaddieIds,
    npcPlacementsInTheSameLocation,
    invalidOffMapNpcPlacements,
    teamsWithTheSameIds,
    squaddiesOnMultipleTeams,
}: MissionFileValidationFailures) => {
    if (invalidOffMapNpcPlacements.length > 0) {
        throw new Error(
            "[MapValidationService] found squaddies that were placed with invalid coordinates."
        )
    }

    if (npcPlacementsInTheSameLocation.length > 0) {
        throw new Error(
            "[MapValidationService] multiple squaddies at the same coordinate."
        )
    }

    if (Object.keys(invalidTeamBattleSquaddieIds).length > 0) {
        throw new Error(
            "[MapValidationService] team has a squaddie id that does not exist."
        )
    }

    if (Object.keys(teamsWithTheSameIds).length > 0) {
        throw new Error(
            "[MapValidationService] multiple teams with the same id."
        )
    }

    if (Object.keys(squaddiesOnMultipleTeams).length > 0) {
        throw new Error("[MapValidationService] squaddie is on multiple teams.")
    }
}

const findInvalidOffMapNpcPlacements = (
    missionData: MissionFileFormat
): MapPlacement[] => {
    const terrainMap = TerrainTileMapService.new({
        movementCost: missionData.terrain,
    })
    const allInvalidPlacements: MapPlacement[] = []
    ;[
        missionData.npcDeployments.enemy?.mapPlacements,
        missionData.npcDeployments.ally?.mapPlacements,
        missionData.npcDeployments.noAffiliation?.mapPlacements,
    ]
        .filter((x) => x != undefined)
        .forEach((mapPlacements) => {
            mapPlacements.forEach((mapPlacement) => {
                if (
                    mapPlacement.coordinate &&
                    !TerrainTileMapService.isCoordinateOnMap(
                        terrainMap,
                        mapPlacement.coordinate
                    )
                ) {
                    allInvalidPlacements.push(mapPlacement)
                }
            })
        })

    return allInvalidPlacements
}

const findNpcPlacementsInTheSameCoordinate = (
    missionData: MissionFileFormat
): {
    coordinate: HexCoordinate
    battleSquaddieIds: string[]
}[] => {
    const squaddiesByLocation: {
        coordinate: HexCoordinate
        battleSquaddieIds: string[]
    }[] = []

    ;[
        missionData.npcDeployments.enemy?.mapPlacements,
        missionData.npcDeployments.ally?.mapPlacements,
        missionData.npcDeployments.noAffiliation?.mapPlacements,
    ]
        .filter((x) => x != undefined)
        .forEach((mapPlacements) => {
            mapPlacements.forEach((mapPlacement) => {
                let existingCoordinate = squaddiesByLocation.find(
                    (c) =>
                        mapPlacement.coordinate != undefined &&
                        HexCoordinateService.areEqual(
                            c.coordinate,
                            mapPlacement.coordinate
                        )
                )
                if (mapPlacement.coordinate == undefined) return

                if (!existingCoordinate) {
                    existingCoordinate = {
                        coordinate: mapPlacement.coordinate,
                        battleSquaddieIds: [],
                    }
                    squaddiesByLocation.push(existingCoordinate)
                }

                existingCoordinate.battleSquaddieIds.push(
                    mapPlacement.battleSquaddieId
                )
            })
        })

    return squaddiesByLocation.filter((s) => s.battleSquaddieIds.length > 1)
}

const findInvalidTeamBattleSquaddieIds = (
    missionData: MissionFileFormat
): { [teamId: string]: string[] } => {
    const invalidTeamBattleSquaddieIds: { [teamId: string]: string[] } = {}

    const hasBattleSquaddieAlreadyPlaced = (
        deployment: NpcTeamMissionDeployment,
        battleSquaddieId: string
    ) => {
        return deployment.mapPlacements.some(
            (mapPlacement) => mapPlacement.battleSquaddieId === battleSquaddieId
        )
    }
    ;[
        missionData.npcDeployments?.enemy,
        missionData.npcDeployments?.ally,
        missionData.npcDeployments?.noAffiliation,
    ]
        .filter((x) => x != undefined)
        .forEach((deployment) => {
            deployment.teams.forEach((team) => {
                const missingBattleSquaddieIds = team.battleSquaddieIds.filter(
                    (battleSquaddieId) =>
                        hasBattleSquaddieAlreadyPlaced(
                            deployment,
                            battleSquaddieId
                        ) === false
                )
                if (missingBattleSquaddieIds.length > 0) {
                    invalidTeamBattleSquaddieIds[team.id] =
                        missingBattleSquaddieIds
                }
            })
        })

    return invalidTeamBattleSquaddieIds
}

const findTeamsWithTheSameIds = (missionData: MissionFileFormat) => {
    const teamsWithTheSameIds: { [teamId: string]: string[] } = {}
    ;[
        missionData.npcDeployments?.enemy,
        missionData.npcDeployments?.ally,
        missionData.npcDeployments?.noAffiliation,
    ]
        .filter((x) => x != undefined)
        .forEach((deployment) => {
            deployment.teams.forEach((team) => {
                if (!teamsWithTheSameIds[team.id]) {
                    teamsWithTheSameIds[team.id] = []
                }

                teamsWithTheSameIds[team.id].push(team.name)
            })
        })

    return Object.fromEntries(
        Object.entries(teamsWithTheSameIds).filter(
            ([_, teamNames]) => teamNames.length > 1
        )
    )
}

const findSquaddiesOnMultipleTeams = (
    missionData: MissionFileFormat
): { [battleSquaddieId: string]: string[] } => {
    const squaddiesOnTeams: { [battleSquaddieId: string]: string[] } = {}

    ;[
        missionData.npcDeployments?.enemy,
        missionData.npcDeployments?.ally,
        missionData.npcDeployments?.noAffiliation,
    ]
        .filter((x) => x != undefined)
        .forEach((deployment) => {
            deployment.teams.forEach((team) => {
                team.battleSquaddieIds.forEach((battleSquaddieId) => {
                    if (!squaddiesOnTeams[battleSquaddieId]) {
                        squaddiesOnTeams[battleSquaddieId] = []
                    }

                    squaddiesOnTeams[battleSquaddieId].push(team.id)
                })
            })
        })

    return Object.fromEntries(
        Object.entries(squaddiesOnTeams).filter(
            ([_, teamIds]) => teamIds.length > 1
        )
    )
}
