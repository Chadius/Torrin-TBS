import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {drawHexMap} from "../../hexMap/hexDrawingUtils";
import {DrawSquaddieUtilities} from "../animation/drawSquaddie";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {MissionMapSquaddieLocationHandler} from "../../missionMap/squaddieLocation";
import {RectAreaService} from "../../ui/rectArea";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryService} from "../objectRepository";
import {isValidValue} from "../../utils/validityCheck";
import {ActionsThisRoundService} from "../history/actionsThisRound";
import {ActionEffectType} from "../../action/template/actionEffectTemplate";

export class BattleMapDisplay implements BattleOrchestratorComponent {
    draw(state: GameEngineState, graphicsContext: GraphicsContext): void {
        graphicsContext.background(50, 10, 20);

        if (state.battleOrchestratorState.battleState.missionMap.terrainTileMap) {
            drawHexMap(graphicsContext, state.battleOrchestratorState.battleState.missionMap.terrainTileMap, ...state.battleOrchestratorState.battleState.camera.getCoordinates());
        }

        let battleSquaddieIdsToOmit = getCurrentlyMovingBattleSquaddieIds(state);
        this.drawSquaddieMapIcons(state, graphicsContext, battleSquaddieIdsToOmit);
        state.battleOrchestratorState.battleState.camera.moveCamera();

        state.battleOrchestratorState.battleSquaddieSelectedHUD.draw(state, graphicsContext);
    }

    hasCompleted(state: GameEngineState): boolean {
        return false;
    }

    mouseEventHappened(state: GameEngineState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            state.battleOrchestratorState.battleState.missionMap.terrainTileMap.mouseClicked(event.mouseX, event.mouseY, ...state.battleOrchestratorState.battleState.camera.getCoordinates());
        }
        if (event.eventType === OrchestratorComponentMouseEventType.MOVED) {
            this.moveCameraBasedOnMouseMovement(state.battleOrchestratorState, event.mouseX, event.mouseY);
        }
    }

    keyEventHappened(state: GameEngineState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
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
            if (mouseX > RectAreaService.right(state.battleSquaddieSelectedHUD.background.area)) {
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

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
        this.draw(state, graphicsContext);
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        return undefined;
    }

    reset(state: GameEngineState) {
    }

    private drawSquaddieMapIcons(state: GameEngineState, graphicsContext: GraphicsContext, battleSquaddieIdsToOmit: string[]) {
        ObjectRepositoryService.getBattleSquaddieIterator(state.repository)
            .filter((info) =>
                info.battleSquaddieId in state.repository.imageUIByBattleSquaddieId
            )
            .forEach((info) => {
                const {battleSquaddie, battleSquaddieId} = info;

                if (!battleSquaddieIdsToOmit.includes(battleSquaddieId)) {
                    const datum = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(battleSquaddieId);

                    const squaddieIsOnTheMap: boolean = MissionMapSquaddieLocationHandler.isValid(datum) && state.battleOrchestratorState.battleState.missionMap.areCoordinatesOnMap(datum.mapLocation);
                    const squaddieIsHidden: boolean = state.battleOrchestratorState.battleState.missionMap.isSquaddieHiddenFromDrawing(battleSquaddieId);
                    if (squaddieIsOnTheMap && !squaddieIsHidden) {
                        DrawSquaddieUtilities.drawSquaddieMapIconAtMapLocation(graphicsContext, state.repository, battleSquaddie, battleSquaddieId, datum.mapLocation, state.battleOrchestratorState.battleState.camera);
                    }
                }
            });
    }
}

const getCurrentlyMovingBattleSquaddieIds = (state: GameEngineState) => {
    if (state.battleOrchestratorState.battleState.actionsThisRound === undefined) {
        return [];
    }

    const processedActionEffectToShow = ActionsThisRoundService.getProcessedActionEffectToShow(state.battleOrchestratorState.battleState.actionsThisRound);
    if (!isValidValue(processedActionEffectToShow)) {
        return [];
    }

    let battleSquaddieIdsToOmit: string[] = [];
    if (processedActionEffectToShow.type === ActionEffectType.MOVEMENT) {
        battleSquaddieIdsToOmit.push(state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId);
    }

    return battleSquaddieIdsToOmit;
};
