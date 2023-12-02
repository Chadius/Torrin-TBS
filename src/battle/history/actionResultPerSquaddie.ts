export enum DegreeOfSuccess {
    NONE = "NONE",
    SUCCESS = "SUCCESS",
    FAILURE = "FAILURE",
}

export const DegreeOfSuccessHelper = {
    atLeastSuccessful: (degree: DegreeOfSuccess): boolean => {
        return [
            DegreeOfSuccess.SUCCESS,
        ].includes(degree)
    }
}

export interface ActionResultPerSquaddie {
    damageTaken: number;
    healingReceived: number;
    actorDegreeOfSuccess: DegreeOfSuccess;
}
