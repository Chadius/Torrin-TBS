import {SearchParametersHelper} from "../searchParams";
import {SearchPathHelper} from "../searchPath";
import {AddPathConditionPathIsLessThanTotalMovement} from "./addPathConditionPathIsLessThanTotalMovement";

describe('AddPathConditionPathIsLessThanTotalMovement', () => {
    it('knows if the current path is shorter than the total movement', () => {
        const pathAtHead = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 0}, cumulativeMovementCost: 0}, 0);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 0}, cumulativeMovementCost: 0}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 2, r: 0}, cumulativeMovementCost: 1}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 3, r: 0}, cumulativeMovementCost: 2}, 2);

        const searchParameters = SearchParametersHelper.new({
            numberOfActions: 3,
            movementPerAction: 2,
        });

        const condition = new AddPathConditionPathIsLessThanTotalMovement({});
        expect(condition.shouldAddNewPath({newPath: pathAtHead, searchParameters})).toBe(true);
    });
    it('knows if the current path is more than the total movement', () => {
        const pathAtHead = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 0}, cumulativeMovementCost: 0}, 0);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 0}, cumulativeMovementCost: 0}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 2, r: 0}, cumulativeMovementCost: 1}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 3, r: 0}, cumulativeMovementCost: 2}, 2);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 3, r: 1}, cumulativeMovementCost: 2}, 2);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 3, r: 2}, cumulativeMovementCost: 2}, 2);

        const searchParameters = SearchParametersHelper.new({
            numberOfActions: 3,
            movementPerAction: 2,
        });

        const condition = new AddPathConditionPathIsLessThanTotalMovement({});
        expect(condition.shouldAddNewPath({newPath: pathAtHead, searchParameters})).toBe(false);
    });
    it('returns true if search has unlimited movement', () => {
        const pathAtHead = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 0}, cumulativeMovementCost: 0}, 0);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 0}, cumulativeMovementCost: 0}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 2, r: 0}, cumulativeMovementCost: 1}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 3, r: 0}, cumulativeMovementCost: 2}, 2);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 3, r: 1}, cumulativeMovementCost: 2}, 2);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 3, r: 2}, cumulativeMovementCost: 2}, 2);

        const searchParameters = SearchParametersHelper.new({
            numberOfActions: undefined,
            movementPerAction: undefined,
        });

        const condition = new AddPathConditionPathIsLessThanTotalMovement({});
        expect(condition.shouldAddNewPath({newPath: pathAtHead, searchParameters})).toBe(true);
    });
    it('returns undefined if there is no path', () => {
        const pathAtHead = SearchPathHelper.newSearchPath();

        const searchParameters = SearchParametersHelper.new({
            numberOfActions: undefined,
            movementPerAction: undefined,
        });

        const condition = new AddPathConditionPathIsLessThanTotalMovement({});
        expect(condition.shouldAddNewPath({newPath: pathAtHead, searchParameters})).toBeUndefined();
    });
});
