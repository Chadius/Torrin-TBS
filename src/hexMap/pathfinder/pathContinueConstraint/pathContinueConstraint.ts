import { SearchParameters } from "../searchParameters"
import { SearchPath, SearchPathService } from "../searchPath"
import { isValidValue } from "../../../utils/validityCheck"

export interface PathContinueConstraint {
    shouldContinue({
        newPath,
        searchParameters,
    }: {
        newPath: SearchPath
        searchParameters: SearchParameters
    }): boolean
}

export const AreValidParametersForAddPathCondition = ({
    newPath,
}: {
    newPath: SearchPath
}): boolean => {
    if (!isValidValue(newPath)) {
        return false
    }

    if (!isValidValue(SearchPathService.getMostRecentCoordinate(newPath))) {
        return false
    }

    return isValidValue(
        SearchPathService.getMostRecentCoordinate(newPath).hexCoordinate
    )
}
