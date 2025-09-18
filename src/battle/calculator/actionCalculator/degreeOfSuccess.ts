import { EnumLike } from "../../../utils/enum"

export const DegreeOfSuccess = {
    NONE: "NONE",
    CRITICAL_SUCCESS: "CRITICAL_SUCCESS",
    SUCCESS: "SUCCESS",
    FAILURE: "FAILURE",
    CRITICAL_FAILURE: "CRITICAL_FAILURE",
} as const satisfies Record<string, string>

export type TDegreeOfSuccess = EnumLike<typeof DegreeOfSuccess>

export type DegreeOfSuccessAndSuccessBonus = {
    degreeOfSuccess: TDegreeOfSuccess
    successBonus: number | undefined
}

export const DegreeOfSuccessService = {
    atLeastSuccessful: (degree: TDegreeOfSuccess): boolean =>
        new Set<TDegreeOfSuccess>([
            DegreeOfSuccess.SUCCESS,
            DegreeOfSuccess.CRITICAL_SUCCESS,
        ]).has(degree),
    atBestFailure: (degree: TDegreeOfSuccess): boolean =>
        new Set<TDegreeOfSuccess>([
            DegreeOfSuccess.FAILURE,
            DegreeOfSuccess.CRITICAL_FAILURE,
        ]).has(degree),
    upgradeByOneStep: (degreeOfSuccess: TDegreeOfSuccess): TDegreeOfSuccess => {
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
    degradeByOneStep: (degreeOfSuccess: TDegreeOfSuccess) => {
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
