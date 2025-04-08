import { getValidValueOrDefault } from "../utils/objectValidityCheck"

export interface ActionResourceCost {
    actionPoints: number
    numberOfTimesPerRound: number
    cooldownTurns: number
}

export const ActionResourceCostService = {
    new: ({
        actionPoints,
        numberOfTimesPerRound,
        cooldownTurns,
    }: {
        actionPoints?: number
        numberOfTimesPerRound?: number
        cooldownTurns?: number
    }): ActionResourceCost =>
        sanitize({
            actionPoints,
            numberOfTimesPerRound,
            cooldownTurns,
        }),
    sanitize: (actionResourceCost: ActionResourceCost): ActionResourceCost =>
        sanitize(actionResourceCost),
}

const sanitize = (
    actionResourceCost: ActionResourceCost
): ActionResourceCost => {
    if (!actionResourceCost) {
        return {
            actionPoints: 1,
            numberOfTimesPerRound: undefined,
            cooldownTurns: undefined,
        }
    }

    actionResourceCost.actionPoints = getValidValueOrDefault(
        actionResourceCost.actionPoints,
        1
    )
    if (actionResourceCost.actionPoints < 0) {
        actionResourceCost.actionPoints = 0
    }

    if (
        actionResourceCost.numberOfTimesPerRound != undefined &&
        actionResourceCost.numberOfTimesPerRound < 1
    ) {
        actionResourceCost.numberOfTimesPerRound = 1
    }
    return actionResourceCost
}
