import { MissionMap } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SearchParametersHelper } from "../../hexMap/pathfinder/searchParams"
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
import { PathfinderHelper } from "../../hexMap/pathfinder/pathGeneration/pathfinder"
import { ActionEffectSquaddieTemplate } from "../../action/template/actionEffectSquaddieTemplate"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { isValidValue } from "../../utils/validityCheck"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { HighlightPulseRedColor } from "../../hexMap/hexDrawingUtils"
import {
    Trait,
    TraitCategory,
    TraitStatusStorage,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"

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
    const invalidSourceTiles =
        sourceTiles === undefined || sourceTiles.length === 0
    const invalidSquaddieLocation =
        squaddieInfo === undefined || squaddieInfo.mapLocation === undefined
    if (invalidSourceTiles && invalidSquaddieLocation) {
        return new TargetingResults()
    }

    const allLocationsInRange: SearchResult = PathfinderHelper.search({
        searchParameters: SearchParametersHelper.new({
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
    const actingAffiliation: SquaddieAffiliation =
        actingSquaddieTemplate.squaddieId.affiliation
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
        TraitStatusStorageService.getStatus(actionTraits, Trait.TARGETS_SELF) &&
        targetBattleSquaddieId === actorBattleSquaddieId
    ) {
        return true
    }

    if (
        TraitStatusStorageService.getStatus(
            actionTraits,
            Trait.TARGETS_ALLIES
        ) &&
        friendlyAffiliations[targetAffiliation]
    ) {
        return true
    }

    return (
        TraitStatusStorageService.getStatus(actionTraits, Trait.TARGETS_FOE) &&
        !friendlyAffiliations[targetAffiliation]
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
    const previewedActionTemplate = squaddieTemplate.actionTemplates.find(
        (template) => template.id === previewedActionTemplateId
    )

    if (!isValidValue(previewedActionTemplate)) {
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

    gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles()
    gameEngineState.battleOrchestratorState.battleState.missionMap.terrainTileMap.highlightTiles(
        [
            {
                tiles: actionRange,
                pulseColor: HighlightPulseRedColor,
                overlayImageResourceName: "map icon attack 1 action",
            },
        ]
    )
    return actionRange
}
