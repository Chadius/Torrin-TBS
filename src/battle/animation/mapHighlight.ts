import { SearchPath } from "../../hexMap/pathfinder/searchPath"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { HighlightCoordinateDescription } from "../../hexMap/terrainTileMap"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"
import { HIGHLIGHT_PULSE_COLOR } from "../../hexMap/hexDrawingUtils"
import { MissionMap } from "../../missionMap/missionMap"
import {
    SearchResult,
    SearchResultsService,
} from "../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderService } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { SearchParametersService } from "../../hexMap/pathfinder/searchParameters"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { CampaignResources } from "../../campaign/campaignResources"
import { SquaddieTurn } from "../../squaddie/turn"
import { BattleSquaddieSelectorService } from "../orchestratorComponents/battleSquaddieSelectorUtils"
import { PulseBlendColor } from "../../hexMap/colorUtils"

export const MapHighlightService = {
    convertSearchPathToHighlightCoordinates: ({
        searchPath,
        repository,
        battleSquaddieId,
        campaignResources,
        squaddieIsNormallyControllableByPlayer,
    }: {
        searchPath: SearchPath
        repository: ObjectRepository
        battleSquaddieId: string
        campaignResources: CampaignResources
        squaddieIsNormallyControllableByPlayer: boolean
    }): HighlightCoordinateDescription[] => {
        const coordinatesByNumberOfMovementActions =
            SquaddieService.searchPathCoordinatesByNumberOfMovementActions({
                repository,
                battleSquaddieId,
                searchPath,
            })
        return Object.entries(coordinatesByNumberOfMovementActions).map(
            ([numberOfMoveActionsStr, coordinateTraveledList]) => {
                const numberOfMoveActions: number = Number(
                    numberOfMoveActionsStr
                )
                let imageOverlayName: string
                switch (numberOfMoveActions) {
                    case 0:
                        imageOverlayName = ""
                        break
                    case 1:
                        imageOverlayName =
                            squaddieIsNormallyControllableByPlayer
                                ? campaignResources
                                      .missionMapMovementIconResourceKeys
                                      .MOVE_1_ACTION_CONTROLLABLE_SQUADDIE
                                : campaignResources
                                      .missionMapMovementIconResourceKeys
                                      .MOVE_1_ACTION_UNCONTROLLABLE_SQUADDIE
                        break
                    case 2:
                        imageOverlayName =
                            squaddieIsNormallyControllableByPlayer
                                ? campaignResources
                                      .missionMapMovementIconResourceKeys
                                      .MOVE_2_ACTIONS_CONTROLLABLE_SQUADDIE
                                : campaignResources
                                      .missionMapMovementIconResourceKeys
                                      .MOVE_2_ACTIONS_UNCONTROLLABLE_SQUADDIE
                        break
                    default:
                        imageOverlayName =
                            squaddieIsNormallyControllableByPlayer
                                ? campaignResources
                                      .missionMapMovementIconResourceKeys
                                      .MOVE_3_ACTIONS_CONTROLLABLE_SQUADDIE
                                : campaignResources
                                      .missionMapMovementIconResourceKeys
                                      .MOVE_3_ACTIONS_UNCONTROLLABLE_SQUADDIE
                        break
                }
                return {
                    coordinates: coordinateTraveledList.map((loc) => {
                        return {
                            q: loc.hexCoordinate.q,
                            r: loc.hexCoordinate.r,
                        }
                    }),
                    pulseColor: squaddieIsNormallyControllableByPlayer
                        ? HIGHLIGHT_PULSE_COLOR.BLUE
                        : HIGHLIGHT_PULSE_COLOR.PALE_BLUE,
                    overlayImageResourceName: imageOverlayName,
                }
            }
        )
    },
    highlightAllCoordinatesWithinSquaddieRange: ({
        startCoordinate,
        missionMap,
        repository,
        battleSquaddieId,
        campaignResources,
        squaddieTurnOverride,
    }: {
        startCoordinate: HexCoordinate
        missionMap: MissionMap
        repository: ObjectRepository
        battleSquaddieId: string
        campaignResources: CampaignResources
        squaddieTurnOverride?: SquaddieTurn
    }): HighlightCoordinateDescription[] => {
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                battleSquaddieId
            )
        )

        let { actionPointsRemaining } = SquaddieService.getNumberOfActionPoints(
            {
                battleSquaddie,
                squaddieTemplate,
            }
        )
        if (squaddieTurnOverride) {
            actionPointsRemaining = squaddieTurnOverride.remainingActionPoints
        }

        const reachableCoordinateSearch: SearchResult =
            PathfinderService.search({
                searchParameters: SearchParametersService.new({
                    pathGenerators: {
                        startCoordinates: [startCoordinate],
                    },
                    pathSizeConstraints: {
                        numberOfActions: actionPointsRemaining,
                        movementPerAction:
                            SquaddieService.getSquaddieMovementAttributes({
                                battleSquaddie,
                                squaddieTemplate,
                            }).net.movementPerAction,
                    },
                    pathContinueConstraints: {
                        ignoreTerrainCost:
                            SquaddieService.getSquaddieMovementAttributes({
                                battleSquaddie,
                                squaddieTemplate,
                            }).net.ignoreTerrainCost,
                        canPassOverPits:
                            SquaddieService.getSquaddieMovementAttributes({
                                battleSquaddie,
                                squaddieTemplate,
                            }).net.crossOverPits,
                        canPassThroughWalls:
                            SquaddieService.getSquaddieMovementAttributes({
                                battleSquaddie,
                                squaddieTemplate,
                            }).net.passThroughWalls,
                        squaddieAffiliation: {
                            searchingSquaddieAffiliation:
                                squaddieTemplate.squaddieId.affiliation,
                            canCrossThroughUnfriendlySquaddies:
                                SquaddieService.getSquaddieMovementAttributes({
                                    battleSquaddie,
                                    squaddieTemplate,
                                }).net.passThroughSquaddies,
                        },
                    },
                    pathStopConstraints: {
                        canStopOnSquaddies: false,
                    },
                    goal: {},
                }),
                missionMap,
                objectRepository: repository,
            })
        const { squaddieIsNormallyControllableByPlayer } =
            SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate,
                battleSquaddie,
            })

        const movementRange =
            highlightAllCoordinatesWithinSquaddieMovementRange({
                startCoordinate,
                reachableCoordinatesSearch: reachableCoordinateSearch,
                campaignResources,
                squaddieIsNormallyControllableByPlayer,
            })
        const attackRange = addAttackRangeOntoMovementRange({
            objectRepository: repository,
            battleSquaddieId,
            reachableCoordinateSearch: reachableCoordinateSearch,
            missionMap,
            campaignResources,
            squaddieIsNormallyControllableByPlayer,
            actionPointsRemaining,
        })
        if (attackRange && attackRange.coordinates.length > 0) {
            return [...movementRange, attackRange]
        }
        return [...movementRange]
    },
}

const highlightAllCoordinatesWithinSquaddieMovementRange = ({
    startCoordinate,
    reachableCoordinatesSearch,
    campaignResources,
    squaddieIsNormallyControllableByPlayer,
}: {
    startCoordinate: HexCoordinate
    reachableCoordinatesSearch: SearchResult
    campaignResources: CampaignResources
    squaddieIsNormallyControllableByPlayer: boolean
}) => {
    const pulseMovementColor: PulseBlendColor =
        squaddieIsNormallyControllableByPlayer
            ? HIGHLIGHT_PULSE_COLOR.BLUE
            : HIGHLIGHT_PULSE_COLOR.PALE_BLUE

    const highlightedCoordinates: HighlightCoordinateDescription[] = [
        {
            coordinates: [{ ...startCoordinate }],
            pulseColor: pulseMovementColor,
            overlayImageResourceName: "",
        },
        {
            coordinates: [],
            pulseColor: pulseMovementColor,
            overlayImageResourceName: squaddieIsNormallyControllableByPlayer
                ? campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_1_ACTION_CONTROLLABLE_SQUADDIE
                : campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_1_ACTION_UNCONTROLLABLE_SQUADDIE,
        },
        {
            coordinates: [],
            pulseColor: pulseMovementColor,
            overlayImageResourceName: squaddieIsNormallyControllableByPlayer
                ? campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_2_ACTIONS_CONTROLLABLE_SQUADDIE
                : campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_2_ACTIONS_UNCONTROLLABLE_SQUADDIE,
        },
        {
            coordinates: [],
            pulseColor: pulseMovementColor,
            overlayImageResourceName: squaddieIsNormallyControllableByPlayer
                ? campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_3_ACTIONS_CONTROLLABLE_SQUADDIE
                : campaignResources.missionMapMovementIconResourceKeys
                      .MOVE_3_ACTIONS_UNCONTROLLABLE_SQUADDIE,
        },
    ]
    Object.entries(
        SearchResultsService.getCoordinatesByNumberOfMoveActions(
            reachableCoordinatesSearch
        )
    ).forEach(([moveActionsStr, coordinates]) => {
        const moveActions = Number(moveActionsStr)
        let highlightedCoordinateIndex: number = Math.min(moveActions, 3)
        const coordinateBesidesStart = coordinates.filter(
            (l) => l.q !== startCoordinate.q || l.r !== startCoordinate.r
        )
        highlightedCoordinates[highlightedCoordinateIndex].coordinates.push(
            ...coordinateBesidesStart
        )
    })

    return highlightedCoordinates.filter(
        (description) => description.coordinates.length > 0
    )
}

const addAttackRangeOntoMovementRange = ({
    objectRepository,
    battleSquaddieId,
    reachableCoordinateSearch,
    missionMap,
    campaignResources,
    squaddieIsNormallyControllableByPlayer,
    actionPointsRemaining,
}: {
    objectRepository: ObjectRepository
    battleSquaddieId: string
    reachableCoordinateSearch: SearchResult
    missionMap: MissionMap
    campaignResources: CampaignResources
    squaddieIsNormallyControllableByPlayer: boolean
    actionPointsRemaining: number
}): HighlightCoordinateDescription => {
    const attackCoordinates =
        BattleSquaddieSelectorService.getAttackCoordinates({
            objectRepository,
            battleSquaddieId,
            reachableCoordinateSearch,
            missionMap,
            actionPointsRemaining,
        })

    const pulseActionColor: PulseBlendColor =
        squaddieIsNormallyControllableByPlayer
            ? HIGHLIGHT_PULSE_COLOR.RED
            : HIGHLIGHT_PULSE_COLOR.PURPLE

    return {
        coordinates: attackCoordinates,
        pulseColor: pulseActionColor,
        overlayImageResourceName:
            campaignResources.missionMapAttackIconResourceKeys.ATTACK_1_ACTION,
    }
}
