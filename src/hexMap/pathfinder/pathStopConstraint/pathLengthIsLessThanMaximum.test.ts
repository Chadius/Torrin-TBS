import { SearchParametersService } from "../searchParameters"
import { SearchPathService } from "../searchPath"
import { PathLengthIsLessThanMaximum } from "./pathLengthIsLessThanMaximum"

describe("AddPathConditionPathIsLessThanTotalMovement", () => {
    it("knows if the current path is shorter than the total movement", () => {
        const pathAtHead = SearchPathService.newSearchPath()
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            1
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 2, r: 0 }, cumulativeMovementCost: 1 },
            1
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 3, r: 0 }, cumulativeMovementCost: 2 },
            2
        )

        const searchParameters = SearchParametersService.new({
            pathSizeConstraints: {
                numberOfActions: 3,
                movementPerAction: 2,
            },
            goal: {},
        })

        const condition = new PathLengthIsLessThanMaximum()
        expect(
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })
    it("knows if the current path is more than the total movement", () => {
        const pathAtHead = SearchPathService.newSearchPath()
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            1
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 2, r: 0 }, cumulativeMovementCost: 1 },
            1
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 3, r: 0 }, cumulativeMovementCost: 2 },
            2
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 3, r: 1 }, cumulativeMovementCost: 2 },
            2
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 3, r: 2 }, cumulativeMovementCost: 2 },
            2
        )

        const searchParameters = SearchParametersService.new({
            pathSizeConstraints: {
                numberOfActions: 3,
                movementPerAction: 2,
            },
            goal: {},
        })

        const condition = new PathLengthIsLessThanMaximum()
        expect(
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(false)
    })
    it("returns true if search has unlimited movement", () => {
        const pathAtHead = SearchPathService.newSearchPath()
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 0, r: 0 }, cumulativeMovementCost: 0 },
            0
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 1, r: 0 }, cumulativeMovementCost: 0 },
            1
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 2, r: 0 }, cumulativeMovementCost: 1 },
            1
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 3, r: 0 }, cumulativeMovementCost: 2 },
            2
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 3, r: 1 }, cumulativeMovementCost: 2 },
            2
        )
        SearchPathService.add(
            pathAtHead,
            { hexCoordinate: { q: 3, r: 2 }, cumulativeMovementCost: 2 },
            2
        )

        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        const condition = new PathLengthIsLessThanMaximum()
        expect(
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBe(true)
    })
    it("returns undefined if there is no path", () => {
        const pathAtHead = SearchPathService.newSearchPath()

        const searchParameters = SearchParametersService.new({
            goal: {},
        })

        const condition = new PathLengthIsLessThanMaximum()
        expect(
            condition.squaddieCanStopAtTheEndOfThisPath({
                newPath: pathAtHead,
                searchParameters,
            })
        ).toBeUndefined()
    })
})