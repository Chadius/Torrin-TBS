import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import {
    SquaddieAffiliationService,
    TSquaddieAffiliation,
} from "../../squaddie/squaddieAffiliation"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import {
    MissionMapSquaddieCoordinate,
    MissionMapSquaddieCoordinateService,
} from "../../missionMap/squaddieCoordinate"
import { SearchResult } from "../../hexMap/pathfinder/searchResults/searchResult"
import {
    ActionEffectTemplate,
    TargetBySquaddieAffiliationRelation,
} from "../../action/template/actionEffectTemplate"
import { ActionTemplate } from "../../action/template/actionTemplate"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    MapGraphicsLayerService,
    MapGraphicsLayerType,
} from "../../hexMap/mapLayer/mapGraphicsLayer"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import {
    BattleActionRecorder,
    BattleActionRecorderService,
} from "../history/battleAction/battleActionRecorder"
import { SearchResultAdapterService } from "../../hexMap/pathfinder/searchResults/searchResultAdapter"
import { MapSearchService } from "../../hexMap/pathfinder/pathGeneration/mapSearch"
import { SearchLimitService } from "../../hexMap/pathfinder/pathGeneration/searchLimit"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"

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

    addCoordinatesInRange(hexCoordinates: HexCoordinate[]) {
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
            actionEffectTemplate: actionEffectSquaddieTemplate,
        })
    },
    highlightTargetRange: ({
        missionMap,
        objectRepository,
        battleActionDecisionStep,
        battleActionRecorder,
    }: {
        missionMap: MissionMap
        objectRepository: ObjectRepository
        battleActionDecisionStep: BattleActionDecisionStep
        battleActionRecorder: BattleActionRecorder
    }): HexCoordinate[] => {
        return highlightTargetRange({
            missionMap,
            objectRepository,
            battleActionDecisionStep,
            battleActionRecorder,
        })
    },
    shouldTargetDueToAffiliationAndTargetTraits: ({
        actorAffiliation,
        actorBattleSquaddieId,
        targetBattleSquaddieId,
        squaddieAffiliationRelation,
        targetAffiliation,
    }: {
        actorAffiliation: TSquaddieAffiliation
        actorBattleSquaddieId: string
        targetBattleSquaddieId: string
        targetAffiliation: TSquaddieAffiliation
        squaddieAffiliationRelation: {
            [TargetBySquaddieAffiliationRelation.TARGET_SELF]: boolean
            [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: boolean
            [TargetBySquaddieAffiliationRelation.TARGET_FOE]: boolean
        }
    }): boolean => {
        return !!shouldAddDueToAffiliationRelation({
            actorAffiliation,
            actorBattleSquaddieId,
            targetBattleSquaddieId,
            squaddieAffiliationRelation,
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
    actionEffectTemplate,
    actionTemplate,
}: {
    map: MissionMap
    actionEffectTemplate?: ActionEffectTemplate
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
    const invalidSquaddieLocation =
        squaddieInfo?.currentMapCoordinate === undefined
    if (invalidSourceTiles && invalidSquaddieLocation) {
        return new TargetingResults()
    }

    let startCoordinates = sourceTiles
    if (!sourceTiles || sourceTiles.length <= 0) {
        startCoordinates = squaddieInfo?.currentMapCoordinate
            ? [squaddieInfo.currentMapCoordinate]
            : []
    }

    const allLocationsInRange: SearchResult =
        MapSearchService.calculateAllPossiblePathsFromStartingCoordinate({
            missionMap: map,
            objectRepository: squaddieRepository,
            originMapCoordinate: startCoordinates[0],
            currentMapCoordinate: startCoordinates[0],
            searchLimit: SearchLimitService.new({
                baseSearchLimit: SearchLimitService.targeting(),
                passThroughWalls: TraitStatusStorageService.getStatus(
                    actionTemplate.actionEffectTemplates[0].traits,
                    Trait.PASS_THROUGH_WALLS
                ),
                crossOverPits: TraitStatusStorageService.getStatus(
                    actionTemplate.actionEffectTemplates[0].traits,
                    Trait.CROSS_OVER_PITS
                ),
                minimumDistance: actionTemplate.targetConstraints.minimumRange,
                maximumDistance: actionTemplate.targetConstraints.maximumRange,
            }),
        })

    const results = new TargetingResults()
    results.addCoordinatesInRange(
        SearchResultAdapterService.getCoordinatesWithPaths(allLocationsInRange)
    )

    addValidTargetsToResult({
        squaddieAffiliationRelation: actionEffectTemplate
            ? actionEffectTemplate.targetConstraints.squaddieAffiliationRelation
            : actionTemplate.actionEffectTemplates[0].targetConstraints
                  .squaddieAffiliationRelation,
        targetingResults: results,
        actingSquaddieTemplate,
        actingBattleSquaddie,
        tilesInRange:
            SearchResultAdapterService.getCoordinatesWithPaths(
                allLocationsInRange
            ),
        map,
        objectRepository: squaddieRepository,
    })

    return results
}

const addValidTargetsToResult = ({
    targetingResults,
    actingSquaddieTemplate,
    actingBattleSquaddie,
    tilesInRange,
    map,
    objectRepository,
    squaddieAffiliationRelation,
}: {
    targetingResults: TargetingResults
    actingSquaddieTemplate: SquaddieTemplate
    actingBattleSquaddie: BattleSquaddie
    tilesInRange: HexCoordinate[]
    map: MissionMap
    objectRepository: ObjectRepository
    squaddieAffiliationRelation: {
        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: boolean
        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: boolean
        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: boolean
    }
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

            if (
                shouldAddDueToAffiliationRelation({
                    squaddieAffiliationRelation,
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

const shouldAddDueToAffiliationRelation = ({
    actorAffiliation,
    actorBattleSquaddieId,
    targetBattleSquaddieId,
    targetAffiliation,
    squaddieAffiliationRelation,
}: {
    actorAffiliation: TSquaddieAffiliation
    actorBattleSquaddieId: string
    targetBattleSquaddieId: string
    targetAffiliation: TSquaddieAffiliation
    squaddieAffiliationRelation: {
        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: boolean
        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: boolean
        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: boolean
    }
}): boolean => {
    if (
        squaddieAffiliationRelation[
            TargetBySquaddieAffiliationRelation.TARGET_SELF
        ] &&
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
        squaddieAffiliationRelation[
            TargetBySquaddieAffiliationRelation.TARGET_ALLY
        ] &&
        targetBattleSquaddieId !== actorBattleSquaddieId &&
        squaddiesAreFriends
    ) {
        return true
    }

    return (
        squaddieAffiliationRelation[
            TargetBySquaddieAffiliationRelation.TARGET_FOE
        ] && !squaddiesAreFriends
    )
}

const highlightTargetRange = ({
    missionMap,
    objectRepository,
    battleActionDecisionStep,
    battleActionRecorder,
}: {
    missionMap: MissionMap
    objectRepository: ObjectRepository
    battleActionDecisionStep: BattleActionDecisionStep
    battleActionRecorder: BattleActionRecorder
}): HexCoordinate[] => {
    let battleSquaddieId: string
    let actionTemplateId: string
    if (BattleActionDecisionStepService.isActorSet(battleActionDecisionStep)) {
        battleSquaddieId = BattleActionDecisionStepService.getActor(
            battleActionDecisionStep
        ).battleSquaddieId
        actionTemplateId = BattleActionDecisionStepService.getAction(
            battleActionDecisionStep
        ).actionTemplateId
    } else if (
        BattleActionRecorderService.peekAtAnimationQueue(battleActionRecorder)
    ) {
        battleSquaddieId =
            BattleActionRecorderService.peekAtAnimationQueue(
                battleActionRecorder
            ).actor.actorBattleSquaddieId
        actionTemplateId =
            BattleActionRecorderService.peekAtAnimationQueue(
                battleActionRecorder
            ).action.actionTemplateId
    }

    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            battleSquaddieId
        )
    )

    if (
        !MissionMapService.getByBattleSquaddieId(missionMap, battleSquaddieId)
            .currentMapCoordinate
    )
        return []

    let previewedActionTemplate: ActionTemplate
    try {
        previewedActionTemplate = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            actionTemplateId
        )
    } catch (e) {
        return []
    }

    const actionEffectSquaddieTemplate =
        previewedActionTemplate.actionEffectTemplates[0]

    const targetingResults = TargetingResultsService.findValidTargets({
        map: missionMap,
        actionTemplate: previewedActionTemplate,
        actionEffectSquaddieTemplate,
        actingSquaddieTemplate: squaddieTemplate,
        actingBattleSquaddie: battleSquaddie,
        squaddieRepository: objectRepository,
    })
    const actionRange: HexCoordinate[] = targetingResults.coordinatesInRange

    TerrainTileMapService.removeAllGraphicsLayers(missionMap.terrainTileMap)

    const highlightedColor =
        MapGraphicsLayerService.getActionTemplateHighlightedTileDescriptionColor(
            {
                objectRepository: objectRepository,
                actionTemplateId: previewedActionTemplate.id,
            }
        )
    const actionRangeOnMap = MapGraphicsLayerService.new({
        id: battleSquaddieId,
        highlightedTileDescriptions: [
            {
                coordinates: actionRange,
                pulseColor: highlightedColor,
            },
        ],
        type: MapGraphicsLayerType.CLICKED_ON_CONTROLLABLE_SQUADDIE,
    })
    TerrainTileMapService.addGraphicsLayer(
        missionMap.terrainTileMap,
        actionRangeOnMap
    )

    return actionRange
}
