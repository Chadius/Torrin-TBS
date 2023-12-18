export enum DegreeOfSuccess {
    NONE = "NONE",
    CRITICAL_SUCCESS = "CRITICAL_SUCCESS",
    SUCCESS = "SUCCESS",
    FAILURE = "FAILURE",
    CRITICAL_FAILURE = "CRITICAL_FAILURE",
}

export const DegreeOfSuccessHelper = {
    atLeastSuccessful: (degree: DegreeOfSuccess): boolean => {
        return [
            DegreeOfSuccess.SUCCESS,
            DegreeOfSuccess.CRITICAL_SUCCESS,
        ].includes(degree)
    }
}

export interface ActionResultPerSquaddie {
    damageTaken: number;
    healingReceived: number;
    actorDegreeOfSuccess: DegreeOfSuccess;
}
