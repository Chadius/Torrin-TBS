import { SearchPath } from "../searchPath"
import { SearchParameters } from "../searchParameters"
import {
    AreValidParametersForPathCanStopCondition,
    PathStopConstraint,
} from "./pathStopConstraint"

export class PathLengthIsLessThanMaximum implements PathStopConstraint {
    squaddieCanStopAtTheEndOfThisPath({
        newPath,
        searchParameters,
    }: {
        newPath: SearchPath
        searchParameters: SearchParameters
    }): boolean {
        if (!AreValidParametersForPathCanStopCondition({ newPath })) {
            return undefined
        }

        if (
            searchParameters.pathSizeConstraints.numberOfActions ===
                undefined ||
            searchParameters.pathSizeConstraints.movementPerAction === undefined
        ) {
            return true
        }

        const totalMovementThisRound: number =
            searchParameters.pathSizeConstraints.numberOfActions *
            searchParameters.pathSizeConstraints.movementPerAction
        return newPath.totalMovementCost <= totalMovementThisRound
    }
}
