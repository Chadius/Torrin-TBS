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
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../hexMap/mapGraphicsLayer"

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

const createSearchPath = (
    gameEngineState: GameEngineState,
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    clickedHexCoordinate: HexCoordinate
) => {
    const datum =
        gameEngineState.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
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
        missionMap:
            gameEngineState.battleOrchestratorState.battleState.missionMap,
        repository: gameEngineState.repository,
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

    gameEngineState.battleOrchestratorState.battleState.squaddieMovePath =
        closestRoute

    const routeTilesByDistance =
        MapHighlightHelper.convertSearchPathToHighlightLocations({
            searchPath: closestRoute,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            repository: gameEngineState.repository,
            campaignResources: gameEngineState.campaign.resources,
        })
    const actionRangeOnMap = MapGraphicsLayerService.new({
        id: battleSquaddie.battleSquaddieId,
        highlightedTileDescriptions: routeTilesByDistance,
        type: MapGraphicsLayerType.CLICKED_ON_SQUADDIE,
    })
    TerrainTileMapService.removeAllGraphicsLayers(
        gameEngineState.battleOrchestratorState.battleState.missionMap
            .terrainTileMap
    )
    TerrainTileMapService.addGraphicsLayer(
        gameEngineState.battleOrchestratorState.battleState.missionMap
            .terrainTileMap,
        actionRangeOnMap
    )
}
