import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { TerrainTileMap, TerrainTileMapService } from "./terrainTileMap"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../utils/test/mocks"
import {
    ResourceRepository,
    ResourceRepositoryService,
} from "../resource/resourceRepository.ts"
import { ResourceRepositoryTestUtilsService } from "../resource/resourceRepositoryTestUtils.ts"
import { HexDrawingUtils } from "./hexDrawingUtils"
import { ConvertCoordinateService } from "./convertCoordinates"
import { HexGridMovementCost } from "./hexGridMovementCost"
import { BattleCamera } from "../battle/battleCamera"
import { HEX_TILE_HEIGHT, HEX_TILE_WIDTH } from "../graphicsConstants"
import p5 from "p5"

describe("Hex Drawing Utils", () => {
    describe("draw on single image", () => {
        let terrainTileMap: TerrainTileMap
        let graphicsBuffer: GraphicsBuffer
        let graphicsBufferSpies: { [key: string]: MockInstance }
        let copyImageSpy: MockInstance
        let resourceRepository: ResourceRepository

        beforeEach(async () => {
            terrainTileMap = TerrainTileMapService.new({
                movementCost: ["1 1 x ", " 2 - 1 "],
            })

            graphicsBuffer = new MockedP5GraphicsBuffer()

            graphicsBufferSpies =
                MockedGraphicsBufferService.addSpies(graphicsBuffer)
            resourceRepository =
                await ResourceRepositoryTestUtilsService.getResourceRepositoryWithAllTestImages(
                    {
                        graphics: graphicsBuffer,
                    }
                )
        })

        afterEach(() => {
            MockedGraphicsBufferService.resetSpies(graphicsBufferSpies)
            if (copyImageSpy) copyImageSpy.mockRestore()
        })

        const addCopyImageSpy = (destinationImage: p5.Image) => {
            copyImageSpy = vi.spyOn(destinationImage, "copy").mockReturnValue()
        }

        it("will draw once per tile", () => {
            const mapImage = graphicsBuffer.createImage(1, 1)
            addCopyImageSpy(mapImage)

            HexDrawingUtils.drawMapTilesOntoImage({
                mapImage,
                terrainTileMap,
                resourceRepository,
            })

            expect(copyImageSpy).toBeCalledTimes(6)
        })

        describe("draws the tiles in the correct locations", () => {
            beforeEach(() => {
                const mapImage = graphicsBuffer.createImage(1, 1)
                addCopyImageSpy(mapImage)
                HexDrawingUtils.drawMapTilesOntoImage({
                    mapImage,
                    terrainTileMap,
                    resourceRepository,
                })
            })

            const tests = [
                {
                    coordinate: { q: 0, r: 0 },
                },
                {
                    coordinate: { q: 0, r: 1 },
                },
                {
                    coordinate: { q: 0, r: 2 },
                },
                {
                    coordinate: { q: 1, r: 0 },
                },
                {
                    coordinate: { q: 1, r: 1 },
                },
                {
                    coordinate: { q: 1, r: 2 },
                },
            ]

            it.each(tests)(`$coordinate`, ({ coordinate }) => {
                let { x, y } =
                    ConvertCoordinateService.convertMapCoordinatesToWorldLocation(
                        {
                            mapCoordinate: coordinate,
                        }
                    )

                const imageCall = copyImageSpy.mock.calls.find(
                    (args) => args[5] == x && args[6] == y
                )
                expect(imageCall).toBeTruthy()
            })
        })

        describe("uses the correct images based on the terrain", () => {
            const tests = [
                {
                    terrainType: HexGridMovementCost.singleMovement,
                    expectedResourceKey: "map-tiles-basic-floor",
                    movementCost: ["1 "],
                },
                {
                    terrainType: HexGridMovementCost.doubleMovement,
                    expectedResourceKey: "map-tiles-basic-sand",
                    movementCost: ["2 "],
                },
                {
                    terrainType: HexGridMovementCost.pit,
                    expectedResourceKey: "map-tiles-basic-water",
                    movementCost: ["- "],
                },
                {
                    terrainType: HexGridMovementCost.wall,
                    expectedResourceKey: "map-tiles-basic-wall",
                    movementCost: ["x "],
                },
            ]

            it.each(tests)(
                `$terrainType`,
                ({ movementCost, expectedResourceKey }) => {
                    const terrainTileMap = TerrainTileMapService.new({
                        movementCost,
                    })

                    const resourceSpy = vi.spyOn(
                        ResourceRepositoryService,
                        "getImage"
                    )
                    const mapImage = graphicsBuffer.createImage(1, 1)
                    addCopyImageSpy(mapImage)
                    HexDrawingUtils.drawMapTilesOntoImage({
                        mapImage,
                        terrainTileMap,
                        resourceRepository,
                    })

                    expect(resourceSpy).toBeCalledWith(
                        expect.objectContaining({
                            resourceRepository,
                            key: expectedResourceKey,
                        })
                    )
                    resourceSpy.mockRestore()
                }
            )
        })

        it("can create an image containing the map", () => {
            const drawMapTilesOntoBufferSpy = vi.spyOn(
                HexDrawingUtils,
                "drawMapTilesOntoImage"
            )

            const createdImage = graphicsBuffer.createImage(1, 1)
            graphicsBufferSpies["createImage"].mockReturnValue(createdImage)

            const mapImage: p5.Image = HexDrawingUtils.createMapImage({
                graphicsBuffer,
                terrainTileMap,
                resourceRepository,
            })

            expect(graphicsBufferSpies["createImage"]).toBeCalled()

            expect(drawMapTilesOntoBufferSpy).toBeCalled()
            expect(drawMapTilesOntoBufferSpy.mock.calls[0][0].mapImage).toEqual(
                createdImage
            )
            expect(mapImage).toEqual(createdImage)
            drawMapTilesOntoBufferSpy.mockRestore()
        })

        it("can be drawn on screen, using a camera to position", () => {
            const mapImage: p5.Image = HexDrawingUtils.createMapImage({
                graphicsBuffer,
                terrainTileMap,
                resourceRepository,
            })

            const camera = new BattleCamera(0, 0)

            graphicsBufferSpies["image"].mockClear()

            HexDrawingUtils.drawMapOnScreen({
                mapImage,
                screenGraphicsBuffer: graphicsBuffer,
                camera,
            })

            let { x: centerOfTileX, y: centerOfTileY } =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: { q: 0, r: 0 },
                    cameraLocation: camera.getWorldLocation(),
                })

            expect(graphicsBufferSpies["image"]).toBeCalledWith(
                mapImage,
                centerOfTileX - HEX_TILE_WIDTH / 2,
                centerOfTileY - HEX_TILE_HEIGHT / 2
            )
        })
    })
})
