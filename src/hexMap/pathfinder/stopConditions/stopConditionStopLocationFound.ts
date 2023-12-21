import {SearchState} from "../searchState";
import {SearchParameters} from "../searchParams";
import {SearchPathHelper} from "../searchPath";
import {isValidValue} from "../../../utils/validityCheck";
import {StopCondition} from "./stopCondition";

export class StopConditionStopLocationFound implements StopCondition {
    shouldStopSearching({workingState, searchParameters}: {
        workingState: SearchState,
        searchParameters: SearchParameters
    }): boolean {
        if (!isValidValue(searchParameters.stopLocations)) {
            return false;
        }

        const lowestCostPath = workingState.searchPathQueue.peek();
        if (lowestCostPath === undefined) {
            return false;
        }

        const headTile = SearchPathHelper.getMostRecentTileLocation(lowestCostPath);
        return headTile.hexCoordinate.q === searchParameters.stopLocations.q && headTile.hexCoordinate.r === searchParameters.stopLocations.r;
    }
}
