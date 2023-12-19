import {SearchParameters, SearchParametersHelper} from "../searchParams";
import {SearchStateHelper} from "../searchState";
import {SearchPathHelper} from "../searchPath";
import {StopConditionStopLocationFound} from "./stopConditionStopLocationFound";

describe('Stop Condition when pathfinding', () => {
    it('will stop when the head has reached the stop location', () => {
        const condition = new StopConditionStopLocationFound();
        const searchParameters: SearchParameters = SearchParametersHelper.new({
            stopLocation: {q: 1, r: 0},
        });

        const pathAtHead = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 0}, movementCost: 0}, 0);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 0}, movementCost: 0}, 0);

        const workingState = SearchStateHelper.newFromSearchParameters(searchParameters);
        workingState.searchPathQueue.enqueue(pathAtHead);

        condition.shouldStopSearching({
            workingState,
            searchParameters,
        });

        expect(condition.shouldStopSearching({workingState, searchParameters})).toBe(true);
    });
    it('will not stop if the head has not reached the stop location', () => {
        const condition = new StopConditionStopLocationFound();
        const searchParameters: SearchParameters = SearchParametersHelper.new({
            stopLocation: {q: 1, r: 0},
        });

        const pathAtHead = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 0}, movementCost: 0}, 0);

        const workingState = SearchStateHelper.newFromSearchParameters(searchParameters);
        workingState.searchPathQueue.enqueue(pathAtHead);

        condition.shouldStopSearching({
            workingState,
            searchParameters,
        });

        expect(condition.shouldStopSearching({workingState, searchParameters})).toBe(false);
    });
    it('will not stop when there are no paths', () => {
        const condition = new StopConditionStopLocationFound();
        const searchParameters: SearchParameters = SearchParametersHelper.new({
            stopLocation: {q: 1, r: 0},
        });

        const workingState = SearchStateHelper.newFromSearchParameters(searchParameters);

        condition.shouldStopSearching({
            workingState,
            searchParameters,
        });

        expect(condition.shouldStopSearching({workingState, searchParameters})).toBe(false);
    });
    it('will not stop when there is no stop location', () => {
        const condition = new StopConditionStopLocationFound();
        const searchParameters: SearchParameters = SearchParametersHelper.new({
        });

        const pathAtHead = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 0}, movementCost: 0}, 0);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 0}, movementCost: 0}, 0);

        const workingState = SearchStateHelper.newFromSearchParameters(searchParameters);
        workingState.searchPathQueue.enqueue(pathAtHead);

        condition.shouldStopSearching({
            workingState,
            searchParameters,
        });

        expect(condition.shouldStopSearching({workingState, searchParameters})).toBe(false);
    });
});
