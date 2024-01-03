export enum DegreeOfSuccess {
    NONE = "NONE",
    CRITICAL_SUCCESS = "CRITICAL_SUCCESS",
    SUCCESS = "SUCCESS",
    FAILURE = "FAILURE",
    CRITICAL_FAILURE = "CRITICAL_FAILURE",
}

export const DegreeOfSuccessService = {
    atLeastSuccessful: (degree: DegreeOfSuccess): boolean => {
        return [
            DegreeOfSuccess.SUCCESS,
            DegreeOfSuccess.CRITICAL_SUCCESS,
        ].includes(degree)
    },
    atBestFailure: (degree: DegreeOfSuccess): boolean => {
        return [
            DegreeOfSuccess.FAILURE,
            DegreeOfSuccess.CRITICAL_FAILURE,
        ].includes(degree)
    },
}
