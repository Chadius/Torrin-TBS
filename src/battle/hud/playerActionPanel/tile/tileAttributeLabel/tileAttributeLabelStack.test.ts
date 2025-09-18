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
import { ResourceHandler } from "../../../../../resource/resourceHandler"
import { MockedGraphicsBufferService } from "../../../../../utils/test/mocks"
import {
    TileAttributeLabel,
    TileAttributeLabelService,
    TileAttributeLabelStatus,
} from "./tileAttributeLabel"
import { RectAreaService } from "../../../../../ui/rectArea"
import { ActionTilePosition } from "../actionTilePosition"
import {
    TileAttributeLabelStack,
    TileAttributeLabelStackService,
} from "./tileAttributeLabelStack"
import { TileAttributeTestUtils } from "./testUtils"

describe("TileAttributeLabelStack", () => {
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
        let stack: TileAttributeLabelStack
        beforeEach(() => {
            stack = TileAttributeLabelStackService.new({
                bottom: 100,
                tilePosition: ActionTilePosition.SELECTED_ACTION,
            })
        })

        it("has no labels when created", () => {
            expect(stack.labels).toHaveLength(0)
        })
    })
    describe("Adding labels", () => {
        let stack: TileAttributeLabelStack
        beforeEach(() => {
            stack = TileAttributeLabelStackService.new({
                bottom: 100,
                tilePosition: ActionTilePosition.SELECTED_ACTION,
            })
        })

        it("will add one label at the given tile position and location bottom", () => {
            TileAttributeLabelStackService.add({
                stack,
                newTile: {
                    id: "bottom",
                    title: "first added",
                    descriptionText: "This was added first",
                },
            })
            expect(stack.labels).toHaveLength(1)

            const firstLabel = stack.labels[0]
            expect(firstLabel.id).toEqual("bottom")
            expect(firstLabel.title).toEqual("first added")

            const area = TileAttributeLabelService.getArea(firstLabel)
            expect(RectAreaService.bottom(area)).toEqual(100)
        })
        it("will add additional labels stacked above the previous label", () => {
            TileAttributeLabelStackService.add({
                stack,
                newTile: {
                    id: "bottom",
                    title: "first added",
                    descriptionText: "This was added first",
                },
            })
            TileAttributeLabelStackService.add({
                stack,
                newTile: {
                    id: "top",
                    title: "second added",
                    descriptionText:
                        "The bottom of this should be on top of the first added",
                },
            })
            expect(stack.labels).toHaveLength(2)
            const bottomTileArea = TileAttributeLabelService.getArea(
                stack.labels[0]
            )
            const topTileArea = TileAttributeLabelService.getArea(
                stack.labels[1]
            )

            expect(RectAreaService.bottom(topTileArea)).toEqual(
                RectAreaService.top(bottomTileArea)
            )
        })
        it("will delete all labels when requested", () => {
            TileAttributeLabelStackService.add({
                stack,
                newTile: {
                    id: "bottom",
                    title: "first added",
                    descriptionText: "This was added first",
                },
            })
            TileAttributeLabelStackService.removeAllLabels(stack)
            expect(stack.labels).toHaveLength(0)
        })
    })
    describe("Respond to mouse events", () => {
        let stack: TileAttributeLabelStack
        let startTime = 0
        let bottomTile: TileAttributeLabel
        let middleTile: TileAttributeLabel
        let topTile: TileAttributeLabel
        let dateSpy: MockInstance
        type TileArea = {
            start?: {
                bottom: number | undefined
                top: number | undefined
                height: number | undefined
            }
            current?: {
                bottom: number | undefined
                top: number | undefined
                height: number | undefined
            }
        }

        beforeEach(() => {
            stack = TileAttributeLabelStackService.new({
                bottom: 1000,
                tilePosition: ActionTilePosition.SELECTED_ACTION,
            })
            bottomTile = TileAttributeLabelStackService.add({
                stack,
                newTile: {
                    id: "bottom",
                    title: "first added",
                    descriptionText: "This was added first",
                },
            })
            middleTile = TileAttributeLabelStackService.add({
                stack,
                newTile: {
                    id: "middle",
                    title: "second added",
                    descriptionText:
                        "The bottom of this should be on top of the first added",
                },
            })
            topTile = TileAttributeLabelStackService.add({
                stack,
                newTile: {
                    id: "top",
                    title: "third added",
                    descriptionText: "This should be on top of the stack",
                },
            })
            dateSpy = vi.spyOn(Date, "now").mockReturnValue(startTime)
        })

        const expectBottomTileDoesNotChange = (bottomTileArea: TileArea) => {
            expect(bottomTileArea.current!.bottom).toEqual(
                bottomTileArea.start!.bottom
            )
            expect(bottomTileArea.current!.top).toEqual(
                bottomTileArea.start!.top
            )
            expect(bottomTileArea.current!.height).toEqual(
                bottomTileArea.start!.height
            )
            expect(bottomTileArea.current!.bottom).toEqual(1000)
            return true
        }

        const expectMiddleTileBottomIsOnTopOfBottomTile = (
            middleTileArea: TileArea,
            bottomTileArea: TileArea
        ) => {
            expect(middleTileArea.current!.bottom).toEqual(
                bottomTileArea.current!.top
            )
            return true
        }
        const expectTopTileBottomIsOnTopOfMiddleTile = (
            topTileArea: TileArea,
            middleTileArea: TileArea
        ) => {
            expect(topTileArea.current!.bottom).toEqual(
                middleTileArea.current!.top
            )
            return true
        }

        describe("opening one label pushes above labels", () => {
            it("will update the label statuses when the mouse moves over one label", () => {
                TileAttributeTestUtils.moveMouseOnLabel(middleTile)
                expect(middleTile.animationStatus).toEqual(
                    TileAttributeLabelStatus.OPENING
                )
            })
            describe("will move the labels as one is opening", () => {
                let bottomTileArea: TileArea
                let middleTileArea: TileArea
                let topTileArea: TileArea

                beforeEach(() => {
                    TileAttributeTestUtils.moveMouseOnLabel(middleTile)
                    ;({ bottomTileArea, middleTileArea, topTileArea } =
                        measureLabelAreasBeforeAndAfterChange(
                            bottomTileArea,
                            middleTileArea,
                            topTileArea
                        ))
                })

                it("does not change the bottom tile because it is below the opening tile", () => {
                    expect(
                        expectBottomTileDoesNotChange(bottomTileArea)
                    ).toBeTruthy()
                })

                it("will change the middle tile height and top as it opens", () => {
                    expect(middleTileArea.current!.bottom).toEqual(
                        middleTileArea.start!.bottom
                    )
                    expect(middleTileArea.current!.top).toBeLessThan(
                        middleTileArea.start!.top!
                    )
                    expect(middleTileArea.current!.height).toBeGreaterThan(
                        middleTileArea.start!.height!
                    )
                })

                it("the middle tile bottom will still be on the top of the bottom tile", () => {
                    expect(
                        expectMiddleTileBottomIsOnTopOfBottomTile(
                            middleTileArea,
                            bottomTileArea
                        )
                    ).toBeTruthy()
                })
                it("will change the top tile bottom and top as the middle tile pushes it upward", () => {
                    expect(topTileArea.current!.bottom).toBeLessThan(
                        topTileArea.start!.bottom!
                    )
                    expect(topTileArea.current!.top).toBeLessThan(
                        topTileArea.start!.top!
                    )
                    expect(topTileArea.current!.height).toEqual(
                        topTileArea.start!.height
                    )
                })
                it("the top tile bottom will still be on the top of the middle tile", () => {
                    expect(
                        expectTopTileBottomIsOnTopOfMiddleTile(
                            topTileArea,
                            middleTileArea
                        )
                    ).toBeTruthy()
                })
            })
        })
        const measureLabelAreasBeforeAndAfterChange = (
            bottomTileArea: TileArea,
            middleTileArea: TileArea,
            topTileArea: TileArea
        ) => {
            TileAttributeLabelStackService.draw({
                stack,
                graphicsBuffer,
                resourceHandler,
            })

            // @ts-ignore
            bottomTileArea = {
                start: undefined,
                current: undefined,
            }
            // @ts-ignore
            middleTileArea = {
                start: undefined,
                current: undefined,
            }
            // @ts-ignore
            topTileArea = {
                start: undefined,
                current: undefined,
            }
            topTileArea.start = {
                bottom: RectAreaService.bottom(
                    TileAttributeLabelService.getArea(topTile)
                ),
                height: RectAreaService.height(
                    TileAttributeLabelService.getArea(topTile)
                ),
                top: RectAreaService.top(
                    TileAttributeLabelService.getArea(topTile)
                ),
            }
            middleTileArea.start = {
                bottom: RectAreaService.bottom(
                    TileAttributeLabelService.getArea(middleTile)
                ),
                height: RectAreaService.height(
                    TileAttributeLabelService.getArea(middleTile)
                ),
                top: RectAreaService.top(
                    TileAttributeLabelService.getArea(middleTile)
                ),
            }
            bottomTileArea.start = {
                bottom: RectAreaService.bottom(
                    TileAttributeLabelService.getArea(bottomTile)
                ),
                height: RectAreaService.height(
                    TileAttributeLabelService.getArea(bottomTile)
                ),
                top: RectAreaService.top(
                    TileAttributeLabelService.getArea(bottomTile)
                ),
            }

            dateSpy.mockReturnValue(10)
            TileAttributeLabelStackService.draw({
                stack,
                graphicsBuffer,
                resourceHandler,
            })

            topTileArea.current = {
                bottom: RectAreaService.bottom(
                    TileAttributeLabelService.getArea(topTile)
                ),
                height: RectAreaService.height(
                    TileAttributeLabelService.getArea(topTile)
                ),
                top: RectAreaService.top(
                    TileAttributeLabelService.getArea(topTile)
                ),
            }
            middleTileArea.current = {
                bottom: RectAreaService.bottom(
                    TileAttributeLabelService.getArea(middleTile)
                ),
                height: RectAreaService.height(
                    TileAttributeLabelService.getArea(middleTile)
                ),
                top: RectAreaService.top(
                    TileAttributeLabelService.getArea(middleTile)
                ),
            }
            bottomTileArea.current = {
                bottom: RectAreaService.bottom(
                    TileAttributeLabelService.getArea(bottomTile)
                ),
                height: RectAreaService.height(
                    TileAttributeLabelService.getArea(bottomTile)
                ),
                top: RectAreaService.top(
                    TileAttributeLabelService.getArea(bottomTile)
                ),
            }
            return { bottomTileArea, middleTileArea, topTileArea }
        }
        describe("closing one label drops above labels on top of it", () => {
            it("will update the label statuses when the mouse moves away from the closing label", () => {
                TileAttributeTestUtils.moveMouseOnLabel(middleTile)
                TileAttributeTestUtils.moveMouseAwayFromLabel(middleTile)
                expect(middleTile.animationStatus).toEqual(
                    TileAttributeLabelStatus.CLOSING
                )
            })
            describe("will move the labels as one is closing", () => {
                let bottomTileArea: TileArea
                let middleTileArea: TileArea
                let topTileArea: TileArea

                beforeEach(() => {
                    middleTile.animationStatus =
                        TileAttributeLabelStatus.FULLY_OPEN
                    TileAttributeTestUtils.moveMouseAwayFromLabel(middleTile)
                    ;({ bottomTileArea, middleTileArea, topTileArea } =
                        measureLabelAreasBeforeAndAfterChange(
                            bottomTileArea,
                            middleTileArea,
                            topTileArea
                        ))
                })

                it("does not change the bottom tile because it is below the closing tile", () => {
                    expect(
                        expectBottomTileDoesNotChange(bottomTileArea)
                    ).toBeTruthy()
                })

                it("will change the middle tile height and top as it closes", () => {
                    expect(middleTileArea.current!.bottom).toEqual(
                        middleTileArea.start!.bottom
                    )
                    expect(middleTileArea.current!.top).toBeGreaterThan(
                        middleTileArea.start!.top!
                    )
                    expect(middleTileArea.current!.height).toBeLessThan(
                        middleTileArea.start!.height!
                    )
                })
                it("the middle tile bottom will still be on the top of the bottom tile", () => {
                    expect(
                        expectMiddleTileBottomIsOnTopOfBottomTile(
                            middleTileArea,
                            bottomTileArea
                        )
                    ).toBeTruthy()
                })
                it("will change the top tile bottom and top as the middle tile closes", () => {
                    expect(topTileArea.current!.bottom).toBeGreaterThan(
                        topTileArea.start!.bottom!
                    )
                    expect(topTileArea.current!.top).toBeGreaterThan(
                        topTileArea.start!.top!
                    )
                    expect(topTileArea.current!.height).toEqual(
                        topTileArea.start!.height
                    )
                })
                it("the top tile bottom will still be on the top of the middle tile", () => {
                    expect(
                        expectTopTileBottomIsOnTopOfMiddleTile(
                            topTileArea,
                            middleTileArea
                        )
                    ).toBeTruthy()
                })
            })
        })
    })
})
