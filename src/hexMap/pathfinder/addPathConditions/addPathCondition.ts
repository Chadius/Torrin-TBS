import { SearchParameters } from "../searchParams"
import { SearchPath, SearchPathHelper } from "../searchPath"
import { isValidValue } from "../../../utils/validityCheck"

export interface AddPathCondition {
    shouldAddNewPath({
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

    if (!isValidValue(SearchPathHelper.getMostRecentLocation(newPath))) {
        return false
    }

    return isValidValue(
        SearchPathHelper.getMostRecentLocation(newPath).hexCoordinate
    )
}
