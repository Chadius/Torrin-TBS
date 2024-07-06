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
import { MissionMapSquaddieLocationHandler } from "../../missionMap/squaddieLocation"
import { GameEngineState } from "../../gameEngine/gameEngine"
import { ObjectRepositoryService } from "../objectRepository"
import { isValidValue } from "../../utils/validityCheck"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ActionEffectType } from "../../action/template/actionEffectTemplate"
import { FileAccessHUDService } from "../hud/fileAccessHUD"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { SummaryHUDStateService } from "../hud/summaryHUD"

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

        gameEngineState.battleOrchestratorState.battleHUD.battleSquaddieSelectedHUD.draw(
            gameEngineState,
            graphics
        )

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
    }

    hasCompleted(state: GameEngineState): boolean {
        return false
    }

    mouseEventHappened(
        state: GameEngineState,
        event: OrchestratorComponentMouseEvent
    ): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            state.battleOrchestratorState.battleState.missionMap.terrainTileMap.mouseClicked(
                {
                    mouseX: event.mouseX,
                    mouseY: event.mouseY,
                    mouseButton: event.mouseButton,
                    ...state.battleOrchestratorState.battleState.camera.getCoordinatesAsObject(),
                }
            )
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
    ): void {}

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({})
    }

    moveCameraBasedOnMouseMovement(
        state: BattleOrchestratorState,
        mouseX: number,
        mouseY: number
    ) {
        if (state.battleState.camera.isPanning()) {
            return
        }

        if (
            state.battleHUDState.summaryHUDState?.showSummaryHUD &&
            SummaryHUDStateService.isMouseHoveringOver({
                summaryHUDState: state.battleHUDState.summaryHUDState,
                mouseSelectionLocation: {
                    x: mouseX,
                    y: mouseY,
                },
            })
        ) {
            if (mouseX < ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.left[1]) {
                state.battleState.camera.setXVelocity(-5)
            }
            if (
                mouseX >
                ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.right[2]
            ) {
                state.battleState.camera.setXVelocity(5)
            }

            return
        }

        if (mouseX < ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.left[0]) {
            state.battleState.camera.setXVelocity(-1)
            if (mouseX < ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.left[1]) {
                state.battleState.camera.setXVelocity(-5)
            }
            if (mouseX < ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.left[2]) {
                state.battleState.camera.setXVelocity(-10)
            }
        } else if (
            mouseX >
            ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.right[0]
        ) {
            state.battleState.camera.setXVelocity(1)
            if (
                mouseX >
                ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.right[1]
            ) {
                state.battleState.camera.setXVelocity(5)
            }
            if (
                mouseX >
                ScreenDimensions.SCREEN_WIDTH * SCREEN_EDGES.right[2]
            ) {
                state.battleState.camera.setXVelocity(10)
            }
        } else {
            state.battleState.camera.setXVelocity(0)
        }

        if (mouseY < ScreenDimensions.SCREEN_HEIGHT * SCREEN_EDGES.top[0]) {
            state.battleState.camera.setYVelocity(-1)
            if (mouseY < ScreenDimensions.SCREEN_HEIGHT * SCREEN_EDGES.top[1]) {
                state.battleState.camera.setYVelocity(-5)
            }
            if (mouseY < ScreenDimensions.SCREEN_HEIGHT * SCREEN_EDGES.top[2]) {
                state.battleState.camera.setYVelocity(-10)
            }
        } else if (
            mouseY >
            ScreenDimensions.SCREEN_HEIGHT * SCREEN_EDGES.bottom[0]
        ) {
            state.battleState.camera.setYVelocity(1)
            if (
                mouseY >
                ScreenDimensions.SCREEN_HEIGHT * SCREEN_EDGES.bottom[1]
            ) {
                state.battleState.camera.setYVelocity(5)
            }
            if (
                mouseY >
                ScreenDimensions.SCREEN_HEIGHT * SCREEN_EDGES.bottom[2]
            ) {
                state.battleState.camera.setYVelocity(10)
            }
        } else {
            state.battleState.camera.setYVelocity(0)
        }

        if (
            mouseX < 0 ||
            mouseX > ScreenDimensions.SCREEN_WIDTH ||
            mouseY < 0 ||
            mouseY > ScreenDimensions.SCREEN_HEIGHT
        ) {
            state.battleState.camera.setXVelocity(0)
            state.battleState.camera.setYVelocity(0)
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

    reset(state: GameEngineState) {}

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
                        MissionMapSquaddieLocationHandler.isValid(datum) &&
                        state.battleOrchestratorState.battleState.missionMap.areCoordinatesOnMap(
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
