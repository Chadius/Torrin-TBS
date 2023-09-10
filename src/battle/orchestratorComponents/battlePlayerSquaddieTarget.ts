import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import p5 from "p5";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {ScreenDimensions} from "../../utils/graphicsConfig";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {convertScreenCoordinatesToMapCoordinates} from "../../hexMap/convertCoordinates";
import {FriendlyAffiliationsByAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
import {RectArea} from "../../ui/rectArea";
import {GetSquaddieAtScreenLocation} from "./orchestratorUtils";
import {Label} from "../../ui/label";
import {BattleEvent} from "../history/battleEvent";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {CalculateResults} from "./battleSquaddieSelectorUtils";

const buttonTop = ScreenDimensions.SCREEN_HEIGHT * 0.95;
const buttonMiddleDivider = ScreenDimensions.SCREEN_WIDTH / 2;

export class BattlePlayerSquaddieTarget implements BattleOrchestratorComponent {
    private cancelAbility: boolean;
    private hasSelectedValidTarget: boolean;
    private hasConfirmedAction: boolean;
    private validTargetLocation?: HexCoordinate;
    private highlightedTargetRange: HexCoordinate[];

    constructor() {
        this.resetObject();
    }

    private get hasHighlightedTargetRange(): boolean {
        return this.highlightedTargetRange.length > 0;
    }

    hasCompleted(state: BattleOrchestratorState): boolean {
        const userWantsADifferentAbility: boolean = this.cancelAbility === true;
        const userConfirmedTarget: boolean = this.hasConfirmedAction === true;
        return userWantsADifferentAbility || userConfirmedTarget;
    }

    mouseEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            if (!this.hasSelectedValidTarget) {
                if (event.mouseY > buttonTop) {
                    this.cancelAbility = true;
                    state.squaddieCurrentlyActing.cancelSelectedActivity();
                    state.hexMap.stopHighlightingTiles();
                    return;
                } else {
                    return this.tryToSelectValidTarget(event.mouseX, event.mouseY, state);
                }
            }

            if (!this.hasConfirmedAction) {
                if (
                    event.mouseX < buttonMiddleDivider
                    && event.mouseY > buttonTop
                ) {
                    return this.cancelTargetSelection(state);
                }
                if (
                    event.mouseX >= buttonMiddleDivider
                    && event.mouseY > buttonTop
                ) {
                    return this.confirmTargetSelection(state);
                }

            }
        }
        return;
    }

    keyEventHappened(state: BattleOrchestratorState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: BattleOrchestratorState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: !this.shouldDrawConfirmWindow(),
            displayMap: true,
        });
    }

    update(state: BattleOrchestratorState, p: p5): void {
        if (!this.hasHighlightedTargetRange) {
            return this.highlightTargetRange(state);
        }

        if (this.hasHighlightedTargetRange && !this.hasSelectedValidTarget) {
            this.drawCancelAbilityButton(state, p);
        }

        if (this.hasHighlightedTargetRange && this.hasSelectedValidTarget && !this.hasConfirmedAction) {
            this.drawConfirmWindow(state, p);
        }
        return;
    }

    recommendStateChanges(state: BattleOrchestratorState): BattleOrchestratorChanges | undefined {
        if (this.cancelAbility) {
            return {
                displayMap: true,
                nextMode: BattleOrchestratorMode.PLAYER_SQUADDIE_SELECTOR,
            }
        }

        if (this.hasConfirmedAction) {
            return {
                displayMap: true,
                nextMode: BattleOrchestratorMode.SQUADDIE_SQUADDIE_ACTIVITY,
            }
        }
        return undefined;
    }

    reset(state: BattleOrchestratorState) {
        this.resetObject();
        state.hexMap.stopHighlightingTiles();
        state.battleSquaddieUIInput.reset();
    }

    shouldDrawConfirmWindow(): boolean {
        return this.hasSelectedValidTarget === true;
    }

    private resetObject() {
        this.hasConfirmedAction = false;
        this.highlightedTargetRange = [];
        this.cancelAbility = false;
        this.hasSelectedValidTarget = false;
        this.validTargetLocation = undefined;
    }

    private highlightTargetRange(state: BattleOrchestratorState) {
        const ability = state.squaddieCurrentlyActing.currentlySelectedActivity;

        const {mapLocation} = state.missionMap.getSquaddieByDynamicId(state.squaddieCurrentlyActing.dynamicSquaddieId);
        const {staticSquaddie} = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(state.squaddieCurrentlyActing.dynamicSquaddieId));
        const abilityRange: HexCoordinate[] = state.pathfinder.getTilesInRange(new SearchParams({
                canStopOnSquaddies: true,
                missionMap: state.missionMap,
                minimumDistanceMoved: ability.minimumRange,
                maximumDistanceMoved: ability.maximumRange,
                startLocation: mapLocation,
                shapeGeneratorType: ability.targetingShape,
                squaddieRepository: state.squaddieRepository,
            }),
            staticSquaddie.activities[0].maximumRange,
            [mapLocation],
        );

        state.hexMap.stopHighlightingTiles();
        state.hexMap.highlightTiles([
                {
                    tiles: abilityRange,
                    pulseColor: HighlightPulseRedColor,
                    overlayImageResourceName: "map icon attack 1 action"
                }
            ]
        );
        this.highlightedTargetRange = [...abilityRange];
    }

    private drawCancelAbilityButton(state: BattleOrchestratorState, p: p5) {
        this.drawButton(
            new RectArea({
                left: 0,
                top: buttonTop,
                width: ScreenDimensions.SCREEN_WIDTH,
                height: ScreenDimensions.SCREEN_HEIGHT - buttonTop,
            }),
            "Cancel",
            p
        );
    }

    private tryToSelectValidTarget(mouseX: number, mouseY: number, state: BattleOrchestratorState) {
        const clickedLocation: HexCoordinate = new HexCoordinate({
            coordinates: [
                ...convertScreenCoordinatesToMapCoordinates(mouseX, mouseY, ...state.camera.getCoordinates())
            ]
        });

        if (!
            this.highlightedTargetRange.some(
                tile =>
                    tile.q === clickedLocation.q && tile.r === clickedLocation.r
            )
        ) {
            return;
        }

        const {
            staticSquaddie: targetSquaddieStatic,
            dynamicSquaddie: targetSquaddieDynamic,
        } = GetSquaddieAtScreenLocation({
            mouseX,
            mouseY,
            camera: state.camera,
            map: state.missionMap,
            squaddieRepository: state.squaddieRepository,
        });

        if (targetSquaddieStatic === undefined) {
            return;
        }

        const {staticSquaddie: actingSquaddieStatic, dynamicSquaddie: actingSquaddieDynamic} = getResultOrThrowError(
            state.squaddieRepository.getSquaddieByDynamicId(state.squaddieCurrentlyActing.dynamicSquaddieId)
        );

        if (FriendlyAffiliationsByAffiliation[actingSquaddieStatic.squaddieId.affiliation][targetSquaddieStatic.squaddieId.affiliation]) {
            return;
        }

        const cameraCoordinates = state.camera.getCoordinates();
        state.hexMap.mouseClicked(mouseX, mouseY, cameraCoordinates[0], cameraCoordinates[1]);
        this.hasSelectedValidTarget = true;
        this.validTargetLocation = clickedLocation;
    }

    private drawConfirmWindow(state: BattleOrchestratorState, p: p5) {
        this.drawButton(
            new RectArea({
                left: 0,
                top: buttonTop,
                width: buttonMiddleDivider,
                height: ScreenDimensions.SCREEN_HEIGHT - buttonTop,
            }),
            "Cancel",
            p
        );

        this.drawButton(
            new RectArea({
                left: buttonMiddleDivider,
                top: buttonTop,
                width: buttonMiddleDivider,
                height: ScreenDimensions.SCREEN_HEIGHT - buttonTop,
            }),
            "Confirm",
            p
        );

        this.drawButton(
            new RectArea({
                left: 0,
                top: ScreenDimensions.SCREEN_HEIGHT / 2,
                width: buttonMiddleDivider,
                height: ScreenDimensions.SCREEN_HEIGHT - buttonTop,
            }),
            "Forecast here",
            p
        );
    }

    private drawButton(area: RectArea, buttonText: string, p: p5) {
        const buttonBackground = new Label({
            area,
            fillColor: [0, 0, 60],
            strokeColor: [0, 0, 0],
            strokeWeight: 4,

            text: buttonText,
            textSize: 24,
            fontColor: [0, 0, 16],
            padding: [6, 0, 0, area.width / 2 - 50],
        });

        buttonBackground.draw(p);
    }

    private cancelTargetSelection(state: BattleOrchestratorState) {
        state.squaddieCurrentlyActing.cancelSelectedActivity();
        this.hasSelectedValidTarget = false;
    }

    private confirmTargetSelection(state: BattleOrchestratorState) {
        const {staticSquaddie: actingSquaddieStatic, dynamicSquaddie: actingSquaddieDynamic} = getResultOrThrowError(
            state.squaddieRepository.getSquaddieByDynamicId(state.squaddieCurrentlyActing.dynamicSquaddieId)
        );
        const actingSquaddieInfo = state.missionMap.getSquaddieByDynamicId(actingSquaddieDynamic.dynamicSquaddieId);

        if (state.squaddieCurrentlyActing.isReadyForNewSquaddie) {
            state.squaddieCurrentlyActing.addInitialState({
                dynamicSquaddieId: actingSquaddieDynamic.dynamicSquaddieId,
                staticSquaddieId: actingSquaddieStatic.staticId,
                startingLocation: actingSquaddieInfo.mapLocation,
            });
        }

        state.squaddieCurrentlyActing.addConfirmedActivity(
            new SquaddieSquaddieActivity({
                targetLocation: this.validTargetLocation,
                squaddieActivity: state.squaddieCurrentlyActing.currentlySelectedActivity,
            })
        );

        actingSquaddieDynamic.squaddieTurn.spendActionsOnActivity(state.squaddieCurrentlyActing.currentlySelectedActivity);
        const instructionResults = CalculateResults(state, actingSquaddieDynamic, this.validTargetLocation);

        const newEvent: BattleEvent = new BattleEvent({
            currentSquaddieInstruction: state.squaddieCurrentlyActing,
            results: instructionResults,
        });

        state.battleEventRecording.addEvent(newEvent);

        this.hasConfirmedAction = true;
    }


}
