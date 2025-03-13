import {
    HexCoordinate,
    HexCoordinateService,
} from "../../hexMap/hexCoordinate/hexCoordinate"
import { SearchConnection } from "../searchGraph/graph"

export type SearchPathAdapter = SearchConnection<HexCoordinate>[]

export const SearchPathAdapterService = {
    getTotalMovementCost: (path: SearchPathAdapter): number => {
        return getTotalCostOfConnections(path)
    },
    clone: (original: SearchPathAdapter): SearchPathAdapter => {
        return original.map((connection) => ({
            fromNode: connection.fromNode,
            toNode: connection.toNode,
            cost: connection.cost,
        }))
    },
    add: ({
        path,
        newCoordinate,
        costToMoveToNewCoordinate,
        startCoordinate,
    }: {
        path: SearchPathAdapter
        newCoordinate: HexCoordinate
        costToMoveToNewCoordinate: number
        startCoordinate?: HexCoordinate
    }): void => {
        const fromNode =
            path.length == 0 ? startCoordinate : path[path.length - 1].toNode
        path.push({
            fromNode,
            toNode: newCoordinate,
            cost: costToMoveToNewCoordinate,
        })
    },
    getHead: (path: SearchPathAdapter): HexCoordinate => {
        if (path.length == 0) return undefined

        return path[path.length - 1].toNode
    },
    getCoordinates: (path: SearchPathAdapter): HexCoordinate[] => {
        if (path.length == 0) return []

        let coordinates: HexCoordinate[] = path.map(
            (coordinate) => coordinate.fromNode
        )
        if (
            path.length == 1 &&
            HexCoordinateService.areEqual(path[0].fromNode, path[0].toNode)
        )
            return coordinates

        coordinates.push(path[path.length - 1].toNode)
        return coordinates
    },
    compare: (a: SearchPathAdapter, b: SearchPathAdapter) => {
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
    },
    getNumberOfMoveActions({
        path,
        movementPerAction,
    }: {
        path: SearchPathAdapter
        movementPerAction: number
    }): number {
        return getNumberOfMoveActions({
            path: path,
            movementPerAction: movementPerAction,
        })
    },
    getNumberOfCoordinates: (path: SearchPathAdapter): number =>
        getNumberOfCoordinates(path),
}

const getTotalCostOfConnections = (path: SearchConnection<HexCoordinate>[]) => {
    return path.reduce((sum, connection) => {
        return sum + connection.cost
    }, 0)
}

const getNumberOfMoveActions = ({
    path,
    movementPerAction,
}: {
    path: SearchConnection<HexCoordinate>[]
    movementPerAction: number
}) => {
    return Math.ceil(getTotalCostOfConnections(path) / movementPerAction)
}

const getNumberOfCoordinates = (path: SearchPathAdapter): number => {
    if (path == undefined) return 0
    if (path.length == 0) return 1
    if (
        path.length == 1 &&
        HexCoordinateService.areEqual(path[0].fromNode, path[0].toNode)
    )
        return 1

    return path.length + 1
}
