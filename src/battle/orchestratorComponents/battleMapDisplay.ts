import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {drawHexMap} from "../../hexMap/hexDrawingUtils";
import {drawSquaddieMapIconAtMapLocation} from "../animation/drawSquaddie";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {SquaddieInstructionInProgressHandler} from "../history/squaddieInstructionInProgress";
import {MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";

export class BattleMapDisplay implements BattleOrchestratorComponent {
    draw(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
        graphicsContext.background(50, 10, 20);

        if (state.battleState.missionMap.terrainTileMap) {
            drawHexMap(graphicsContext, state.battleState.missionMap.terrainTileMap, ...state.battleState.camera.getCoordinates());
        }

        this.drawSquaddieMapIcons(state, graphicsContext);
        state.battleState.camera.moveCamera();

        state.battleSquaddieSelectedHUD.draw(state.battleState.squaddieCurrentlyActing, state, graphicsContext);
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        return false;
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            state.battleState.missionMap.terrainTileMap.mouseClicked(event.mouseX, event.mouseY, ...state.battleState.camera.getCoordinates());
        }
        if (event.eventType === OrchestratorComponentMouseEventType.MOVED) {
            this.moveCameraBasedOnMouseMovement(state, event.mouseX, event.mouseY);
        }
    }

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings {
        return new UIControlSettings({});
    }

    moveCameraBasedOnMouseMovement(state: BattleOrchestratorState, mouseX: number, mouseY: number) {
        if (state.battleState.camera.isPanning()) {
            return;
        }

        if (state.battleSquaddieSelectedHUD.shouldDrawTheHUD() && state.battleSquaddieSelectedHUD.isMouseInsideHUD(mouseX, mouseY)) {
            if (mouseX < state.battleSquaddieSelectedHUD.background.area.left) {
                state.battleState.camera.setXVelocity(-5);
            }
            if (mouseX > state.battleSquaddieSelectedHUD.background.area.right) {
                state.battleState.camera.setXVelocity(5);
            }

            return;
        }

        if (mouseX < ScreenDimensions.SCREEN_WIDTH * 0.10) {
            state.battleState.camera.setXVelocity(-1);
            if (mouseX < ScreenDimensions.SCREEN_WIDTH * 0.04) {
                state.battleState.camera.setXVelocity(-5);
            }
            if (mouseX < ScreenDimensions.SCREEN_WIDTH * 0.02) {
                state.battleState.camera.setXVelocity(-10);
            }
        } else if (mouseX > ScreenDimensions.SCREEN_WIDTH * 0.90) {
            state.battleState.camera.setXVelocity(1);
            if (mouseX > ScreenDimensions.SCREEN_WIDTH * 0.96) {
                state.battleState.camera.setXVelocity(5);
            }
            if (mouseX > ScreenDimensions.SCREEN_WIDTH * 0.98) {
                state.battleState.camera.setXVelocity(10);
            }
        } else {
            state.battleState.camera.setXVelocity(0);
        }

        if (mouseY < ScreenDimensions.SCREEN_HEIGHT * 0.10) {
            state.battleState.camera.setYVelocity(-1);
            if (mouseY < ScreenDimensions.SCREEN_HEIGHT * 0.04) {
                state.battleState.camera.setYVelocity(-5);
            }
            if (mouseY < ScreenDimensions.SCREEN_HEIGHT * 0.02) {
                state.battleState.camera.setYVelocity(-10);
            }
        } else if (mouseY > ScreenDimensions.SCREEN_HEIGHT * 0.90) {
            state.battleState.camera.setYVelocity(1);
            if (mouseY > ScreenDimensions.SCREEN_HEIGHT * 0.96) {
                state.battleState.camera.setYVelocity(5);
            }
            if (mouseY > ScreenDimensions.SCREEN_HEIGHT * 0.98) {
                state.battleState.camera.setYVelocity(10);
            }
        } else {
            state.battleState.camera.setYVelocity(0);
        }

        if (
            mouseX < 0
            || mouseX > ScreenDimensions.SCREEN_WIDTH
            || mouseY < 0
            || mouseY > ScreenDimensions.SCREEN_HEIGHT
        ) {
            state.battleState.camera.setXVelocity(0);
            state.battleState.camera.setYVelocity(0);
        }
    }

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
        this.draw(state, graphicsContext);
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        return undefined;
    }

    reset(state: BattleOrchestratorState) {
    }

    private drawSquaddieMapIcons(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        const noSquaddieIsCurrentlyActing: boolean = state.battleState.squaddieCurrentlyActing === undefined;
        state.squaddieRepository.getBattleSquaddieIterator()
            .filter((info) =>
                info.battleSquaddieId in state.squaddieRepository.imageUIByBattleSquaddieId
            )
            .forEach((info) => {
                const {battleSquaddie, battleSquaddieId} = info;

                if (noSquaddieIsCurrentlyActing
                    || !SquaddieInstructionInProgressHandler.isBattleSquaddieIdMoving(state.battleState.squaddieCurrentlyActing, battleSquaddieId)) {
                    const datum = state.battleState.missionMap.getSquaddieByBattleId(battleSquaddieId);

                    const squaddieIsOnTheMap: boolean = MissionMapSquaddieLocationHandler.isValid(datum) && state.battleState.missionMap.areCoordinatesOnMap(datum.mapLocation);
                    const squaddieIsHidden: boolean = state.battleState.missionMap.isSquaddieHiddenFromDrawing(battleSquaddieId);
                    if (squaddieIsOnTheMap && !squaddieIsHidden) {
                        drawSquaddieMapIconAtMapLocation(graphicsContext, state.squaddieRepository, battleSquaddie, battleSquaddieId, datum.mapLocation, state.battleState.camera);
                    }
                }
            });
    }
}
