import { SearchParameters } from "../searchParameters"
import { isValidValue } from "../../../utils/validityCheck"
import { AreValidParametersForAddPathCondition } from "../pathContinueConstraint/pathContinueConstraint"
import { PathStopConstraint } from "./pathStopConstraint"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../../search/searchPathAdapter/searchPathAdapter"

export class PathLengthIsMoreThanMinimum implements PathStopConstraint {
    squaddieCanStopAtTheEndOfThisPath({
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
                searchParameters.pathSizeConstraints.minimumDistanceMoved
            )
        ) {
            return true
        }

        return (
            SearchPathAdapterService.getCoordinates(newPath).length >=
            searchParameters.pathSizeConstraints.minimumDistanceMoved + 1
        )
    }
}
