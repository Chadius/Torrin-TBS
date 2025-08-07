import { SearchGraph } from "../../searchGraph/graph"
import { NodeArrayAStarPathfinder } from "./nodeArrayAStarPathfinder"
import { describe, expect, it } from "vitest"
import { SearchNodeRecord } from "../../nodeRecord/nodeRecord"

describe("Node Array A* Pathfinder", () => {
    describe("getPathsToAllReachableNodes", () => {
        it("can stop searching early", () => {
            const graph = makeGraphWith1SplitPath()
            const allPaths =
                NodeArrayAStarPathfinder.getPathsToAllReachableNodes<string>({
                    startNode: "A",
                    graph,
                    nodesAreEqual: (fromNode, toNode) => fromNode === toNode,
                    earlyStopSearchingCondition: (
                        nodeRecord: SearchNodeRecord<string>
                    ) => nodeRecord.node == "A",
                })

            expect(allPaths["A"]).toHaveLength(0)
            expect(allPaths["B1"]).toBeUndefined()
            expect(allPaths["B2"]).toBeUndefined()
            expect(allPaths["C"]).toBeUndefined()
        })
    })
    describe("shouldAddNeighbor filter", () => {
        it("will can filter paths by looking at the node record", () => {
            const graph = makeGraphWith1SplitPath()
            const allPaths =
                NodeArrayAStarPathfinder.getPathsToAllReachableNodes<string>({
                    startNode: "A",
                    graph,
                    nodesAreEqual: (fromNode, toNode) => fromNode === toNode,
                    shouldAddNeighbor: (
                        nodeRecord: SearchNodeRecord<string>
                    ) => {
                        return nodeRecord.node != "C"
                    },
                })

            expect(allPaths["C"]).toBeUndefined()
        })
    })
})

/*
A --1-> B1 -20--> C
  \-2-> B2 -1-/
* */
const makeGraphWith1SplitPath = () => {
    const getConnections = (fromNode: SearchNodeRecord<string>) => {
        if (fromNode.node === "A") {
            return [
                {
                    cost: 1,
                    fromNode: "A",
                    toNode: "B1",
                },
                {
                    cost: 2,
                    fromNode: "A",
                    toNode: "B2",
                },
            ]
        }
        if (fromNode.node === "B1") {
            return [
                {
                    cost: 20,
                    fromNode: "B1",
                    toNode: "C",
                },
                {
                    cost: 1,
                    fromNode: "B1",
                    toNode: "A",
                },
            ]
        }
        if (fromNode.node === "B2") {
            return [
                {
                    cost: 1,
                    fromNode: "B2",
                    toNode: "C",
                },
                {
                    cost: 2,
                    fromNode: "B2",
                    toNode: "A",
                },
            ]
        }
        return [
            {
                cost: 20,
                fromNode: "C",
                toNode: "B1",
            },
            {
                cost: 1,
                fromNode: "C",
                toNode: "B2",
            },
        ]
    }

    const graph: SearchGraph<string> = {
        getConnections,
        getAllNodes: () => [
            {
                data: "A",
                key: "A",
            },
            {
                data: "B1",
                key: "B1",
            },
            {
                data: "B2",
                key: "B2",
            },
            {
                data: "C",
                key: "C",
            },
        ],
        getKeyForNode: (fromNode: string) => `${fromNode}`,
    }
    return graph
}
