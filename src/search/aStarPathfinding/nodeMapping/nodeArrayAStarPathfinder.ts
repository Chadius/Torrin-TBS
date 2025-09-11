import { SearchConnection, SearchGraph } from "../../searchGraph/graph"
import { AStarSearchService } from "../aStarSearchService"
import {
    NodeRecordStorage,
    SearchNodeRecord,
    SearchNodeRecordStatus,
} from "../../nodeRecord/nodeRecord"

export const NodeArrayAStarPathfinder = {
    getPathsToAllReachableNodes: <T>({
        startNode,
        graph,
        nodesAreEqual,
        shouldAddNeighbor,
        earlyStopSearchingCondition,
    }: {
        startNode: T
        graph: SearchGraph<T>
        nodesAreEqual: (fromNode: T, toNode: T) => boolean
        shouldAddNeighbor?: (nodeRecord: SearchNodeRecord<T>) => boolean
        earlyStopSearchingCondition?: (
            nodeRecord: SearchNodeRecord<T>
        ) => boolean
    }): { [key: string]: SearchConnection<T>[] } => {
        const estimateCostBetweenNodes = (_: T) => 0

        const nodeRecordMapping = convertGraphToNodeRecordMapping(
            graph,
            estimateCostBetweenNodes
        )

        const getStartNodes = () => [startNode]

        const neverStopEarly = (_: SearchNodeRecord<T>) => false

        AStarSearchService.priorityQueueSearch({
            getStartNodes,
            earlyStopSearchingCondition:
                earlyStopSearchingCondition ?? neverStopEarly,
            graph,
            estimateCostBetweenNodes,
            nodeRecordStorage: createNodeStorageRecord({
                nodeRecordMapping,
                estimateCostBetweenNodes,
                graph,
            }),
            nodesAreEqual,
            shouldAddNeighbor,
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
                            nodesAreEqual,
                        }),
                    ]
                })
        )
    },
}

const convertGraphToNodeRecordMapping = <T>(
    graph: SearchGraph<T>,
    estimateCostBetweenNodes: (fromNode: T) => number
): {
    [key: string]: SearchNodeRecord<T>
} =>
    Object.fromEntries(
        graph.getAllNodes().map((info): [string, SearchNodeRecord<T>] => [
            info.key,
            {
                node: info.data,
                connection: undefined,
                costSoFar: undefined,
                lengthSoFar: undefined,
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
        nodeRecordMapping[key].lengthSoFar = 0
        nodeRecordMapping[key].estimatedTotalCost = estimateCostBetweenNodes(
            nodeRecord.node
        )
    },
})
