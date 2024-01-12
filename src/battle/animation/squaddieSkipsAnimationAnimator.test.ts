import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../decision/actionEffectSquaddieTemplate";
import {ResourceHandler} from "../../resource/resourceHandler";
import {makeResult} from "../../utils/ResultOrError";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {Recording, RecordingService} from "../history/recording";
import {ANIMATE_TEXT_WINDOW_WAIT_TIME, SquaddieSkipsAnimationAnimator} from "./squaddieSkipsAnimationAnimator";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleEvent} from "../history/battleEvent";
import {
    CurrentlySelectedSquaddieDecision,
    CurrentlySelectedSquaddieDecisionService
} from "../history/currentlySelectedSquaddieDecision";
import {
    SquaddieActionsForThisRoundService,
    SquaddieDecisionsDuringThisPhase
} from "../history/squaddieDecisionsDuringThisPhase";
import {BattleOrchestratorState, BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {LabelHelper} from "../../ui/label";
import * as ActionResultTextService from "./actionResultTextService";
import {BattleStateService} from "../orchestrator/battleState";
import {ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";
import {DecisionService} from "../../decision/decision";

describe('SquaddieSkipsAnimationAnimator', () => {
    let mockResourceHandler: jest.Mocked<ResourceHandler>;

    let squaddieRepository: ObjectRepository;
    let monkStaticId = "monk static";
    let monkDynamicId = "monk dynamic";
    let monkKoanAction: ActionEffectSquaddieTemplate;
    let monkMeditatesEvent: BattleEvent;
    let monkMeditatesInstruction: CurrentlySelectedSquaddieDecision;

    let battleEventRecording: Recording;

    let animator: SquaddieSkipsAnimationAnimator;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        monkKoanAction = ActionEffectSquaddieTemplateService.new({
            id: "koan",
            name: "koan",
            traits: TraitStatusStorageHelper.newUsingTraitValues(
                {
                    [Trait.SKIP_ANIMATION]: true
                }
            ),
            maximumRange: 0,
            minimumRange: 0,
        });

        squaddieRepository = ObjectRepositoryService.new();
        CreateNewSquaddieAndAddToRepository({
            actions: [monkKoanAction],
            affiliation: SquaddieAffiliation.PLAYER,
            battleId: monkDynamicId,
            name: "Monk",
            templateId: monkStaticId,
            squaddieRepository,
        });

        battleEventRecording = {history: []};
        const oneDecisionInstruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new(
            {
                squaddieTemplateId: monkStaticId,
                battleSquaddieId: monkDynamicId,
                startingLocation: {q: 0, r: 0},
                decisions: [{
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            numberOfActionPointsSpent: 1,
                            template: monkKoanAction,
                            targetLocation: {q: 0, r: 0},
                        })
                    ]
                }],
            });

        monkMeditatesInstruction = CurrentlySelectedSquaddieDecisionService.new({

            squaddieActionsForThisRound: oneDecisionInstruction,
            currentlySelectedDecision: DecisionService.new({
                actionEffects: [
                    ActionEffectSquaddieService.new({
                        template: monkKoanAction,
                        targetLocation: {q: 0, r: 0},
                        numberOfActionPointsSpent: 1,
                    })
                ]
            }),
        });

        monkMeditatesEvent = {
            instruction: monkMeditatesInstruction,
            results: {
                actingBattleSquaddieId: monkDynamicId,
                targetedBattleSquaddieIds: [],
                resultPerTarget: {},
                actingSquaddieRoll: {
                    occurred: false,
                    rolls: [],
                },
                actingSquaddieModifiers: {},
            }
        };
        RecordingService.addEvent(battleEventRecording, monkMeditatesEvent);

        animator = new SquaddieSkipsAnimationAnimator();
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
    });

    it('will create a text window with the action results', () => {
        const state: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                squaddieCurrentlyActing: monkMeditatesInstruction,
                recording: battleEventRecording,
            }),
        })

        const outputResultForTextOnlySpy = jest.spyOn(ActionResultTextService.ActionResultTextService, "outputResultForTextOnly");
        const drawLabelSpy = jest.spyOn(LabelHelper, "draw");

        animator.reset(state);
        animator.update(state, mockedP5GraphicsContext);

        expect(animator.outputTextDisplay).not.toBeUndefined();
        expect(outputResultForTextOnlySpy).toBeCalled();
        expect(outputResultForTextOnlySpy).toBeCalledWith({
            currentActionEffectTemplate: monkKoanAction,
            result: monkMeditatesEvent.results,
            squaddieRepository,
        });
        expect(drawLabelSpy).toBeCalled();
    });

    it('will complete at the end of the display time', () => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                squaddieCurrentlyActing: monkMeditatesInstruction,
                recording: battleEventRecording,
            }),
        })
        animator.reset(state);
        animator.update(state, mockedP5GraphicsContext);
        expect(animator.hasCompleted(state)).toBeFalsy();

        jest.spyOn(Date, 'now').mockImplementation(() => ANIMATE_TEXT_WINDOW_WAIT_TIME);

        animator.update(state, mockedP5GraphicsContext);
        expect(animator.hasCompleted(state)).toBeTruthy();
    });

    it('will skip displaying the results if the user clicks', () => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                squaddieCurrentlyActing: monkMeditatesInstruction,
                recording: battleEventRecording,
            }),
        })
        animator.reset(state);
        animator.update(state, mockedP5GraphicsContext);
        expect(animator.hasCompleted(state)).toBeFalsy();

        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0,
        };
        animator.mouseEventHappened(state, mouseEvent);

        animator.update(state, mockedP5GraphicsContext);
        expect(animator.hasCompleted(state)).toBeTruthy();
    });
});
