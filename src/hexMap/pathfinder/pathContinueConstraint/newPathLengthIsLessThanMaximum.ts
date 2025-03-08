import {
    AreValidParametersForAddPathCondition,
    PathContinueConstraint,
} from "./pathContinueConstraint"
import { SearchParameters } from "../searchParameters"
import { isValidValue } from "../../../utils/validityCheck"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../../search/searchPathAdapter/searchPathAdapter"

export class NewPathLengthIsLessThanMaximum implements PathContinueConstraint {
    shouldContinue({
        newPath,
        searchParameters,
    }: {
        newPath: SearchPathAdapter
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
            SearchPathAdapterService.getCoordinates(newPath).length <=
            searchParameters.pathSizeConstraints.maximumDistanceMoved + 1
        )
    }
}
