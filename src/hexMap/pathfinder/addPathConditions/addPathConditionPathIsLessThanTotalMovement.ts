import {
    AddPathCondition,
    AreValidParametersForAddPathCondition,
} from "./addPathCondition"
import { SearchPath } from "../searchPath"
import { SearchParameters } from "../searchParams"

export class AddPathConditionPathIsLessThanTotalMovement
    implements AddPathCondition
{
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

        if (
            searchParameters.numberOfActions === undefined ||
            searchParameters.movementPerAction === undefined
        ) {
            return true
        }

        const totalMovementThisRound: number =
            searchParameters.numberOfActions *
            searchParameters.movementPerAction
        return newPath.totalMovementCost <= totalMovementThisRound
    }
}
