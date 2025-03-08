import {
    SearchPath,
    SearchPathService,
} from "../../hexMap/pathfinder/searchPath"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { SearchConnection } from "../searchGraph/graph"
import { CoordinateTraveled } from "../../hexMap/pathfinder/coordinateTraveled"

/*
This type will bridge the gap between the deprecated SearchPath
and the new SearchConnection<HexCoordinate>[].
 */
export type SearchPathAdapter = SearchPath | SearchConnection<HexCoordinate>[]

export const SearchPathAdapterService = {
    getTotalMovementCost: (path: SearchPathAdapter): number => {
        if (!Array.isArray(path)) {
            return SearchPathService.getTotalMovementCost(path)
        }
        return getTotalCostOfConnections(path)
    },
    clone: (original: SearchPathAdapter): SearchPathAdapter => {
        if (!Array.isArray(original)) {
            return SearchPathService.clone(original)
        }
        return original.map((connection) => ({
            fromNode: connection.fromNode,
            toNode: connection.toNode,
            cost: connection.cost,
        }))
    },
    add: (
        path: SearchPathAdapter,
        coordinateTraveled: CoordinateTraveled,
        costToMoveToNewCoordinate: number,
        startLocation?: HexCoordinate
    ): void => {
        if (!Array.isArray(path)) {
            return SearchPathService.add(
                path,
                coordinateTraveled,
                costToMoveToNewCoordinate
            )
        }

        const fromNode =
            path.length == 0 ? startLocation : path[path.length - 1].toNode
        path.push({
            fromNode,
            toNode: coordinateTraveled.hexCoordinate,
            cost: costToMoveToNewCoordinate,
        })
    },
    getMostRecentCoordinate: (path: SearchPathAdapter): CoordinateTraveled => {
        if (!Array.isArray(path)) {
            return SearchPathService.getMostRecentCoordinate(path)
        }
        if (path.length == 0) return undefined

        return {
            hexCoordinate: path[path.length - 1].toNode,
            cumulativeMovementCost: getTotalCostOfConnections(path),
        }
    },
    getCoordinates: (path: SearchPathAdapter): CoordinateTraveled[] => {
        if (!Array.isArray(path)) {
            return SearchPathService.getCoordinates(path)
        }

        if (path.length == 0) return []

        let cumulativeMovementCost = 0
        let coordinates: CoordinateTraveled[] = []
        coordinates.push({
            hexCoordinate: path[0].fromNode,
            cumulativeMovementCost: 0,
        })
        if (path.length == 1) return coordinates

        path.slice(1).forEach((coordinate, index) => {
            cumulativeMovementCost += path[index].cost
            coordinates.push({
                hexCoordinate: coordinate.fromNode,
                cumulativeMovementCost,
            })
        })

        coordinates.push({
            hexCoordinate: path[path.length - 1].toNode,
            cumulativeMovementCost:
                cumulativeMovementCost + path[path.length - 1].cost,
        })

        return coordinates
    },
    getTotalDistance: (path: SearchPathAdapter): number => {
        if (!Array.isArray(path)) {
            return SearchPathService.getTotalDistance(path)
        }
        return path.length
    },
    compare: (a: SearchPathAdapter, b: SearchPathAdapter) => {
        if (Array.isArray(a) != Array.isArray(b)) {
            throw new Error(
                "SearchPathAdapterService.compare: a and b are different types"
            )
        }

        if (!Array.isArray(a) && !Array.isArray(b)) {
            return SearchPathService.compare(a, b)
        }

        if (Array.isArray(a) && Array.isArray(b)) {
            const costOfConnectionsA = getTotalCostOfConnections(a)
            const costOfConnectionsB = getTotalCostOfConnections(b)

            switch (true) {
                case costOfConnectionsA < costOfConnectionsB:
                    return -1
                case costOfConnectionsA > costOfConnectionsB:
                    return 1
                default:
                    return 0
            }
        }
        return 0
    },
    convertToSearchConnectionArray: (
        searchPath: SearchPath
    ): SearchConnection<HexCoordinate>[] => {
        if (searchPath.coordinatesTraveled.length < 2) return []

        return searchPath.coordinatesTraveled
            .slice(1)
            .map((coordinateTraveled, index) => {
                const fromNode =
                    searchPath.coordinatesTraveled[index].hexCoordinate
                const toNode = coordinateTraveled.hexCoordinate
                const cost =
                    coordinateTraveled.cumulativeMovementCost -
                    searchPath.coordinatesTraveled[index].cumulativeMovementCost
                return {
                    fromNode,
                    toNode,
                    cost,
                }
            })
    },
    convertToSearchPath: (
        connections: SearchConnection<HexCoordinate>[]
    ): SearchPath => {
        const searchPath = SearchPathService.newSearchPath()
        if (connections.length < 1) return searchPath

        SearchPathService.add(
            searchPath,
            {
                hexCoordinate: connections[0].fromNode,
                cumulativeMovementCost: 0,
            },
            0
        )

        let cumulativeMovementCost = 0
        connections.forEach((connection: SearchConnection<HexCoordinate>) => {
            cumulativeMovementCost += connection.cost
            SearchPathService.add(
                searchPath,
                {
                    hexCoordinate: connection.toNode,
                    cumulativeMovementCost,
                },
                connection.cost
            )
        })

        return searchPath
    },
}

const getTotalCostOfConnections = (path: SearchConnection<HexCoordinate>[]) => {
    return path.reduce((sum, connection) => {
        return sum + connection.cost
    }, 0)
}
