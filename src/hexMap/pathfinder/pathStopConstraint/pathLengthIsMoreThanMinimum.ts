import { SearchPath } from "../searchPath"
import { SearchParameters } from "../searchParameters"
import { isValidValue } from "../../../utils/validityCheck"
import { AreValidParametersForAddPathCondition } from "../pathContinueConstraint/pathContinueConstraint"
import { PathStopConstraint } from "./pathStopConstraint"

export class PathLengthIsMoreThanMinimum implements PathStopConstraint {
    squaddieCanStopAtTheEndOfThisPath({
        newPath,
        searchParameters,
    }: {
        newPath: SearchPath
        searchParameters: SearchParameters
    }): boolean {
        if (!AreValidParametersForAddPathCondition({ newPath })) {
            return undefined
        }

        if (
            !isValidValue(
                searchParameters.pathSizeConstraints.minimumDistanceMoved
            )
        ) {
            return true
        }

        return (
            newPath.coordinatesTraveled.length >=
            searchParameters.pathSizeConstraints.minimumDistanceMoved + 1
        )
    }
}
