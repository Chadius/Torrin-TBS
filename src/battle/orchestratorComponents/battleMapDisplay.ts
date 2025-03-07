import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { BattleOrchestratorState } from "../orchestrator/battleOrchestratorState"
import { HexDrawingUtils } from "../../hexMap/hexDrawingUtils"
import { DrawSquaddieIconOnMapUtilities } from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { MissionMapSquaddieCoordinateService } from "../../missionMap/squaddieCoordinate"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { isValidValue } from "../../utils/validityCheck"
import { FileAccessHUDService } from "../hud/fileAccess/fileAccessHUD"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { SummaryHUDStateService } from "../hud/summary/summaryHUD"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileGraphicsService } from "../../hexMap/terrainTileGraphics"
import { ResourceHandler } from "../../resource/resourceHandler"
import {
    PlayerInputAction,
    PlayerInputStateService,
} from "../../ui/playerInput/playerInputState"
import { ScreenLocation } from "../../utils/mouseConfig"

const SCREEN_EDGES = {
    left: [0.1, 0.04, 0.02],
    top: [0.1, 0.04, 0.02],
    right: [0.9, 0.96, 0.98],
    bottom: [0.9, 0.96, 0.98],
}
const HORIZONTAL_SCROLL_SPEED_PER_UPDATE = JSON.parse(
    process.env.MAP_KEYBOARD_SCROLL_SPEED_PER_UPDATE
).horizontal
const VERTICAL_SCROLL_SPEED_PER_UPDATE = JSON.parse(
    process.env.MAP_KEYBOARD_SCROLL_SPEED_PER_UPDATE
).vertical

export class BattleMapDisplay implements BattleOrchestratorComponent {
    public scrollTime: number

    draw({
        gameEngineState,
        graphics,
        resourceHandler,
    }: {
        gameEngineState: GameEngineState
        graphics: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void {
        graphics.background(50, 10, 20)

        if (
            gameEngineState.battleOrchestratorState.battleState.missionMap
                .terrainTileMap
        ) {
            TerrainTileMapService.sortGraphicsLayersByType(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap
            )
            HexDrawingUtils.drawHexMap({
                graphics,
                map: gameEngineState.battleOrchestratorState.battleState
                    .missionMap.terrainTileMap,
                camera: gameEngineState.battleOrchestratorState.battleState
                    .camera,
                resourceHandler: gameEngineState.resourceHandler,
            })
        }

        let battleSquaddieIdsToOmit =
            getCurrentlyMovingBattleSquaddieIds(gameEngineState)
        this.drawSquaddieMapIcons(
            gameEngineState,
            graphics,
            battleSquaddieIdsToOmit,
            resourceHandler
        )
        gameEngineState.battleOrchestratorState.battleState.camera.moveCamera()

        FileAccessHUDService.updateBasedOnGameEngineState(
            gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
            gameEngineState
        )
        FileAccessHUDService.updateStatusMessage({
            fileAccessHUD:
                gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
            fileState: gameEngineState.fileState,
            messageBoard: gameEngineState.messageBoard,
        })
        FileAccessHUDService.draw(
            gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
            graphics
        )
    }

    hasCompleted(state: GameEngineState): boolean {
        return false
    }

    mouseEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        if (event.eventType === OrchestratorComponentMouseEventType.RELEASE) {
            TerrainTileGraphicsService.mouseClicked({
                terrainTileMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap.terrainTileMap,
                mouseClick: event.mouseRelease,
                cameraLocation:
                    gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
            })
        }
        if (event.eventType === OrchestratorComponentMouseEventType.LOCATION) {
            this.moveCameraBasedOnMouseMovement(
                gameEngineState.battleOrchestratorState,
                event.mouseLocation
            )
        }
    }

    keyEventHappened(
        _gameEngineState: GameEngineState,
        _keyEvent: OrchestratorComponentKeyEvent
    ): void {
        // Required by Inheritance
    }

    uiControlSettings(_state: GameEngineState): UIControlSettings {
        return new UIControlSettings({})
    }

    moveCameraBasedOnMouseMovement(
        battleOrchestraState: BattleOrchestratorState,
        mouseLocation: ScreenLocation
    ) {
        if (battleOrchestraState.battleState.camera.isPanning()) {
            return
        }

        if (
            !!battleOrchestraState.battleHUDState.summaryHUDState &&
            SummaryHUDStateService.isMouseHoveringOver({
                summaryHUDState:
                    battleOrchestraState.battleHUDState.summaryHUDState,
                mouseSelectionLocation: mouseLocation,
            })
        ) {
            moveCameraWhenMouseIsOverSummaryHUD(
                mouseLocation.x,
                battleOrchestraState
            )
            return
        }
        changeCameraHorizontalSpeedBasedOnMouseLocationOnScreen(
            mouseLocation.x,
            battleOrchestraState
        )
        changeCameraVerticalSpeedBasedOnMouseLocationOnScreen(
            mouseLocation.y,
            battleOrchestraState
        )
        stopCameraIfMouseIsOffscreen(mouseLocation, battleOrchestraState)
    }

    update({
        gameEngineState,
        graphicsContext,
        resourceHandler,
    }: {
        gameEngineState: GameEngineState
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void {
        this.checkForKeyboardHeldKeys(gameEngineState)
        this.draw({
            gameEngineState,
            graphics: graphicsContext,
            resourceHandler,
        })
    }

    recommendStateChanges(
        state: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        return undefined
    }

    reset(gameEngineState: GameEngineState) {
        this.scrollTime = undefined
    }

    private drawSquaddieMapIcons(
        state: GameEngineState,
        graphicsContext: GraphicsBuffer,
        battleSquaddieIdsToOmit: string[],
        resourceHandler: ResourceHandler
    ) {
        ObjectRepositoryService.getBattleSquaddieIterator(state.repository)
            .filter(
                (info) =>
                    info.battleSquaddieId in
                    state.repository.imageUIByBattleSquaddieId
            )
            .forEach((info) => {
                const { battleSquaddie, battleSquaddieId } = info

                if (!battleSquaddieIdsToOmit.includes(battleSquaddieId)) {
                    const datum = MissionMapService.getByBattleSquaddieId(
                        state.battleOrchestratorState.battleState.missionMap,
                        battleSquaddieId
                    )

                    const squaddieIsOnTheMap: boolean =
                        MissionMapSquaddieCoordinateService.isValid(datum) &&
                        TerrainTileMapService.isCoordinateOnMap(
                            state.battleOrchestratorState.battleState.missionMap
                                .terrainTileMap,
                            datum.mapCoordinate
                        )
                    const squaddieIsHidden: boolean =
                        MissionMapService.isSquaddieHiddenFromDrawing(
                            state.battleOrchestratorState.battleState
                                .missionMap,
                            battleSquaddieId
                        )
                    if (squaddieIsOnTheMap && !squaddieIsHidden) {
                        DrawSquaddieIconOnMapUtilities.drawSquaddieMapIconAtMapCoordinate(
                            {
                                graphics: graphicsContext,
                                squaddieRepository: state.repository,
                                battleSquaddieId: battleSquaddieId,
                                mapCoordinate: datum.mapCoordinate,
                                camera: state.battleOrchestratorState
                                    .battleState.camera,
                                resourceHandler,
                            }
                        )
                    }
                }
            })
    }

    private checkForKeyboardHeldKeys(gameEngineState: GameEngineState) {
        const actions = PlayerInputStateService.getActionsForHeldKeys(
            gameEngineState.playerInputState
        )

        if (actions.includes(PlayerInputAction.SCROLL_LEFT)) {
            gameEngineState.battleOrchestratorState.battleState.camera.xCoordinate -=
                HORIZONTAL_SCROLL_SPEED_PER_UPDATE
        }
        if (actions.includes(PlayerInputAction.SCROLL_RIGHT)) {
            gameEngineState.battleOrchestratorState.battleState.camera.xCoordinate +=
                HORIZONTAL_SCROLL_SPEED_PER_UPDATE
        }
        if (actions.includes(PlayerInputAction.SCROLL_UP)) {
            gameEngineState.battleOrchestratorState.battleState.camera.yCoordinate -=
                VERTICAL_SCROLL_SPEED_PER_UPDATE
        }
        if (actions.includes(PlayerInputAction.SCROLL_DOWN)) {
            gameEngineState.battleOrchestratorState.battleState.camera.yCoordinate +=
                VERTICAL_SCROLL_SPEED_PER_UPDATE
        }
        gameEngineState.battleOrchestratorState.battleState.camera.constrainCamera()
    }
}

const getCurrentlyMovingBattleSquaddieIds = (
    gameEngineState: GameEngineState
) => {
    if (
        BattleActionRecorderService.isAnimationQueueEmpty(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )
    ) {
        return []
    }

    const actionToAnimate = BattleActionRecorderService.peekAtAnimationQueue(
        gameEngineState.battleOrchestratorState.battleState.battleActionRecorder
    )

    if (!isValidValue(actionToAnimate)) {
        return []
    }

    let battleSquaddieIdsToOmit: string[] = []
    if (actionToAnimate.action.isMovement) {
        battleSquaddieIdsToOmit.push(
            actionToAnimate.actor.actorBattleSquaddieId
        )
    }

    return battleSquaddieIdsToOmit
}

const stopCameraIfMouseIsOffscreen = (
    mouseLocation: ScreenLocation,
    battleOrchestraState: BattleOrchestratorState
) => {
    if (
        mouseLocation.x < 0 ||
        mouseLocation.x > ScreenDimensions.SCREEN_WIDTH ||
        mouseLocation.y < 0 ||
        mouseLocation.y > ScreenDimensions.SCREEN_HEIGHT
    ) {
        battleOrchestraState.battleState.camera.setXVelocity(0)
        battleOrchestraState.battleState.camera.setYVelocity(0)
    }
}

const moveCameraWhenMouseIsOverSummaryHUD = (
    mouseX: number,
    battleOrchestraState: BattleOrchestratorState
) => {
    if (mouseX < ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.left[1]) {
        battleOrchestraState.battleState.camera.setXVelocity(-5)
    }
    if (mouseX > ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.right[2]) {
        battleOrchestraState.battleState.camera.setXVelocity(5)
    }
}

const changeCameraVerticalSpeedBasedOnMouseLocationOnScreen = (
    mouseY: number,
    battleOrchestraState: BattleOrchestratorState
) => {
    if (mouseY < ScreenDimensions.SCREEN_HEIGHT * SCREEN_EDGES.top[0]) {
        battleOrchestraState.battleState.camera.setYVelocity(-1)
        if (mouseY < ScreenDimensions.SCREEN_HEIGHT * SCREEN_EDGES.top[1]) {
            battleOrchestraState.battleState.camera.setYVelocity(-5)
        }
        if (mouseY < ScreenDimensions.SCREEN_HEIGHT * SCREEN_EDGES.top[2]) {
            battleOrchestraState.battleState.camera.setYVelocity(-10)
        }
    } else if (
        mouseY >
        ScreenDimensions.SCREEN_HEIGHT * SCREEN_EDGES.bottom[0]
    ) {
        battleOrchestraState.battleState.camera.setYVelocity(1)
        if (mouseY > ScreenDimensions.SCREEN_HEIGHT * SCREEN_EDGES.bottom[1]) {
            battleOrchestraState.battleState.camera.setYVelocity(5)
        }
        if (mouseY > ScreenDimensions.SCREEN_HEIGHT * SCREEN_EDGES.bottom[2]) {
            battleOrchestraState.battleState.camera.setYVelocity(10)
        }
    } else {
        battleOrchestraState.battleState.camera.setYVelocity(0)
    }
}
const changeCameraHorizontalSpeedBasedOnMouseLocationOnScreen = (
    mouseX: number,
    battleOrchestraState: BattleOrchestratorState
) => {
    if (mouseX < ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.left[0]) {
        battleOrchestraState.battleState.camera.setXVelocity(-1)
        if (mouseX < ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.left[1]) {
            battleOrchestraState.battleState.camera.setXVelocity(-5)
        }
        if (mouseX < ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.left[2]) {
            battleOrchestraState.battleState.camera.setXVelocity(-10)
        }
    } else if (mouseX > ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.right[0]) {
        battleOrchestraState.battleState.camera.setXVelocity(1)
        if (mouseX > ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.right[1]) {
            battleOrchestraState.battleState.camera.setXVelocity(5)
        }
        if (mouseX > ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.right[2]) {
            battleOrchestraState.battleState.camera.setXVelocity(10)
        }
    } else {
        battleOrchestraState.battleState.camera.setXVelocity(0)
    }
}
