import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {convertScreenCoordinatesToMapCoordinates} from "../../hexMap/convertCoordinates";
import {FriendlyAffiliationsByAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieSquaddieAction} from "../history/squaddieSquaddieAction";
import {RectArea} from "../../ui/rectArea";
import {GetSquaddieAtScreenLocation} from "./orchestratorUtils";
import {Label} from "../../ui/label";
import {BattleEvent} from "../history/battleEvent";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {SquaddieAction} from "../../squaddie/action";
import {Trait} from "../../trait/traitStatusStorage";
import {CalculateResults} from "../actionCalculator/calculator";
import {FindValidTargets} from "../targeting/targetingService";
import {FormatIntent} from "../animation/actionResultTextWriter";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../../ui/constants";
import {SquaddieInstructionInProgressHandler} from "../history/squaddieInstructionInProgress";
import {RecordingHandler} from "../history/recording";
import {SquaddieTurnHandler} from "../../squaddie/turn";

const BUTTON_TOP = ScreenDimensions.SCREEN_HEIGHT * 0.90;
const BUTTON_MIDDLE_DIVIDER = ScreenDimensions.SCREEN_WIDTH / 2;
const MESSAGE_TEXT_SIZE = 24;

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
                if (event.mouseY > BUTTON_TOP) {
                    this.cancelAbility = true;
                    SquaddieInstructionInProgressHandler.cancelSelectedAction(state.squaddieCurrentlyActing);
                    state.missionMap.terrainTileMap.stopHighlightingTiles();
                    return;
                } else {
                    return this.tryToSelectValidTarget(event.mouseX, event.mouseY, state);
                }
            }

            if (!this.hasConfirmedAction) {
                if (event.mouseY > BUTTON_TOP) {
                    return this.cancelTargetSelection(state);
                }

                return this.confirmTargetSelection(state);
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
            pauseTimer: false,
        });
    }

    update(state: BattleOrchestratorState, graphicsContext: GraphicsContext): void {
        if (!this.hasHighlightedTargetRange) {
            return this.highlightTargetRange(state);
        }

        if (this.hasHighlightedTargetRange && !this.hasSelectedValidTarget) {
            this.drawCancelAbilityButton(state, graphicsContext);
        }

        if (this.hasHighlightedTargetRange && this.hasSelectedValidTarget && !this.hasConfirmedAction) {
            this.drawConfirmWindow(state, graphicsContext);
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
                nextMode: BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE,
            }
        }
        return undefined;
    }

    reset(state: BattleOrchestratorState) {
        this.resetObject();
        state.missionMap.terrainTileMap.stopHighlightingTiles();
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
        const action = state.squaddieCurrentlyActing.currentlySelectedAction;

        const {
            squaddieTemplate: actingSquaddieTemplate,
            battleSquaddie: actingBattleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(
            SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing)
        ));
        const targetingResults = FindValidTargets({
            map: state.missionMap,
            action: action,
            actingSquaddieTemplate,
            actingBattleSquaddie,
            squaddieRepository: state.squaddieRepository,
        })
        const actionRange: HexCoordinate[] = targetingResults.locationsInRange;

        state.missionMap.terrainTileMap.stopHighlightingTiles();
        state.missionMap.terrainTileMap.highlightTiles([
                {
                    tiles: actionRange,
                    pulseColor: HighlightPulseRedColor,
                    overlayImageResourceName: "map icon attack 1 action"
                }
            ]
        );
        this.highlightedTargetRange = [...actionRange];
    }

    private drawCancelAbilityButton(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        this.drawButton(
            new RectArea({
                left: 0,
                top: BUTTON_TOP,
                width: ScreenDimensions.SCREEN_WIDTH,
                height: ScreenDimensions.SCREEN_HEIGHT - BUTTON_TOP,
            }),
            "Click on target or click Cancel",
            graphicsContext,
        );
    }

    private tryToSelectValidTarget(mouseX: number, mouseY: number, state: BattleOrchestratorState) {
        const coordinates = convertScreenCoordinatesToMapCoordinates(mouseX, mouseY, ...state.camera.getCoordinates());

        const clickedLocation: HexCoordinate = {
            q: coordinates[0],
            r: coordinates[1],
        };

        if (!
            this.highlightedTargetRange.some(
                tile =>
                    tile.q === clickedLocation.q && tile.r === clickedLocation.r
            )
        ) {
            return;
        }

        const {
            squaddieTemplate: targetSquaddieTemplate,
            battleSquaddie: targetBattleSquaddie,
        } = GetSquaddieAtScreenLocation({
            mouseX,
            mouseY,
            camera: state.camera,
            map: state.missionMap,
            squaddieRepository: state.squaddieRepository,
        });

        if (targetSquaddieTemplate === undefined) {
            return;
        }

        const {squaddieTemplate: actingSquaddieTemplate, battleSquaddie: actingBattleSquaddie} = getResultOrThrowError(
            state.squaddieRepository.getSquaddieByBattleId(
                SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing)
            )
        );

        const actorAndTargetAreFriends: boolean = FriendlyAffiliationsByAffiliation[actingSquaddieTemplate.squaddieId.affiliation][targetSquaddieTemplate.squaddieId.affiliation];
        const actionConsidered: SquaddieAction = state.squaddieCurrentlyActing.currentlySelectedAction;
        if (actorAndTargetAreFriends && actionConsidered.traits.booleanTraits[Trait.TARGETS_ALLIES] !== true) {
            return;
        }
        if (!actorAndTargetAreFriends && actionConsidered.traits.booleanTraits[Trait.TARGETS_ALLIES] === true) {
            return;
        }

        const cameraCoordinates = state.camera.getCoordinates();
        state.missionMap.terrainTileMap.mouseClicked(mouseX, mouseY, cameraCoordinates[0], cameraCoordinates[1]);
        this.hasSelectedValidTarget = true;
        this.validTargetLocation = clickedLocation;
    }

    private drawConfirmWindow(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        this.drawButton(
            new RectArea({
                left: 0,
                top: BUTTON_TOP,
                width: ScreenDimensions.SCREEN_WIDTH,
                height: ScreenDimensions.SCREEN_HEIGHT - BUTTON_TOP,
            }),
            "Cancel",
            graphicsContext,
        );

        const intentMessages = FormatIntent({
            currentAction: state.squaddieCurrentlyActing.currentlySelectedAction,
            actingBattleSquaddieId: SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing),
            squaddieRepository: state.squaddieRepository,
        });

        intentMessages.push(...[
            "",
            "Click to Confirm",
            "or click Cancel button",
        ]);

        const messageToShow = intentMessages.join("\n");

        this.drawButton(
            new RectArea({
                left: ScreenDimensions.SCREEN_WIDTH / 12,
                top: ScreenDimensions.SCREEN_HEIGHT / 2,
                width: BUTTON_MIDDLE_DIVIDER,
                height: MESSAGE_TEXT_SIZE * (intentMessages.length + 2)
            }),
            messageToShow,
            graphicsContext,
        );
    }

    private drawButton(area: RectArea, buttonText: string, graphicsContext: GraphicsContext) {
        const buttonBackground = new Label({
            area,
            fillColor: [0, 0, 60],
            strokeColor: [0, 0, 0],
            strokeWeight: 4,

            text: buttonText,
            textSize: MESSAGE_TEXT_SIZE,
            horizAlign: HORIZ_ALIGN_CENTER,
            vertAlign: VERT_ALIGN_CENTER,
            fontColor: [0, 0, 16],
            padding: [0, 0, 0, 0],
        });

        buttonBackground.draw(graphicsContext);
    }

    private cancelTargetSelection(state: BattleOrchestratorState) {
        this.hasSelectedValidTarget = false;
    }

    private confirmTargetSelection(state: BattleOrchestratorState) {
        const {squaddieTemplate: actingSquaddieTemplate, battleSquaddie: actingBattleSquaddie} = getResultOrThrowError(
            state.squaddieRepository.getSquaddieByBattleId(
                SquaddieInstructionInProgressHandler.battleSquaddieId(state.squaddieCurrentlyActing)
            )
        );
        const actingSquaddieInfo = state.missionMap.getSquaddieByBattleId(actingBattleSquaddie.battleSquaddieId);

        if (
            state.squaddieCurrentlyActing === undefined
            || SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.squaddieCurrentlyActing)
        ) {
            state.squaddieCurrentlyActing =
                {
                    movingBattleSquaddieIds: [],
                    squaddieActionsForThisRound: {
                        battleSquaddieId: actingBattleSquaddie.battleSquaddieId,
                        squaddieTemplateId: actingSquaddieTemplate.squaddieId.templateId,
                        startingLocation: actingSquaddieInfo.mapLocation,
                        actions: [],
                    },
                    currentlySelectedAction: undefined,
                };
        }

        SquaddieInstructionInProgressHandler.addConfirmedAction(state.squaddieCurrentlyActing,
            new SquaddieSquaddieAction({
                    targetLocation: this.validTargetLocation,
                    squaddieAction: state.squaddieCurrentlyActing.currentlySelectedAction,
                }
            ));

        SquaddieTurnHandler.spendActionPointsOnAction(actingBattleSquaddie.squaddieTurn, state.squaddieCurrentlyActing.currentlySelectedAction);
        const instructionResults = CalculateResults({
            state,
            actingBattleSquaddie,
            validTargetLocation: this.validTargetLocation,
        });

        const newEvent: BattleEvent = {
            instruction: state.squaddieCurrentlyActing,
            results: instructionResults,
        };

        RecordingHandler.addEvent(state.battleEventRecording, newEvent);

        this.hasConfirmedAction = true;
    }


}
