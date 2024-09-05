import {
    AddPathCondition,
    AreValidParametersForAddPathCondition,
} from "./addPathCondition"
import { SearchPath } from "../searchPath"
import { SearchParameters } from "../searchParams"
import { isValidValue } from "../../../utils/validityCheck"

export class AddPathConditionMaximumDistance implements AddPathCondition {
    shouldAddNewPath({
        newPath,
        searchParameters,
    }: {
        newPath: SearchPath
        searchParameters: SearchParameters
    }): boolean {
        if (!AreValidParametersForAddPathCondition({ newPath })) {
            return undefined
        }

        if (!isValidValue(searchParameters.maximumDistanceMoved)) {
            return true
        }

        return (
            newPath.locationsTraveled.length <=
            searchParameters.maximumDistanceMoved + 1
        )
    }
}
