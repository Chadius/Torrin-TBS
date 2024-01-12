import {BattleOrchestratorState, BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {
    SquaddieActionsForThisRoundService,
    SquaddieDecisionsDuringThisPhase
} from "../history/squaddieDecisionsDuringThisPhase";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {
    CurrentlySelectedSquaddieDecision,
    CurrentlySelectedSquaddieDecisionService
} from "../history/currentlySelectedSquaddieDecision";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../decision/actionEffectSquaddieTemplate";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {ResourceHandler} from "../../resource/resourceHandler";
import {makeResult} from "../../utils/ResultOrError";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewKnightSquaddie, CreateNewThiefSquaddie} from "../../utils/test/squaddie";
import {Recording, RecordingService} from "../history/recording";
import {BattleEvent} from "../history/battleEvent";
import {DamageType} from "../../squaddie/squaddieService";
import {SquaddieTargetsOtherSquaddiesAnimator} from "./squaddieTargetsOtherSquaddiesAnimatior";
import {ActionAnimationPhase} from "./actionAnimation/actionAnimationConstants";
import {ActionTimer} from "./actionAnimation/actionTimer";
import {BattleStateService} from "../orchestrator/battleState";

import {DegreeOfSuccess} from "../actionCalculator/degreeOfSuccess";
import {ActionEffectSquaddieService} from "../../decision/actionEffectSquaddie";
import {DecisionService} from "../../decision/decision";

describe('SquaddieTargetsOtherSquaddiesAnimation', () => {
    let squaddieRepository: ObjectRepository;
    let knightBattleSquaddie: BattleSquaddie;
    let knightDynamicId = "knight_0";
    let knightTemplateId = "knight_0";
    let thiefBattleSquaddie: BattleSquaddie;
    let thiefDynamicId = "thief_0";
    let thiefStaticId = "thief_0";

    let longswordAction: ActionEffectSquaddieTemplate;
    let powerAttackLongswordAction: ActionEffectSquaddieTemplate;
    let animator: SquaddieTargetsOtherSquaddiesAnimator;
    let oneActionInstruction: SquaddieDecisionsDuringThisPhase;
    let mockResourceHandler: jest.Mocked<ResourceHandler>;
    let battleEventRecording: Recording;

    let knightHitsThiefWithLongswordInstructionInProgress: CurrentlySelectedSquaddieDecision;
    let knightHitsThiefWithLongswordEvent: BattleEvent;

    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        squaddieRepository = ObjectRepositoryService.new();

        ({
            thiefBattleSquaddie,
        } = CreateNewThiefSquaddie({
            squaddieRepository,
            templateId: thiefStaticId,
            battleId: thiefDynamicId,
        }));

        longswordAction = ActionEffectSquaddieTemplateService.new({
            name: "longsword",
            id: "longsword",
            traits: TraitStatusStorageHelper.newUsingTraitValues(
                {
                    [Trait.ATTACK]: true,
                    [Trait.TARGET_ARMOR]: true,
                }),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 1,
            damageDescriptions: {
                [DamageType.BODY]: 2,
            },
        });

        ({
            knightBattleSquaddie,
        } = CreateNewKnightSquaddie({
            squaddieRepository,
            templateId: knightTemplateId,
            battleId: knightDynamicId,
            actions: [longswordAction],
        }));

        animator = new SquaddieTargetsOtherSquaddiesAnimator();

        const oneActionInstruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new(
            {
                squaddieTemplateId: "static_squaddie",
                battleSquaddieId: "dynamic_squaddie",
                startingLocation: {q: 0, r: 0},

                decisions: [{
                    actionEffects: [
                        ActionEffectSquaddieService.new({
                            numberOfActionPointsSpent: 1,
                            template: longswordAction,
                            targetLocation: {q: 0, r: 0},
                        })
                    ]
                }],
            });

        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        knightHitsThiefWithLongswordInstructionInProgress = CurrentlySelectedSquaddieDecisionService.new({
            squaddieActionsForThisRound: oneActionInstruction,

            currentlySelectedDecision: DecisionService.new({
                actionEffects: [
                    ActionEffectSquaddieService.new({
                        template: powerAttackLongswordAction,
                        targetLocation: {q: 0, r: 0},
                        numberOfActionPointsSpent: 1,
                    })
                ]
            }),
        });
        const decision = DecisionService.new({
            actionEffects: [
                ActionEffectSquaddieService.new({
                    template: longswordAction,
                    targetLocation: {q: 0, r: 0},
                    numberOfActionPointsSpent: 1,
                })
            ]
        });
        CurrentlySelectedSquaddieDecisionService.addConfirmedDecision(knightHitsThiefWithLongswordInstructionInProgress, decision);
        CurrentlySelectedSquaddieDecisionService.selectCurrentDecision(knightHitsThiefWithLongswordInstructionInProgress, decision);

        knightHitsThiefWithLongswordEvent = {
            instruction: knightHitsThiefWithLongswordInstructionInProgress,
            results: {
                actingBattleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                targetedBattleSquaddieIds: [thiefDynamicId],
                resultPerTarget: {
                    [thiefDynamicId]: {
                        damageTaken: 1,
                        healingReceived: 0,
                        actorDegreeOfSuccess: DegreeOfSuccess.SUCCESS
                    }
                },
                actingSquaddieRoll: {
                    occurred: false,
                    rolls: [],
                },
                actingSquaddieModifiers: {},
            }
        };
        battleEventRecording = {history: []};
    });

    function mockActionTimerPhase(timer: ActionTimer, actionAnimationPhase: ActionAnimationPhase) {
        return jest.spyOn(timer, "currentPhase", "get").mockReturnValue(actionAnimationPhase);
    }

    it('will create an actor sprite and a target sprite', () => {
        RecordingService.addEvent(battleEventRecording, knightHitsThiefWithLongswordEvent);
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                squaddieCurrentlyActing: knightHitsThiefWithLongswordInstructionInProgress,
                recording: battleEventRecording,
            }),
        })
        animator.reset(state);
        animator.update(state, mockedP5GraphicsContext);

        expect(animator.actorSprite).not.toBeUndefined();
        expect(animator.actorSprite.battleSquaddieId).toBe(knightDynamicId);

        expect(animator.targetSprites).not.toBeUndefined();
        expect(animator.targetSprites).toHaveLength(1);
        expect(animator.targetSprites[0].battleSquaddieId).toBe(thiefDynamicId);
    });

    it('will skip displaying the results if the user clicks', () => {
        RecordingService.addEvent(battleEventRecording, knightHitsThiefWithLongswordEvent);
        mockActionTimerPhase(animator.actionAnimationTimer, ActionAnimationPhase.INITIALIZED);
        const state: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                squaddieCurrentlyActing: knightHitsThiefWithLongswordInstructionInProgress,
                recording: battleEventRecording,
            }),
        })
        animator.reset(state);
        animator.update(state, mockedP5GraphicsContext);
        mockActionTimerPhase(animator.actionAnimationTimer, ActionAnimationPhase.DURING_ACTION);

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

    it('is complete at the end of the animation time', () => {
        RecordingService.addEvent(battleEventRecording, knightHitsThiefWithLongswordEvent);

        mockActionTimerPhase(animator.actionAnimationTimer, ActionAnimationPhase.INITIALIZED);
        const state: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                squaddieCurrentlyActing: knightHitsThiefWithLongswordInstructionInProgress,
                recording: battleEventRecording,
            }),
        })
        animator.reset(state);
        animator.update(state, mockedP5GraphicsContext);
        expect(animator.hasCompleted(state)).toBeFalsy();

        mockActionTimerPhase(animator.actionAnimationTimer, ActionAnimationPhase.FINISHED_SHOWING_RESULTS);
        animator.update(state, mockedP5GraphicsContext);
        expect(animator.hasCompleted(state)).toBeTruthy();
    });
});
