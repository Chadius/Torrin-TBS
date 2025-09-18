import { SearchConnection, SearchGraph } from "../searchGraph/graph"
import { PriorityQueue } from "../../utils/priorityQueue"
import {
    NodeRecordStorage,
    SearchNodeRecord,
    SearchNodeRecordStatus,
} from "../nodeRecord/nodeRecord"

export const AStarSearchService = {
    priorityQueueSearch: <T>({
        getStartNodes,
        nodesAreEqual,
        earlyStopSearchingCondition,
        graph,
        estimateCostBetweenNodes,
        nodeRecordStorage,
        shouldAddNeighbor,
    }: {
        getStartNodes: () => T[]
        nodesAreEqual: (fromNode: T, toNode: T) => boolean
        earlyStopSearchingCondition: (
            nodeRecord: SearchNodeRecord<T>
        ) => boolean
        graph: SearchGraph<T>
        estimateCostBetweenNodes: (fromNode: T) => number
        nodeRecordStorage: NodeRecordStorage<T>
        shouldAddNeighbor?: (nodeRecord: SearchNodeRecord<T>) => boolean
    }): SearchConnection<T>[] => {
        let priorityQueue: PriorityQueue<string> = new PriorityQueue(
            (a: string, b: string): number =>
                compareNodeRecords(
                    nodeRecordStorage.getNodeRecordByKey(a),
                    nodeRecordStorage.getNodeRecordByKey(b)
                )
        )
        let currentRecord: SearchNodeRecord<T> | undefined = undefined
        const startingNodeRecords: SearchNodeRecord<T>[] =
            createStartingNodeRecords({
                startingNodes: getStartNodes(),
                estimateCostBetweenNodes,
            })
        addStartingNodeRecordsToPriorityQueue({
            startingNodeRecords,
            graph,
            priorityQueue,
        })
        startingNodeRecords.forEach(nodeRecordStorage.addNodeRecord)

        while (!priorityQueue.isEmpty()) {
            const nextKey = priorityQueue.dequeue()
            if (nextKey == undefined) break
            currentRecord = nodeRecordStorage.getNodeRecordByKey(nextKey)
            if (
                currentRecord == undefined ||
                earlyStopSearchingCondition(currentRecord)
            ) {
                break
            }

            const connections = graph.getConnections(currentRecord)
            connections.forEach((connection) => {
                const endNode = connection.toNode
                const endNodeCost = currentRecord!.costSoFar! + connection.cost

                const endNodeRecord =
                    nodeRecordStorage.getNodeRecordByNode(endNode)

                if (
                    !shouldUpdateEndNodeCostAndOpenToContinueSearching({
                        endNodeRecord,
                        startNodeCost: currentRecord!.costSoFar!,
                        connectionCost: connection.cost,
                    })
                )
                    return

                const endNodeHeuristic = calculateEndNodeEstimatedCost(
                    endNodeRecord,
                    estimateCostBetweenNodes
                )

                endNodeRecord.costSoFar = endNodeCost
                endNodeRecord.lengthSoFar = currentRecord!.lengthSoFar! + 1
                endNodeRecord.connection = connection
                endNodeRecord.estimatedTotalCost =
                    endNodeCost + endNodeHeuristic
                if (shouldAddNeighbor && !shouldAddNeighbor(endNodeRecord))
                    return
                endNodeRecord.status = SearchNodeRecordStatus.OPEN

                priorityQueue.enqueue(graph.getKeyForNode(endNode))
            })
            currentRecord.status = SearchNodeRecordStatus.CLOSED
        }
        if (currentRecord !== undefined) {
            return constructPathFromNodeRecord<T>({
                endNodeRecord: currentRecord,
                nodeRecordStorage,
                getStartNodes,
                nodesAreEqual,
            })
        }
        return []
    },
    constructPathFromNodeRecord: <T>({
        endNodeRecord,
        nodeRecordStorage,
        getStartNodes,
        nodesAreEqual,
    }: {
        endNodeRecord: SearchNodeRecord<T>
        nodeRecordStorage: NodeRecordStorage<T>
        getStartNodes: () => T[]
        nodesAreEqual: (fromNode: T, toNode: T) => boolean
    }): SearchConnection<T>[] =>
        constructPathFromNodeRecord<T>({
            endNodeRecord,
            nodeRecordStorage,
            getStartNodes,
            nodesAreEqual,
        }),
}

const createStartingNodeRecords = <T>({
    startingNodes,
    estimateCostBetweenNodes,
}: {
    startingNodes: T[]
    estimateCostBetweenNodes: (fromNode: T) => number
}): SearchNodeRecord<T>[] =>
    startingNodes.map(
        (startingNode): SearchNodeRecord<T> => ({
            node: startingNode,
            connection: undefined,
            lengthSoFar: 0,
            costSoFar: 0,
            estimatedTotalCost: estimateCostBetweenNodes(startingNode),
            status: SearchNodeRecordStatus.OPEN,
        })
    )

const addStartingNodeRecordsToPriorityQueue = <T>({
    startingNodeRecords,
    priorityQueue,
    graph,
}: {
    startingNodeRecords: SearchNodeRecord<T>[]
    priorityQueue: PriorityQueue<string>
    graph: SearchGraph<T>
}) => {
    startingNodeRecords.forEach((startingNode) => {
        priorityQueue.enqueue(graph.getKeyForNode(startingNode.node))
    })
}

const compareNodeRecords = <T>(
    a: SearchNodeRecord<T>,
    b: SearchNodeRecord<T>
) => {
    if (a.estimatedTotalCost < b.estimatedTotalCost) {
        return -1
    }
    if (a.estimatedTotalCost > b.estimatedTotalCost) {
        return 1
    }
    return 0
}

const shouldUpdateEndNodeCostAndOpenToContinueSearching = <T>({
    endNodeRecord,
    startNodeCost,
    connectionCost,
}: {
    endNodeRecord: SearchNodeRecord<T>
    startNodeCost: number
    connectionCost: number
}): boolean => {
    if (endNodeRecord.status === SearchNodeRecordStatus.UNVISITED) {
        return true
    }

    return endNodeRecord.costSoFar! > startNodeCost + connectionCost
}

const calculateEndNodeEstimatedCost = <T>(
    nodeRecord: SearchNodeRecord<T>,
    estimateCostBetweenNodes: (fromNode: T) => number
): number => {
    if (nodeRecord.status === SearchNodeRecordStatus.UNVISITED) {
        return estimateCostBetweenNodes(nodeRecord.node)
    }

    return nodeRecord.estimatedTotalCost - nodeRecord.costSoFar!
}

const constructPathFromNodeRecord = <T>({
    endNodeRecord,
    nodeRecordStorage,
    getStartNodes,
    nodesAreEqual,
}: {
    endNodeRecord: SearchNodeRecord<T>
    nodeRecordStorage: NodeRecordStorage<T>
    getStartNodes: () => T[]
    nodesAreEqual: (fromNode: T, toNode: T) => boolean
}): SearchConnection<T>[] => {
    const path: SearchConnection<T>[] = []
    const startNodes = getStartNodes()
    const isInStartNodes = (node: T) =>
        startNodes.some((startNode) => nodesAreEqual(startNode, node))
    while (!isInStartNodes(endNodeRecord.node)) {
        path.push(endNodeRecord.connection!)
        endNodeRecord = nodeRecordStorage.getNodeRecordByNode(
            endNodeRecord.connection!.fromNode
        )
    }
    return path.reverse()
}
