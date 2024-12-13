import { SearchPath, SearchPathService } from "../searchPath"
import { SearchParameters } from "../searchParameters"
import { isValidValue } from "../../../utils/validityCheck"

export interface PathStopConstraint {
    squaddieCanStopAtTheEndOfThisPath({
        newPath,
        searchParameters,
    }: {
        newPath: SearchPath
        searchParameters: SearchParameters
    }): boolean
}

export const AreValidParametersForPathCanStopCondition = ({
    newPath,
}: {
    newPath: SearchPath
}): boolean => {
    if (!isValidValue(newPath)) {
        return false
    }

    if (!isValidValue(SearchPathService.getMostRecentLocation(newPath))) {
        return false
    }

    return isValidValue(
        SearchPathService.getMostRecentLocation(newPath).hexCoordinate
    )
}
