import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../../ui/constants";
import {RecordingService} from "../history/recording";
import {GameEngineState} from "../../gameEngine/gameEngine";
import {ObjectRepositoryService} from "../objectRepository";
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
import {TargetingResultsService} from "../targeting/targetingService";
import {HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {RectArea, RectAreaService} from "../../ui/rectArea";
import {convertScreenCoordinatesToMapCoordinates} from "../../hexMap/convertCoordinates";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {FriendlyAffiliationsByAffiliation} from "../../squaddie/squaddieAffiliation";
import {Trait} from "../../trait/traitStatusStorage";
import {LabelService} from "../../ui/label";
import {ActionCalculator} from "../actionCalculator/calculator";
import {BattleEvent, BattleEventService} from "../history/battleEvent";
import {isValidValue} from "../../utils/validityCheck";
import {ActionEffectType} from "../../action/template/actionEffectTemplate";
import {ActionsThisRound, ActionsThisRoundService} from "../history/actionsThisRound";
import {ActionEffectSquaddieTemplate} from "../../action/template/actionEffectSquaddieTemplate";
import {ActionResultTextService} from "../animation/actionResultTextService";
import {ActionTemplate} from "../../action/template/actionTemplate";
import {ProcessedAction, ProcessedActionService} from "../../action/processed/processedAction";
import {DecidedActionService} from "../../action/decided/decidedAction";
import {
    DecidedActionSquaddieEffect,
    DecidedActionSquaddieEffectService
} from "../../action/decided/decidedActionSquaddieEffect";
import {SquaddieTurnService} from "../../squaddie/turn";
import {ProcessedActionSquaddieEffectService} from "../../action/processed/processedActionSquaddieEffect";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";

const BUTTON_TOP = ScreenDimensions.SCREEN_HEIGHT * 0.90;
const BUTTON_MIDDLE_DIVIDER = ScreenDimensions.SCREEN_WIDTH / 2;
const MESSAGE_TEXT_SIZE = 24;

export class BattlePlayerSquaddieTarget implements BattleOrchestratorComponent {
    hasSelectedValidTarget: boolean;
    private cancelAbility: boolean;
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

                    const battleSquaddieToHighlightId: string = state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId;

                    OrchestratorUtilities.highlightSquaddieRange(state, battleSquaddieToHighlightId);
                    state.battleOrchestratorState.battleState.actionsThisRound.previewedActionTemplateId = undefined;

                    if (state.battleOrchestratorState.battleState.actionsThisRound.processedActions.length === 0) {
                        state.battleOrchestratorState.battleState.actionsThisRound = undefined;
                    }
                    return;
                } else {
                    return this.tryToSelectValidTarget(event.mouseX, event.mouseY, state);
                }
            }

            if (!this.hasConfirmedAction) {
                if (event.mouseY > BUTTON_TOP) {
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

        if (!this.hasSelectedValidTarget) {
            this.drawCancelAbilityButton(state.battleOrchestratorState, graphicsContext);
        }

        if (this.hasSelectedValidTarget && !this.hasConfirmedAction) {
            this.drawConfirmWindow(state, graphicsContext);
        }
        return;
    }

    recommendStateChanges(state: GameEngineState): BattleOrchestratorChanges | undefined {
        OrchestratorUtilities.generateMessagesIfThePlayerCanActWithANewSquaddie(state);
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
        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(
            state.repository,
            state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId,
        ));

        const previewedActionTemplateId = state.battleOrchestratorState.battleState.actionsThisRound.previewedActionTemplateId;
        const previewedActionTemplate = squaddieTemplate.actionTemplates.find(template => template.id === previewedActionTemplateId);

        if (!isValidValue(previewedActionTemplate)) {
            return;
        }

        const actionEffectSquaddieTemplate = previewedActionTemplate.actionEffectTemplates[0];
        if (actionEffectSquaddieTemplate.type !== ActionEffectType.SQUADDIE) {
            return;
        }

        const targetingResults = TargetingResultsService.findValidTargets({
            map: state.battleOrchestratorState.battleState.missionMap,
            actionEffectSquaddieTemplate,
            actingSquaddieTemplate: squaddieTemplate,
            actingBattleSquaddie: battleSquaddie,
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
        } = OrchestratorUtilities.getSquaddieAtScreenLocation({
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
            ObjectRepositoryService.getSquaddieByBattleId(
                state.repository,
                state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId,
            )
        );

        const actorAndTargetAreFriends: boolean = FriendlyAffiliationsByAffiliation[actingSquaddieTemplate.squaddieId.affiliation][targetSquaddieTemplate.squaddieId.affiliation];

        const actionTemplate = actingSquaddieTemplate.actionTemplates.find(template => template.id === state.battleOrchestratorState.battleState.actionsThisRound.previewedActionTemplateId);

        if (!isValidValue(actionTemplate)) {
            return;
        }

        const actionEffectTemplate = actionTemplate.actionEffectTemplates[0]
        if (actionEffectTemplate.type !== ActionEffectType.SQUADDIE) {
            return;
        }

        if (actorAndTargetAreFriends && actionEffectTemplate.traits.booleanTraits[Trait.TARGETS_ALLIES] !== true) {
            return;
        }
        if (!actorAndTargetAreFriends && actionEffectTemplate.traits.booleanTraits[Trait.TARGETS_ALLIES] === true) {
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
        let {multipleAttackPenalty} = ActionsThisRoundService.getMultipleAttackPenaltyForProcessedActions(
            state.battleOrchestratorState.battleState.actionsThisRound
        )
        if (multipleAttackPenalty !== 0) {
            actingSquaddieModifiers[ATTACK_MODIFIER.MULTIPLE_ATTACK_PENALTY] = multipleAttackPenalty;
        }

        const {
            found,
            actionTemplate,
            actionEffectSquaddieTemplate
        } = getActionEffectSquaddieTemplate({gameEngineState: state});
        if (!found) {
            return;
        }

        const intentMessages = ActionResultTextService.outputIntentForTextOnly({
            currentActionEffectSquaddieTemplate: actionEffectSquaddieTemplate,
            actionTemplate,
            actingBattleSquaddieId: state.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId,
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
        const buttonBackground = LabelService.new({
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

        LabelService.draw(buttonBackground, graphicsContext);
    }

    private cancelTargetSelection(state: BattleOrchestratorState) {
        this.hasSelectedValidTarget = false;
    }

    private confirmTargetSelection(state: GameEngineState) {
        let actionsThisRound = state.battleOrchestratorState.battleState.actionsThisRound;
        const {squaddieTemplate: actingSquaddieTemplate, battleSquaddie: actingBattleSquaddie} = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                state.repository,
                actionsThisRound.battleSquaddieId
            )
        );

        const actionTemplate = actingSquaddieTemplate.actionTemplates.find(template => template.id === actionsThisRound.previewedActionTemplateId);
        let firstActionEffectTemplate = actionTemplate.actionEffectTemplates[0];
        if (firstActionEffectTemplate.type !== ActionEffectType.SQUADDIE) {
            return;
        }

        SquaddieTurnService.spendActionPoints(actingBattleSquaddie.squaddieTurn, actionTemplate.actionPoints);
        state.battleOrchestratorState.battleState.actionsThisRound.previewedActionTemplateId = undefined;

        const decidedAction = createDecidedAction(actionsThisRound, actionTemplate, firstActionEffectTemplate, this.validTargetLocation);
        const processedAction = ProcessedActionService.new({
            decidedAction
        });
        actionsThisRound.processedActions.push(processedAction);

        let results: SquaddieSquaddieResults = ActionCalculator.calculateResults({
            state,
            actingBattleSquaddie,
            validTargetLocation: this.validTargetLocation,
            actionsThisRound: state.battleOrchestratorState.battleState.actionsThisRound,
            actionEffect: ActionsThisRoundService.getDecidedButNotProcessedActionEffect(state.battleOrchestratorState.battleState.actionsThisRound).decidedActionEffect,
        });
        processedAction.processedActionEffects.push(
            ProcessedActionSquaddieEffectService.new({
                decidedActionEffect: decidedAction.actionEffects.find(actionEffect => actionEffect.type === ActionEffectType.SQUADDIE) as DecidedActionSquaddieEffect,
                results,
            })
        )
        addEventToRecording(processedAction, results, state);

        this.hasConfirmedAction = true;
    }
}

const getActionEffectSquaddieTemplate = ({
                                             gameEngineState
                                         }: {
    gameEngineState: GameEngineState
}): {
    found: boolean,
    actionTemplate: ActionTemplate,
    actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate,
} => {
    const {squaddieTemplate: actingSquaddieTemplate} = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            gameEngineState.repository,
            gameEngineState.battleOrchestratorState.battleState.actionsThisRound.battleSquaddieId,
        )
    );
    const actionTemplate = actingSquaddieTemplate.actionTemplates.find(template => template.id === gameEngineState.battleOrchestratorState.battleState.actionsThisRound.previewedActionTemplateId);
    if (!isValidValue(actionTemplate)) {
        return {
            found: false,
            actionTemplate,
            actionEffectSquaddieTemplate: undefined,
        };
    }

    const actionEffectTemplate = actionTemplate.actionEffectTemplates[0]
    if (actionEffectTemplate.type !== ActionEffectType.SQUADDIE) {
        return {
            found: false,
            actionTemplate,
            actionEffectSquaddieTemplate: undefined,
        };
    }

    return {
        found: true,
        actionTemplate,
        actionEffectSquaddieTemplate: actionEffectTemplate
    }
}

const createDecidedAction = (actionsThisRound: ActionsThisRound, actionTemplate: ActionTemplate, firstActionEffectTemplate: ActionEffectSquaddieTemplate, targetLocation: HexCoordinate) => {
    return DecidedActionService.new({
        battleSquaddieId: actionsThisRound.battleSquaddieId,
        actionTemplateName: actionTemplate.name,
        actionTemplateId: actionTemplate.id,
        actionPointCost: actionTemplate.actionPoints,
        actionEffects: [
            DecidedActionSquaddieEffectService.new({
                template: firstActionEffectTemplate,
                target: targetLocation,
            })
        ]
    });
};

const addEventToRecording = (processedAction: ProcessedAction, results: SquaddieSquaddieResults, state: GameEngineState) => {
    const newEvent: BattleEvent = BattleEventService.new({
        processedAction,
        results,
    });
    RecordingService.addEvent(state.battleOrchestratorState.battleState.recording, newEvent);
};
