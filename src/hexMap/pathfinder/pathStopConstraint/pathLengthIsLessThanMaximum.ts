import { SearchParameters } from "../searchParameters"
import {
    AreValidParametersForPathCanStopCondition,
    PathStopConstraint,
} from "./pathStopConstraint"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../../search/searchPathAdapter/searchPathAdapter"

export class PathLengthIsLessThanMaximum implements PathStopConstraint {
    squaddieCanStopAtTheEndOfThisPath({
        newPath,
        searchParameters,
    }: {
        newPath: SearchPathAdapter
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
        return (
            SearchPathAdapterService.getTotalMovementCost(newPath) <=
            totalMovementThisRound
        )
    }
}
