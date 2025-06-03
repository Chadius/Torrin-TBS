import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import {
    HexCoordinate,
    HexCoordinateService,
} from "../../hexCoordinate/hexCoordinate"
import {
    SearchResult,
    SearchResultsService,
} from "../searchResults/searchResult"
import { TerrainTileMap, TerrainTileMapService } from "../../terrainTileMap"
import {
    SearchConnection,
    SearchGraph,
} from "../../../search/searchGraph/graph"
import { SearchNodeRecord } from "../../../search/nodeRecord/nodeRecord"
import { NodeArrayAStarPathfinder } from "../../../search/aStarPathfinding/nodeMapping/nodeArrayAStarPathfinder"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../../search/searchPathAdapter/searchPathAdapter"
import { SquaddieTemplate } from "../../../campaign/squaddieTemplate"
import { BattleSquaddie } from "../../../battle/battleSquaddie"
import { SearchLimit } from "./searchLimit"
import {
    HexGridMovementCost,
    HexGridMovementCostService,
} from "../../hexGridMovementCost"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../battle/objectRepository"
import { getResultOrThrowError } from "../../../utils/ResultOrError"
import {
    SquaddieAffiliation,
    SquaddieAffiliationService,
} from "../../../squaddie/squaddieAffiliation"
import { InBattleAttributesService } from "../../../battle/stats/inBattleAttributes"
import { AttributeType } from "../../../squaddie/attribute/attributeType"

export const MapSearchService = {
    calculateAllPossiblePathsFromStartingCoordinate: ({
        missionMap,
        originMapCoordinate,
        currentMapCoordinate,
        searchLimit,
        objectRepository,
    }: {
        missionMap: MissionMap
        originMapCoordinate: HexCoordinate
        currentMapCoordinate: HexCoordinate
        searchLimit: SearchLimit
        objectRepository: ObjectRepository
    }): SearchResult =>
        calculateAllPossiblePathsFromStartingCoordinate({
            missionMap,
            originMapCoordinate,
            currentMapCoordinate,
            searchLimit,
            objectRepository,
        }),
    calculatePathsToDestinations: ({
        missionMap,
        originMapCoordinate,
        currentMapCoordinate,
        searchLimit,
        destinationCoordinates,
        objectRepository,
    }: {
        missionMap: MissionMap
        searchLimit: SearchLimit
        originMapCoordinate: HexCoordinate
        currentMapCoordinate: HexCoordinate
        objectRepository: ObjectRepository
        destinationCoordinates: HexCoordinate[]
    }): SearchResult => {
        return calculateAllPossiblePathsFromStartingCoordinate({
            missionMap,
            originMapCoordinate,
            currentMapCoordinate,
            searchLimit,
            objectRepository,
            destinationCoordinates,
        })
    },
}

const calculateAllPossiblePathsFromStartingCoordinate = ({
    missionMap,
    originMapCoordinate,
    currentMapCoordinate,
    searchLimit,
    objectRepository,
    destinationCoordinates,
}: {
    missionMap: MissionMap
    originMapCoordinate: HexCoordinate
    currentMapCoordinate: HexCoordinate
    searchLimit: SearchLimit
    objectRepository: ObjectRepository
    destinationCoordinates?: HexCoordinate[]
}): SearchResult => {
    const destinationCoordinatesReached: { [p: string]: boolean } =
        destinationCoordinates
            ? Object.fromEntries(
                  destinationCoordinates.map((destinationCoordinate) => [
                      HexCoordinateService.toString(destinationCoordinate),
                      false,
                  ])
              )
            : undefined

    const battleSquaddieAtStartCoordinate = getSquaddieAtStartCoordinate({
        missionMap: missionMap,
        startCoordinate: currentMapCoordinate,
        objectRepository: objectRepository,
    })?.battleSquaddie

    const allPossiblePaths: {
        [key: string]: SearchConnection<HexCoordinate>[]
    } = NodeArrayAStarPathfinder.getPathsToAllReachableNodes({
        startNode: originMapCoordinate,
        graph: convertTerrainTileMapToSearchGraph({
            tiles: missionMap.terrainTileMap,
            searchLimit,
        }),
        nodesAreEqual: (fromNode, toNode) =>
            HexCoordinateService.areEqual(fromNode, toNode),
        shouldAddNeighbor: (nodeRecord: SearchNodeRecord<HexCoordinate>) =>
            shouldAddNeighborDuringMapSearch({
                nodeRecord,
                searchLimit,
                missionMap,
                objectRepository,
                battleSquaddieAtStartCoordinate:
                    battleSquaddieAtStartCoordinate,
            }),
        earlyStopSearchingCondition: (
            nodeRecord: SearchNodeRecord<HexCoordinate>
        ): boolean => {
            if (destinationCoordinatesReached == undefined) return false

            destinationCoordinatesReached[
                HexCoordinateService.toString(nodeRecord.node)
            ] = true
            return Object.values(destinationCoordinatesReached).every(
                (isReached) => isReached
            )
        },
    })

    const postFilteredPaths = filterCoordinatesYouCannotStopOn({
        searchLimit,
        allPossiblePaths: allPossiblePaths,
        missionMap,
        battleSquaddieAtStartCoordinate,
    })

    return addStopCoordinatesAndNoMovementPaths({
        allPossiblePaths: postFilteredPaths,
        startCoordinate: originMapCoordinate,
    })
}

const convertTerrainTileMapToSearchGraph = ({
    tiles,
    searchLimit,
}: {
    tiles: TerrainTileMap
    searchLimit: SearchLimit
}): SearchGraph<HexCoordinate> => {
    const getKeyForNode = (node: HexCoordinate) =>
        HexCoordinateService.toString(node)

    const dimensions = TerrainTileMapService.getDimensions(tiles)

    const allHexCoordinates: HexCoordinate[] = []
    for (let q = 0; q < dimensions.numberOfRows; q++) {
        for (let r = 0; r < dimensions.widthOfWidestRow; r++) {
            if (TerrainTileMapService.isCoordinateOnMap(tiles, { q, r })) {
                allHexCoordinates.push({ q, r })
            }
        }
    }

    const allNodes: {
        data: HexCoordinate
        key: string
    }[] = allHexCoordinates.map((coordinate) => ({
        data: coordinate,
        key: getKeyForNode(coordinate),
    }))

    const allConnections: SearchConnection<HexCoordinate>[] = []
    allHexCoordinates.forEach((coordinate) => {
        HexCoordinateService.createNewNeighboringCoordinates(coordinate)
            .filter((neighborCoordinate: HexCoordinate) =>
                TerrainTileMapService.isCoordinateOnMap(
                    tiles,
                    neighborCoordinate
                )
            )
            .filter((neighborCoordinate: HexCoordinate) =>
                continueIfThereIsAPitAndSearchCanCrossOverPits({
                    searchLimit,
                    terrainTileMap: tiles,
                    coordinate: neighborCoordinate,
                })
            )
            .filter((neighborCoordinate: HexCoordinate) =>
                continueIfThereIsAWallAndSearchCanPassThroughWalls({
                    searchLimit,
                    terrainTileMap: tiles,
                    coordinate: neighborCoordinate,
                })
            )
            .forEach((neighborCoordinate: HexCoordinate) => {
                const movementCost = searchLimit.ignoreTerrainCost
                    ? 1
                    : HexGridMovementCostService.movingCostByTerrainType(
                          TerrainTileMapService.getTileTerrainTypeAtCoordinate(
                              tiles,
                              coordinate
                          )
                      )

                allConnections.push({
                    fromNode: coordinate,
                    toNode: neighborCoordinate,
                    cost: movementCost,
                })
            })
    })

    return {
        getConnections: (fromNode: SearchNodeRecord<HexCoordinate>) =>
            allConnections.filter((connection) =>
                HexCoordinateService.areEqual(
                    connection.fromNode,
                    fromNode.node
                )
            ),
        getAllNodes: () => allNodes,
        getKeyForNode,
    }
}

const addStopCoordinatesAndNoMovementPaths = ({
    allPossiblePaths,
    startCoordinate,
}: {
    allPossiblePaths: { [_: string]: SearchConnection<HexCoordinate>[] }
    startCoordinate: HexCoordinate
}): SearchResult => {
    const stopCoordinates: HexCoordinate[] = []

    const getDestinationCoordinate = (
        path: SearchConnection<HexCoordinate>[]
    ) =>
        SearchPathAdapterService.getNumberOfCoordinates(path) == 1
            ? startCoordinate
            : SearchPathAdapterService.getHead(path)

    Object.values(allPossiblePaths).forEach((path) => {
        stopCoordinates.push(getDestinationCoordinate(path))
    })

    if (
        Object.values(allPossiblePaths).some(
            (path: SearchConnection<HexCoordinate>[]) =>
                SearchPathAdapterService.getNumberOfCoordinates(path) == 1
        )
    ) {
        allPossiblePaths[HexCoordinateService.toString(startCoordinate)] = [
            {
                fromNode: startCoordinate,
                toNode: startCoordinate,
                cost: 0,
            },
        ]
    }

    return SearchResultsService.new({
        id: undefined,
        shortestPathByCoordinate: allPossiblePaths,
        stopCoordinatesReached: stopCoordinates,
    })
}

const continueIfThereIsAPitAndSearchCanCrossOverPits = ({
    searchLimit,
    terrainTileMap,
    coordinate,
}: {
    searchLimit: SearchLimit
    terrainTileMap: TerrainTileMap
    coordinate: HexCoordinate
}) => {
    if (searchLimit.crossOverPits) {
        return true
    }

    const terrainType = TerrainTileMapService.getTileTerrainTypeAtCoordinate(
        terrainTileMap,
        coordinate
    )
    return terrainType !== HexGridMovementCost.pit
}

const continueIfThereIsAWallAndSearchCanPassThroughWalls = ({
    searchLimit,
    terrainTileMap,
    coordinate,
}: {
    searchLimit: SearchLimit
    terrainTileMap: TerrainTileMap
    coordinate: HexCoordinate
}) => {
    if (searchLimit.passThroughWalls) {
        return true
    }

    const terrainType = TerrainTileMapService.getTileTerrainTypeAtCoordinate(
        terrainTileMap,
        coordinate
    )
    return terrainType !== HexGridMovementCost.wall
}

const filterCoordinatesYouCannotStopOn = ({
    allPossiblePaths,
    missionMap,
    searchLimit,
    battleSquaddieAtStartCoordinate,
}: {
    allPossiblePaths: { [_: string]: SearchConnection<HexCoordinate>[] }
    missionMap: MissionMap
    searchLimit: SearchLimit
    battleSquaddieAtStartCoordinate: BattleSquaddie
}) => {
    const pathsToKeep = Object.values(allPossiblePaths)
        .filter((possiblePath) => possiblePath.length > 0)
        .filter((possiblePath) =>
            canStopBecauseThereIsNoPit({
                terrainTileMap: missionMap.terrainTileMap,
                coordinate: SearchPathAdapterService.getHead(possiblePath),
            })
        )
        .filter((possiblePath) =>
            canStopBecauseThereIsNoWall({
                terrainTileMap: missionMap.terrainTileMap,
                coordinate: SearchPathAdapterService.getHead(possiblePath),
            })
        )
        .filter((possiblePath) =>
            canStopBecauseItIsMoreThanOrEqualToMinimumDistance({
                path: possiblePath,
                searchLimit,
            })
        )
        .filter((possiblePath) =>
            canStopBecauseThereIsNoSquaddie({
                path: possiblePath,
                searchLimit,
                missionMap,
                battleSquaddieAtStartCoordinate,
            })
        )

    const pathsToKeepByKey = Object.fromEntries(
        pathsToKeep.map((path) => {
            const key = HexCoordinateService.toString(
                SearchPathAdapterService.getHead(path)
            )
            return [key, path]
        })
    )

    const pathsWithoutSteps = Object.entries(allPossiblePaths)
        .filter(([_, path]) => path.length == 0)
        .filter(([_, path]) =>
            canStopBecauseItIsMoreThanOrEqualToMinimumDistance({
                path,
                searchLimit,
            })
        )

    pathsWithoutSteps.forEach(([key, _]) => {
        pathsToKeepByKey[key] = []
    })

    return pathsToKeepByKey
}

const canStopBecauseThereIsNoWall = ({
    terrainTileMap,
    coordinate,
}: {
    terrainTileMap: TerrainTileMap
    coordinate: HexCoordinate
}) => {
    const terrainType = TerrainTileMapService.getTileTerrainTypeAtCoordinate(
        terrainTileMap,
        coordinate
    )
    return terrainType !== HexGridMovementCost.wall
}

const canStopBecauseThereIsNoPit = ({
    terrainTileMap,
    coordinate,
}: {
    terrainTileMap: TerrainTileMap
    coordinate: HexCoordinate
}) => {
    const terrainType = TerrainTileMapService.getTileTerrainTypeAtCoordinate(
        terrainTileMap,
        coordinate
    )
    return terrainType !== HexGridMovementCost.pit
}

const canStopBecauseItIsMoreThanOrEqualToMinimumDistance = ({
    path,
    searchLimit,
}: {
    searchLimit: SearchLimit
    path: SearchPathAdapter
}): boolean => {
    if (searchLimit.minimumDistance == undefined) return true
    return (
        SearchPathAdapterService.getNumberOfCoordinates(path) >=
        searchLimit.minimumDistance + 1
    )
}

const canStopBecauseThereIsNoSquaddie = ({
    path,
    searchLimit,
    missionMap,
    battleSquaddieAtStartCoordinate,
}: {
    path: SearchConnection<HexCoordinate>[]
    searchLimit: SearchLimit
    missionMap: MissionMap
    battleSquaddieAtStartCoordinate: BattleSquaddie
}): boolean => {
    const squaddieAtEndOfPath = MissionMapService.getBattleSquaddieAtCoordinate(
        missionMap,
        SearchPathAdapterService.getHead(path)
    ).battleSquaddieId

    return (
        searchLimit.canStopOnSquaddies ||
        !squaddieAtEndOfPath ||
        squaddieAtEndOfPath === battleSquaddieAtStartCoordinate.battleSquaddieId
    )
}

const shouldAddNeighborDuringMapSearch = ({
    nodeRecord,
    searchLimit,
    missionMap,
    objectRepository,
    battleSquaddieAtStartCoordinate,
}: {
    nodeRecord: SearchNodeRecord<HexCoordinate>
    searchLimit: SearchLimit
    missionMap: MissionMap
    objectRepository: ObjectRepository
    battleSquaddieAtStartCoordinate: BattleSquaddie
}) => {
    if (
        searchLimit.maximumDistance != undefined &&
        nodeRecord.lengthSoFar > searchLimit.maximumDistance
    )
        return false

    if (
        searchLimit.maximumMovementCost != undefined &&
        nodeRecord.costSoFar > searchLimit.maximumMovementCost
    )
        return false

    return shouldAddNeighborDuringMapSearchWhenThereIsASquaddieAtNeighbor({
        battleSquaddieIdAtNeighbor:
            MissionMapService.getBattleSquaddieAtCoordinate(
                missionMap,
                nodeRecord.node
            ).battleSquaddieId,
        objectRepository,
        battleSquaddieAtStartCoordinate,
        searchLimit,
    })
}

const shouldAddNeighborDuringMapSearchWhenThereIsASquaddieAtNeighbor = ({
    battleSquaddieIdAtNeighbor,
    objectRepository,
    battleSquaddieAtStartCoordinate,
    searchLimit,
}: {
    battleSquaddieIdAtNeighbor: string
    objectRepository: ObjectRepository
    battleSquaddieAtStartCoordinate: BattleSquaddie
    searchLimit: SearchLimit
}) => {
    if (
        !searchLimit.squaddieAffiliation ||
        searchLimit.squaddieAffiliation == SquaddieAffiliation.UNKNOWN
    )
        return true

    if (!battleSquaddieIdAtNeighbor) return true

    const { squaddieTemplate } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            battleSquaddieIdAtNeighbor
        )
    )

    if (
        battleSquaddieAtStartCoordinate &&
        InBattleAttributesService.getAllActiveAttributeModifiers(
            battleSquaddieAtStartCoordinate.inBattleAttributes
        ).some((attribute) => attribute.type === AttributeType.ELUSIVE)
    )
        return true

    return SquaddieAffiliationService.areSquaddieAffiliationsAllies({
        actingAffiliation: searchLimit.squaddieAffiliation,
        targetAffiliation: squaddieTemplate.squaddieId.affiliation,
    })
}

const getSquaddieAtStartCoordinate = ({
    missionMap,
    startCoordinate,
    objectRepository,
}: {
    missionMap: MissionMap
    startCoordinate: HexCoordinate
    objectRepository: ObjectRepository
}): { squaddieTemplate: SquaddieTemplate; battleSquaddie: BattleSquaddie } => {
    const { battleSquaddieId } =
        MissionMapService.getBattleSquaddieAtCoordinate(
            missionMap,
            startCoordinate
        )
    if (!battleSquaddieId) return undefined
    const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            battleSquaddieId
        )
    )
    return { squaddieTemplate, battleSquaddie }
}
