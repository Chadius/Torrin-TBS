import { SearchPath } from "../searchPath"
import { SearchParameters } from "../searchParams"
import { isValidValue } from "../../../utils/validityCheck"
import { AreValidParametersForAddPathCondition } from "../addPathConditions/addPathCondition"
import { PathCanStopCondition } from "./pathCanStopCondition"

export class PathCanStopConditionMinimumDistance
    implements PathCanStopCondition
{
    constructor({}: {}) {}

    shouldMarkPathLocationAsStoppable({
        newPath,
        searchParameters,
    }: {
        newPath: SearchPath
        searchParameters: SearchParameters
    }): boolean {
        if (!AreValidParametersForAddPathCondition({ newPath })) {
            return undefined
        }

        if (!isValidValue(searchParameters.minimumDistanceMoved)) {
            return true
        }

        return (
            newPath.locationsTraveled.length >=
            searchParameters.minimumDistanceMoved + 1
        )
    }
}
