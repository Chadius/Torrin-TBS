import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import p5 from "p5";
import {drawHexMap} from "../../hexMap/hexDrawingUtils";
import {drawSquaddieMapIconAtMapLocation} from "../animation/drawSquaddie";
import {ScreenDimensions} from "../../utils/graphicsConfig";
import {UIControlSettings} from "../orchestrator/uiControlSettings";

export class BattleMapDisplay implements BattleOrchestratorComponent {
    draw(state: BattleOrchestratorState, p: p5): void {
        p.background(50, 10, 20);

        if (state.hexMap) {
            drawHexMap(p, state.hexMap, ...state.camera.getCoordinates());
        }

        this.drawSquaddieMapIcons(state, p);
        state.camera.moveCamera();

        state.battleSquaddieSelectedHUD.draw(state.squaddieCurrentlyActing, state, p);
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        return false;
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            state.hexMap.mouseClicked(event.mouseX, event.mouseY, ...state.camera.getCoordinates());
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
        if (state.camera.isPanning()) {
            return;
        }

        if (state.battleSquaddieSelectedHUD.shouldDrawTheHUD() && state.battleSquaddieSelectedHUD.isMouseInsideHUD(mouseX, mouseY)) {
            if (mouseX < state.battleSquaddieSelectedHUD.background.area.left) {
                state.camera.setXVelocity(-5);
            }
            if (mouseX > state.battleSquaddieSelectedHUD.background.area.right) {
                state.camera.setXVelocity(5);
            }

            return;
        }

        if (mouseX < ScreenDimensions.SCREEN_WIDTH * 0.10) {
            state.camera.setXVelocity(-1);
            if (mouseX < ScreenDimensions.SCREEN_WIDTH * 0.04) {
                state.camera.setXVelocity(-5);
            }
            if (mouseX < ScreenDimensions.SCREEN_WIDTH * 0.02) {
                state.camera.setXVelocity(-10);
            }
        } else if (mouseX > ScreenDimensions.SCREEN_WIDTH * 0.90) {
            state.camera.setXVelocity(1);
            if (mouseX > ScreenDimensions.SCREEN_WIDTH * 0.96) {
                state.camera.setXVelocity(5);
            }
            if (mouseX > ScreenDimensions.SCREEN_WIDTH * 0.98) {
                state.camera.setXVelocity(10);
            }
        } else {
            state.camera.setXVelocity(0);
        }

        if (mouseY < ScreenDimensions.SCREEN_HEIGHT * 0.10) {
            state.camera.setYVelocity(-1);
            if (mouseY < ScreenDimensions.SCREEN_HEIGHT * 0.04) {
                state.camera.setYVelocity(-5);
            }
            if (mouseY < ScreenDimensions.SCREEN_HEIGHT * 0.02) {
                state.camera.setYVelocity(-10);
            }
        } else if (mouseY > ScreenDimensions.SCREEN_HEIGHT * 0.90) {
            state.camera.setYVelocity(1);
            if (mouseY > ScreenDimensions.SCREEN_HEIGHT * 0.96) {
                state.camera.setYVelocity(5);
            }
            if (mouseY > ScreenDimensions.SCREEN_HEIGHT * 0.98) {
                state.camera.setYVelocity(10);
            }
        } else {
            state.camera.setYVelocity(0);
        }

        if (
            mouseX < 0
            || mouseX > ScreenDimensions.SCREEN_WIDTH
            || mouseY < 0
            || mouseY > ScreenDimensions.SCREEN_HEIGHT
        ) {
            state.camera.setXVelocity(0);
            state.camera.setYVelocity(0);
        }
    }

    update(state: BattleOrchestratorState, p: p5): void {
        this.draw(state, p);
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        return undefined;
    }

    reset(state: BattleOrchestratorState) {
    }

    private drawSquaddieMapIcons(state: BattleOrchestratorState, p: p5) {
        const noSquaddieIsCurrentlyActing: boolean = state.squaddieCurrentlyActing === undefined;
        state.squaddieRepository.getDynamicSquaddieIterator()
            .filter((info) =>
                info.dynamicSquaddie.mapIcon
            )
            .forEach((info) => {
                const {dynamicSquaddie, dynamicSquaddieId} = info;

                if (noSquaddieIsCurrentlyActing || !state.squaddieCurrentlyActing.isSquaddieDynamicIdMoving(dynamicSquaddieId)) {
                    const datum = state.missionMap.getSquaddieByDynamicId(dynamicSquaddieId);

                    const squaddieIsOnTheMap: boolean = datum.isValid() && state.missionMap.areCoordinatesOnMap(datum.mapLocation);
                    const squaddieIsHidden: boolean = state.missionMap.isSquaddieHiddenFromDrawing(dynamicSquaddieId);
                    if (squaddieIsOnTheMap && !squaddieIsHidden) {
                        drawSquaddieMapIconAtMapLocation(p, state.squaddieRepository, dynamicSquaddie, dynamicSquaddieId, datum.mapLocation, state.camera);
                    }
                }
            });
    }
}
