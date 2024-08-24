import { BattleMapDisplay } from "./battleMapDisplay"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../orchestrator/battleOrchestratorState"
import { ObjectRepositoryService } from "../objectRepository"
import { BattleCamera } from "../battleCamera"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { OrchestratorComponentMouseEventType } from "../orchestrator/battleOrchestratorComponent"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { MissionMap } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleHUDService } from "../hud/battleHUD"
import { BattleHUDStateService } from "../hud/battleHUDState"
import { SummaryHUDStateService } from "../hud/summaryHUD"

describe("battleMapDisplay", () => {
    let battleMapDisplay: BattleMapDisplay
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        jest.spyOn(
            ObjectRepositoryService,
            "getBattleSquaddieIterator"
        ).mockReturnValue([])

        battleMapDisplay = new BattleMapDisplay()

        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
    })

    it("will move the camera if the mouse is near the edge of the screen", () => {
        const initialCameraCoordinates = [0, -ScreenDimensions.SCREEN_HEIGHT]
        let camera = new BattleCamera(...initialCameraCoordinates)
        camera.setXVelocity = jest.fn()
        camera.setYVelocity = jest.fn()

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
            eventType: OrchestratorComponentMouseEventType.MOVED,
            mouseX: 0,
            mouseY: 0,
        })
        expect(camera.setXVelocity).toBeCalled()
        expect(camera.setYVelocity).toBeCalled()
    })

    describe("panning the camera", () => {
        let state: GameEngineState
        let camera: BattleCamera
        let initialCameraCoordinates: number[]

        beforeEach(() => {
            initialCameraCoordinates = [0, -ScreenDimensions.SCREEN_HEIGHT]
            camera = new BattleCamera(...initialCameraCoordinates)

            state = GameEngineStateService.new({
                repository: undefined,
                resourceHandler: undefined,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleHUD: BattleHUDService.new({}),
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        camera,
                        missionMap: new MissionMap({
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
            camera.setXVelocity = jest.fn()
            camera.setYVelocity = jest.fn()

            jest.spyOn(Date, "now").mockImplementation(() => 0)
            camera.pan({
                xDestination: destinationCoordinates[0],
                yDestination: destinationCoordinates[1],
                timeToPan,
                respectConstraints: false,
            })

            jest.spyOn(Date, "now").mockImplementation(() => timeToPan / 2)
            battleMapDisplay.draw(state, mockedP5GraphicsContext)
            expect(camera.getCoordinates()[0]).toBeCloseTo(
                (initialCameraCoordinates[0] + destinationCoordinates[0]) / 2
            )
            expect(camera.getCoordinates()[1]).toBeCloseTo(
                (initialCameraCoordinates[1] + destinationCoordinates[1]) / 2
            )

            battleMapDisplay.mouseEventHappened(state, {
                eventType: OrchestratorComponentMouseEventType.MOVED,
                mouseX: 0,
                mouseY: 0,
            })
            expect(camera.setXVelocity).not.toBeCalled()
            expect(camera.setYVelocity).not.toBeCalled()

            jest.spyOn(Date, "now").mockImplementation(() => timeToPan)
            battleMapDisplay.draw(state, mockedP5GraphicsContext)
            expect(camera.getCoordinates()[0]).toBeCloseTo(
                destinationCoordinates[0]
            )
            expect(camera.getCoordinates()[1]).toBeCloseTo(
                destinationCoordinates[1]
            )
        })
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
            mouseX: number
            mouseY: number
            cameraVelocityTest: (camera: BattleCamera) => boolean
        }

        const tests: CameraTest[] = [
            {
                cameraDescription: "move left",
                mouseX: 0,
                mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraVelocityTest: (camera: BattleCamera) =>
                    camera.getVelocity()[0] < 0,
            },
            {
                cameraDescription: "move right",
                mouseX: ScreenDimensions.SCREEN_WIDTH,
                mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
                cameraVelocityTest: (camera: BattleCamera) =>
                    camera.getVelocity()[0] > 0,
            },
            {
                cameraDescription: "move up",
                mouseX: ScreenDimensions.SCREEN_WIDTH / 2,
                mouseY: 0,
                cameraVelocityTest: (camera: BattleCamera) =>
                    camera.getVelocity()[1] < 0,
            },
            {
                cameraDescription: "move down",
                mouseX: ScreenDimensions.SCREEN_WIDTH / 2,
                mouseY: ScreenDimensions.SCREEN_HEIGHT,
                cameraVelocityTest: (camera: BattleCamera) =>
                    camera.getVelocity()[1] > 0,
            },
        ]

        it.each(tests)(
            `moving mouse to ($mouseX, $mouseY) will make the camera $cameraDescription`,
            ({ cameraDescription, mouseX, mouseY, cameraVelocityTest }) => {
                battleMapDisplay.moveCameraBasedOnMouseMovement(
                    state,
                    mouseX,
                    mouseY
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
                summaryHUDState: SummaryHUDStateService.new({
                    mouseSelectionLocation: {
                        x: 0,
                        y: 0,
                    },
                }),
            }),
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                camera,
            }),
        })

        stateWithOpenedHUD.battleState.camera.setXVelocity(0)
        stateWithOpenedHUD.battleState.camera.setYVelocity(0)
        stateWithOpenedHUD.battleHUDState.summaryHUDState.showSummaryHUD = true
        const mouseHoverSpy: jest.SpyInstance = jest
            .spyOn(SummaryHUDStateService, "isMouseHoveringOver")
            .mockReturnValue(true)

        battleMapDisplay.moveCameraBasedOnMouseMovement(
            stateWithOpenedHUD,
            ScreenDimensions.SCREEN_WIDTH / 2,
            ScreenDimensions.SCREEN_HEIGHT
        )
        expect(stateWithOpenedHUD.battleState.camera.getVelocity()[1]).toBe(0)
        expect(mouseHoverSpy).toBeCalled()
        mouseHoverSpy.mockRestore()
    })

    describe("will horizontally scroll the camera if the HUD is open but only at the extreme edge", () => {
        let camera: BattleCamera
        let initialCameraCoordinates: number[]

        beforeEach(() => {
            initialCameraCoordinates = [0, -ScreenDimensions.SCREEN_HEIGHT]
            camera = new BattleCamera(...initialCameraCoordinates)
        })

        type CameraTest = {
            cameraDescription: string
            mouseX: number
            cameraVelocityTest: (camera: BattleCamera) => boolean
        }

        const tests: CameraTest[] = [
            {
                cameraDescription: "move left",
                mouseX: 0,
                cameraVelocityTest: (camera: BattleCamera) =>
                    camera.getVelocity()[0] < 0,
            },
            {
                cameraDescription: "move right",
                mouseX: ScreenDimensions.SCREEN_WIDTH,
                cameraVelocityTest: (camera: BattleCamera) =>
                    camera.getVelocity()[0] > 0,
            },
            {
                cameraDescription: "not move",
                mouseX: ScreenDimensions.SCREEN_WIDTH / 2,
                cameraVelocityTest: (camera: BattleCamera) =>
                    camera.getVelocity()[0] === 0,
            },
        ]

        const stateWithOpenedHUD = BattleOrchestratorStateService.new({
            battleHUDState: BattleHUDStateService.new({
                summaryHUDState: SummaryHUDStateService.new({
                    mouseSelectionLocation: {
                        x: 0,
                        y: 0,
                    },
                }),
            }),
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                camera,
            }),
        })

        it.each(tests)(
            `when hovering over the HUD at mouseX $mouseX, the camera should $cameraDescription`,
            ({ cameraDescription, mouseX, cameraVelocityTest }) => {
                stateWithOpenedHUD.battleState.camera.setXVelocity(0)
                stateWithOpenedHUD.battleState.camera.setYVelocity(0)
                stateWithOpenedHUD.battleHUDState.summaryHUDState.showSummaryHUD =
                    true
                stateWithOpenedHUD.battleHUDState.summaryHUDState.mouseSelectionLocation.y =
                    ScreenDimensions.SCREEN_HEIGHT
                stateWithOpenedHUD.battleHUDState.summaryHUDState.mouseSelectionLocation.x =
                    mouseX
                const mouseHoverSpy: jest.SpyInstance = jest
                    .spyOn(SummaryHUDStateService, "isMouseHoveringOver")
                    .mockReturnValue(true)
                battleMapDisplay.moveCameraBasedOnMouseMovement(
                    stateWithOpenedHUD,
                    mouseX,
                    ScreenDimensions.SCREEN_HEIGHT
                )
                expect(
                    cameraVelocityTest(stateWithOpenedHUD.battleState.camera)
                ).toBeTruthy()
                expect(mouseHoverSpy).toBeCalled()
                mouseHoverSpy.mockRestore()
            }
        )
    })
})
