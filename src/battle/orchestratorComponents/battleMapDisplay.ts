import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { BattleOrchestratorState } from "../orchestrator/battleOrchestratorState"
import { HexDrawingUtils } from "../../hexMap/hexDrawingUtils"
import { DrawSquaddieUtilities } from "../animation/drawSquaddie"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { UIControlSettings } from "../orchestrator/uiControlSettings"
import { MissionMapSquaddieLocationService } from "../../missionMap/squaddieLocation"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { isValidValue } from "../../utils/validityCheck"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { FileAccessHUDService } from "../hud/fileAccessHUD"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { SummaryHUDStateService } from "../hud/summaryHUD"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"

const SCREEN_EDGES = {
    left: [0.1, 0.04, 0.02],
    top: [0.1, 0.04, 0.02],
    right: [0.9, 0.96, 0.98],
    bottom: [0.9, 0.96, 0.98],
}

export class BattleMapDisplay implements BattleOrchestratorComponent {
    draw(gameEngineState: GameEngineState, graphics: GraphicsBuffer): void {
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
            battleSquaddieIdsToOmit
        )
        gameEngineState.battleOrchestratorState.battleState.camera.moveCamera()

        FileAccessHUDService.updateBasedOnGameEngineState(
            gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
            gameEngineState
        )
        FileAccessHUDService.updateStatusMessage(
            gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
            gameEngineState.fileState
        )
        FileAccessHUDService.draw(
            gameEngineState.battleOrchestratorState.battleHUD.fileAccessHUD,
            graphics
        )

        if (
            !gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState?.showSummaryHUD
        ) {
            return
        }

        SummaryHUDStateService.draw({
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            graphicsBuffer: graphics,
            gameEngineState,
        })
    }

    hasCompleted(state: GameEngineState): boolean {
        return false
    }

    mouseEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            TerrainTileMapService.mouseClicked({
                terrainTileMap:
                    state.battleOrchestratorState.battleState.missionMap
                        .terrainTileMap,
                mouseX: event.mouseX,
                mouseY: event.mouseY,
                mouseButton: event.mouseButton,
                ...state.battleOrchestratorState.battleState.camera.getCoordinates(),
            })
        }
        if (event.eventType === OrchestratorComponentMouseEventType.MOVED) {
            this.moveCameraBasedOnMouseMovement(
                state.battleOrchestratorState,
                event.mouseX,
                event.mouseY
            )
        }
    }

    keyEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentKeyEvent
    ): void {
        // Required by inheritance
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({})
    }

    moveCameraBasedOnMouseMovement(
        battleOrchestraState: BattleOrchestratorState,
        mouseX: number,
        mouseY: number
    ) {
        if (battleOrchestraState.battleState.camera.isPanning()) {
            return
        }

        if (
            battleOrchestraState.battleHUDState.summaryHUDState
                ?.showSummaryHUD &&
            SummaryHUDStateService.isMouseHoveringOver({
                summaryHUDState:
                    battleOrchestraState.battleHUDState.summaryHUDState,
                mouseSelectionLocation: {
                    x: mouseX,
                    y: mouseY,
                },
            })
        ) {
            this.moveCameraWhenMouseIsOverSummaryHUD(
                mouseX,
                battleOrchestraState
            )
            return
        }
        this.changeCameraHorizontalSpeedBasedOnMousePositionOnScreen(
            mouseX,
            battleOrchestraState
        )
        this.changeCameraVerticalSpeedBasedOnMousePositionOnScreen(
            mouseY,
            battleOrchestraState
        )
        this.stopCameraIfMouseIsOffscreen(mouseX, mouseY, battleOrchestraState)
    }

    private stopCameraIfMouseIsOffscreen = (
        mouseX: number,
        mouseY: number,
        battleOrchestraState: BattleOrchestratorState
    ) => {
        if (
            mouseX < 0 ||
            mouseX > ScreenDimensions.SCREEN_WIDTH ||
            mouseY < 0 ||
            mouseY > ScreenDimensions.SCREEN_HEIGHT
        ) {
            battleOrchestraState.battleState.camera.setXVelocity(0)
            battleOrchestraState.battleState.camera.setYVelocity(0)
        }
    }
    private changeCameraVerticalSpeedBasedOnMousePositionOnScreen = (
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
            if (
                mouseY >
                ScreenDimensions.SCREEN_HEIGHT * SCREEN_EDGES.bottom[1]
            ) {
                battleOrchestraState.battleState.camera.setYVelocity(5)
            }
            if (
                mouseY >
                ScreenDimensions.SCREEN_HEIGHT * SCREEN_EDGES.bottom[2]
            ) {
                battleOrchestraState.battleState.camera.setYVelocity(10)
            }
        } else {
            battleOrchestraState.battleState.camera.setYVelocity(0)
        }
    }
    private changeCameraHorizontalSpeedBasedOnMousePositionOnScreen = (
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
        } else if (
            mouseX >
            ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.right[0]
        ) {
            battleOrchestraState.battleState.camera.setXVelocity(1)
            if (
                mouseX >
                ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.right[1]
            ) {
                battleOrchestraState.battleState.camera.setXVelocity(5)
            }
            if (
                mouseX >
                ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.right[2]
            ) {
                battleOrchestraState.battleState.camera.setXVelocity(10)
            }
        } else {
            battleOrchestraState.battleState.camera.setXVelocity(0)
        }
    }
    private moveCameraWhenMouseIsOverSummaryHUD = (
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

    update(state: GameEngineState, graphicsContext: GraphicsBuffer): void {
        this.draw(state, graphicsContext)
    }

    recommendStateChanges(
        state: GameEngineState
    ): BattleOrchestratorChanges | undefined {
        return undefined
    }

    reset(state: GameEngineState) {
        // Required by inheritance
    }

    private drawSquaddieMapIcons(
        state: GameEngineState,
        graphicsContext: GraphicsBuffer,
        battleSquaddieIdsToOmit: string[]
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
                    const datum =
                        state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(
                            battleSquaddieId
                        )

                    const squaddieIsOnTheMap: boolean =
                        MissionMapSquaddieLocationService.isValid(datum) &&
                        TerrainTileMapService.isLocationOnMap(
                            state.battleOrchestratorState.battleState.missionMap
                                .terrainTileMap,
                            datum.mapLocation
                        )
                    const squaddieIsHidden: boolean =
                        state.battleOrchestratorState.battleState.missionMap.isSquaddieHiddenFromDrawing(
                            battleSquaddieId
                        )
                    if (squaddieIsOnTheMap && !squaddieIsHidden) {
                        DrawSquaddieUtilities.drawSquaddieMapIconAtMapLocation(
                            graphicsContext,
                            state.repository,
                            battleSquaddie,
                            battleSquaddieId,
                            datum.mapLocation,
                            state.battleOrchestratorState.battleState.camera
                        )
                    }
                }
            })
    }
}

const getCurrentlyMovingBattleSquaddieIds = (state: GameEngineState) => {
    if (
        state.battleOrchestratorState.battleState.actionsThisRound === undefined
    ) {
        return []
    }

    const processedActionEffectToShow =
        ActionsThisRoundService.getProcessedActionEffectToShow(
            state.battleOrchestratorState.battleState.actionsThisRound
        )
    if (!isValidValue(processedActionEffectToShow)) {
        return []
    }

    let battleSquaddieIdsToOmit: string[] = []
    if (processedActionEffectToShow.type === ActionEffectType.MOVEMENT) {
        battleSquaddieIdsToOmit.push(
            state.battleOrchestratorState.battleState.actionsThisRound
                .battleSquaddieId
        )
    }

    return battleSquaddieIdsToOmit
}
