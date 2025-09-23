import { BattleMapDisplay } from "./battleMapDisplay"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../orchestrator/battleOrchestratorState"
import { ObjectRepositoryService } from "../objectRepository"
import { BattleCamera } from "../battleCamera"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { OrchestratorComponentMouseEventType } from "../orchestrator/battleOrchestratorComponent"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { BattleStateService } from "../battleState/battleState"
import { BattleHUDService } from "../hud/battleHUD/battleHUD"
import { BattleHUDStateService } from "../hud/battleHUD/battleHUDState"
import { SummaryHUDStateService } from "../hud/summary/summaryHUD"
import { ResourceHandler } from "../../resource/resourceHandler"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { PlayerInputTestService } from "../../utils/test/playerInput"
import {
    MouseButton,
    MouseDrag,
    MouseWheel,
    ScreenLocation,
} from "../../utils/mouseConfig"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngineState/gameEngineState"

describe("battleMapDisplay", () => {
    let battleMapDisplay: BattleMapDisplay
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let resourceHandler: ResourceHandler

    beforeEach(() => {
        vi.spyOn(
            ObjectRepositoryService,
            "getBattleSquaddieIterator"
        ).mockReturnValue([])

        battleMapDisplay = new BattleMapDisplay()

        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        resourceHandler = mocks.mockResourceHandler(mockedP5GraphicsContext)
    })

    describe("panning the camera", () => {
        let gameEngineState: GameEngineState
        let camera: BattleCamera
        let initialCameraCoordinates: number[]

        beforeEach(() => {
            initialCameraCoordinates = [0, -ScreenDimensions.SCREEN_HEIGHT]
            camera = new BattleCamera(...initialCameraCoordinates)

            gameEngineState = GameEngineStateService.new({
                repository: undefined,
                resourceHandler: mocks.mockResourceHandler(
                    mockedP5GraphicsContext
                ),
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({}),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        camera,
                        missionMap: MissionMapService.new({
                            terrainTileMap: TerrainTileMapService.new({
                                movementCost: ["1 "],
                            }),
                        }),
                    }),
                }),
            })
        })

        it("can pan over to a coordinate, ignoring the mouse location", () => {
            const destinationCoordinates: number[] = [
                100,
                -ScreenDimensions.SCREEN_HEIGHT + 200,
            ]
            const timeToPan: number = 1000
            camera.setXVelocity = vi.fn()
            camera.setYVelocity = vi.fn()

            vi.spyOn(Date, "now").mockImplementation(() => 0)
            camera.pan({
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                timeToPan,
                respectConstraints: false,
            })

            vi.spyOn(Date, "now").mockImplementation(() => timeToPan / 2)
            battleMapDisplay.draw({
                gameEngineState: gameEngineState,
                graphics: mockedP5GraphicsContext,
                resourceHandler,
            })
            expect(camera.getWorldLocation().x).toBeCloseTo(
                (initialCameraCoordinates[0] + destinationCoordinates[0]) / 2
            )
            expect(camera.getWorldLocation().y).toBeCloseTo(
                (initialCameraCoordinates[1] + destinationCoordinates[1]) / 2
            )

            battleMapDisplay.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.LOCATION,
                mouseLocation: {
                    x: 0,
                    y: 0,
                },
            })
            expect(camera.setXVelocity).not.toBeCalled()
            expect(camera.setYVelocity).not.toBeCalled()

            vi.spyOn(Date, "now").mockImplementation(() => timeToPan)
            battleMapDisplay.draw({
                gameEngineState: gameEngineState,
                graphics: mockedP5GraphicsContext,
                resourceHandler,
            })
            expect(camera.getWorldLocation().x).toBeCloseTo(
                destinationCoordinates[0]
            )
            expect(camera.getWorldLocation().y).toBeCloseTo(
                destinationCoordinates[1]
            )
        })

        const keyboardScrollInputTests = [
            {
                direction: "right",
                playerInput: PlayerInputTestService.holdScrollRightKey,
                expectation: (
                    camera: BattleCamera,
                    initialCameraCoordinates: ScreenLocation
                ) => camera.getWorldLocation().x > initialCameraCoordinates.x,
            },
            {
                direction: "left",
                playerInput: PlayerInputTestService.holdScrollLeftKey,
                expectation: (
                    camera: BattleCamera,
                    initialCameraCoordinates: ScreenLocation
                ) => camera.getWorldLocation().x < initialCameraCoordinates.x,
            },
            {
                direction: "up",
                playerInput: PlayerInputTestService.holdScrollUpKey,
                expectation: (
                    camera: BattleCamera,
                    initialCameraCoordinates: ScreenLocation
                ) => camera.getWorldLocation().y < initialCameraCoordinates.y,
            },
            {
                direction: "down",
                playerInput: PlayerInputTestService.holdScrollDownKey,
                expectation: (
                    camera: BattleCamera,
                    initialCameraCoordinates: ScreenLocation
                ) => camera.getWorldLocation().y > initialCameraCoordinates.y,
            },
        ]

        it.each(keyboardScrollInputTests)(
            `$direction`,
            ({ playerInput, expectation }) => {
                gameEngineState.battleOrchestratorState.battleState.camera.setMapDimensionBoundaries(
                    100,
                    100
                )
                gameEngineState.battleOrchestratorState.battleState.camera.xCoordinate =
                    ScreenDimensions.SCREEN_WIDTH
                gameEngineState.battleOrchestratorState.battleState.camera.yCoordinate =
                    ScreenDimensions.SCREEN_HEIGHT

                const initialCameraCoordinates =
                    gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation()

                const dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)

                playerInput(gameEngineState.playerInputState)
                dateSpy.mockReturnValue(1000)
                battleMapDisplay.update({
                    gameEngineState,
                    resourceHandler: gameEngineState.resourceHandler!,
                    graphicsContext: mockedP5GraphicsContext,
                })

                expect(
                    expectation(
                        gameEngineState.battleOrchestratorState.battleState
                            .camera,
                        initialCameraCoordinates
                    )
                ).toBeTruthy()
            }
        )
    })

    describe("it will change the camera velocity based on the mouse location", () => {
        let state: BattleOrchestratorState
        let camera: BattleCamera
        let initialCameraCoordinates: number[]

        beforeEach(() => {
            initialCameraCoordinates = [0, -ScreenDimensions.SCREEN_HEIGHT]
            camera = new BattleCamera(...initialCameraCoordinates)

            state = BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    camera,
                }),
            })
        })

        type CameraTest = {
            cameraDescription: string
            mouseLocation: ScreenLocation
            cameraVelocityTest: (camera: BattleCamera) => boolean
        }

        const tests: CameraTest[] = [
            {
                cameraDescription: "move left",
                mouseLocation: {
                    x: 0,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                },
                cameraVelocityTest: (camera: BattleCamera) =>
                    camera.getVelocity().xVelocity < 0,
            },
            {
                cameraDescription: "move right",
                mouseLocation: {
                    x: ScreenDimensions.SCREEN_WIDTH,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                },
                cameraVelocityTest: (camera: BattleCamera) =>
                    camera.getVelocity().xVelocity > 0,
            },
            {
                cameraDescription: "move up",
                mouseLocation: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: 0,
                },
                cameraVelocityTest: (camera: BattleCamera) =>
                    camera.getVelocity().yVelocity < 0,
            },
            {
                cameraDescription: "move down",
                mouseLocation: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT,
                },
                cameraVelocityTest: (camera: BattleCamera) =>
                    camera.getVelocity().yVelocity > 0,
            },
        ]

        it.each(tests)(
            `moving mouse to ($mouseX, $mouseY) will make the camera $cameraDescription`,
            ({ mouseLocation, cameraVelocityTest }) => {
                battleMapDisplay.moveCameraBasedOnMouseMovement(
                    state,
                    mouseLocation
                )
                expect(cameraVelocityTest(camera)).toBeTruthy()
            }
        )
    })

    describe("it will change the camera position based on the mouse wheel", () => {
        let battleOrchestratorState: BattleOrchestratorState
        let camera: BattleCamera
        let initialCameraCoordinates: number[]

        beforeEach(() => {
            initialCameraCoordinates = [
                ScreenDimensions.SCREEN_WIDTH / 2,
                ScreenDimensions.SCREEN_HEIGHT / 2,
            ]
            camera = new BattleCamera(...initialCameraCoordinates)

            battleOrchestratorState = BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    camera,
                }),
            })
        })

        type CameraTest = {
            cameraDescription: string
            mouseWheel: MouseWheel
            cameraLocationTest: (camera: BattleCamera) => boolean
        }

        const tests: CameraTest[] = [
            {
                cameraDescription: "move left",
                mouseWheel: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                    deltaX: -10,
                    deltaY: 0,
                },
                cameraLocationTest: (camera: BattleCamera) =>
                    camera.getWorldLocation().x < initialCameraCoordinates[0],
            },
            {
                cameraDescription: "move right",
                mouseWheel: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                    deltaX: 10,
                    deltaY: 0,
                },
                cameraLocationTest: (camera: BattleCamera) =>
                    camera.getWorldLocation().x > initialCameraCoordinates[0],
            },
            {
                cameraDescription: "move up",
                mouseWheel: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                    deltaX: 0,
                    deltaY: -10,
                },
                cameraLocationTest: (camera: BattleCamera) =>
                    camera.getWorldLocation().y < initialCameraCoordinates[1],
            },
            {
                cameraDescription: "move down",
                mouseWheel: {
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                    deltaX: 0,
                    deltaY: 10,
                },
                cameraLocationTest: (camera: BattleCamera) =>
                    camera.getWorldLocation().y > initialCameraCoordinates[1],
            },
        ]

        it.each(tests)(
            `($mouseWheel.deltaX, $mouseWheel.deltaY) will make the camera $cameraDescription`,
            ({ mouseWheel, cameraLocationTest }) => {
                battleMapDisplay.moveCameraBasedOnMouseWheel(
                    battleOrchestratorState,
                    mouseWheel
                )
                expect(cameraLocationTest(camera)).toBeTruthy()
            }
        )

        describe("invert scroll direction based on config", () => {
            let scrollConfigSpy: MockInstance
            beforeEach(() => {
                scrollConfigSpy = getScrollConfigSpy(battleMapDisplay)
            })

            afterEach(() => {
                scrollConfigSpy.mockRestore()
            })

            const useMouseWheelToMoveCamera = (cameraDescription: string) => {
                const test = findTestByCameraDescription(
                    tests,
                    cameraDescription
                )

                battleMapDisplay.moveCameraBasedOnMouseWheel(
                    battleOrchestratorState,
                    test.mouseWheel
                )
            }

            it("left", () => {
                useMouseWheelToMoveCamera("move left")
                expect(
                    findTestByCameraDescription(
                        tests,
                        "move right"
                    ).cameraLocationTest(camera)
                ).toBeTruthy()
                expect(scrollConfigSpy).toBeCalled()
            })

            it("right", () => {
                useMouseWheelToMoveCamera("move right")
                expect(
                    findTestByCameraDescription(
                        tests,
                        "move left"
                    ).cameraLocationTest(camera)
                ).toBeTruthy()

                expect(scrollConfigSpy).toBeCalled()
            })

            it("down", () => {
                useMouseWheelToMoveCamera("move down")
                expect(
                    findTestByCameraDescription(
                        tests,
                        "move up"
                    ).cameraLocationTest(camera)
                ).toBeTruthy()

                expect(scrollConfigSpy).toBeCalled()
            })

            it("right", () => {
                useMouseWheelToMoveCamera("move up")
                expect(
                    findTestByCameraDescription(
                        tests,
                        "move down"
                    ).cameraLocationTest(camera)
                ).toBeTruthy()
                expect(scrollConfigSpy).toBeCalled()
            })
        })
    })

    describe("it will change the camera position when the mouse drags", () => {
        let battleOrchestratorState: BattleOrchestratorState
        let camera: BattleCamera
        let initialCameraCoordinates: number[]

        beforeEach(() => {
            initialCameraCoordinates = [
                ScreenDimensions.SCREEN_WIDTH / 2,
                ScreenDimensions.SCREEN_HEIGHT / 2,
            ]
            camera = new BattleCamera(...initialCameraCoordinates)

            battleOrchestratorState = BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    camera,
                }),
            })
        })

        type CameraTest = {
            cameraDescription: string
            mouseDrag: MouseDrag
            cameraLocationTest: (camera: BattleCamera) => boolean
        }

        const tests: CameraTest[] = [
            {
                cameraDescription: "move left",
                mouseDrag: {
                    button: MouseButton.ACCEPT,
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                    movementX: -1,
                    movementY: 0,
                },
                cameraLocationTest: (camera: BattleCamera) =>
                    camera.getWorldLocation().x < initialCameraCoordinates[0],
            },
            {
                cameraDescription: "move right",
                mouseDrag: {
                    button: MouseButton.ACCEPT,
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                    movementX: 1,
                    movementY: 0,
                },
                cameraLocationTest: (camera: BattleCamera) =>
                    camera.getWorldLocation().x > initialCameraCoordinates[0],
            },
            {
                cameraDescription: "move up",
                mouseDrag: {
                    button: MouseButton.ACCEPT,
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                    movementX: 0,
                    movementY: -1,
                },
                cameraLocationTest: (camera: BattleCamera) =>
                    camera.getWorldLocation().y < initialCameraCoordinates[1],
            },
            {
                cameraDescription: "move down",
                mouseDrag: {
                    button: MouseButton.ACCEPT,
                    x: ScreenDimensions.SCREEN_WIDTH / 2,
                    y: ScreenDimensions.SCREEN_HEIGHT / 2,
                    movementX: 0,
                    movementY: 1,
                },
                cameraLocationTest: (camera: BattleCamera) =>
                    camera.getWorldLocation().y > initialCameraCoordinates[1],
            },
        ]

        it.each(tests)(
            `($mouseDrag.movementX, $mouseDrag.movementY) will make the camera $cameraDescription`,
            ({ mouseDrag, cameraLocationTest }) => {
                battleMapDisplay.moveCameraBasedOnMouseDrag(
                    battleOrchestratorState,
                    mouseDrag
                )
                expect(cameraLocationTest(camera)).toBeTruthy()
            }
        )

        it("will not scroll unless a button is pressed", () => {
            const moveLeftTest = findTestByCameraDescription(tests, "move left")
            const dragWithNoButton = {
                ...moveLeftTest.mouseDrag,
                button: MouseButton.NONE,
            }
            battleMapDisplay.moveCameraBasedOnMouseDrag(
                battleOrchestratorState,
                dragWithNoButton
            )
            expect(camera.getWorldLocation().x).toEqual(
                initialCameraCoordinates[0]
            )
        })

        describe("invert scroll direction based on config", () => {
            let scrollConfigSpy: MockInstance
            beforeEach(() => {
                scrollConfigSpy = getScrollConfigSpy(battleMapDisplay)
            })

            afterEach(() => {
                scrollConfigSpy.mockRestore()
            })

            const useMouseDragToMoveCamera = (cameraDescription: string) => {
                const test = findTestByCameraDescription(
                    tests,
                    cameraDescription
                )

                battleMapDisplay.moveCameraBasedOnMouseDrag(
                    battleOrchestratorState,
                    test.mouseDrag
                )
            }

            it("left", () => {
                useMouseDragToMoveCamera("move left")
                expect(
                    findTestByCameraDescription(
                        tests,
                        "move right"
                    ).cameraLocationTest(camera)
                ).toBeTruthy()
                expect(scrollConfigSpy).toBeCalled()
            })

            it("right", () => {
                useMouseDragToMoveCamera("move right")
                expect(
                    findTestByCameraDescription(
                        tests,
                        "move left"
                    ).cameraLocationTest(camera)
                ).toBeTruthy()

                expect(scrollConfigSpy).toBeCalled()
            })

            it("down", () => {
                useMouseDragToMoveCamera("move down")
                expect(
                    findTestByCameraDescription(
                        tests,
                        "move up"
                    ).cameraLocationTest(camera)
                ).toBeTruthy()

                expect(scrollConfigSpy).toBeCalled()
            })

            it("right", () => {
                useMouseDragToMoveCamera("move up")
                expect(
                    findTestByCameraDescription(
                        tests,
                        "move down"
                    ).cameraLocationTest(camera)
                ).toBeTruthy()
                expect(scrollConfigSpy).toBeCalled()
            })
        })
    })

    it("when hovering over the HUD at the bottom of the screen, do not move the camera", () => {
        let initialCameraCoordinates: number[] = [
            0,
            -ScreenDimensions.SCREEN_HEIGHT,
        ]
        let camera: BattleCamera = new BattleCamera(...initialCameraCoordinates)

        const stateWithOpenedHUD = BattleOrchestratorStateService.new({
            battleHUDState: BattleHUDStateService.new({
                summaryHUDState: SummaryHUDStateService.new(),
            }),
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                camera,
            }),
        })

        stateWithOpenedHUD.battleState.camera.setXVelocity(0)
        stateWithOpenedHUD.battleState.camera.setYVelocity(0)
        const mouseHoverSpy: MockInstance = vi
            .spyOn(SummaryHUDStateService, "isMouseHoveringOver")
            .mockReturnValue(true)

        battleMapDisplay.moveCameraBasedOnMouseMovement(stateWithOpenedHUD, {
            x: ScreenDimensions.SCREEN_WIDTH / 2,
            y: ScreenDimensions.SCREEN_HEIGHT,
        })
        expect(
            stateWithOpenedHUD.battleState.camera.getVelocity().yVelocity
        ).toBe(0)
        expect(mouseHoverSpy).toBeCalled()
        mouseHoverSpy.mockRestore()
    })
})

const getScrollConfigSpy = (battleMapDisplay: BattleMapDisplay) => {
    return vi
        .spyOn(battleMapDisplay, "getMouseDirectionConfig")
        .mockReturnValue({
            horizontalTracksMouseMovement: false,
            verticalTracksMouseMovement: false,
            horizontalTracksMouseDrag: false,
            verticalTracksMouseDrag: false,
        })
}

type CameraTestDescription = {
    cameraDescription: string
}

const findTestByCameraDescription = <T>(
    tests: (T & CameraTestDescription)[],
    cameraDescription: string
): T => {
    const foundTest = tests.find(
        (t) => t.cameraDescription === cameraDescription
    )
    if (foundTest == undefined) {
        throw new Error("Could not find camera description test")
    }
    return foundTest
}
