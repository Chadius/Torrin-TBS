import { describe, expect, it } from "vitest"
import { IterativeDeepeningAStarPathfinder } from "./iterativeDeepeningAStarPathfinding"

type SafeCrackerCombination = [number, number, number]

type SafeCrackerAction = {
    digit: number
    value: number
}

describe("Iterative Deepening A* Search", () => {
    it("will do nothing if it is already at the goal", () => {
        const startingSafeCombination: SafeCrackerCombination = [0, 0, 0]
        const correctSafeCombination: SafeCrackerCombination = [0, 0, 0]
        const maxDepth: number = 100

        const actionPlan = calculateActionsNeededToCrackSafe(
            startingSafeCombination,
            maxDepth,
            correctSafeCombination
        )

        expect(actionPlan).toEqual([])
    })
    it("can make a plan that requires a single decision", () => {
        const startingSafeCombination: SafeCrackerCombination = [0, 0, 0]
        const correctSafeCombination: SafeCrackerCombination = [1, 0, 0]
        const maxDepth: number = 1

        const actionPlan = calculateActionsNeededToCrackSafe(
            startingSafeCombination,
            maxDepth,
            correctSafeCombination
        )

        expect(actionPlan).toEqual([
            {
                digit: 0,
                value: 1,
            },
        ])
    })
    it("can make a plan that requires multiple decisions", () => {
        const startingSafeCombination: SafeCrackerCombination = [0, 0, 0]
        const correctSafeCombination: SafeCrackerCombination = [2, 1, 0]
        const maxDepth: number = 100

        const actionPlan = calculateActionsNeededToCrackSafe(
            startingSafeCombination,
            maxDepth,
            correctSafeCombination
        )

        expect(actionPlan).toHaveLength(2)
        expect(actionPlan).toEqual(
            expect.arrayContaining([
                {
                    digit: 0,
                    value: 2,
                },
                {
                    digit: 1,
                    value: 1,
                },
            ])
        )
    })
    it("will indicate it gave up if solution requires too many decisions", () => {
        const startingSafeCombination: SafeCrackerCombination = [0, 0, 0]
        const correctSafeCombination: SafeCrackerCombination = [2, 1, 1]
        const maxDepth: number = 2
        const actionPlan = calculateActionsNeededToCrackSafe(
            startingSafeCombination,
            maxDepth,
            correctSafeCombination
        )

        expect(actionPlan).toHaveLength(0)
    })
})

const cloneSafeCrackerCombination = (
    worldModel: SafeCrackerCombination
): SafeCrackerCombination => [worldModel[0], worldModel[1], worldModel[2]]

const isSafeCombinationCorrect = (
    worldModel: SafeCrackerCombination,
    correctSafeCombination: SafeCrackerCombination
): boolean => {
    return (
        worldModel[0] === correctSafeCombination[0] &&
        worldModel[1] === correctSafeCombination[1] &&
        worldModel[2] === correctSafeCombination[2]
    )
}

const estimateCostToCorrectCombination = (
    worldModel: SafeCrackerCombination,
    correctSafeCombination: SafeCrackerCombination
) => {
    let cost: number = 0
    if (worldModel[0] != correctSafeCombination[0]) {
        cost += 1
    }
    if (worldModel[1] != correctSafeCombination[1]) {
        cost += 1
    }
    if (worldModel[2] != correctSafeCombination[2]) {
        cost += 1
    }
    return cost
}

const applyActionToSafeCrackerCombination = (
    worldModel: SafeCrackerCombination,
    action: SafeCrackerAction
): void => {
    worldModel[action.digit] = action.value
}

const getCostOfSafeCrackerAction = (_action: SafeCrackerAction): number => 1

const getSafeCrackerCombinationHashKey = (
    worldModel: SafeCrackerCombination
): string => `${worldModel[0]}${worldModel[1]}${worldModel[2]}`

const safeCrackerCombinationsAreEqual = (
    a: SafeCrackerCombination,
    b: SafeCrackerCombination
): boolean =>
    getSafeCrackerCombinationHashKey(a) === getSafeCrackerCombinationHashKey(b)

function* createActionGeneratorForSafeCrackerCombination(
    _worldModel: SafeCrackerCombination
): Generator<SafeCrackerAction> {
    let actions: SafeCrackerAction[] = [
        {
            digit: 0,
            value: 0,
        },
        {
            digit: 1,
            value: 0,
        },
        {
            digit: 2,
            value: 0,
        },
        {
            digit: 0,
            value: 1,
        },
        {
            digit: 1,
            value: 1,
        },
        {
            digit: 2,
            value: 1,
        },
        {
            digit: 0,
            value: 2,
        },
        {
            digit: 1,
            value: 2,
        },
        {
            digit: 2,
            value: 2,
        },
    ]
    for (let i = 0; i < actions.length; i++) {
        yield actions[i]
    }
}

const calculateActionsNeededToCrackSafe = (
    startingSafeCombination: [number, number, number],
    maxDepth: number,
    correctSafeCombination: [number, number, number]
) => {
    return IterativeDeepeningAStarPathfinder.planAction<
        SafeCrackerCombination,
        SafeCrackerAction
    >({
        worldModel: {
            initial: startingSafeCombination,
            getKey: getSafeCrackerCombinationHashKey,
            areEqual: safeCrackerCombinationsAreEqual,
            clone: (worldModel: SafeCrackerCombination) =>
                cloneSafeCrackerCombination(worldModel),
        },
        goal: {
            estimateCost: (worldModel: SafeCrackerCombination) =>
                estimateCostToCorrectCombination(
                    worldModel,
                    correctSafeCombination
                ),
            isFulfilled: (worldModel: SafeCrackerCombination) =>
                isSafeCombinationCorrect(worldModel, correctSafeCombination),
        },
        action: {
            getCost: (action: SafeCrackerAction) =>
                getCostOfSafeCrackerAction(action),
            createActionGenerator: (worldModel: SafeCrackerCombination) =>
                createActionGeneratorForSafeCrackerCombination(worldModel),
        },
        applyActionToWorldModel: (
            worldModel: SafeCrackerCombination,
            action: SafeCrackerAction
        ) => applyActionToSafeCrackerCombination(worldModel, action),
        maxDepth,
    })
}
