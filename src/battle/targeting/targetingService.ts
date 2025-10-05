import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliationService } from "../../squaddie/squaddieAffiliation"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { MissionMapSquaddieCoordinate } from "../../missionMap/squaddieCoordinate"
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
import { TargetConstraintsService } from "../../action/targetConstraints"

export interface TargetingResults {
    coordinatesInRange: Set<HexCoordinate>
    battleSquaddieIds: {
        notAnAlly: Set<string>
        notAFoe: Set<string>
        inRange: Set<string>
    }
}

const newTargetingResults = (): TargetingResults => {
    return {
        coordinatesInRange: new Set<HexCoordinate>(),
        battleSquaddieIds: {
            inRange: new Set<string>(),
            notAnAlly: new Set<string>(),
            notAFoe: new Set<string>(),
        },
    }
}

export const TargetingResultsService = {
    new: (): TargetingResults => newTargetingResults(),
    withCoordinatesInRange: (
        targetingResults: TargetingResults | undefined,
        hexCoordinates: HexCoordinate[]
    ): TargetingResults => {
        return {
            coordinatesInRange: new Set([
                ...(targetingResults?.coordinatesInRange.values() ?? []),
                ...hexCoordinates,
            ]),
            battleSquaddieIds: {
                inRange: new Set(
                    targetingResults?.battleSquaddieIds.inRange ?? []
                ),
                notAnAlly: new Set(
                    targetingResults?.battleSquaddieIds.notAnAlly ?? []
                ),
                notAFoe: new Set(
                    targetingResults?.battleSquaddieIds.notAFoe ?? []
                ),
            },
        }
    },
    withBattleSquaddieIdsInRange: (
        targetingResults: TargetingResults | undefined,
        battleIds: string[]
    ): TargetingResults => {
        return {
            coordinatesInRange: new Set([
                ...(targetingResults?.coordinatesInRange.values() ?? []),
            ]),
            battleSquaddieIds: {
                inRange: new Set([
                    ...(targetingResults?.battleSquaddieIds.inRange ?? []),
                    ...battleIds,
                ]),
                notAnAlly: new Set(
                    targetingResults?.battleSquaddieIds.notAnAlly ?? []
                ),
                notAFoe: new Set(
                    targetingResults?.battleSquaddieIds.notAFoe ?? []
                ),
            },
        }
    },
    withBattleSquaddieIdsNotAnAlly: (
        targetingResults: TargetingResults | undefined,
        battleIds: string[]
    ): TargetingResults => {
        return {
            coordinatesInRange: new Set([
                ...(targetingResults?.coordinatesInRange.values() ?? []),
            ]),
            battleSquaddieIds: {
                inRange: new Set(
                    targetingResults?.battleSquaddieIds.inRange ?? []
                ),
                notAnAlly: new Set([
                    ...(targetingResults?.battleSquaddieIds.notAnAlly ?? []),
                    ...battleIds,
                ]),
                notAFoe: new Set(
                    targetingResults?.battleSquaddieIds.notAFoe ?? []
                ),
            },
        }
    },
    withBattleSquaddieIdsNotAFoe: (
        targetingResults: TargetingResults | undefined,
        battleIds: string[]
    ): TargetingResults => {
        return {
            coordinatesInRange: new Set([
                ...(targetingResults?.coordinatesInRange.values() ?? []),
            ]),
            battleSquaddieIds: {
                inRange: new Set(
                    targetingResults?.battleSquaddieIds.inRange ?? []
                ),
                notAnAlly: new Set(
                    targetingResults?.battleSquaddieIds.notAnAlly ?? []
                ),
                notAFoe: new Set([
                    ...(targetingResults?.battleSquaddieIds.notAFoe ?? []),
                    ...battleIds,
                ]),
            },
        }
    },
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

    let startCoordinates = sourceTiles
    if (
        (sourceTiles == undefined || sourceTiles.length <= 0) &&
        squaddieInfo?.currentMapCoordinate != undefined
    )
        startCoordinates = [squaddieInfo.currentMapCoordinate]

    if (startCoordinates == undefined || startCoordinates[0] == undefined)
        return newTargetingResults()

    const range = TargetConstraintsService.getRangeDistance(
        actionTemplate.targetConstraints
    )

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
                minimumDistance: range[0],
                maximumDistance: range[1],
            }),
        })

    const results = TargetingResultsService.withCoordinatesInRange(
        newTargetingResults(),
        SearchResultAdapterService.getCoordinatesWithPaths(allLocationsInRange)
    )

    return addTargetsToResult({
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
}

const addTargetsToResult = ({
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
}): TargetingResults => {
    const battleSquaddies = tilesInRange
        .map((tile) => {
            const mapData: MissionMapSquaddieCoordinate =
                MissionMapService.getBattleSquaddieAtCoordinate(map, tile)
            if (mapData.battleSquaddieId == undefined) return undefined
            const { squaddieTemplate, battleSquaddie } =
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    mapData.battleSquaddieId
                )

            if (squaddieTemplate == undefined || battleSquaddie == undefined)
                return undefined

            const squaddiesAreFriends =
                SquaddieAffiliationService.areSquaddieAffiliationsAllies({
                    actingAffiliation:
                        actingSquaddieTemplate.squaddieId.affiliation,
                    targetAffiliation: squaddieTemplate.squaddieId.affiliation,
                })
            return { battleSquaddie, squaddieTemplate, squaddiesAreFriends }
        })
        .filter((x) => x != undefined)

    const {
        validBattleSquaddieIds,
        invalidBattleSquaddieIdsNotAFoe,
        invalidBattleSquaddieIdsNotAnAlly,
    } = filterTargetsBasedOnValidity(
        battleSquaddies,
        squaddieAffiliationRelation,
        actingBattleSquaddie
    )

    let targetingResultsWithInformation =
        TargetingResultsService.withBattleSquaddieIdsInRange(
            targetingResults,
            validBattleSquaddieIds
        )

    targetingResultsWithInformation =
        TargetingResultsService.withBattleSquaddieIdsNotAnAlly(
            targetingResultsWithInformation,
            invalidBattleSquaddieIdsNotAnAlly
        )

    return TargetingResultsService.withBattleSquaddieIdsNotAFoe(
        targetingResultsWithInformation,
        invalidBattleSquaddieIdsNotAFoe
    )
}

const filterTargetsBasedOnValidity = (
    battleSquaddies: {
        battleSquaddie: BattleSquaddie
        squaddieTemplate: SquaddieTemplate
        squaddiesAreFriends: boolean
    }[],
    squaddieAffiliationRelation: {
        [TargetBySquaddieAffiliationRelation.TARGET_SELF]: boolean
        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: boolean
        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: boolean
    },
    actingBattleSquaddie: BattleSquaddie
) => {
    const validBattleSquaddieIds: string[] = []
    const invalidBattleSquaddieIdsNotAFoe: string[] = []
    const invalidBattleSquaddieIdsNotAnAlly: string[] = []
    battleSquaddies.forEach((tile) => {
        const { battleSquaddie, squaddiesAreFriends } = tile

        if (
            shouldAddDueToAffiliationRelation({
                squaddiesAreFriends,
                squaddieAffiliationRelation,
                actorBattleSquaddieId: actingBattleSquaddie.battleSquaddieId,
                targetBattleSquaddieId: battleSquaddie.battleSquaddieId,
            })
        ) {
            validBattleSquaddieIds.push(battleSquaddie.battleSquaddieId)
            return
        }

        if (squaddiesAreFriends) {
            invalidBattleSquaddieIdsNotAFoe.push(
                battleSquaddie.battleSquaddieId
            )
            return
        }

        return invalidBattleSquaddieIdsNotAnAlly.push(
            battleSquaddie.battleSquaddieId
        )
    })
    return {
        validBattleSquaddieIds,
        invalidBattleSquaddieIdsNotAFoe,
        invalidBattleSquaddieIdsNotAnAlly,
    }
}

const shouldAddDueToAffiliationRelation = ({
    actorBattleSquaddieId,
    targetBattleSquaddieId,
    squaddieAffiliationRelation,
    squaddiesAreFriends,
}: {
    squaddiesAreFriends: boolean
    actorBattleSquaddieId: string
    targetBattleSquaddieId: string
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
    let battleSquaddieId: string | undefined
    let actionTemplateId: string | undefined
    if (BattleActionDecisionStepService.isActorSet(battleActionDecisionStep)) {
        battleSquaddieId = BattleActionDecisionStepService.getActor(
            battleActionDecisionStep
        )?.battleSquaddieId
        actionTemplateId = BattleActionDecisionStepService.getAction(
            battleActionDecisionStep
        )?.actionTemplateId
    } else if (
        BattleActionRecorderService.peekAtAnimationQueue(battleActionRecorder)
    ) {
        battleSquaddieId =
            BattleActionRecorderService.peekAtAnimationQueue(
                battleActionRecorder
            )?.actor.actorBattleSquaddieId
        actionTemplateId =
            BattleActionRecorderService.peekAtAnimationQueue(
                battleActionRecorder
            )?.action.actionTemplateId
    }
    if (battleSquaddieId == undefined) return []
    if (actionTemplateId == undefined) return []

    const { squaddieTemplate, battleSquaddie } =
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            battleSquaddieId
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
    const actionRange: HexCoordinate[] = [
        ...targetingResults.coordinatesInRange.values(),
    ]

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
