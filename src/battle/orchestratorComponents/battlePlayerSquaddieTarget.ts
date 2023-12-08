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
import {RectArea, RectAreaHelper} from "../../ui/rectArea";
import {GetSquaddieAtScreenLocation} from "./orchestratorUtils";
import {LabelHelper} from "../../ui/label";
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
import {GameEngineState} from "../../gameEngine/gameEngine";

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

    hasCompleted(state: GameEngineState): boolean {
        const userWantsADifferentAbility: boolean = this.cancelAbility === true;
        const userConfirmedTarget: boolean = this.hasConfirmedAction === true;
        return userWantsADifferentAbility || userConfirmedTarget;
    }

    mouseEventHappened(state: GameEngineState, event: OrchestratorComponentMouseEvent): void {
        if (event.eventType === OrchestratorComponentMouseEventType.CLICKED) {
            if (!this.hasSelectedValidTarget) {
                if (event.mouseY > BUTTON_TOP) {
                    this.cancelAbility = true;
                    SquaddieInstructionInProgressHandler.cancelSelectedAction(state.battleOrchestratorState.battleState.squaddieCurrentlyActing);
                    state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
                    return;
                } else {
                    return this.tryToSelectValidTarget(event.mouseX, event.mouseY, state.battleOrchestratorState);
                }
            }

            if (!this.hasConfirmedAction) {
                if (event.mouseY > BUTTON_TOP) {
                    return this.cancelTargetSelection(state.battleOrchestratorState);
                }

                return this.confirmTargetSelection(state.battleOrchestratorState);
            }
        }
        return;
    }

    keyEventHappened(state: GameEngineState, event: OrchestratorComponentKeyEvent): void {
    }

    uiControlSettings(state: GameEngineState): UIControlSettings {
        return new UIControlSettings({
            scrollCamera: !this.shouldDrawConfirmWindow(),
            displayMap: true,
            pauseTimer: false,
        });
    }

    update(state: GameEngineState, graphicsContext: GraphicsContext): void {
        if (!this.hasHighlightedTargetRange) {
            return this.highlightTargetRange(state.battleOrchestratorState);
        }

        if (this.hasHighlightedTargetRange && !this.hasSelectedValidTarget) {
            this.drawCancelAbilityButton(state.battleOrchestratorState, graphicsContext);
        }

        if (this.hasHighlightedTargetRange && this.hasSelectedValidTarget && !this.hasConfirmedAction) {
            this.drawConfirmWindow(state.battleOrchestratorState, graphicsContext);
        }
        return;
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
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

    reset(state: GameEngineState) {
        this.resetObject();
        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
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
        const action = state.battleState.squaddieCurrentlyActing.currentlySelectedAction;

        const {
            squaddieTemplate: actingSquaddieTemplate,
            battleSquaddie: actingBattleSquaddie,
        } = getResultOrThrowError(state.squaddieRepository.getSquaddieByBattleId(
            SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing)
        ));
        const targetingResults = FindValidTargets({
            map: state.battleState.missionMap,
            action: action,
            actingSquaddieTemplate,
            actingBattleSquaddie,
            squaddieRepository: state.squaddieRepository,
        })
        const actionRange: HexCoordinate[] = targetingResults.locationsInRange;

        state.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        state.battleState.missionMap.terrainTileMap.highlightTiles([
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
            RectAreaHelper.new({
                left: 0,
                top: BUTTON_TOP,
                width: ScreenDimensions.SCREEN_WIDTH,
                height: ScreenDimensions.SCREEN_HEIGHT - BUTTON_TOP,
            }),
            "Click on target or click HERE to Cancel",
            graphicsContext,
        );
    }

    private tryToSelectValidTarget(mouseX: number, mouseY: number, state: BattleOrchestratorState) {
        const coordinates = convertScreenCoordinatesToMapCoordinates(mouseX, mouseY, ...state.battleState.camera.getCoordinates());

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
            camera: state.battleState.camera,
            map: state.battleState.missionMap,
            squaddieRepository: state.squaddieRepository,
        });

        if (targetSquaddieTemplate === undefined) {
            return;
        }

        const {squaddieTemplate: actingSquaddieTemplate, battleSquaddie: actingBattleSquaddie} = getResultOrThrowError(
            state.squaddieRepository.getSquaddieByBattleId(
                SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing)
            )
        );

        const actorAndTargetAreFriends: boolean = FriendlyAffiliationsByAffiliation[actingSquaddieTemplate.squaddieId.affiliation][targetSquaddieTemplate.squaddieId.affiliation];
        const actionConsidered: SquaddieAction = state.battleState.squaddieCurrentlyActing.currentlySelectedAction;
        if (actorAndTargetAreFriends && actionConsidered.traits.booleanTraits[Trait.TARGETS_ALLIES] !== true) {
            return;
        }
        if (!actorAndTargetAreFriends && actionConsidered.traits.booleanTraits[Trait.TARGETS_ALLIES] === true) {
            return;
        }

        const cameraCoordinates = state.battleState.camera.getCoordinates();
        state.battleState.missionMap.terrainTileMap.mouseClicked(mouseX, mouseY, cameraCoordinates[0], cameraCoordinates[1]);
        this.hasSelectedValidTarget = true;
        this.validTargetLocation = clickedLocation;
    }

    private drawConfirmWindow(state: BattleOrchestratorState, graphicsContext: GraphicsContext) {
        this.drawButton(
            RectAreaHelper.new({
                left: 0,
                top: BUTTON_TOP,
                width: ScreenDimensions.SCREEN_WIDTH,
                height: ScreenDimensions.SCREEN_HEIGHT - BUTTON_TOP,
            }),
            "Cancel",
            graphicsContext,
        );

        const intentMessages = FormatIntent({
            currentAction: state.battleState.squaddieCurrentlyActing.currentlySelectedAction,
            actingBattleSquaddieId: SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing),
            squaddieRepository: state.squaddieRepository,
        });

        intentMessages.push(...[
            "",
            "Click to Confirm",
            "or click Cancel button",
        ]);

        const messageToShow = intentMessages.join("\n");

        this.drawButton(
            RectAreaHelper.new({
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
        const buttonBackground = LabelHelper.new({
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

        LabelHelper.draw(buttonBackground, graphicsContext);
    }

    private cancelTargetSelection(state: BattleOrchestratorState) {
        this.hasSelectedValidTarget = false;
    }

    private confirmTargetSelection(state: BattleOrchestratorState) {
        const {squaddieTemplate: actingSquaddieTemplate, battleSquaddie: actingBattleSquaddie} = getResultOrThrowError(
            state.squaddieRepository.getSquaddieByBattleId(
                SquaddieInstructionInProgressHandler.battleSquaddieId(state.battleState.squaddieCurrentlyActing)
            )
        );
        const actingSquaddieInfo = state.battleState.missionMap.getSquaddieByBattleId(actingBattleSquaddie.battleSquaddieId);

        if (
            state.battleState.squaddieCurrentlyActing === undefined
            || SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.battleState.squaddieCurrentlyActing)
        ) {
            state.battleState.squaddieCurrentlyActing =
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

        SquaddieInstructionInProgressHandler.addConfirmedAction(state.battleState.squaddieCurrentlyActing,
            new SquaddieSquaddieAction({
                    targetLocation: this.validTargetLocation,
                    squaddieAction: state.battleState.squaddieCurrentlyActing.currentlySelectedAction,
                }
            ));

        SquaddieTurnHandler.spendActionPointsOnAction(actingBattleSquaddie.squaddieTurn, state.battleState.squaddieCurrentlyActing.currentlySelectedAction);
        const instructionResults = CalculateResults({
            state,
            actingBattleSquaddie,
            validTargetLocation: this.validTargetLocation,
        });

        const newEvent: BattleEvent = {
            instruction: state.battleState.squaddieCurrentlyActing,
            results: instructionResults,
        };

        RecordingHandler.addEvent(state.battleState.recording, newEvent);

        this.hasConfirmedAction = true;
    }


}
