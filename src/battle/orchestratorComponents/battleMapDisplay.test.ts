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
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleHUDService } from "../hud/battleHUD/battleHUD"
import { BattleHUDStateService } from "../hud/battleHUD/battleHUDState"
import { SummaryHUDStateService } from "../hud/summary/summaryHUD"
import { ResourceHandler } from "../../resource/resourceHandler"
import { beforeEach, describe, expect, it, MockInstance, vi } from "vitest"
import { PlayerInputTestService } from "../../utils/test/playerInput"
import { ScreenLocation } from "../../utils/mouseConfig"

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

    it("will move the camera if the mouse is near the edge of the screen", () => {
        const initialCameraCoordinates = [0, -ScreenDimensions.SCREEN_HEIGHT]
        let camera = new BattleCamera(...initialCameraCoordinates)
        camera.setXVelocity = vi.fn()
        camera.setYVelocity = vi.fn()

        const state: GameEngineState = GameEngineStateService.new({
            repository: undefined,
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                    camera,
                }),
            }),
        })
        battleMapDisplay.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.LOCATION,
            mouseLocation: {
                x: 0,
                y: 0,
            },
        })
        expect(camera.setXVelocity).toBeCalled()
        expect(camera.setYVelocity).toBeCalled()
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
                resourceHandler: undefined,
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
                    resourceHandler: gameEngineState.resourceHandler,
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
