import { SearchConnection, SearchGraph } from "../../searchGraph/graph"
import { AStarSearchService } from "../aStarSearchService"
import {
    NodeRecordStorage,
    SearchNodeRecord,
    SearchNodeRecordStatus,
} from "../../nodeRecord/nodeRecord"

export const NodeArrayAStarPathfinder = {
    getLowestCostConnectionsFromStartNodesToEndNode: <T>({
        startNodes,
        endNode,
        estimateCostBetweenNodeAndGoal,
        graph,
        nodesAreEqual,
    }: {
        startNodes: T[]
        endNode: T
        estimateCostBetweenNodeAndGoal: (fromNode: T, toNode: T) => number
        graph: SearchGraph<T>
        nodesAreEqual: (fromNode: T, toNode: T) => boolean
    }): SearchConnection<T>[] => {
        const estimateCostBetweenNodes = (fromNode: T) =>
            estimateCostBetweenNodeAndGoal(fromNode, endNode)

        const nodeRecordMapping: {
            [key: string]: SearchNodeRecord<T>
        } = convertGraphToNodeRecordMapping(graph, estimateCostBetweenNodes)

        return AStarSearchService.priorityQueueSearch({
            getStartNodes: () => startNodes,
            earlyStopSearchingCondition: (nodeRecord: SearchNodeRecord<T>) =>
                nodesAreEqual(nodeRecord.node, endNode),
            graph,
            estimateCostBetweenNodes,
            nodeRecordStorage: createNodeStorageRecord({
                nodeRecordMapping,
                estimateCostBetweenNodes,
                graph,
            }),
        })
    },
    isEndNodeReachableFromStartNodes: <T>({
        startNodes,
        endNode,
        estimateCostBetweenNodeAndGoal,
        graph,
        nodesAreEqual,
    }: {
        startNodes: T[]
        endNode: T
        estimateCostBetweenNodeAndGoal: (fromNode: T, toNode: T) => number
        graph: SearchGraph<T>
        nodesAreEqual: (fromNode: T, toNode: T) => boolean
    }): boolean => {
        if (startNodes.some((startNode) => nodesAreEqual(startNode, endNode)))
            return true

        const estimateCostBetweenNodes = (fromNode: T) =>
            estimateCostBetweenNodeAndGoal(fromNode, endNode)

        const nodeRecordMapping = convertGraphToNodeRecordMapping(
            graph,
            estimateCostBetweenNodes
        )

        const path = AStarSearchService.priorityQueueSearch({
            getStartNodes: () => startNodes,
            earlyStopSearchingCondition: (nodeRecord: SearchNodeRecord<T>) =>
                nodesAreEqual(nodeRecord.node, endNode),
            graph,
            estimateCostBetweenNodes,
            nodeRecordStorage: createNodeStorageRecord({
                nodeRecordMapping,
                estimateCostBetweenNodes,
                graph,
            }),
        })
        if (path.length <= 0) return false
        return nodesAreEqual(path[path.length - 1].toNode, endNode)
    },
    getPathsToAllReachableNodes: <T>({
        startNode,
        graph,
    }: {
        startNode: T
        graph: SearchGraph<T>
    }): { [key: string]: SearchConnection<T>[] } => {
        const estimateCostBetweenNodes = (_: T) => 0

        const nodeRecordMapping = convertGraphToNodeRecordMapping(
            graph,
            estimateCostBetweenNodes
        )

        const getStartNodes = () => [startNode]

        AStarSearchService.priorityQueueSearch({
            getStartNodes,
            earlyStopSearchingCondition: (_: SearchNodeRecord<T>) => false,
            graph,
            estimateCostBetweenNodes,
            nodeRecordStorage: createNodeStorageRecord({
                nodeRecordMapping,
                estimateCostBetweenNodes,
                graph,
            }),
        })

        return Object.fromEntries(
            Object.entries(nodeRecordMapping)
                .filter(
                    ([_, searchNodeRecord]) =>
                        searchNodeRecord.status !=
                        SearchNodeRecordStatus.UNVISITED
                )
                .map(([key, searchNodeRecord]) => {
                    return [
                        key,
                        AStarSearchService.constructPathFromNodeRecord<T>({
                            endNodeRecord: searchNodeRecord,
                            nodeRecordStorage: createNodeStorageRecord({
                                nodeRecordMapping,
                                estimateCostBetweenNodes,
                                graph,
                            }),
                            getStartNodes,
                        }),
                    ]
                })
        )
    },
    getNodesFromSearchConnectionList: <T>(list: SearchConnection<T>[]): T[] => {
        if (!list) return []
        return list.map((connection) => connection.fromNode)
    },
}

const convertGraphToNodeRecordMapping = <T>(
    graph: SearchGraph<T>,
    estimateCostBetweenNodes: (fromNode: T) => number
): {
    [key: string]: SearchNodeRecord<T>
} =>
    Object.fromEntries(
        graph.getAllNodes().map((info) => [
            info.key,
            {
                node: info.data,
                connection: undefined,
                costSoFar: undefined,
                estimatedTotalCost: estimateCostBetweenNodes(info.data),
                status: SearchNodeRecordStatus.UNVISITED,
            },
        ])
    )

const createNodeStorageRecord = <T>({
    nodeRecordMapping,
    graph,
    estimateCostBetweenNodes,
}: {
    nodeRecordMapping: { [_p: string]: SearchNodeRecord<T> }
    graph: SearchGraph<T>
    estimateCostBetweenNodes: (fromNode: T) => number
}): NodeRecordStorage<T> => ({
    getNodeRecordByNode: (node: T) =>
        nodeRecordMapping[graph.getKeyForNode(node)],
    getNodeRecordByKey: (key: string) => nodeRecordMapping[key],
    addNodeRecord: (nodeRecord: SearchNodeRecord<T>) => {
        const key = graph.getKeyForNode(nodeRecord.node)
        nodeRecordMapping[key].status = SearchNodeRecordStatus.OPEN
        nodeRecordMapping[key].costSoFar = 0
        nodeRecordMapping[key].estimatedTotalCost = estimateCostBetweenNodes(
            nodeRecord.node
        )
    },
})
