import {
    AreValidParametersForAddPathCondition,
    PathContinueConstraint,
} from "./pathContinueConstraint"
import { SearchPath } from "../searchPath"
import { SearchParameters } from "../searchParameters"
import { isValidValue } from "../../../utils/validityCheck"

export class NewPathLengthIsLessThanMaximum implements PathContinueConstraint {
    shouldContinue({
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
                searchParameters.pathSizeConstraints.maximumDistanceMoved
            )
        ) {
            return true
        }

        return (
            newPath.coordinatesTraveled.length <=
            searchParameters.pathSizeConstraints.maximumDistanceMoved + 1
        )
    }
}
