import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { GraphicsBuffer } from "../../../../../utils/graphics/graphicsRenderer"
import { MockedGraphicsBufferService } from "../../../../../utils/test/mocks"
import {
    TileAttributeLabel,
    TileAttributeLabelService,
    TileAttributeLabelStatus,
} from "./tileAttributeLabel"
import { RectArea, RectAreaService } from "../../../../../ui/rectArea"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "../actionTilePosition"
import { WINDOW_SPACING } from "../../../../../ui/constants"
import { ResourceHandler } from "../../../../../resource/resourceHandler"
import { TileAttributeTestUtils } from "./testUtils"

describe("TileAttributeLabel", () => {
    let graphicsBuffer: GraphicsBuffer
    let graphicsBufferSpies: { [key: string]: MockInstance }
    let resourceHandler: ResourceHandler

    beforeEach(() => {
        ;({ graphicsBufferSpies, graphicsBuffer, resourceHandler } =
            TileAttributeTestUtils.mockGraphicsAndAddSpies())
    })
    afterEach(() => {
        MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
    })

    describe("Creation", () => {
        let label: TileAttributeLabel
        beforeEach(() => {
            label = TileAttributeLabelService.new({
                id: "armor",
                title: "AC +2",
                descriptionText:
                    "Armor Class reduces the change of getting hit by weapons.",
            })
        })

        it("uses the id", () => {
            expect(label.id).toBe("armor")
        })

        it("uses the title", () => {
            expect(label.title).toBe("AC +2")
        })

        it("uses the description", () => {
            expect(label.description.text).toBe(
                "Armor Class reduces the change of getting hit by weapons."
            )
        })

        it("will be fully closed by default upon creation", () => {
            expect(label.animationStatus).toBe(
                TileAttributeLabelStatus.FULLY_CLOSED
            )
        })
    })

    describe("Drawing background, title and icon based on location", () => {
        let label: TileAttributeLabel
        let tileBoundingBox: RectArea

        beforeEach(() => {
            label = TileAttributeLabelService.new({
                id: "armor",
                title: "AC +2",
                descriptionText:
                    "Armor Class reduces the change of getting hit by weapons.",
            })
            TileAttributeLabelService.setLocation({
                label,
                bottom: 100,
                tilePosition: ActionTilePosition.SELECTED_ACTION,
            })
            tileBoundingBox =
                ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                    ActionTilePosition.SELECTED_ACTION
                )
        })

        describe("background window", () => {
            it("setting the location creates a new background", () => {
                expect(label.uiElements.backgroundRectangle).not.toBeUndefined()
                expect(
                    RectAreaService.bottom(
                        label.uiElements.backgroundRectangle.area
                    )
                ).toBe(100)
                expect(
                    RectAreaService.centerX(
                        label.uiElements.backgroundRectangle.area
                    )
                ).toBe(RectAreaService.centerX(tileBoundingBox))
            })

            it("will move the background bottom if it already exists when the location is set", () => {
                TileAttributeLabelService.setLocation({
                    label,
                    bottom: 250,
                    tilePosition: ActionTilePosition.SELECTED_ACTION,
                })
                expect(
                    RectAreaService.bottom(
                        label.uiElements.backgroundRectangle.area
                    )
                ).toBe(250)
            })
            it("can render the background", () => {
                TileAttributeLabelService.draw({
                    label,
                    graphicsBuffer,
                    resourceHandler,
                })
                expect(graphicsBufferSpies["rect"]).toHaveBeenCalledWith(
                    RectAreaService.left(
                        label.uiElements.backgroundRectangle.area
                    ),
                    RectAreaService.top(
                        label.uiElements.backgroundRectangle.area
                    ),
                    RectAreaService.width(
                        label.uiElements.backgroundRectangle.area
                    ),
                    RectAreaService.height(
                        label.uiElements.backgroundRectangle.area
                    )
                )
            })
        })
        describe("title text", () => {
            beforeEach(() => {
                TileAttributeLabelService.draw({
                    label: label,
                    graphicsBuffer: graphicsBuffer,
                    resourceHandler,
                })
            })
            it("will create title text near the top of the rectangle.", () => {
                expect(label.uiElements.titleTextBox).not.toBeUndefined()
                expect(
                    RectAreaService.top(label.uiElements.titleTextBox.area)
                ).toBeLessThan(
                    RectAreaService.top(
                        label.uiElements.backgroundRectangle.area
                    ) + WINDOW_SPACING.SPACING1
                )
            })
            it("will draw the title", () => {
                expect(graphicsBufferSpies["text"]).toHaveBeenCalledWith(
                    label.title,
                    expect.any(Number),
                    expect.any(Number),
                    expect.any(Number),
                    expect.any(Number)
                )
            })
            it("will move the icon if the location is changed", () => {
                const firstDistanceFromTheTop =
                    RectAreaService.top(
                        label.uiElements.backgroundRectangle.area
                    ) - RectAreaService.top(label.uiElements.titleTextBox.area)
                TileAttributeLabelService.setLocation({
                    label,
                    bottom: 250,
                    tilePosition: ActionTilePosition.SELECTED_ACTION,
                })
                const secondDistanceFromTheTop =
                    RectAreaService.top(
                        label.uiElements.backgroundRectangle.area
                    ) - RectAreaService.top(label.uiElements.titleTextBox.area)
                expect(secondDistanceFromTheTop).toBe(firstDistanceFromTheTop)
            })
        })
        describe("icon", () => {
            beforeEach(() => {
                label.iconResourceKey = "armor-resource-key"
                TileAttributeLabelService.draw({
                    label: label,
                    graphicsBuffer: graphicsBuffer,
                    resourceHandler,
                })
            })
            it("will create an icon near the top of the rectangle.", () => {
                expect(label.uiElements.icon).not.toBeUndefined()
                expect(label.uiElements.icon.resourceKey).toEqual(
                    "armor-resource-key"
                )

                expect(
                    RectAreaService.top(label.uiElements.icon.drawArea)
                ).toBeLessThan(
                    RectAreaService.top(label.uiElements.icon.drawArea) +
                        WINDOW_SPACING.SPACING1
                )
            })
            it("will draw the icon", () => {
                expect(graphicsBufferSpies["image"]).toBeCalled()
            })
            it("will move the icon if the location is changed", () => {
                const firstDistanceFromTheTop =
                    RectAreaService.top(
                        label.uiElements.backgroundRectangle.area
                    ) - RectAreaService.top(label.uiElements.icon.drawArea)
                TileAttributeLabelService.setLocation({
                    label,
                    bottom: 250,
                    tilePosition: ActionTilePosition.SELECTED_ACTION,
                })
                const secondDistanceFromTheTop =
                    RectAreaService.top(
                        label.uiElements.backgroundRectangle.area
                    ) - RectAreaService.top(label.uiElements.icon.drawArea)
                expect(secondDistanceFromTheTop).toBe(firstDistanceFromTheTop)
            })
        })
    })

    describe("fully closed status", () => {
        let label: TileAttributeLabel
        beforeEach(() => {
            label = TileAttributeLabelService.new({
                id: "armor",
                title: "AC +2",
                descriptionText:
                    "Armor Class reduces the change of getting hit by weapons.",
            })
            TileAttributeLabelService.setLocation({
                label,
                bottom: 100,
                tilePosition: ActionTilePosition.SELECTED_ACTION,
            })
        })

        it("will change to opening status when the mouse hovers over it", () => {
            TileAttributeTestUtils.moveMouseOnLabel(label)
            expect(label.animationStatus).toBe(TileAttributeLabelStatus.OPENING)
        })
    })

    describe("opening status", () => {
        let label: TileAttributeLabel
        let startTime = 0
        let dateSpy: MockInstance
        beforeEach(() => {
            label = TileAttributeLabelService.new({
                id: "armor",
                title: "AC +2",
                descriptionText:
                    "Armor Class reduces the change of getting hit by weapons.",
            })
            TileAttributeLabelService.setLocation({
                label,
                bottom: 100,
                tilePosition: ActionTilePosition.SELECTED_ACTION,
            })
            dateSpy = vi.spyOn(Date, "now").mockReturnValue(startTime)
            let labelBackgroundArea = TileAttributeLabelService.getArea(label)
            TileAttributeLabelService.mouseMoved({
                label,
                mouseLocation: {
                    x: RectAreaService.centerX(labelBackgroundArea),
                    y: RectAreaService.centerY(labelBackgroundArea),
                },
            })
        })

        afterEach(() => {
            dateSpy.mockRestore()
        })

        it("will change to closing status when the mouse hovers away from it", () => {
            TileAttributeTestUtils.moveMouseAwayFromLabel(label)
            expect(label.animationStatus).toBe(TileAttributeLabelStatus.CLOSING)
        })

        it("will change the height as time passes", () => {
            TileAttributeLabelService.draw({
                label,
                graphicsBuffer,
                resourceHandler,
            })
            const startingHeight = RectAreaService.height(
                TileAttributeLabelService.getArea(label)
            )
            dateSpy.mockReturnValue(10)
            TileAttributeLabelService.draw({
                label,
                graphicsBuffer,
                resourceHandler,
            })

            const currentHeight = RectAreaService.height(
                TileAttributeLabelService.getArea(label)
            )

            expect(startingHeight).toBeLessThan(currentHeight)
        })

        it("will change the width as time passes", () => {
            TileAttributeLabelService.draw({
                label,
                graphicsBuffer,
                resourceHandler,
            })
            const startingWidth = RectAreaService.width(
                TileAttributeLabelService.getArea(label)
            )
            dateSpy.mockReturnValue(10)
            TileAttributeLabelService.draw({
                label,
                graphicsBuffer,
                resourceHandler,
            })

            const currentWidth = RectAreaService.width(
                TileAttributeLabelService.getArea(label)
            )

            expect(startingWidth).toBeLessThan(currentWidth)
        })

        it("will change the status once enough time passes to fully open", () => {
            TileAttributeLabelService.draw({
                label,
                graphicsBuffer,
                resourceHandler,
            })
            dateSpy.mockReturnValue(9001)
            TileAttributeLabelService.draw({
                label,
                graphicsBuffer,
                resourceHandler,
            })
            expect(label.animationStatus).toBe(
                TileAttributeLabelStatus.FULLY_OPEN
            )
        })
    })

    describe("fully open status", () => {
        let label: TileAttributeLabel
        beforeEach(() => {
            label = TileAttributeLabelService.new({
                id: "armor",
                title: "AC +2",
                descriptionText:
                    "Armor Class reduces the change of getting hit by weapons.",
            })
            TileAttributeLabelService.setLocation({
                label,
                bottom: 100,
                tilePosition: ActionTilePosition.SELECTED_ACTION,
            })
            label.animationStatus = TileAttributeLabelStatus.FULLY_OPEN
        })

        it("will display the description", () => {
            TileAttributeLabelService.draw({
                label: label,
                graphicsBuffer: graphicsBuffer,
                resourceHandler,
            })
            expect(graphicsBufferSpies["text"]).toHaveBeenCalledWith(
                label.description.text,
                expect.any(Number),
                expect.any(Number),
                expect.any(Number),
                expect.any(Number)
            )
        })

        it("will change to closing status when the mouse hovers away from it", () => {
            TileAttributeTestUtils.moveMouseAwayFromLabel(label)
            expect(label.animationStatus).toBe(TileAttributeLabelStatus.CLOSING)
        })
    })

    describe("closing status", () => {
        let label: TileAttributeLabel
        let startTime = 0
        let dateSpy: MockInstance
        beforeEach(() => {
            label = TileAttributeLabelService.new({
                id: "armor",
                title: "AC +2",
                descriptionText:
                    "Armor Class reduces the change of getting hit by weapons.",
            })
            TileAttributeLabelService.setLocation({
                label,
                bottom: 100,
                tilePosition: ActionTilePosition.SELECTED_ACTION,
            })
            label.animationStatus = TileAttributeLabelStatus.FULLY_OPEN
            dateSpy = vi.spyOn(Date, "now").mockReturnValue(startTime)
            TileAttributeTestUtils.moveMouseAwayFromLabel(label)
        })

        afterEach(() => {
            dateSpy.mockRestore()
        })

        it("will change to opening status when the mouse hovers on it", () => {
            TileAttributeTestUtils.moveMouseOnLabel(label)
            expect(label.animationStatus).toBe(TileAttributeLabelStatus.OPENING)
        })

        it("will change the height as time passes", () => {
            TileAttributeLabelService.draw({
                label,
                graphicsBuffer,
                resourceHandler,
            })
            const startingHeight = RectAreaService.height(
                TileAttributeLabelService.getArea(label)
            )
            dateSpy.mockReturnValue(10)
            TileAttributeLabelService.draw({
                label,
                graphicsBuffer,
                resourceHandler,
            })

            const currentHeight = RectAreaService.height(
                TileAttributeLabelService.getArea(label)
            )

            expect(startingHeight).toBeGreaterThan(currentHeight)
        })

        it("will change the width as time passes", () => {
            TileAttributeLabelService.draw({
                label,
                graphicsBuffer,
                resourceHandler,
            })
            const startingWidth = RectAreaService.width(
                TileAttributeLabelService.getArea(label)
            )
            dateSpy.mockReturnValue(10)
            TileAttributeLabelService.draw({
                label,
                graphicsBuffer,
                resourceHandler,
            })

            const currentWidth = RectAreaService.width(
                TileAttributeLabelService.getArea(label)
            )

            expect(startingWidth).toBeGreaterThan(currentWidth)
        })

        it("will change the status once enough time passes to fully closed", () => {
            TileAttributeLabelService.draw({
                label,
                graphicsBuffer,
                resourceHandler,
            })
            dateSpy.mockReturnValue(9001)
            TileAttributeLabelService.draw({
                label,
                graphicsBuffer,
                resourceHandler,
            })
            expect(label.animationStatus).toBe(
                TileAttributeLabelStatus.FULLY_CLOSED
            )
        })
    })
})
