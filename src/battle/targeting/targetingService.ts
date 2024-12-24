import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SearchParametersService } from "../../hexMap/pathfinder/searchParameters"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import {
    SquaddieAffiliation,
    SquaddieAffiliationService,
} from "../../squaddie/squaddieAffiliation"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { TargetingShapeGeneratorService } from "./targetingShapeGenerator"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    MissionMapSquaddieCoordinate,
    MissionMapSquaddieCoordinateService,
} from "../../missionMap/squaddieCoordinate"
import {
    SearchResult,
    SearchResultsService,
} from "../../hexMap/pathfinder/searchResults/searchResult"
import { PathfinderService } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { ActionEffectTemplate } from "../../action/template/actionEffectTemplate"
import { GameEngineState } from "../../gameEngine/gameEngine"
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
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"

export class TargetingResults {
    constructor() {
        this._coordinatesInRange = []
        this._battleSquaddieIdsInRange = []
    }

    private _coordinatesInRange: HexCoordinate[]

    get coordinatesInRange(): HexCoordinate[] {
        return this._coordinatesInRange
    }

    private _battleSquaddieIdsInRange: string[]

    get battleSquaddieIdsInRange(): string[] {
        return this._battleSquaddieIdsInRange
    }

    addLocationsInRange(hexCoordinates: HexCoordinate[]) {
        this._coordinatesInRange = [
            ...this._coordinatesInRange,
            ...hexCoordinates,
        ]
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
        actionTemplate,
    }: {
        map: MissionMap
        actionEffectSquaddieTemplate?: ActionEffectTemplate
        actionTemplate: ActionTemplate
        actingSquaddieTemplate: SquaddieTemplate
        actingBattleSquaddie: BattleSquaddie
        squaddieRepository: ObjectRepository
        sourceTiles?: HexCoordinate[]
    }): TargetingResults => {
        return findValidTargets({
            map,
            actionTemplate,
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
        return !!shouldAddDueToAffiliationAndTargetTraits({
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
    actionTemplate,
}: {
    map: MissionMap
    actionEffectSquaddieTemplate?: ActionEffectTemplate
    actionTemplate: ActionTemplate
    actingSquaddieTemplate: SquaddieTemplate
    actingBattleSquaddie: BattleSquaddie
    squaddieRepository: ObjectRepository
    sourceTiles?: HexCoordinate[]
}): TargetingResults => {
    const squaddieInfo = MissionMapService.getByBattleSquaddieId(
        map,
        actingBattleSquaddie.battleSquaddieId
    )
    const invalidSourceTiles = sourceTiles?.length <= 0
    const invalidSquaddieLocation = squaddieInfo?.mapCoordinate === undefined
    if (invalidSourceTiles && invalidSquaddieLocation) {
        return new TargetingResults()
    }

    let startCoordinates = sourceTiles
    if (!sourceTiles || sourceTiles.length <= 0) {
        startCoordinates = squaddieInfo?.mapCoordinate
            ? [squaddieInfo.mapCoordinate]
            : []
    }

    const allLocationsInRange: SearchResult = PathfinderService.search({
        searchParameters: SearchParametersService.new({
            pathGenerators: {
                startCoordinates,
                shapeGenerator: TargetingShapeGeneratorService.new(
                    actionTemplate.targetConstraints.targetingShape
                ),
            },
            pathStopConstraints: {
                canStopOnSquaddies: true,
            },
            pathContinueConstraints: {
                squaddieAffiliation: {
                    searchingSquaddieAffiliation: SquaddieAffiliation.UNKNOWN,
                },
                ignoreTerrainCost: true,
                canPassOverPits: false,
                canPassThroughWalls: false,
            },
            pathSizeConstraints: {
                minimumDistanceMoved:
                    actionTemplate.targetConstraints.minimumRange,
                maximumDistanceMoved:
                    actionTemplate.targetConstraints.maximumRange,
            },
            goal: {},
        }),
        missionMap: map,
        objectRepository: squaddieRepository,
    })

    const results = new TargetingResults()
    results.addLocationsInRange(
        SearchResultsService.getStoppableCoordinates(allLocationsInRange)
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
            SearchResultsService.getStoppableCoordinates(allLocationsInRange),
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
            const mapData: MissionMapSquaddieCoordinate =
                MissionMapService.getBattleSquaddieAtCoordinate(map, tile)
            if (!MissionMapSquaddieCoordinateService.isValid(mapData)) {
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
    if (
        TraitStatusStorageService.getStatus(actionTraits, Trait.TARGET_SELF) &&
        targetBattleSquaddieId === actorBattleSquaddieId
    ) {
        return true
    }

    const squaddiesAreFriends =
        SquaddieAffiliationService.areSquaddieAffiliationsAllies({
            actingAffiliation: actorAffiliation,
            targetAffiliation,
        })

    if (
        TraitStatusStorageService.getStatus(actionTraits, Trait.TARGET_ALLY) &&
        squaddiesAreFriends
    ) {
        return true
    }

    return (
        TraitStatusStorageService.getStatus(actionTraits, Trait.TARGET_FOE) &&
        !squaddiesAreFriends
    )
}

const highlightTargetRange = (
    gameEngineState: GameEngineState
): HexCoordinate[] => {
    let battleSquaddieId: string
    let actionTemplateId: string
    if (
        BattleActionDecisionStepService.isActorSet(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )
    ) {
        battleSquaddieId = BattleActionDecisionStepService.getActor(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        ).battleSquaddieId
        actionTemplateId = BattleActionDecisionStepService.getAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        ).actionTemplateId
    } else if (
        BattleActionRecorderService.peekAtAnimationQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )
    ) {
        battleSquaddieId = BattleActionRecorderService.peekAtAnimationQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        ).actor.actorBattleSquaddieId
        actionTemplateId = BattleActionRecorderService.peekAtAnimationQueue(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        ).action.actionTemplateId
    }

    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            battleSquaddieId
        )
    )

    let previewedActionTemplate: ActionTemplate
    try {
        previewedActionTemplate = ObjectRepositoryService.getActionTemplateById(
            gameEngineState.repository,
            actionTemplateId
        )
    } catch (e) {
        return []
    }

    const actionEffectSquaddieTemplate =
        previewedActionTemplate.actionEffectTemplates[0]

    const targetingResults = TargetingResultsService.findValidTargets({
        map: gameEngineState.battleOrchestratorState.battleState.missionMap,
        actionTemplate: previewedActionTemplate,
        actionEffectSquaddieTemplate,
        actingSquaddieTemplate: squaddieTemplate,
        actingBattleSquaddie: battleSquaddie,
        squaddieRepository: gameEngineState.repository,
    })
    const actionRange: HexCoordinate[] = targetingResults.coordinatesInRange

    TerrainTileMapService.removeAllGraphicsLayers(
        gameEngineState.battleOrchestratorState.battleState.missionMap
            .terrainTileMap
    )

    const actionRangeOnMap = MapGraphicsLayerService.new({
        id: battleSquaddieId,
        highlightedTileDescriptions: [
            {
                coordinates: actionRange,
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
