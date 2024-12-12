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
    upgradeByOneStep: (degreeOfSuccess: DegreeOfSuccess): DegreeOfSuccess => {
        switch (degreeOfSuccess) {
            case DegreeOfSuccess.CRITICAL_FAILURE:
                return DegreeOfSuccess.FAILURE
            case DegreeOfSuccess.FAILURE:
                return DegreeOfSuccess.SUCCESS
            case DegreeOfSuccess.SUCCESS:
                return DegreeOfSuccess.CRITICAL_SUCCESS
            case DegreeOfSuccess.CRITICAL_SUCCESS:
                return DegreeOfSuccess.CRITICAL_SUCCESS
        }

        return DegreeOfSuccess.NONE
    },
    degradeByOneStep: (degreeOfSuccess: DegreeOfSuccess) => {
        switch (degreeOfSuccess) {
            case DegreeOfSuccess.CRITICAL_FAILURE:
                return DegreeOfSuccess.CRITICAL_FAILURE
            case DegreeOfSuccess.FAILURE:
                return DegreeOfSuccess.CRITICAL_FAILURE
            case DegreeOfSuccess.SUCCESS:
                return DegreeOfSuccess.FAILURE
            case DegreeOfSuccess.CRITICAL_SUCCESS:
                return DegreeOfSuccess.SUCCESS
        }

        return DegreeOfSuccess.NONE
    },
}
