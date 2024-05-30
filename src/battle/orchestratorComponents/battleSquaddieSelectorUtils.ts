import { BattleSquaddie } from "../battleSquaddie"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { GetNumberOfActionPoints } from "../../squaddie/squaddieService"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SearchParametersHelper } from "../../hexMap/pathfinder/searchParams"
import {
    GetTargetingShapeGenerator,
    TargetingShape,
} from "../targeting/targetingShapeGenerator"
import { SearchPath } from "../../hexMap/pathfinder/searchPath"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    SearchResult,
    SearchResultsService,
} from "../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderHelper } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { MapHighlightHelper } from "../animation/mapHighlight"
import { GameEngineState } from "../../gameEngine/gameEngine"

export const BattleSquaddieSelectorService = {
    createSearchPath: ({
        state,
        squaddieTemplate,
        battleSquaddie,
        clickedHexCoordinate,
    }: {
        state: GameEngineState
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
        clickedHexCoordinate: HexCoordinate
    }) => {
        return createSearchPath(
            state,
            squaddieTemplate,
            battleSquaddie,
            clickedHexCoordinate
        )
    },
}

export function createSearchPath(
    state: GameEngineState,
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    clickedHexCoordinate: HexCoordinate
) {
    const datum =
        state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
            battleSquaddie.battleSquaddieId
        )
    const { actionPointsRemaining } = GetNumberOfActionPoints({
        squaddieTemplate,
        battleSquaddie,
    })
    const searchResults: SearchResult = PathfinderHelper.search({
        searchParameters: SearchParametersHelper.new({
            startLocations: [
                {
                    q: datum.mapLocation.q,
                    r: datum.mapLocation.r,
                },
            ],
            movementPerAction:
                squaddieTemplate.attributes.movement.movementPerAction,
            canPassThroughWalls:
                squaddieTemplate.attributes.movement.passThroughWalls,
            canPassOverPits: squaddieTemplate.attributes.movement.crossOverPits,
            shapeGenerator: getResultOrThrowError(
                GetTargetingShapeGenerator(TargetingShape.SNAKE)
            ),
            maximumDistanceMoved: undefined,
            minimumDistanceMoved: undefined,
            canStopOnSquaddies: undefined,
            ignoreTerrainCost: undefined,
            stopLocations: [clickedHexCoordinate],
            numberOfActions: actionPointsRemaining,
        }),
        missionMap: state.battleOrchestratorState.battleState.missionMap,
        repository: state.repository,
    })

    const closestRoute: SearchPath =
        SearchResultsService.getShortestPathToLocation(
            searchResults,
            clickedHexCoordinate.q,
            clickedHexCoordinate.r
        )

    const noDirectRouteToDestination = closestRoute === null
    if (noDirectRouteToDestination) {
        return
    }

    state.battleOrchestratorState.battleState.squaddieMovePath = closestRoute

    const routeTilesByDistance =
        MapHighlightHelper.convertSearchPathToHighlightLocations({
            searchPath: closestRoute,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            repository: state.repository,
            campaignResources: state.campaign.resources,
        })
    state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles()
    state.battleOrchestratorState.battleState.missionMap.terrainTileMap.highlightTiles(
        routeTilesByDistance
    )

    state.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.clearSelectedSquaddie()
}
