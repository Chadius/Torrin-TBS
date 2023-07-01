import {
    OrchestratorChanges,
    OrchestratorComponent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/orchestratorComponent";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import p5 from "p5";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {ScreenDimensions} from "../../utils/graphicsConfig";
import {BattleOrchestratorMode} from "../orchestrator/orchestrator";
import {convertScreenCoordinatesToMapCoordinates} from "../../hexMap/convertCoordinates";
import {FriendlyAffiliationsByAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
import {Rectangle} from "../../ui/rectangle";
import {RectArea} from "../../ui/rectArea";
import {GetSquaddieAtScreenLocation} from "./orchestratorUtils";

const buttonTop = ScreenDimensions.SCREEN_HEIGHT * 0.95;
const buttonMiddleDivider = ScreenDimensions.SCREEN_WIDTH / 2;

export class BattleSquaddieTarget implements OrchestratorComponent {
    private cancelAbility: boolean;
    private hasSelectedValidTarget: boolean;
    private hasConfirmedAction: boolean;
    private validTargetLocation?: HexCoordinate;
    private highlightedTargetRange: HexCoordinate[];

    constructor() {
        this.resetObject();
    }

    hasCompleted(state: OrchestratorState): boolean {
        const userWantsADifferentAbility: boolean = this.cancelAbility === true;
        const userConfirmedTarget: boolean = this.hasConfirmedAction === true;
        return userWantsADifferentAbility || userConfirmedTarget;
    }

    mouseEventHappened(state: OrchestratorState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            if (!this.hasSelectedValidTarget) {
                if (event.mouseY > buttonTop) {
                    this.cancelAbility = true;
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

    update(state: OrchestratorState, p: p5): void {
        if (!this.hasHighlightedTargetRange) {
            return this.highlightTargetRange(state, p);
        }

        if (this.hasHighlightedTargetRange && !this.hasSelectedValidTarget) {
            this.drawCancelAbilityButton(state, p);
        }

        if (this.hasHighlightedTargetRange && this.hasSelectedValidTarget && !this.hasConfirmedAction) {
            this.drawConfirmWindow(state, p);
        }
        return;
    }

    recommendStateChanges(state: OrchestratorState): OrchestratorChanges | undefined {
        if (this.cancelAbility) {
            return {
                displayMap: true,
                nextMode: BattleOrchestratorMode.SQUADDIE_SELECTOR,
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

    reset(state: OrchestratorState) {
        this.resetObject();
        state.hexMap.stopHighlightingTiles();
    }

    private resetObject() {
        this.hasConfirmedAction = false;
        this.highlightedTargetRange = [];
        this.cancelAbility = false;
        this.hasSelectedValidTarget = false;
        this.validTargetLocation = undefined;
    }

    private get hasHighlightedTargetRange(): boolean {
        return this.highlightedTargetRange.length > 0;
    }

    private highlightTargetRange(state: OrchestratorState, p: p5) {
        const ability = state.squaddieCurrentlyActing.currentSquaddieActivity;

        const {mapLocation} = state.missionMap.getSquaddieByDynamicId(state.squaddieCurrentlyActing.dynamicSquaddieId);
        const {staticSquaddie} = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicID(state.squaddieCurrentlyActing.dynamicSquaddieId));
        const abilityRange: HexCoordinate[] = state.pathfinder.getTilesInRange(new SearchParams({
                canStopOnSquaddies: true,
                missionMap: state.missionMap,
                minimumDistanceMoved: ability.minimumRange,
                maximumDistanceMoved: ability.maximumRange,
                startLocation: mapLocation,
                shapeGeneratorType: ability.targetingShape,
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

    private drawCancelAbilityButton(state: OrchestratorState, p: p5) {
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

    shouldDrawConfirmWindow(): boolean {
        return this.hasSelectedValidTarget === true;
    }

    private tryToSelectValidTarget(mouseX: number, mouseY: number, state: OrchestratorState) {
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
            squaddieMapLocation,
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
            state.squaddieRepository.getSquaddieByDynamicID(state.squaddieCurrentlyActing.dynamicSquaddieId)
        );

        if (FriendlyAffiliationsByAffiliation[actingSquaddieStatic.squaddieId.affiliation][targetSquaddieStatic.squaddieId.affiliation]) {
            return;
        }

        const cameraCoordinates = state.camera.getCoordinates();
        state.hexMap.mouseClicked(mouseX, mouseY, cameraCoordinates[0], cameraCoordinates[1]);
        this.hasSelectedValidTarget = true;
        this.validTargetLocation = clickedLocation;
    }

    private drawConfirmWindow(state: OrchestratorState, p: p5) {
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
        const buttonBackground = new Rectangle({
            area,
            fillColor: [0, 0, 60],
            strokeColor: [0, 0, 0],
            strokeWeight: 4,
        });

        buttonBackground.draw(p);

        p.push();
        const textLeft: number = buttonBackground.area.getCenterX() - 50;
        const textTop: number = buttonBackground.area.getCenterY() + 6;

        p.textSize(24);
        p.fill("#0f0f0f");

        p.text(buttonText, textLeft, textTop);
        p.pop();
    }

    private cancelTargetSelection(state: OrchestratorState) {
        this.hasSelectedValidTarget = false;
    }

    private confirmTargetSelection(state: OrchestratorState) {
        const {staticSquaddie: actingSquaddieStatic, dynamicSquaddie: actingSquaddieDynamic} = getResultOrThrowError(
            state.squaddieRepository.getSquaddieByDynamicID(state.squaddieCurrentlyActing.dynamicSquaddieId)
        );
        const actingSquaddieInfo = state.missionMap.getSquaddieByDynamicId(actingSquaddieDynamic.dynamicSquaddieId);

        if (state.squaddieCurrentlyActing.isReadyForNewSquaddie()) {
            state.squaddieCurrentlyActing.addSquaddie({
                dynamicSquaddieId: actingSquaddieDynamic.dynamicSquaddieId,
                staticSquaddieId: actingSquaddieStatic.staticId,
                startingLocation: actingSquaddieInfo.mapLocation,
            });
        }

        state.squaddieCurrentlyActing.addConfirmedActivity(
            new SquaddieSquaddieActivity({
                targetLocation: this.validTargetLocation,
                squaddieActivity: state.squaddieCurrentlyActing.currentSquaddieActivity,
            })
        );

        this.hasConfirmedAction = true;
        actingSquaddieDynamic.squaddieTurn.spendActionsOnActivity(state.squaddieCurrentlyActing.currentSquaddieActivity);
    }
}
