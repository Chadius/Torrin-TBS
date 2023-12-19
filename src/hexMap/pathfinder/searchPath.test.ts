import {SearchPathHelper} from "./searchPath";

describe('SearchPath', () => {
    it('knows if two paths share the same ancestor', () => {
        const path0 = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(path0, {hexCoordinate: {q: 0, r: 0}, movementCost: 0}, 0);
        SearchPathHelper.add(path0, {hexCoordinate: {q: 1, r: 0}, movementCost: 0}, 0);
        SearchPathHelper.add(path0, {hexCoordinate: {q: 2, r: 0}, movementCost: 0}, 0);
        SearchPathHelper.add(path0, {hexCoordinate: {q: 3, r: 0}, movementCost: 0}, 0);

        const path1 = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(path1, {hexCoordinate: {q: 0, r: 0}, movementCost: 0}, 0);
        SearchPathHelper.add(path1, {hexCoordinate: {q: 1, r: 0}, movementCost: 0}, 0);
        SearchPathHelper.add(path1, {hexCoordinate: {q: 1, r: 1}, movementCost: 0}, 0);

        expect(SearchPathHelper.pathsHaveTheSameAncestor({
            pathA: path0,
            pathB: path1,
            ancestor: {q: 0, r: 0},
        })).toBeTruthy();

        expect(SearchPathHelper.pathsHaveTheSameAncestor({
            pathA: path0,
            pathB: path1,
            ancestor: {q: 1, r: 0},
        })).toBeTruthy();

        expect(SearchPathHelper.pathsHaveTheSameAncestor({
            pathA: path0,
            pathB: path1,
            ancestor: {q: 2, r: 0},
        })).toBeFalsy();

        expect(SearchPathHelper.pathsHaveTheSameAncestor({
            pathA: path0,
            pathB: path1,
            ancestor: {q: 9001, r: 90210},
        })).toBeFalsy();
    });
});
