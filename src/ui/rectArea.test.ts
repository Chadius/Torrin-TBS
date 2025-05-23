import {
    HorizontalAnchor,
    RectArea,
    RectAreaService,
    VerticalAnchor,
} from "./rectArea"
import { HORIZONTAL_ALIGN, VERTICAL_ALIGN, WINDOW_SPACING } from "./constants"
import { beforeEach, describe, expect, it } from "vitest"

describe("RectArea", () => {
    describe("RectArea created from Position arguments", () => {
        it("can make a new Rectangle with top, left, width and height", () => {
            const rect = RectAreaService.new({
                top: 0,
                left: 10,
                height: 30,
                width: 20,
            })

            expect(rect.top).toBe(0)
            expect(rect.left).toBe(10)
            expect(rect.height).toBe(30)
            expect(rect.width).toBe(20)
        })
        it("can make a new Rectangle with top, left, bottom and right", () => {
            const rect = RectAreaService.new({
                top: 0,
                left: 10,
                bottom: 20,
                right: 30,
            })

            expect(rect.top).toBe(0)
            expect(rect.left).toBe(10)
            expect(rect.height).toBe(20)
            expect(rect.width).toBe(20)
        })
    })
    describe("RectArea created from Screen Percentage arguments", () => {
        it("can make a new Rectangle with screen percentage top, left, width and height", () => {
            const rect = RectAreaService.new({
                screenWidth: 1000,
                screenHeight: 500,
                percentTop: 10,
                percentLeft: 20,
                percentHeight: 40,
                percentWidth: 30,
            })

            expect(rect.top).toBe(50)
            expect(rect.left).toBe(200)
            expect(rect.height).toBe(200)
            expect(rect.width).toBe(300)
        })

        it("can make a new Rectangle with screen percentage top, left, bottom and right", () => {
            const rect = RectAreaService.new({
                screenWidth: 1000,
                screenHeight: 500,
                percentTop: 10,
                percentLeft: 20,
                percentBottom: 40,
                percentRight: 30,
            })

            expect(rect.top).toBe(50)
            expect(rect.left).toBe(200)
            expect(rect.height).toBe(150)
            expect(rect.width).toBe(100)
        })
    })
    describe("RectArea created from 12 point column", () => {
        it("can make a new Rectangle with screen dimensions, start column, end column and top and bottom", () => {
            const rect = RectAreaService.new({
                screenWidth: 1200,
                screenHeight: 500,
                startColumn: 1,
                endColumn: 3,
                top: 20,
                bottom: 100,
            })

            expect(rect.top).toBe(20)
            expect(rect.left).toBe(100)
            expect(rect.height).toBe(80)
            expect(rect.width).toBe(300)
        })

        it("can make a new Rectangle with screen dimensions, start column, end column and percent top and percent bottom", () => {
            const rect = RectAreaService.new({
                screenWidth: 1200,
                screenHeight: 500,
                startColumn: 11,
                endColumn: 12,
                percentTop: 10,
                percentBottom: 30,
            })

            expect(rect.top).toBe(50)
            expect(rect.left).toBe(1100)
            expect(rect.height).toBe(100)
            expect(rect.width).toBe(200)
        })

        it("can make a new Rectangle with screen dimensions, left, end column and top and percent bottom", () => {
            const rect = RectAreaService.new({
                screenWidth: 1200,
                screenHeight: 500,
                left: 100,
                endColumn: 11,
                top: 10,
                percentBottom: 30,
            })

            expect(rect.top).toBe(10)
            expect(rect.left).toBe(100)
            expect(rect.height).toBe(140)
            expect(rect.width).toBe(1100)
        })

        it("can apply margins to a rectangle created with columns", () => {
            const rect = RectAreaService.new({
                screenWidth: 1200,
                screenHeight: 500,
                startColumn: 1,
                endColumn: 3,
                top: 20,
                bottom: 100,
                margin: [10, 20, 30, 40],
            })

            expect(rect.top).toBe(20 + 10)
            expect(rect.left).toBe(100 + 40)
            expect(rect.height).toBe(100 - 30 - (20 + 10))
            expect(rect.width).toBe(400 - 20 - (100 + 40))
        })
    })
    describe("RectArea created from right and width and bottom and height", () => {
        it("left and width", () => {
            const rect = RectAreaService.new({
                right: 50,
                width: 40,
                top: 100,
                height: 20,
            })

            expect(RectAreaService.left(rect)).toBe(10)
        })

        it("bottom and height", () => {
            const rect = RectAreaService.new({
                left: 10,
                right: 50,
                height: 20,
                bottom: 100,
            })

            expect(RectAreaService.top(rect)).toBe(80)
        })
    })
    describe("RectArea created from center and length", () => {
        it("centerX and width", () => {
            const rect = RectAreaService.new({
                centerX: 30,
                width: 20,
                top: 100,
                height: 20,
            })

            expect(RectAreaService.left(rect)).toBe(20)
            expect(RectAreaService.right(rect)).toBe(40)
        })

        it("centerY and height", () => {
            const rect = RectAreaService.new({
                left: 20,
                width: 40,
                centerY: 400,
                height: 20,
            })

            expect(RectAreaService.top(rect)).toBe(390)
            expect(RectAreaService.bottom(rect)).toBe(410)
        })
    })
    describe("RectArea anchored to another rect", () => {
        it("can create a rect with the same top and left corner", () => {
            const baseRect = RectAreaService.new({
                top: 10,
                left: 20,
                height: 30,
                width: 40,
            })

            const rect = RectAreaService.new({
                baseRectangle: baseRect,
                anchorLeft: HorizontalAnchor.LEFT,
                anchorTop: VerticalAnchor.TOP,
                height: 70,
                width: 50,
            })

            expect(rect.top).toBe(baseRect.top)
            expect(rect.left).toBe(baseRect.left)
            expect(rect.height).toBe(70)
            expect(rect.width).toBe(50)
        })
        it("can create a rect in the middle and center", () => {
            const baseRect = RectAreaService.new({
                top: 10,
                left: 20,
                height: 30,
                width: 40,
            })

            const rect = RectAreaService.new({
                baseRectangle: baseRect,
                anchorLeft: HorizontalAnchor.MIDDLE,
                anchorTop: VerticalAnchor.CENTER,
                height: 70,
                width: 50,
            })

            expect(rect.top).toBe(baseRect.top + baseRect.height / 2)
            expect(rect.left).toBe(baseRect.left + baseRect.width / 2)
            expect(rect.height).toBe(70)
            expect(rect.width).toBe(50)
        })
        it("can create a rect with the bottom right corner", () => {
            const baseRect = RectAreaService.new({
                top: 10,
                left: 20,
                height: 30,
                width: 40,
            })

            const rect = RectAreaService.new({
                baseRectangle: baseRect,
                anchorLeft: HorizontalAnchor.RIGHT,
                anchorTop: VerticalAnchor.BOTTOM,
                height: 70,
                width: 50,
            })

            expect(rect.top).toBe(baseRect.top + baseRect.height)
            expect(rect.left).toBe(baseRect.left + baseRect.width)
            expect(rect.height).toBe(70)
            expect(rect.width).toBe(50)
        })
        it("can create a rect with arbitrary offset", () => {
            const baseRect = RectAreaService.new({
                top: 10,
                left: 20,
                height: 30,
                width: 40,
            })

            const rect = RectAreaService.new({
                baseRectangle: baseRect,
                left: 30,
                top: 20,
            })

            expect(rect.top).toBe(baseRect.top + 20)
            expect(rect.left).toBe(baseRect.left + 30)
            expect(rect.height).toBe(baseRect.height)
            expect(rect.width).toBe(baseRect.width)
        })
    })
    describe("RectArea can combine multiple options", () => {
        it("can combine multiple top options", () => {
            const baseRect = RectAreaService.new({
                top: 10,
                left: 20,
                height: 30,
                width: 40,
            })

            const rect = RectAreaService.new({
                baseRectangle: baseRect,
                anchorTop: VerticalAnchor.TOP,
                screenHeight: 500,
                percentTop: 10,
                top: 20,
                left: 10,
                height: 70,
                width: 50,
            })

            const expectedPercent = 50
            const expectedAnchor = 20

            expect(rect.top).toBe(
                baseRect.top + expectedAnchor + expectedPercent
            )
        })

        it("can combine multiple left options", () => {
            const baseRect = RectAreaService.new({
                top: 10,
                left: 20,
                height: 30,
                width: 40,
            })

            const rect = RectAreaService.new({
                screenWidth: 1200,
                percentLeft: 20,
                startColumn: 2,
                baseRectangle: baseRect,
                anchorLeft: HorizontalAnchor.LEFT,
                top: 20,
                left: 10,
                height: 70,
                width: 50,
            })

            const expectedColumn = 200
            const expectedPercent = 240
            const expectedAnchor = 10

            expect(rect.left).toBe(
                baseRect.left +
                    expectedAnchor +
                    expectedPercent +
                    expectedColumn
            )
        })

        it("can apply base rectangle, anchor and margins", () => {
            const baseRect = RectAreaService.new({
                top: 10,
                left: 20,
                height: 30,
                width: 40,
            })

            const rect = RectAreaService.new({
                baseRectangle: baseRect,
                anchorLeft: HorizontalAnchor.MIDDLE,
                anchorTop: VerticalAnchor.CENTER,
                margin: [60, 0, 0, 30],
            })

            expect(rect.top).toBe(RectAreaService.centerY(baseRect) + 60)
            expect(rect.left).toBe(RectAreaService.centerX(baseRect) + 30)
            expect(rect.width).toBe(RectAreaService.width(baseRect) - 30)
            expect(rect.height).toBe(RectAreaService.height(baseRect) - 60)
        })
    })
    describe("RectArea can apply margins based on another Rect", () => {
        let baseRect: RectArea
        beforeEach(() => {
            baseRect = RectAreaService.new({
                top: 10,
                left: 20,
                height: 30,
                width: 40,
            })
        })

        it("Can apply all margins", () => {
            const rect = RectAreaService.new({
                baseRectangle: baseRect,
                margin: WINDOW_SPACING.SPACING1,
            })

            expect(rect.top).toBe(baseRect.top + WINDOW_SPACING.SPACING1)
            expect(rect.left).toBe(baseRect.left + WINDOW_SPACING.SPACING1)
            expect(rect.height).toBe(
                baseRect.height -
                    (WINDOW_SPACING.SPACING1 + WINDOW_SPACING.SPACING1)
            )
            expect(rect.width).toBe(
                baseRect.width -
                    (WINDOW_SPACING.SPACING1 + WINDOW_SPACING.SPACING1)
            )
        })

        it("Can apply vertical and horizontal margins", () => {
            const rect = RectAreaService.new({
                baseRectangle: baseRect,
                margin: [WINDOW_SPACING.SPACING1, WINDOW_SPACING.SPACING2],
            })

            expect(rect.top).toBe(baseRect.top + WINDOW_SPACING.SPACING1)
            expect(rect.left).toBe(baseRect.left + WINDOW_SPACING.SPACING2)
            expect(rect.height).toBe(
                baseRect.height -
                    (WINDOW_SPACING.SPACING1 + WINDOW_SPACING.SPACING1)
            )
            expect(rect.width).toBe(
                baseRect.width -
                    (WINDOW_SPACING.SPACING2 + WINDOW_SPACING.SPACING2)
            )
        })

        it("Can apply top, horizontal, bottom margins", () => {
            const rect = RectAreaService.new({
                baseRectangle: baseRect,
                margin: [
                    WINDOW_SPACING.SPACING1,
                    WINDOW_SPACING.SPACING2,
                    WINDOW_SPACING.SPACING4,
                ],
            })

            expect(rect.top).toBe(baseRect.top + WINDOW_SPACING.SPACING1)
            expect(rect.left).toBe(baseRect.left + WINDOW_SPACING.SPACING2)
            expect(rect.height).toBe(
                baseRect.height -
                    (WINDOW_SPACING.SPACING1 + WINDOW_SPACING.SPACING4)
            )
            expect(rect.width).toBe(
                baseRect.width -
                    (WINDOW_SPACING.SPACING2 + WINDOW_SPACING.SPACING2)
            )
        })

        it("Can apply top, right, bottom, left margins", () => {
            const rect = RectAreaService.new({
                baseRectangle: baseRect,
                margin: [
                    WINDOW_SPACING.SPACING1,
                    WINDOW_SPACING.SPACING2,
                    WINDOW_SPACING.SPACING4,
                    WINDOW_SPACING.SPACING1,
                ],
            })

            expect(rect.top).toBe(baseRect.top + WINDOW_SPACING.SPACING1)
            expect(rect.left).toBe(baseRect.left + WINDOW_SPACING.SPACING1)
            expect(rect.height).toBe(
                baseRect.height -
                    (WINDOW_SPACING.SPACING1 + WINDOW_SPACING.SPACING4)
            )
            expect(rect.width).toBe(
                baseRect.width -
                    (WINDOW_SPACING.SPACING2 + WINDOW_SPACING.SPACING1)
            )
        })

        it("Can apply zero margins", () => {
            const rect = RectAreaService.new({
                baseRectangle: baseRect,
                margin: 0,
            })

            expect(rect.top).toBe(baseRect.top)
            expect(rect.left).toBe(baseRect.left)
            expect(rect.height).toBe(baseRect.height)
            expect(rect.width).toBe(baseRect.width)
        })
    })
    describe("RectArea can align width and height", () => {
        it("can make a new Rectangle with top, left, width and height", () => {
            const rect = RectAreaService.new({
                top: 0,
                left: 10,
                height: 30,
                width: 20,
                horizAlign: HORIZONTAL_ALIGN.CENTER,
                vertAlign: VERTICAL_ALIGN.CENTER,
            })

            expect(RectAreaService.top(rect)).toBe(-15)
            expect(RectAreaService.left(rect)).toBe(0)
            expect(RectAreaService.right(rect)).toBe(20)
            expect(RectAreaService.bottom(rect)).toBe(15)
            expect(RectAreaService.height(rect)).toBe(30)
            expect(RectAreaService.width(rect)).toBe(20)
        })
    })
    describe("RectArea getters", () => {
        it("should return parts of the RectArea", () => {
            const rect = RectAreaService.new({
                top: 0,
                left: 10,
                height: 30,
                width: 40,
            })

            expect(RectAreaService.top(rect)).toBe(0)
            expect(RectAreaService.left(rect)).toBe(10)
            expect(RectAreaService.right(rect)).toBe(50)
            expect(RectAreaService.bottom(rect)).toBe(30)
            expect(RectAreaService.height(rect)).toBe(30)
            expect(RectAreaService.width(rect)).toBe(40)
            expect(RectAreaService.centerY(rect)).toBe(15)
            expect(RectAreaService.centerX(rect)).toBe(30)
        })
    })
    describe("RectArea queries", () => {
        it("knows if a given point is inside the rectangle", () => {
            const rect = RectAreaService.new({
                top: 0,
                left: 10,
                height: 30,
                width: 20,
            })

            expect(RectAreaService.isInside(rect, 10, 0)).toBeTruthy()
            expect(RectAreaService.isInside(rect, 0, 0)).toBeFalsy()
            expect(RectAreaService.isInside(rect, 10, -10)).toBeFalsy()
            expect(RectAreaService.isInside(rect, 30, 30)).toBeTruthy()
            expect(RectAreaService.isInside(rect, 31, 31)).toBeFalsy()
        })
    })
    it("can move the rect top left corner", () => {
        const rect = RectAreaService.new({
            top: 0,
            left: 10,
            height: 30,
            width: 20,
        })

        RectAreaService.move(rect, { left: 40, top: 50 })
        expect(rect.left).toBe(40)
        expect(rect.top).toBe(50)
    })
    describe("RectArea can set width and height based on aspect ratio", () => {
        it("given ratio and width, RectArea calculates the height", () => {
            const rect = RectAreaService.new({
                top: 0,
                left: 10,
                width: 20,
                height: 0,
            })

            RectAreaService.changeAspectRatio(rect, 2, "WIDTH")

            expect(rect.height).toBe(10)
            expect(rect.width).toBe(20)
        })
        it("given ratio and height, RectArea calculates the width", () => {
            const rect = RectAreaService.new({
                top: 0,
                left: 10,
                height: 20,
                width: 0,
            })

            RectAreaService.changeAspectRatio(rect, 2, "HEIGHT")

            expect(rect.height).toBe(20)
            expect(rect.width).toBe(40)
        })
    })
    it("can align a RectArea against a right and bottom side", () => {
        const rect = RectAreaService.new({
            top: 0,
            left: 0,
            height: 30,
            width: 20,
        })

        RectAreaService.setRight(rect, 100)
        RectAreaService.setBottom(rect, 200)

        expect(RectAreaService.top(rect)).toBe(200 - 30)
        expect(RectAreaService.left(rect)).toBe(100 - 20)
        expect(RectAreaService.right(rect)).toBe(100)
        expect(RectAreaService.bottom(rect)).toBe(200)
        expect(RectAreaService.height(rect)).toBe(30)
        expect(RectAreaService.width(rect)).toBe(20)
    })
    it("create a new RectArea based on the bounding box of multiple RectAreas", () => {
        const rectA = RectAreaService.new({
            left: 0,
            top: 10,
            width: 20,
            height: 30,
        })
        const rectB = RectAreaService.new({
            left: 100,
            top: 40,
            width: 30,
            height: 50,
        })

        const newRect = RectAreaService.newRectangleBasedOnMultipleRectAreas([
            rectA,
            rectB,
        ])

        expect(RectAreaService.left(newRect)).toBe(0)
        expect(RectAreaService.top(newRect)).toBe(10)
        expect(RectAreaService.right(newRect)).toBe(130)
        expect(RectAreaService.bottom(newRect)).toBe(90)
    })
    it("can set the left side of the RectArea", () => {
        const rect = RectAreaService.new({
            top: 0,
            left: 0,
            height: 30,
            width: 20,
        })

        RectAreaService.setLeft(rect, 100)

        expect(RectAreaService.left(rect)).toBe(100)
        expect(RectAreaService.top(rect)).toBe(0)
        expect(RectAreaService.height(rect)).toBe(30)
        expect(RectAreaService.width(rect)).toBe(20)
    })
    it("can set the top side of the RectArea", () => {
        const rect = RectAreaService.new({
            top: 0,
            left: 0,
            height: 30,
            width: 20,
        })

        RectAreaService.setTop(rect, 100)

        expect(RectAreaService.left(rect)).toBe(0)
        expect(RectAreaService.top(rect)).toBe(100)
        expect(RectAreaService.height(rect)).toBe(30)
        expect(RectAreaService.width(rect)).toBe(20)
    })
})
