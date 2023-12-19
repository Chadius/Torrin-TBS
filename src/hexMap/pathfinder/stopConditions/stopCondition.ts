import {SearchState} from "../searchState";
import {SearchParameters} from "../searchParams";
import {SearchPathHelper} from "../searchPath";
import {isValidValue} from "../../../utils/validityCheck";

export interface StopCondition {
    shouldStopSearching({workingState, searchParameters}:{workingState: SearchState, searchParameters: SearchParameters}): boolean;
}
