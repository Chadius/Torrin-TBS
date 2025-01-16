import { SearchGraph } from "../searchGraph/graph"
import { NodeArrayAStarPathfinder } from "./nodeArrayAStarPathfinder"
import { describe, expect, it } from "vitest"

describe("Node Array A* Pathfinder", () => {
    describe("getLowestCostConnectionsFromStartToEndNode", () => {
        it("will not move if it is at the endpoint", () => {
            const graph: SearchGraph<number> = {
                getConnections: (_fromNode: number) => [
                    {
                        cost: 0,
                        fromNode: 0,
                        toNode: 0,
                    },
                ],
                getAllNodes: () => [
                    {
                        data: 0,
                        key: "0",
                    },
                ],
                getKeyForNode: (_: number) => "0",
            }

            const lowestCostConnections =
                NodeArrayAStarPathfinder.getLowestCostConnectionsFromStartNodesToEndNode<number>(
                    {
                        startNodes: [0],
                        endNode: 0,
                        estimateCostBetweenNodeAndGoal: (
                            _fromNode: number,
                            _toNode: number
                        ) => 1,
                        graph,
                        nodesAreEqual: (fromNode, toNode) =>
                            fromNode === toNode,
                    }
                )

            expect(lowestCostConnections).toHaveLength(0)
            const nodeList =
                NodeArrayAStarPathfinder.getNodesFromSearchConnectionList<number>(
                    lowestCostConnections
                )
            expect(nodeList).toHaveLength(0)
        })
        it("will choose the lowest cost path starting from a single node", () => {
            const graph = makeGraphWith1SplitPath()
            const lowestCostConnections =
                NodeArrayAStarPathfinder.getLowestCostConnectionsFromStartNodesToEndNode<string>(
                    {
                        startNodes: ["A"],
                        endNode: "C",
                        estimateCostBetweenNodeAndGoal: (
                            fromNode: string,
                            _toNode: string
                        ) => {
                            switch (fromNode) {
                                case "A":
                                    return 2
                                case "B1":
                                case "B2":
                                    return 1
                                case "C":
                                    return 0
                            }
                        },
                        graph,
                        nodesAreEqual: (fromNode, toNode) => fromNode == toNode,
                    }
                )

            expect(lowestCostConnections).toHaveLength(2)
            const nodeList =
                NodeArrayAStarPathfinder.getNodesFromSearchConnectionList<string>(
                    lowestCostConnections
                )
            expect(nodeList).toEqual(["A", "B2"])
        })
        it("will choose the lowest cost path starting from multiple nodes", () => {
            const graph = makeGraphWith1SplitPath()
            const lowestCostConnections =
                NodeArrayAStarPathfinder.getLowestCostConnectionsFromStartNodesToEndNode<string>(
                    {
                        startNodes: ["A", "B1"],
                        endNode: "C",
                        estimateCostBetweenNodeAndGoal: (
                            fromNode: string,
                            _toNode: string
                        ) => {
                            switch (fromNode) {
                                case "A":
                                    return 2
                                case "B1":
                                case "B2":
                                    return 1
                                case "C":
                                    return 0
                            }
                        },
                        graph,
                        nodesAreEqual: (fromNode, toNode) => fromNode == toNode,
                    }
                )

            expect(lowestCostConnections).toHaveLength(2)
            const nodeList =
                NodeArrayAStarPathfinder.getNodesFromSearchConnectionList<string>(
                    lowestCostConnections
                )
            expect(nodeList).toEqual(["A", "B2"])
        })
    })
    describe("isEndNodeReachableFromStartNodes", () => {
        it("is reachable if it starts at the endpoint", () => {
            const graph: SearchGraph<number> = {
                getConnections: (_fromNode: number) => [
                    {
                        cost: 0,
                        fromNode: 0,
                        toNode: 0,
                    },
                ],
                getAllNodes: () => [
                    {
                        data: 0,
                        key: "0",
                    },
                ],
                getKeyForNode: (_: number) => "0",
            }

            expect(
                NodeArrayAStarPathfinder.isEndNodeReachableFromStartNodes<number>(
                    {
                        startNodes: [0],
                        endNode: 0,
                        estimateCostBetweenNodeAndGoal: (
                            _fromNode: number,
                            _toNode: number
                        ) => 1,
                        graph,
                        nodesAreEqual: (fromNode, toNode) =>
                            fromNode === toNode,
                    }
                )
            ).toBeTruthy()
        })
        it("is reachable if there is a path", () => {
            const graph = makeGraphWith1SplitPath()
            expect(
                NodeArrayAStarPathfinder.isEndNodeReachableFromStartNodes<string>(
                    {
                        startNodes: ["A"],
                        endNode: "C",
                        estimateCostBetweenNodeAndGoal: (
                            fromNode: string,
                            _toNode: string
                        ) => {
                            switch (fromNode) {
                                case "A":
                                    return 2
                                case "B1":
                                case "B2":
                                    return 1
                                case "C":
                                    return 0
                            }
                        },
                        graph,
                        nodesAreEqual: (fromNode, toNode) => fromNode == toNode,
                    }
                )
            ).toBeTruthy()
        })
        it("is not reachable if there is no path", () => {
            const graph = makeGraphWith1SplitPath()
            expect(
                NodeArrayAStarPathfinder.isEndNodeReachableFromStartNodes<string>(
                    {
                        startNodes: ["A"],
                        endNode: "Does not exist",
                        estimateCostBetweenNodeAndGoal: (
                            fromNode: string,
                            _toNode: string
                        ) => {
                            switch (fromNode) {
                                case "A":
                                    return 2
                                case "B1":
                                case "B2":
                                    return 1
                                case "C":
                                    return 0
                            }
                        },
                        graph,
                        nodesAreEqual: (fromNode, toNode) => fromNode == toNode,
                    }
                )
            ).toBeFalsy()
        })
    })
    describe("getPathsToAllReachableNodes", () => {
        it("will show all paths to all reachable nodes from a given start node", () => {
            const graph = makeGraphWith1SplitPath()
            const allPaths =
                NodeArrayAStarPathfinder.getPathsToAllReachableNodes<string>({
                    startNode: "A",
                    graph,
                })

            expect(
                NodeArrayAStarPathfinder.getNodesFromSearchConnectionList<string>(
                    allPaths["A"]
                )
            ).toEqual([])

            expect(
                NodeArrayAStarPathfinder.getNodesFromSearchConnectionList<string>(
                    allPaths["B1"]
                )
            ).toEqual(["A"])

            expect(
                NodeArrayAStarPathfinder.getNodesFromSearchConnectionList<string>(
                    allPaths["B2"]
                )
            ).toEqual(["A"])

            expect(
                NodeArrayAStarPathfinder.getNodesFromSearchConnectionList<string>(
                    allPaths["C"]
                )
            ).toEqual(["A", "B2"])
        })
    })
})

/*
A --1-> B1 -20--> C
  \-2-> B2 -1-/
* */
const makeGraphWith1SplitPath = () => {
    const getConnections = (fromNode: string) => {
        if (fromNode === "A") {
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
        if (fromNode === "B1") {
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
        if (fromNode === "B2") {
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
