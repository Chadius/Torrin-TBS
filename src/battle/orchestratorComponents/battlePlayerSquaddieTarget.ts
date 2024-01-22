import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../../ui/constants";
import {CurrentlySelectedSquaddieDecisionService} from "../history/currentlySelectedSquaddieDecision";
import {RecordingService} from "../history/recording";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryService} from "../objectRepository";
import {SquaddieActionsForThisRoundService} from "../history/squaddieDecisionsDuringThisPhase";
import {ATTACK_MODIFIER} from "../modifierConstants";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {
    BattleOrchestratorChanges,
    BattleOrchestratorComponent,
    OrchestratorComponentKeyEvent,
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {UIControlSettings} from "../orchestrator/uiControlSettings";
import {GraphicsContext} from "../../utils/graphics/graphicsContext";
import {BattleOrchestratorMode} from "../orchestrator/battleOrchestrator";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {FindValidTargets} from "../targeting/targetingService";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {RectArea, RectAreaService} from "../../ui/rectArea";
import {convertScreenCoordinatesToMapCoordinates} from "../../hexMap/convertCoordinates";
import {GetSquaddieAtScreenLocation, OrchestratorUtilities} from "./orchestratorUtils";
import {FriendlyAffiliationsByAffiliation} from "../../squaddie/squaddieAffiliation";
import {ActionEffectSquaddieTemplate} from "../../decision/actionEffectSquaddieTemplate";
import {Trait} from "../../trait/traitStatusStorage";
import {ActionResultTextService} from "../animation/actionResultTextService";
import {LabelHelper} from "../../ui/label";
import {ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";
import {ActionCalculator} from "../actionCalculator/calculator";
import {BattleEvent} from "../history/battleEvent";
import {DecisionService} from "../../decision/decision";
import {ActionEffectType} from "../../decision/actionEffect";

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
                    CurrentlySelectedSquaddieDecisionService.cancelSelectedCurrentDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing);
                    state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
                    return;
                } else {
                    return this.tryToSelectValidTarget(event.mouseX, event.mouseY, state);
                }
            }

            if (!this.hasConfirmedAction) {
                if (event.mouseY > BUTTON_TOP) {
                    CurrentlySelectedSquaddieDecisionService.cancelSelectedCurrentDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing);
                    return this.cancelTargetSelection(state.battleOrchestratorState);
                }

                return this.confirmTargetSelection(state);
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
            return this.highlightTargetRange(state);
        }

        if (this.hasHighlightedTargetRange && !this.hasSelectedValidTarget) {
            this.drawCancelAbilityButton(state.battleOrchestratorState, graphicsContext);
        }

        if (this.hasHighlightedTargetRange && this.hasSelectedValidTarget && !this.hasConfirmedAction) {
            this.drawConfirmWindow(state, graphicsContext);
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

    private highlightTargetRange(state: GameEngineState) {
        let squaddieActionEffect = state.battleOrchestratorState.battleState.squaddieCurrentlyActing.currentlySelectedDecision.actionEffects[0];
        if (squaddieActionEffect.type !== ActionEffectType.SQUADDIE) {
            return;
        }
        const action = squaddieActionEffect.template;

        const {
            squaddieTemplate: actingSquaddieTemplate,
            battleSquaddie: actingBattleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(state.repository,
            CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)
        ));
        const targetingResults = FindValidTargets({
            map: state.battleOrchestratorState.battleState.missionMap,
            action: action,
            actingSquaddieTemplate,
            actingBattleSquaddie,
            squaddieRepository: state.repository,
        })
        const actionRange: HexCoordinate[] = targetingResults.locationsInRange;

        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.stopHighlightingTiles();
        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.highlightTiles([
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
            RectAreaService.new({
                left: 0,
                top: BUTTON_TOP,
                width: ScreenDimensions.SCREEN_WIDTH,
                height: ScreenDimensions.SCREEN_HEIGHT - BUTTON_TOP,
            }),
            "Click on target or click HERE to Cancel",
            graphicsContext,
        );
    }

    private tryToSelectValidTarget(mouseX: number, mouseY: number, state: GameEngineState) {
        const coordinates = convertScreenCoordinatesToMapCoordinates(mouseX, mouseY, ...state.battleOrchestratorState.battleState.camera.getCoordinates());

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
            camera: state.battleOrchestratorState.battleState.camera,
            map: state.battleOrchestratorState.battleState.missionMap,
            squaddieRepository: state.repository,
        });

        if (targetSquaddieTemplate === undefined) {
            return;
        }

        const {squaddieTemplate: actingSquaddieTemplate, battleSquaddie: actingBattleSquaddie} = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(state.repository,
                CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)
            )
        );

        const actorAndTargetAreFriends: boolean = FriendlyAffiliationsByAffiliation[actingSquaddieTemplate.squaddieId.affiliation][targetSquaddieTemplate.squaddieId.affiliation];
        let squaddieActionEffect = state.battleOrchestratorState.battleState.squaddieCurrentlyActing.currentlySelectedDecision.actionEffects[0];
        if (squaddieActionEffect.type !== ActionEffectType.SQUADDIE) {
            return;
        }
        const actionConsidered: ActionEffectSquaddieTemplate = squaddieActionEffect.template;

        if (actorAndTargetAreFriends && actionConsidered.traits.booleanTraits[Trait.TARGETS_ALLIES] !== true) {
            return;
        }
        if (!actorAndTargetAreFriends && actionConsidered.traits.booleanTraits[Trait.TARGETS_ALLIES] === true) {
            return;
        }

        const cameraCoordinates = state.battleOrchestratorState.battleState.camera.getCoordinates();
        state.battleOrchestratorState.battleState.missionMap.terrainTileMap.mouseClicked(mouseX, mouseY, cameraCoordinates[0], cameraCoordinates[1]);
        this.hasSelectedValidTarget = true;
        this.validTargetLocation = clickedLocation;
    }

    private drawConfirmWindow(state: GameEngineState, graphicsContext: GraphicsContext) {
        this.drawButton(
            RectAreaService.new({
                left: 0,
                top: BUTTON_TOP,
                width: ScreenDimensions.SCREEN_WIDTH,
                height: ScreenDimensions.SCREEN_HEIGHT - BUTTON_TOP,
            }),
            "Cancel",
            graphicsContext,
        );

        let actingSquaddieModifiers: { [modifier in ATTACK_MODIFIER]?: number } = {};
        let {multipleAttackPenalty} = SquaddieActionsForThisRoundService.previewMultipleAttackPenalty(
            state.battleOrchestratorState.battleState.squaddieCurrentlyActing.squaddieDecisionsDuringThisPhase,
            state.battleOrchestratorState.battleState.squaddieCurrentlyActing.currentlySelectedDecision,
        );
        if (multipleAttackPenalty !== 0) {
            actingSquaddieModifiers[ATTACK_MODIFIER.MULTIPLE_ATTACK_PENALTY] = multipleAttackPenalty;
        }

        let squaddieActionEffect = state.battleOrchestratorState.battleState.squaddieCurrentlyActing.currentlySelectedDecision.actionEffects[0];
        if (squaddieActionEffect.type !== ActionEffectType.SQUADDIE) {
            return;
        }

        const intentMessages = ActionResultTextService.outputIntentForTextOnly({
            currentActionEffectTemplate: squaddieActionEffect.template,
            actingBattleSquaddieId: CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing),
            squaddieRepository: state.repository,
            actingSquaddieModifiers,
        });

        intentMessages.push(...[
            "",
            "Click to Confirm",
            "or click Cancel button",
        ]);

        const messageToShow = intentMessages.join("\n");

        this.drawButton(
            RectAreaService.new({
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

    private confirmTargetSelection(state: GameEngineState) {
        const {squaddieTemplate: actingSquaddieTemplate, battleSquaddie: actingBattleSquaddie} = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(state.repository,
                CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing)
            )
        );
        const actingSquaddieInfo = state.battleOrchestratorState.battleState.missionMap.getSquaddieByBattleId(actingBattleSquaddie.battleSquaddieId);

        if (!OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)) {
            state.battleOrchestratorState.battleState.squaddieCurrentlyActing =
                CurrentlySelectedSquaddieDecisionService.new({
                    squaddieActionsForThisRound: SquaddieActionsForThisRoundService.new({
                        battleSquaddieId: actingBattleSquaddie.battleSquaddieId,
                        squaddieTemplateId: actingSquaddieTemplate.squaddieId.templateId,
                        startingLocation: actingSquaddieInfo.mapLocation,
                    }),
                });
        }

        let squaddieActionEffect = state.battleOrchestratorState.battleState.squaddieCurrentlyActing.currentlySelectedDecision.actionEffects[0];
        if (squaddieActionEffect.type !== ActionEffectType.SQUADDIE) {
            return;
        }

        const decision = DecisionService.new({
            actionEffects: [
                ActionEffectSquaddieService.new({
                        targetLocation: this.validTargetLocation,
                        template: squaddieActionEffect.template,
                        numberOfActionPointsSpent: squaddieActionEffect.numberOfActionPointsSpent,
                    }
                )
            ]
        });
        CurrentlySelectedSquaddieDecisionService.addConfirmedDecision(state.battleOrchestratorState.battleState.squaddieCurrentlyActing, decision);
        state.battleOrchestratorState.battleState.squaddieCurrentlyActing.currentlySelectedDecision = decision;

        OrchestratorUtilities.updateSquaddieBasedOnActionEffect({
            battleSquaddieId: CurrentlySelectedSquaddieDecisionService.battleSquaddieId(state.battleOrchestratorState.battleState.squaddieCurrentlyActing),
            missionMap: state.battleOrchestratorState.battleState.missionMap,
            repository: state.repository,
            actionEffect: squaddieActionEffect,
        });

        const instructionResults = ActionCalculator.calculateResults({
            state,
            actingBattleSquaddie,
            validTargetLocation: this.validTargetLocation,
        });

        const newEvent: BattleEvent = {
            instruction: state.battleOrchestratorState.battleState.squaddieCurrentlyActing,
            results: instructionResults,
        };

        RecordingService.addEvent(state.battleOrchestratorState.battleState.recording, newEvent);
        this.hasConfirmedAction = true;
    }
}
