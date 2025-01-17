interface TranspositionTableEntry<WorldModel> {
    worldModel: WorldModel
    depth: number
}

class TranspositionTable<WorldModel> {
    entriesByKey: { [key: string]: TranspositionTableEntry<WorldModel> }
    getKey: (worldModel: WorldModel) => string
    worldModelsAreEqual: (a: WorldModel, b: WorldModel) => boolean

    constructor(
        getKey: (worldModel: WorldModel) => string,
        worldModelsAreEqual: (a: WorldModel, b: WorldModel) => boolean
    ) {
        this.entriesByKey = {}
        this.getKey = getKey
        this.worldModelsAreEqual = worldModelsAreEqual
    }

    has(worldModel: WorldModel): boolean {
        const existingEntry = this.entriesByKey[this.getKey(worldModel)]
        if (existingEntry == undefined) return false
        return this.worldModelsAreEqual(existingEntry.worldModel, worldModel)
    }

    add(worldModel: WorldModel, depth: number) {
        const existingEntry = this.entriesByKey[this.getKey(worldModel)]

        if (existingEntry == undefined) {
            this.entriesByKey[this.getKey(worldModel)] = { worldModel, depth }
            return
        }

        if (depth < existingEntry.depth) {
            this.entriesByKey[this.getKey(worldModel)].depth = depth
        }
    }
}

export const IterativeDeepeningAStarPathfinder = {
    planAction: <WorldModel, Action>({
        worldModel,
        goal,
        action,
        applyActionToWorldModel,
        maxDepth,
    }: {
        worldModel: {
            initial: WorldModel
            getKey: (worldModel: WorldModel) => string
            areEqual: (a: WorldModel, b: WorldModel) => boolean
            clone: (worldModel: WorldModel) => WorldModel
        }
        goal: {
            estimateCost: (worldModel: WorldModel) => number
            isFulfilled: (worldModel: WorldModel) => boolean
        }
        action: {
            getCost: (action: Action) => number
            createActionGenerator: (worldModel: WorldModel) => Generator<Action>
        }
        applyActionToWorldModel: (
            worldModel: WorldModel,
            action: Action
        ) => void
        maxDepth: number
    }): Action[] => {
        let maximumCostCutoff: number = goal.estimateCost(worldModel.initial)
        let transpositionTable: TranspositionTable<WorldModel> =
            new TranspositionTable<WorldModel>(
                worldModel.getKey,
                worldModel.areEqual
            )
        let bestActions: Action[] = []
        while (maximumCostCutoff != undefined && maximumCostCutoff > 0) {
            ;({ maximumCostCutoff, actions: bestActions } = doDepthSearchFirst({
                worldModel,
                goal,
                action,
                applyActionToWorldModel,
                transpositionTable,
                maximumCostCutoff,
                maxDepth,
            }))
        }
        return bestActions
    },
}

const doDepthSearchFirst = <WorldModel, Action>({
    worldModel,
    goal,
    action,
    applyActionToWorldModel,
    transpositionTable,
    maximumCostCutoff,
    maxDepth,
}: {
    worldModel: {
        initial: WorldModel
        clone: (worldModel: WorldModel) => WorldModel
    }
    goal: {
        estimateCost: (worldModel: WorldModel) => number
        isFulfilled: (worldModel: WorldModel) => boolean
    }
    action: {
        getCost: (action: Action) => number
        createActionGenerator: (worldModel: WorldModel) => Generator<Action>
    }
    applyActionToWorldModel: (worldModel: WorldModel, action: Action) => void
    transpositionTable: TranspositionTable<WorldModel>
    maxDepth: number
    maximumCostCutoff: number
}): { maximumCostCutoff: number; actions: Action[] } => {
    const {
        models,
        actionsThatShouldBePerformed,
        actionGeneratorsPerWorldModel,
        costs,
    } = initializeDepthFirstSearchStorage<WorldModel, Action>({
        maxDepth,
        initialWorldModel: worldModel.initial,
        createActionGenerator: action.createActionGenerator,
    })
    let currentDepth: number = 0
    let smallestCostFound: number = undefined

    while (currentDepth >= 0) {
        if (goal.isFulfilled(models[currentDepth])) {
            return {
                maximumCostCutoff: 0,
                actions: actionsThatShouldBePerformed.filter(
                    (act) => act != undefined
                ),
            }
        }

        if (currentDepth >= maxDepth) {
            currentDepth -= 1
            continue
        }

        let cost = goal.estimateCost(models[currentDepth]) + costs[currentDepth]

        if (cost > maximumCostCutoff) {
            if (smallestCostFound == undefined || cost < smallestCostFound) {
                smallestCostFound = cost
            }
            currentDepth -= 1
            continue
        }

        let actionIteratorResult: IteratorResult<Action> =
            actionGeneratorsPerWorldModel[currentDepth].next()
        if (actionIteratorResult.done) {
            currentDepth -= 1
            continue
        }
        let nextAction: Action = actionIteratorResult.value

        let newWorldModel = createModelAtOneLevelDeeper<WorldModel, Action>({
            plan: {
                models,
                actionsThatShouldBePerformed,
                costs,
                nextAction,
                actionGeneratorsPerWorldModel,
            },
            action,
            applyActionToWorldModel,
            cloneWorldModel: worldModel.clone,
            currentDepth,
        })

        if (!transpositionTable.has(newWorldModel)) {
            currentDepth += 1
        }
        transpositionTable.add(newWorldModel, currentDepth)
    }
    return {
        maximumCostCutoff: smallestCostFound,
        actions: [],
    }
}

const initializeDepthFirstSearchStorage = <WorldModel, Action>({
    maxDepth,
    initialWorldModel,
    createActionGenerator,
}: {
    maxDepth: number
    initialWorldModel: WorldModel
    createActionGenerator: (worldModel: WorldModel) => Generator<Action>
}): {
    models: WorldModel[]
    actionsThatShouldBePerformed: Action[]
    costs: number[]
    actionGeneratorsPerWorldModel: Iterator<Action>[]
} => {
    const models: WorldModel[] = Array.from(
        new Array(maxDepth),
        () => undefined
    )
    const actionGeneratorsPerWorldModel: Iterator<Action>[] = Array.from(
        new Array(maxDepth),
        () => undefined
    )
    const actionsThatShouldBePerformed: Action[] = Array.from(
        new Array(maxDepth),
        () => undefined
    )

    const costs: number[] = Array.from(new Array(maxDepth), () => 0)

    models[0] = initialWorldModel
    actionGeneratorsPerWorldModel[0] = createActionGenerator(models[0])

    return {
        models,
        actionsThatShouldBePerformed,
        actionGeneratorsPerWorldModel,
        costs,
    }
}

const createModelAtOneLevelDeeper = <WorldModel, Action>({
    plan,
    action,
    cloneWorldModel,
    applyActionToWorldModel,
    currentDepth,
}: {
    plan: {
        models: WorldModel[]
        actionsThatShouldBePerformed: Action[]
        costs: number[]
        nextAction: Action
        actionGeneratorsPerWorldModel: Iterator<Action>[]
    }
    action: {
        getCost: (action: Action) => number
        createActionGenerator: (worldModel: WorldModel) => Generator<Action>
    }
    cloneWorldModel: (worldModel: WorldModel) => WorldModel
    applyActionToWorldModel: (worldModel: WorldModel, action: Action) => void
    currentDepth: number
}): WorldModel => {
    plan.models[currentDepth + 1] = cloneWorldModel(plan.models[currentDepth])
    plan.actionsThatShouldBePerformed[currentDepth] = plan.nextAction
    applyActionToWorldModel(plan.models[currentDepth + 1], plan.nextAction)
    plan.actionGeneratorsPerWorldModel[currentDepth + 1] =
        action.createActionGenerator(plan.models[currentDepth + 1])
    plan.costs[currentDepth + 1] =
        plan.costs[currentDepth] + action.getCost(plan.nextAction)
    return plan.models[currentDepth + 1]
}
