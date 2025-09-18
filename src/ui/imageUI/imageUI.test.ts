import { ImageUI, ImageUILoadingBehavior, ImageUIService } from "./imageUI"
import { RectArea, RectAreaService } from "../rectArea"
import { ResourceHandler } from "../../resource/resourceHandler"
import * as mocks from "../../utils/test/mocks"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
    mockResourceHandler,
} from "../../utils/test/mocks"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import {
    PULSE_COLOR_FORMULA,
    PulseColor,
    PulseColorService,
} from "../../hexMap/pulseColor"

describe("ImageUI", () => {
    describe("scale to match aspect ratio", () => {
        it("can scale width to match the screen ratio", () => {
            expect(
                ImageUIService.scaleImageWidth({
                    desiredHeight: 300,
                    imageHeight: 150,
                    imageWidth: 100,
                })
            ).toBe(200)
        })

        it("can scale height to match the screen ratio", () => {
            expect(
                ImageUIService.scaleImageHeight({
                    desiredWidth: 300,
                    imageHeight: 100,
                    imageWidth: 150,
                })
            ).toBe(200)
        })
    })

    describe("loading the image manually", () => {
        let resourceHandler: ResourceHandler
        let mockP5GraphicsContext: MockedP5GraphicsBuffer

        beforeEach(() => {
            mockP5GraphicsContext = new MockedP5GraphicsBuffer()
            resourceHandler = mocks.mockResourceHandler(mockP5GraphicsContext)
            resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(true)
            resourceHandler.loadResource = vi.fn().mockImplementation(() => {})
            resourceHandler.getResource = vi
                .fn()
                .mockReturnValue({ width: 200, height: 100 })
        })

        afterEach(() => {})

        it("will use the resource handler and resize behavior if the graphic does not exist", () => {
            const imageUI: ImageUI = new ImageUI({
                imageLoadingBehavior: {
                    resourceKey: "resourceKey",
                    loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
                },
                area: RectAreaService.new({
                    left: 10,
                    top: 20,
                    width: 0,
                    height: 0,
                }),
            })
            imageUI.load(resourceHandler)

            expect(resourceHandler.isResourceLoaded).toHaveBeenCalledWith(
                "resourceKey"
            )
            expect(resourceHandler.getResource).toHaveBeenCalledWith(
                "resourceKey"
            )
            expect(imageUI.graphic).not.toBeUndefined()
            expect(RectAreaService.width(imageUI.drawArea)).toEqual(200)
            expect(RectAreaService.height(imageUI.drawArea)).toEqual(100)
        })

        it("will not use the resource handler if the graphic already exists", () => {
            const imageUI: ImageUI = new ImageUI({
                imageLoadingBehavior: {
                    resourceKey: undefined,
                    loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
                },
                graphic: mockP5GraphicsContext.createImage(100, 200),
                area: RectAreaService.new({
                    left: 10,
                    top: 20,
                    width: 0,
                    height: 0,
                }),
            })
            imageUI.load(resourceHandler)

            expect(resourceHandler.isResourceLoaded).not.toHaveBeenCalled()
            expect(resourceHandler.getResource).not.toHaveBeenCalled()
            expect(imageUI.graphic).not.toBeUndefined()
            expect(RectAreaService.width(imageUI.drawArea)).toEqual(0)
            expect(RectAreaService.height(imageUI.drawArea)).toEqual(0)
        })
    })

    describe("image has loaded", () => {
        it("returns false if a graphic does not exist", () => {
            const imageUI: ImageUI = new ImageUI({
                imageLoadingBehavior: {
                    resourceKey: undefined,
                    loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
                },
                area: RectAreaService.new({
                    left: 10,
                    top: 20,
                    width: 0,
                    height: 0,
                }),
            })
            expect(imageUI.isImageLoaded()).toBeFalsy()
        })
        it("returns true if a graphic exists", () => {
            const mockP5GraphicsContext = new MockedP5GraphicsBuffer()
            const imageUI: ImageUI = new ImageUI({
                imageLoadingBehavior: {
                    resourceKey: undefined,
                    loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
                },
                graphic: mockP5GraphicsContext.createImage(100, 200),
                area: RectAreaService.new({
                    left: 10,
                    top: 20,
                    width: 0,
                    height: 0,
                }),
            })
            expect(imageUI.isImageLoaded()).toBeTruthy()
        })
    })

    describe("area changes when the loading completes", () => {
        let resourceHandler: ResourceHandler
        let mockP5GraphicsContext: MockedP5GraphicsBuffer
        let imageSpy: MockInstance

        beforeEach(() => {
            mockP5GraphicsContext = new MockedP5GraphicsBuffer()
            resourceHandler = mocks.mockResourceHandler(mockP5GraphicsContext)
            resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(true)
            resourceHandler.loadResource = vi.fn().mockImplementation(() => {})
            resourceHandler.getResource = vi
                .fn()
                .mockReturnValue({ width: 200, height: 100 })
            imageSpy = vi
                .spyOn(mockP5GraphicsContext, "image")
                .mockReturnValue()
        })

        afterEach(() => {
            imageSpy.mockRestore()
        })

        const loadingBehaviorTests = [
            {
                name: "use the image size",
                loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
                initialAreaDimensions: {
                    width: 0,
                    height: 0,
                },
                expectedAreaDimensions: {
                    width: 200,
                    height: 100,
                },
            },
            {
                name: "keep width keep aspect ratio",
                loadingBehavior:
                    ImageUILoadingBehavior.KEEP_AREA_WIDTH_USE_ASPECT_RATIO,
                initialAreaDimensions: {
                    width: 300,
                    height: 300,
                },
                expectedAreaDimensions: {
                    width: 300,
                    height: 150,
                },
            },
            {
                name: "keep height keep aspect ratio",
                loadingBehavior:
                    ImageUILoadingBehavior.KEEP_AREA_HEIGHT_USE_ASPECT_RATIO,
                initialAreaDimensions: {
                    width: 300,
                    height: 300,
                },
                expectedAreaDimensions: {
                    width: 600,
                    height: 300,
                },
            },
            {
                name: "keep area resize image",
                loadingBehavior: ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
                initialAreaDimensions: {
                    width: 300,
                    height: 300,
                },
                expectedAreaDimensions: {
                    width: 300,
                    height: 300,
                },
            },
        ]

        it.each(loadingBehaviorTests)(
            `$name`,
            ({
                loadingBehavior,
                initialAreaDimensions,
                expectedAreaDimensions,
            }) => {
                const imageUI: ImageUI = new ImageUI({
                    imageLoadingBehavior: {
                        resourceKey: "resourceKey",
                        loadingBehavior,
                    },
                    area: RectAreaService.new({
                        left: 10,
                        top: 20,
                        ...initialAreaDimensions,
                    }),
                })

                imageUI.draw({
                    graphicsContext: mockP5GraphicsContext,
                    resourceHandler,
                })

                expect(resourceHandler.isResourceLoaded).toHaveBeenCalledWith(
                    "resourceKey"
                )
                expect(resourceHandler.getResource).toHaveBeenCalledWith(
                    "resourceKey"
                )

                expect(imageUI.graphic!.width).toEqual(200)
                expect(imageUI.graphic!.height).toEqual(100)
                expect(RectAreaService.width(imageUI.drawArea)).toEqual(
                    expectedAreaDimensions.width
                )
                expect(RectAreaService.height(imageUI.drawArea)).toEqual(
                    expectedAreaDimensions.height
                )
            }
        )

        describe("setting an image using a custom function that uses the image dimensions", () => {
            it("can use a custom area based on the image size", () => {
                const tryToCenter = ({
                    imageSize,
                    originalArea,
                }: {
                    imageSize: { width: number; height: number }
                    originalArea: RectArea
                }): RectArea => {
                    return RectAreaService.new({
                        left:
                            RectAreaService.centerX(originalArea) -
                            imageSize.width / 2,
                        top:
                            RectAreaService.bottom(originalArea) -
                            imageSize.height,
                        width: RectAreaService.width(originalArea),
                        height: RectAreaService.height(originalArea),
                    })
                }

                const imageUI: ImageUI = new ImageUI({
                    imageLoadingBehavior: {
                        resourceKey: "resourceKey",
                        loadingBehavior:
                            ImageUILoadingBehavior.USE_CUSTOM_AREA_CALLBACK,
                        customAreaCallback: tryToCenter,
                    },
                    area: RectAreaService.new({
                        left: 0,
                        top: 0,
                        width: 500,
                        height: 1000,
                    }),
                })

                imageUI.draw({
                    graphicsContext: mockP5GraphicsContext,
                    resourceHandler,
                })

                expect(RectAreaService.left(imageUI.drawArea)).toEqual(150)
                expect(RectAreaService.top(imageUI.drawArea)).toEqual(900)
                expect(RectAreaService.width(imageUI.drawArea)).toEqual(500)
                expect(RectAreaService.height(imageUI.drawArea)).toEqual(1000)
            })
            it("if no callback is provided, uses initial area size as a default and prints a warning", () => {
                const consoleWarnSpy = vi
                    .spyOn(console, "warn")
                    .mockImplementation(() => {})
                const imageUI: ImageUI = new ImageUI({
                    imageLoadingBehavior: {
                        resourceKey: "resourceKey",
                        loadingBehavior:
                            ImageUILoadingBehavior.USE_CUSTOM_AREA_CALLBACK,
                    },
                    area: RectAreaService.new({
                        left: 0,
                        top: 0,
                        width: 500,
                        height: 1000,
                    }),
                })

                imageUI.draw({
                    graphicsContext: mockP5GraphicsContext,
                    resourceHandler,
                })

                expect(RectAreaService.left(imageUI.drawArea)).toEqual(0)
                expect(RectAreaService.top(imageUI.drawArea)).toEqual(0)
                expect(RectAreaService.width(imageUI.drawArea)).toEqual(500)
                expect(RectAreaService.height(imageUI.drawArea)).toEqual(1000)

                expect(consoleWarnSpy).toBeCalledWith(
                    '[ImageUI.draw] no custom callback provided for "resourceKey"'
                )
                consoleWarnSpy.mockRestore()
            })
        })
    })

    describe("tint and pulse color", () => {
        let graphicsContext: GraphicsBuffer
        let resourceHandler: ResourceHandler
        let graphicsBufferSpies: { [key: string]: MockInstance }
        let imageUI: ImageUI
        let tintColor = [10, 20, 30, 40]

        beforeEach(() => {
            graphicsContext = new MockedP5GraphicsBuffer()
            graphicsBufferSpies =
                MockedGraphicsBufferService.addSpies(graphicsContext)
            resourceHandler = mockResourceHandler(graphicsContext)
            imageUI = new ImageUI({
                imageLoadingBehavior: {
                    resourceKey: undefined,
                    loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
                },
                graphic: graphicsContext.createImage(100, 200),
                area: RectAreaService.new({
                    left: 10,
                    top: 20,
                    width: 0,
                    height: 0,
                }),
            })
        })

        it("does not tint by default", () => {
            imageUI.draw({
                graphicsContext,
                resourceHandler,
            })
            expect(graphicsBufferSpies["tint"]).not.toHaveBeenCalled()
        })

        it("will tint if it is set", () => {
            imageUI.setTint(
                tintColor[0],
                tintColor[1],
                tintColor[2],
                tintColor[3]
            )
            imageUI.draw({
                graphicsContext,
                resourceHandler,
            })
            expect(graphicsBufferSpies["tint"]).toHaveBeenCalledWith(
                tintColor[0],
                tintColor[1],
                tintColor[2],
                tintColor[3]
            )
        })

        it("will use opaque color if alpha value is omitted", () => {
            let tintColor = [10, 20, 30, 40]
            imageUI.setTint(tintColor[0], tintColor[1], tintColor[2])
            imageUI.draw({
                graphicsContext,
                resourceHandler,
            })
            expect(graphicsBufferSpies["tint"]).toHaveBeenCalledWith(
                tintColor[0],
                tintColor[1],
                tintColor[2],
                255
            )
        })

        it("can remove tint", () => {
            imageUI.setTint(tintColor[0], tintColor[1], tintColor[2])
            imageUI.removeTint()
            imageUI.draw({
                graphicsContext,
                resourceHandler,
            })
            expect(graphicsBufferSpies["tint"]).not.toHaveBeenCalled()
        })

        describe("pulse color", () => {
            let pulseColor: PulseColor
            let pulseColorSpy: MockInstance
            beforeEach(() => {
                pulseColor = PulseColorService.new({
                    hue: 10,
                    saturation: 20,
                    brightness: 30,
                    alpha: 40,
                    pulse: {
                        period: 1000,
                        formula: PULSE_COLOR_FORMULA.LINEAR,
                    },
                })
                pulseColorSpy = vi.spyOn(PulseColorService, "pulseColorToColor")
            })

            it("will tint if a pulse color is given", () => {
                imageUI.setPulseColor(pulseColor)
                expect(imageUI.pulseColor).toEqual(pulseColor)

                imageUI.draw({
                    graphicsContext,
                    resourceHandler,
                })
                expect(pulseColorSpy).toHaveBeenCalledWith(pulseColor)
                expect(graphicsBufferSpies["tint"]).toHaveBeenCalled()
            })
            it("can remove pulse color tint", () => {
                imageUI.setPulseColor(pulseColor)
                imageUI.removePulseColor()
                imageUI.draw({
                    graphicsContext,
                    resourceHandler,
                })
                expect(graphicsBufferSpies["tint"]).not.toHaveBeenCalled()
            })
        })
    })
})
