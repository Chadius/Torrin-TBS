import { MissionMap } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SearchParametersService } from "../../hexMap/pathfinder/searchParams"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import {
    FriendlyAffiliationsByAffiliation,
    SquaddieAffiliation,
} from "../../squaddie/squaddieAffiliation"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import {
    GetTargetingShapeGenerator,
    TargetingShape,
} from "./targetingShapeGenerator"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    MissionMapSquaddieLocation,
    MissionMapSquaddieLocationService,
} from "../../missionMap/squaddieLocation"
import {
    SearchResult,
    SearchResultsService,
} from "../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderService } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { ActionEffectSquaddieTemplate } from "../../action/template/actionEffectSquaddieTemplate"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { HIGHLIGHT_PULSE_COLOR } from "../../hexMap/hexDrawingUtils"
import {
    Trait,
    TraitCategory,
    TraitStatusStorage,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../hexMap/mapGraphicsLayer"

export class TargetingResults {
    constructor() {
        this._locationsInRange = []
        this._battleSquaddieIdsInRange = []
    }

    private _locationsInRange: HexCoordinate[]

    get locationsInRange(): HexCoordinate[] {
        return this._locationsInRange
    }

    private _battleSquaddieIdsInRange: string[]

    get battleSquaddieIdsInRange(): string[] {
        return this._battleSquaddieIdsInRange
    }

    addLocationsInRange(hexCoordinates: HexCoordinate[]) {
        this._locationsInRange = [...this._locationsInRange, ...hexCoordinates]
    }

    addBattleSquaddieIdsInRange(battleIds: string[]) {
        this._battleSquaddieIdsInRange = [
            ...this._battleSquaddieIdsInRange,
            ...battleIds,
        ]
    }
}

export const TargetingResultsService = {
    findValidTargets: ({
        map,
        actingSquaddieTemplate,
        actingBattleSquaddie,
        squaddieRepository,
        sourceTiles,
        actionEffectSquaddieTemplate,
    }: {
        map: MissionMap
        actionEffectSquaddieTemplate?: ActionEffectSquaddieTemplate
        actingSquaddieTemplate: SquaddieTemplate
        actingBattleSquaddie: BattleSquaddie
        squaddieRepository: ObjectRepository
        sourceTiles?: HexCoordinate[]
    }): TargetingResults => {
        return findValidTargets({
            map,
            actingSquaddieTemplate,
            actingBattleSquaddie,
            squaddieRepository,
            sourceTiles,
            actionEffectSquaddieTemplate,
        })
    },
    highlightTargetRange: (
        gameEngineState: GameEngineState
    ): HexCoordinate[] => {
        return highlightTargetRange(gameEngineState)
    },
    shouldTargetDueToAffiliationAndTargetTraits: ({
        actorAffiliation,
        actorBattleSquaddieId,
        targetBattleSquaddieId,
        actionTraits,
        targetAffiliation,
    }: {
        actorAffiliation: SquaddieAffiliation
        actorBattleSquaddieId: string
        targetBattleSquaddieId: string
        targetAffiliation: SquaddieAffiliation
        actionTraits: TraitStatusStorage
    }): boolean => {
        return shouldAddDueToAffiliationAndTargetTraits({
            actorAffiliation,
            actorBattleSquaddieId,
            targetBattleSquaddieId,
            actionTraits,
            targetAffiliation,
        })
    },
}

const findValidTargets = ({
    map,
    actingSquaddieTemplate,
    actingBattleSquaddie,
    squaddieRepository,
    sourceTiles,
    actionEffectSquaddieTemplate,
}: {
    map: MissionMap
    actionEffectSquaddieTemplate?: ActionEffectSquaddieTemplate
    actingSquaddieTemplate: SquaddieTemplate
    actingBattleSquaddie: BattleSquaddie
    squaddieRepository: ObjectRepository
    sourceTiles?: HexCoordinate[]
}): TargetingResults => {
    const squaddieInfo = map.getSquaddieByBattleId(
        actingBattleSquaddie.battleSquaddieId
    )
    const invalidSourceTiles = !(sourceTiles?.length > 0)
    const invalidSquaddieLocation = squaddieInfo?.mapLocation === undefined
    if (invalidSourceTiles && invalidSquaddieLocation) {
        return new TargetingResults()
    }

    const allLocationsInRange: SearchResult = PathfinderService.search({
        searchParameters: SearchParametersService.new({
            startLocations:
                sourceTiles && sourceTiles.length > 0
                    ? sourceTiles
                    : [squaddieInfo.mapLocation],
            squaddieAffiliation: SquaddieAffiliation.UNKNOWN,
            canStopOnSquaddies: true,
            ignoreTerrainCost: true,
            minimumDistanceMoved: actionEffectSquaddieTemplate.minimumRange,
            maximumDistanceMoved: actionEffectSquaddieTemplate.maximumRange,
            shapeGenerator: getResultOrThrowError(
                GetTargetingShapeGenerator(TargetingShape.SNAKE)
            ),
            movementPerAction: undefined,
            canPassOverPits: false,
            canPassThroughWalls: false,
        }),
        missionMap: map,
        repository: squaddieRepository,
    })

    const results = new TargetingResults()
    results.addLocationsInRange(
        SearchResultsService.getStoppableLocations(allLocationsInRange)
    )

    addValidTargetsToResult({
        traits: actionEffectSquaddieTemplate
            ? TraitStatusStorageService.filterCategory(
                  actionEffectSquaddieTemplate.traits,
                  TraitCategory.ACTION
              )
            : undefined,
        targetingResults: results,
        actingSquaddieTemplate,
        actingBattleSquaddie,
        tilesInRange:
            SearchResultsService.getStoppableLocations(allLocationsInRange),
        map,
        objectRepository: squaddieRepository,
    })

    return results
}

const addValidTargetsToResult = ({
    traits,
    targetingResults,
    actingSquaddieTemplate,
    actingBattleSquaddie,
    tilesInRange,
    map,
    objectRepository,
}: {
    traits?: TraitStatusStorage
    targetingResults: TargetingResults
    actingSquaddieTemplate: SquaddieTemplate
    actingBattleSquaddie: BattleSquaddie
    tilesInRange: HexCoordinate[]
    map: MissionMap
    objectRepository: ObjectRepository
}) => {
    const validBattleSquaddieIds: string[] = tilesInRange
        .map((tile) => {
            const mapData: MissionMapSquaddieLocation =
                map.getSquaddieAtLocation(tile)
            if (!MissionMapSquaddieLocationService.isValid(mapData)) {
                return undefined
            }
            const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    mapData.battleSquaddieId
                )
            )

            if (traits === undefined) {
                return battleSquaddie.battleSquaddieId
            }

            if (
                shouldAddDueToAffiliationAndTargetTraits({
                    actionTraits: traits,
                    actorAffiliation:
                        actingSquaddieTemplate.squaddieId.affiliation,
                    actorBattleSquaddieId:
                        actingBattleSquaddie.battleSquaddieId,
                    targetAffiliation: squaddieTemplate.squaddieId.affiliation,
                    targetBattleSquaddieId: battleSquaddie.battleSquaddieId,
                })
            ) {
                return battleSquaddie.battleSquaddieId
            }

            return undefined
        })
        .filter((x) => x)

    targetingResults.addBattleSquaddieIdsInRange(validBattleSquaddieIds)
}

const shouldAddDueToAffiliationAndTargetTraits = ({
    actorAffiliation,
    actorBattleSquaddieId,
    targetBattleSquaddieId,
    actionTraits,
    targetAffiliation,
}: {
    actorAffiliation: SquaddieAffiliation
    actorBattleSquaddieId: string
    targetBattleSquaddieId: string
    targetAffiliation: SquaddieAffiliation
    actionTraits: TraitStatusStorage
}): boolean => {
    const friendlyAffiliations: {
        [friendlyAffiliation in SquaddieAffiliation]?: boolean
    } = FriendlyAffiliationsByAffiliation[actorAffiliation]

    if (
        TraitStatusStorageService.getStatus(actionTraits, Trait.TARGET_SELF) &&
        targetBattleSquaddieId === actorBattleSquaddieId
    ) {
        return true
    }

    if (
        TraitStatusStorageService.getStatus(actionTraits, Trait.TARGET_ALLY) &&
        friendlyAffiliations[targetAffiliation]
    ) {
        return true
    }

    return (
        (TraitStatusStorageService.getStatus(actionTraits, Trait.TARGET_FOE) &&
            !friendlyAffiliations[targetAffiliation]) ||
        false
    )
}

const highlightTargetRange = (
    gameEngineState: GameEngineState
): HexCoordinate[] => {
    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound
                .battleSquaddieId
        )
    )

    const previewedActionTemplateId =
        gameEngineState.battleOrchestratorState.battleState.actionsThisRound
            .previewedActionTemplateId
    let previewedActionTemplate: ActionTemplate
    try {
        previewedActionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            previewedActionTemplateId
        )
    } catch (e) {
        return []
    }

    const actionEffectSquaddieTemplate =
        previewedActionTemplate.actionEffectTemplates[0]
    if (actionEffectSquaddieTemplate.type !== ActionEffectType.SQUADDIE) {
        return []
    }

    const targetingResults = TargetingResultsService.findValidTargets({
        map: gameEngineState.battleOrchestratorState.battleState.missionMap,
        actionEffectSquaddieTemplate,
        actingSquaddieTemplate: squaddieTemplate,
        actingBattleSquaddie: battleSquaddie,
        squaddieRepository: gameEngineState.repository,
    })
    const actionRange: HexCoordinate[] = targetingResults.locationsInRange

    TerrainTileMapService.removeAllGraphicsLayers(
        gameEngineState.battleOrchestratorState.battleState.missionMap
            .terrainTileMap
    )

    const actionRangeOnMap = MapGraphicsLayerService.new({
        id: gameEngineState.battleOrchestratorState.battleState.actionsThisRound
            .battleSquaddieId,
        highlightedTileDescriptions: [
            {
                tiles: actionRange,
                pulseColor: HIGHLIGHT_PULSE_COLOR.RED,
                overlayImageResourceName: "map icon attack 1 action",
            },
        ],
        type: MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
    })
    TerrainTileMapService.addGraphicsLayer(
        gameEngineState.battleOrchestratorState.battleState.missionMap
            .terrainTileMap,
        actionRangeOnMap
    )

    return actionRange
}
