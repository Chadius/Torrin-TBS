import { SearchPathService } from "./searchPath"
import { describe, expect, it } from "vitest"

describe("SearchPath", () => {
    it("knows if two paths share the same ancestor", () => {
        const path0 = SearchPathService.newSearchPath()
        SearchPathService.add(
            path0,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathService.add(
            path0,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathService.add(
            path0,
            { hexCoordinate: { q: 2, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathService.add(
            path0,
            { hexCoordinate: { q: 3, r: 0 }, cumulativeMovementCost: 0 },
            0
        )

        const path1 = SearchPathService.newSearchPath()
        SearchPathService.add(
            path1,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathService.add(
            path1,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathService.add(
            path1,
            { hexCoordinate: { q: 1, r: 1 }, cumulativeMovementCost: 0 },
            0
        )

        expect(
            SearchPathService.pathsHaveTheSameAncestor({
                pathA: path0,
                pathB: path1,
                ancestor: { q: 0, r: 0 },
            })
        ).toBeTruthy()

        expect(
            SearchPathService.pathsHaveTheSameAncestor({
                pathA: path0,
                pathB: path1,
                ancestor: { q: 1, r: 0 },
            })
        ).toBeTruthy()

        expect(
            SearchPathService.pathsHaveTheSameAncestor({
                pathA: path0,
                pathB: path1,
                ancestor: { q: 2, r: 0 },
            })
        ).toBeFalsy()

        expect(
            SearchPathService.pathsHaveTheSameAncestor({
                pathA: path0,
                pathB: path1,
                ancestor: { q: 9001, r: 90210 },
            })
        ).toBeFalsy()
    })
})
