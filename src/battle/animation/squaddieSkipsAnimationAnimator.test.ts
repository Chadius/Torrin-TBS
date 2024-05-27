import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {ResourceHandler} from "../../resource/resourceHandler";
import {makeResult} from "../../utils/ResultOrError";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsBuffer} from "../../utils/test/mocks";
import {Recording, RecordingService} from "../history/recording";
import {ANIMATE_TEXT_WINDOW_WAIT_TIME, SquaddieSkipsAnimationAnimator} from "./squaddieSkipsAnimationAnimator";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleEvent, BattleEventService} from "../history/battleEvent";
import {BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {LabelService} from "../../ui/label";
import * as ActionResultTextService from "./actionResultTextService";
import {BattleStateService} from "../orchestrator/battleState";
import {GameEngineState, GameEngineStateService} from "../../gameEngine/gameEngine";
import {ActionTemplate, ActionTemplateService} from "../../action/template/actionTemplate";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../action/template/actionEffectSquaddieTemplate";
import {ProcessedActionService} from "../../action/processed/processedAction";
import {ProcessedActionSquaddieEffectService} from "../../action/processed/processedActionSquaddieEffect";
import {DecidedActionSquaddieEffectService} from "../../action/decided/decidedActionSquaddieEffect";
import {ActionsThisRound, ActionsThisRoundService} from "../history/actionsThisRound";
import {DecidedActionService} from "../../action/decided/decidedAction";
import {MouseButton} from "../../utils/mouseConfig";
import {PlayerBattleActionBuilderStateService} from "../actionBuilder/playerBattleActionBuilderState";

describe('SquaddieSkipsAnimationAnimator', () => {
    let mockResourceHandler: jest.Mocked<ResourceHandler>;

    let squaddieRepository: ObjectRepository;
    let monkStaticId = "monk static";
    let monkBattleSquaddieId = "monk dynamic";
    let monkKoanAction: ActionTemplate;
    let monkMeditatesEvent: BattleEvent;
    let monkMeditatesInstruction: ActionsThisRound;

    let battleEventRecording: Recording;

    let animator: SquaddieSkipsAnimationAnimator;
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer();
        mockResourceHandler = mocks.mockResourceHandler(mockedP5GraphicsContext);
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        monkKoanAction = ActionTemplateService.new({
            id: "koan",
            name: "koan",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues(
                        {
                            [Trait.SKIP_ANIMATION]: true
                        }
                    ),
                    maximumRange: 0,
                    minimumRange: 0,
                })
            ]
        });

        squaddieRepository = ObjectRepositoryService.new();
        CreateNewSquaddieAndAddToRepository({
            actionTemplates: [monkKoanAction],
            affiliation: SquaddieAffiliation.PLAYER,
            battleId: monkBattleSquaddieId,
            name: "Monk",
            templateId: monkStaticId,
            squaddieRepository,
        });

        battleEventRecording = {history: []};
        const oneDecisionInstruction = ProcessedActionService.new({
            decidedAction: DecidedActionService.new({
                actionPointCost: 1,
                battleSquaddieId: monkBattleSquaddieId,
                actionTemplateName: monkKoanAction.name,
                actionTemplateId: monkKoanAction.id,
            }),
            processedActionEffects: [
                ProcessedActionSquaddieEffectService.new({
                    decidedActionEffect: DecidedActionSquaddieEffectService.new({
                        template: monkKoanAction.actionEffectTemplates[0] as ActionEffectSquaddieTemplate,
                        target: {q: 0, r: 0},
                    }),
                    results: undefined,
                }),
            ]
        });

        monkMeditatesInstruction = ActionsThisRoundService.new({
            battleSquaddieId: monkBattleSquaddieId,
            startingLocation: {q: 0, r: 0},
            processedActions: [oneDecisionInstruction],
        })

        monkMeditatesEvent = BattleEventService.new({
            processedAction: oneDecisionInstruction,
            results: {
                actingBattleSquaddieId: monkBattleSquaddieId,
                targetedBattleSquaddieIds: [],
                resultPerTarget: {},
                actingSquaddieRoll: {
                    occurred: false,
                    rolls: [],
                },
                actingSquaddieModifiers: {},
            }
        });
        RecordingService.addEvent(battleEventRecording, monkMeditatesEvent);

        animator = new SquaddieSkipsAnimationAnimator();
    });

    it('will create a text window with the action results', () => {
        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({

                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                    recording: battleEventRecording,
                    actionsThisRound: monkMeditatesInstruction,
                }),
            }),
            repository: squaddieRepository,
        })

        const outputResultForTextOnlySpy = jest.spyOn(ActionResultTextService.ActionResultTextService, "outputResultForTextOnly");
        const drawLabelSpy = jest.spyOn(LabelService, "draw");

        animator.reset(state);
        animator.update(state, mockedP5GraphicsContext);

        expect(animator.outputTextDisplay).not.toBeUndefined();
        expect(outputResultForTextOnlySpy).toBeCalled();
        expect(outputResultForTextOnlySpy).toBeCalledWith({
            currentActionEffectSquaddieTemplate: monkKoanAction.actionEffectTemplates[0],
            squaddieRepository,
            actionTemplateName: monkKoanAction.name,
            result: monkMeditatesEvent.results,
        });
        expect(drawLabelSpy).toBeCalled();
    });

    it('will complete at the end of the display time', () => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({

                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    actionsThisRound: monkMeditatesInstruction,
                    recording: battleEventRecording,
                }),
            }),
            repository: squaddieRepository,
        });
        animator.reset(state);
        animator.update(state, mockedP5GraphicsContext);
        expect(animator.hasCompleted(state)).toBeFalsy();

        jest.spyOn(Date, 'now').mockImplementation(() => ANIMATE_TEXT_WINDOW_WAIT_TIME);

        animator.update(state, mockedP5GraphicsContext);
        expect(animator.hasCompleted(state)).toBeTruthy();
    });

    it('will skip displaying the results if the user clicks', () => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: GameEngineState = GameEngineStateService.new({
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({

                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    actionsThisRound: monkMeditatesInstruction,
                    recording: battleEventRecording,
                }),
            }),
            repository: squaddieRepository,
        });
        animator.reset(state);
        animator.update(state, mockedP5GraphicsContext);
        expect(animator.hasCompleted(state)).toBeFalsy();

        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0,
            mouseButton: MouseButton.ACCEPT,
        };
        animator.mouseEventHappened(state, mouseEvent);

        animator.update(state, mockedP5GraphicsContext);
        expect(animator.hasCompleted(state)).toBeTruthy();
    });

    it('will set the action builder animation to true when it resets', () => {
        const gameEngineState: GameEngineState = GameEngineStateService.new({
            resourceHandler: mockResourceHandler,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    actionsThisRound: monkMeditatesInstruction,
                    recording: battleEventRecording,
                }),
            }),
            repository: squaddieRepository,
        });

        gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState = PlayerBattleActionBuilderStateService.new({});
        PlayerBattleActionBuilderStateService.setActor({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            battleSquaddieId: monkBattleSquaddieId,
        });
        PlayerBattleActionBuilderStateService.addAction({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            actionTemplate: monkKoanAction,
        });
        PlayerBattleActionBuilderStateService.setConfirmedTarget({
            actionBuilderState: gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState,
            targetLocation: {q: 0, r: 0},
        });

        animator.reset(gameEngineState);

        expect(PlayerBattleActionBuilderStateService.isAnimationComplete(gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState)).toBeTruthy();
    });
});
