import {SearchState} from "../searchState";
import {SearchParameters} from "../searchParams";

export interface StopCondition {
    shouldStopSearching({workingState, searchParameters}: {
        workingState: SearchState,
        searchParameters: SearchParameters
    }): boolean;
}
