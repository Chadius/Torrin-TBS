import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { BattleOrchestratorState } from "../orchestrator/battleOrchestratorState"
import { HexDrawingUtils } from "../../hexMap/hexDrawingUtils"
import {
    DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT,
    DrawSquaddieIconOnMapUtilities,
} from "../animation/drawSquaddieIconOnMap/drawSquaddieIconOnMap"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { MissionMapSquaddieCoordinateService } from "../../missionMap/squaddieCoordinate"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { isValidValue } from "../../utils/objectValidityCheck"
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
import {
    MouseButton,
    MouseDrag,
    MouseWheel,
    ScreenLocation,
} from "../../utils/mouseConfig"
import p5 from "p5"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { MapGraphicsLayerService } from "../../hexMap/mapLayer/mapGraphicsLayer"

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
const PLAYER_INPUT_SCROLL_DIRECTION_HORIZONTAL = JSON.parse(
    process.env.PLAYER_INPUT_SCROLL_DIRECTION
).horizontalTracksMouseMovement
const PLAYER_INPUT_SCROLL_DIRECTION_VERTICAL = JSON.parse(
    process.env.PLAYER_INPUT_SCROLL_DIRECTION
).verticalTracksMouseMovement
const PLAYER_INPUT_DRAG_DIRECTION_HORIZONTAL = JSON.parse(
    process.env.PLAYER_INPUT_DRAG_DIRECTION
).horizontalTracksMouseDrag
const PLAYER_INPUT_DRAG_DIRECTION_VERTICAL = JSON.parse(
    process.env.PLAYER_INPUT_DRAG_DIRECTION
).verticalTracksMouseDrag

export class BattleMapDisplay implements BattleOrchestratorComponent {
    public scrollTime: number
    public mapImage: p5.Image

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

            if (!this.mapImage) {
                this.mapImage = HexDrawingUtils.createMapImage({
                    graphicsBuffer: graphics,
                    resourceHandler,
                    terrainTileMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap.terrainTileMap,
                })
            }
            if (this.mapImage) {
                HexDrawingUtils.drawMapOnScreen({
                    mapImage: this.mapImage,
                    screenGraphicsBuffer: graphics,
                    camera: gameEngineState.battleOrchestratorState.battleState
                        .camera,
                })
            }

            TerrainTileMapService.sortGraphicsLayersByType(
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap
            )

            HexDrawingUtils.drawHighlightedTiles({
                graphics,
                map: gameEngineState.battleOrchestratorState.battleState
                    .missionMap.terrainTileMap,
                camera: gameEngineState.battleOrchestratorState.battleState
                    .camera,
            })

            HexDrawingUtils.drawOutlinedTile({
                graphics,
                map: gameEngineState.battleOrchestratorState.battleState
                    .missionMap.terrainTileMap,
                camera: gameEngineState.battleOrchestratorState.battleState
                    .camera,
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

    hasCompleted(_: GameEngineState): boolean {
        return false
    }

    mouseEventHappened(
        gameEngineState: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        switch (event.eventType) {
            case OrchestratorComponentMouseEventType.RELEASE:
                TerrainTileGraphicsService.mouseClicked({
                    terrainTileMap:
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap.terrainTileMap,
                    mouseClick: event.mouseRelease,
                    cameraLocation:
                        gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
                })
                break
            case OrchestratorComponentMouseEventType.LOCATION:
                this.moveCameraBasedOnMouseMovement(
                    gameEngineState.battleOrchestratorState,
                    event.mouseLocation
                )
                break
            case OrchestratorComponentMouseEventType.WHEEL:
                this.moveCameraBasedOnMouseWheel(
                    gameEngineState.battleOrchestratorState,
                    event.mouseWheel
                )
                break
            case OrchestratorComponentMouseEventType.DRAG:
                this.moveCameraBasedOnMouseDrag(
                    gameEngineState.battleOrchestratorState,
                    event.mouseDrag
                )
                break
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

    moveCameraBasedOnMouseWheel(
        battleOrchestratorState: BattleOrchestratorState,
        mouseWheel: MouseWheel
    ) {
        if (battleOrchestratorState.battleState.camera.isPanning()) {
            return
        }

        if (
            !!battleOrchestratorState.battleHUDState.summaryHUDState &&
            SummaryHUDStateService.isMouseHoveringOver({
                summaryHUDState:
                    battleOrchestratorState.battleHUDState.summaryHUDState,
                mouseSelectionLocation: { ...mouseWheel },
            })
        ) {
            return
        }

        const { horizontalTracksMouseMovement, verticalTracksMouseMovement } =
            this.getMouseDirectionConfig()
        const horizontalMultiplier = horizontalTracksMouseMovement ? 1 : -1
        const verticalMultiplier = verticalTracksMouseMovement ? 1 : -1

        if (mouseWheel.deltaX < 0) {
            battleOrchestratorState.battleState.camera.xCoordinate -=
                HORIZONTAL_SCROLL_SPEED_PER_UPDATE * horizontalMultiplier
        }
        if (mouseWheel.deltaX > 0) {
            battleOrchestratorState.battleState.camera.xCoordinate +=
                HORIZONTAL_SCROLL_SPEED_PER_UPDATE * horizontalMultiplier
        }
        if (mouseWheel.deltaY < 0) {
            battleOrchestratorState.battleState.camera.yCoordinate -=
                VERTICAL_SCROLL_SPEED_PER_UPDATE * verticalMultiplier
        }
        if (mouseWheel.deltaY > 0) {
            battleOrchestratorState.battleState.camera.yCoordinate +=
                VERTICAL_SCROLL_SPEED_PER_UPDATE * verticalMultiplier
        }
        battleOrchestratorState.battleState.camera.constrainCamera()
    }

    moveCameraBasedOnMouseDrag(
        battleOrchestratorState: BattleOrchestratorState,
        mouseDrag: MouseDrag
    ) {
        if (battleOrchestratorState.battleState.camera.isPanning()) {
            return
        }

        if (mouseDrag.button == MouseButton.NONE) return

        if (
            !!battleOrchestratorState.battleHUDState.summaryHUDState &&
            SummaryHUDStateService.isMouseHoveringOver({
                summaryHUDState:
                    battleOrchestratorState.battleHUDState.summaryHUDState,
                mouseSelectionLocation: { ...mouseDrag },
            })
        ) {
            return
        }

        const { horizontalTracksMouseDrag, verticalTracksMouseDrag } =
            this.getMouseDirectionConfig()
        const horizontalMultiplier = horizontalTracksMouseDrag ? 1 : -1
        const verticalMultiplier = verticalTracksMouseDrag ? 1 : -1

        battleOrchestratorState.battleState.camera.xCoordinate +=
            HORIZONTAL_SCROLL_SPEED_PER_UPDATE *
            mouseDrag.movementX *
            horizontalMultiplier
        battleOrchestratorState.battleState.camera.yCoordinate +=
            VERTICAL_SCROLL_SPEED_PER_UPDATE *
            mouseDrag.movementY *
            verticalMultiplier
        battleOrchestratorState.battleState.camera.constrainCamera()
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
        _state: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        return undefined
    }

    reset(_gameEngineState: GameEngineState) {
        this.scrollTime = undefined
    }

    private drawSquaddieMapIcons(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer,
        battleSquaddieIdsToOmit: string[],
        resourceHandler: ResourceHandler
    ) {
        let targetedBattleSquaddieIds: string[] =
            this.getTargetedBattleSquaddieIds(gameEngineState)

        ObjectRepositoryService.getBattleSquaddieIterator(
            gameEngineState.repository
        )
            .filter(
                (info) =>
                    info.battleSquaddieId in
                    gameEngineState.repository.imageUIByBattleSquaddieId
            )
            .filter(
                (info) =>
                    !battleSquaddieIdsToOmit.includes(info.battleSquaddieId)
            )
            .filter((info) => {
                const datum = MissionMapService.getByBattleSquaddieId(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                    info.battleSquaddieId
                )

                const squaddieIsOnTheMap: boolean =
                    MissionMapSquaddieCoordinateService.isValid(datum) &&
                    TerrainTileMapService.isCoordinateOnMap(
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap.terrainTileMap,
                        datum.currentMapCoordinate
                    )
                const squaddieIsHidden: boolean =
                    MissionMapService.isSquaddieHiddenFromDrawing(
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                        info.battleSquaddieId
                    )
                return squaddieIsOnTheMap && !squaddieIsHidden
            })
            .forEach((info) => {
                const { battleSquaddieId } = info

                const datum = MissionMapService.getByBattleSquaddieId(
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                    battleSquaddieId
                )

                if (
                    BattleActionDecisionStepService.getActor(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )?.battleSquaddieId == battleSquaddieId
                ) {
                    DrawSquaddieIconOnMapUtilities.drawPulsingCircleAtMapCoordinate(
                        {
                            graphicsContext,
                            camera: gameEngineState.battleOrchestratorState
                                .battleState.camera,
                            mapCoordinate: datum.currentMapCoordinate,
                            circleInfo:
                                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.actorSquaddie,
                        }
                    )
                } else if (
                    targetedBattleSquaddieIds.includes(battleSquaddieId)
                ) {
                    DrawSquaddieIconOnMapUtilities.drawPulsingCircleAtMapCoordinate(
                        {
                            graphicsContext,
                            camera: gameEngineState.battleOrchestratorState
                                .battleState.camera,
                            mapCoordinate: datum.currentMapCoordinate,
                            circleInfo:
                                DRAW_SQUADDIE_ICON_ON_MAP_LAYOUT.targetEnemySquaddie,
                        }
                    )
                }
                DrawSquaddieIconOnMapUtilities.drawSquaddieMapIconAtMapCoordinate(
                    {
                        graphics: graphicsContext,
                        squaddieRepository: gameEngineState.repository,
                        battleSquaddieId,
                        mapCoordinate: datum.currentMapCoordinate,
                        camera: gameEngineState.battleOrchestratorState
                            .battleState.camera,
                        resourceHandler,
                    }
                )
            })
    }

    private getTargetedBattleSquaddieIds(gameEngineState: GameEngineState) {
        const targetCoordinate = BattleActionDecisionStepService.getTarget(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionDecisionStep
        )?.targetCoordinate
        const targetingLayer = TerrainTileMapService.getGraphicsLayer({
            terrainTileMap:
                gameEngineState.battleOrchestratorState.battleState.missionMap
                    .terrainTileMap,
            id: "targeting",
        })
        const targetedCoordinates = targetingLayer
            ? MapGraphicsLayerService.getCoordinates(targetingLayer)
            : []
        return [targetCoordinate, ...targetedCoordinates]
            .filter((x) => x)
            .map(
                (targetCoordinate) =>
                    MissionMapService.getBattleSquaddieAtCoordinate(
                        gameEngineState.battleOrchestratorState.battleState
                            .missionMap,
                        targetCoordinate
                    ).battleSquaddieId
            )
            .filter((x) => x)
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

    getMouseDirectionConfig() {
        return {
            horizontalTracksMouseMovement:
                PLAYER_INPUT_SCROLL_DIRECTION_HORIZONTAL,
            verticalTracksMouseMovement: PLAYER_INPUT_SCROLL_DIRECTION_VERTICAL,
            horizontalTracksMouseDrag: PLAYER_INPUT_DRAG_DIRECTION_HORIZONTAL,
            verticalTracksMouseDrag: PLAYER_INPUT_DRAG_DIRECTION_VERTICAL,
        }
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
