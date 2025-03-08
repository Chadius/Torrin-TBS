import { SearchParameters } from "../searchParameters"
import { isValidValue } from "../../../utils/validityCheck"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../../search/searchPathAdapter/searchPathAdapter"

export interface PathStopConstraint {
    squaddieCanStopAtTheEndOfThisPath({
        newPath,
        searchParameters,
    }: {
        newPath: SearchPathAdapter
        searchParameters: SearchParameters
    }): boolean
}

export const AreValidParametersForPathCanStopCondition = ({
    newPath,
}: {
    newPath: SearchPathAdapter
}): boolean => {
    if (!isValidValue(newPath)) {
        return false
    }

    if (
        !isValidValue(SearchPathAdapterService.getMostRecentCoordinate(newPath))
    ) {
        return false
    }

    return isValidValue(
        SearchPathAdapterService.getMostRecentCoordinate(newPath).hexCoordinate
    )
}
