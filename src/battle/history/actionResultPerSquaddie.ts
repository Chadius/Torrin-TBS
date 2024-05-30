import { isValidValue } from "../../utils/validityCheck"
import { DegreeOfSuccess } from "../actionCalculator/degreeOfSuccess"

export interface ActionResultPerSquaddie {
    damageTaken: number
    healingReceived: number
    actorDegreeOfSuccess: DegreeOfSuccess
}

export const ActionResultPerSquaddieService = {
    new: ({
        damageTaken,
        healingReceived,
        actorDegreeOfSuccess,
    }: {
        damageTaken?: number
        healingReceived?: number
        actorDegreeOfSuccess: DegreeOfSuccess
    }): ActionResultPerSquaddie => {
        const newResult: ActionResultPerSquaddie = {
            damageTaken: damageTaken,
            healingReceived: healingReceived,
            actorDegreeOfSuccess: actorDegreeOfSuccess,
        }
        return sanitize(newResult)
    },
    sanitize: ({
        result,
    }: {
        result: ActionResultPerSquaddie
    }): ActionResultPerSquaddie => {
        return sanitize(result)
    },
    isSquaddieHindered: (result: ActionResultPerSquaddie): boolean => {
        return result.damageTaken > 0
    },
    isSquaddieHelped: (result: ActionResultPerSquaddie): boolean => {
        return result.healingReceived > 0
    },
}

const sanitize = (result: ActionResultPerSquaddie): ActionResultPerSquaddie => {
    result.damageTaken =
        isValidValue(result.damageTaken) && result.damageTaken >= 0
            ? result.damageTaken
            : 0
    result.healingReceived =
        isValidValue(result.healingReceived) && result.healingReceived >= 0
            ? result.healingReceived
            : 0

    return result
}
