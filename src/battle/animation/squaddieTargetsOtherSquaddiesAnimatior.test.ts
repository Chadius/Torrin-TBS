import {BattleOrchestratorState, BattleOrchestratorStateHelper} from "../orchestrator/battleOrchestratorState";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {
    SquaddieInstructionInProgress,
    SquaddieInstructionInProgressHandler
} from "../history/squaddieInstructionInProgress";
import {SquaddieSquaddieAction, SquaddieSquaddieActionService} from "../../squaddie/action";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {ResourceHandler} from "../../resource/resourceHandler";
import {makeResult} from "../../utils/ResultOrError";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewKnightSquaddie, CreateNewThiefSquaddie} from "../../utils/test/squaddie";
import {Recording, RecordingHandler} from "../history/recording";
import {BattleEvent} from "../history/battleEvent";
import {DamageType} from "../../squaddie/squaddieService";
import {SquaddieTargetsOtherSquaddiesAnimator} from "./squaddieTargetsOtherSquaddiesAnimatior";
import {ActionAnimationPhase} from "./actionAnimation/actionAnimationConstants";
import {ActionTimer} from "./actionAnimation/actionTimer";
import {SquaddieActionType} from "../history/anySquaddieAction";
import {BattleStateHelper} from "../orchestrator/battleState";

import {DegreeOfSuccess} from "../actionCalculator/degreeOfSuccess";

describe('SquaddieTargetsOtherSquaddiesAnimation', () => {
    let squaddieRepository: ObjectRepository;
    let knightBattleSquaddie: BattleSquaddie;
    let knightDynamicId = "knight_0";
    let knightTemplateId = "knight_0";
    let thiefBattleSquaddie: BattleSquaddie;
    let thiefDynamicId = "thief_0";
    let thiefStaticId = "thief_0";

    let longswordAction: SquaddieSquaddieAction;
    let powerAttackLongswordAction: SquaddieSquaddieAction;
    let animator: SquaddieTargetsOtherSquaddiesAnimator;
    let oneActionInstruction: SquaddieActionsForThisRound;
    let mockResourceHandler: jest.Mocked<ResourceHandler>;
    let battleEventRecording: Recording;

    let knightHitsThiefWithLongswordInstructionInProgress: SquaddieInstructionInProgress;
    let knightHitsThiefWithLongswordEvent: BattleEvent;

    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        squaddieRepository = ObjectRepositoryHelper.new();

        ({
            thiefBattleSquaddie,
        } = CreateNewThiefSquaddie({
            squaddieRepository,
            templateId: thiefStaticId,
            battleId: thiefDynamicId,
        }));

        longswordAction = SquaddieSquaddieActionService.new({
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

        oneActionInstruction = {
            squaddieTemplateId: "static_squaddie",
            battleSquaddieId: "dynamic_squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        };

        SquaddieActionsForThisRoundHandler.addAction(oneActionInstruction, {
            type: SquaddieActionType.SQUADDIE,
            numberOfActionPointsSpent: 1,
            squaddieAction: longswordAction,
            targetLocation: {q: 0, r: 0},
        });

        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        knightHitsThiefWithLongswordInstructionInProgress = {
            squaddieActionsForThisRound: oneActionInstruction,
            currentlySelectedAction: powerAttackLongswordAction,
            movingBattleSquaddieIds: [],
        };
        SquaddieInstructionInProgressHandler.addSelectedAction(knightHitsThiefWithLongswordInstructionInProgress, longswordAction);

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
        RecordingHandler.addEvent(battleEventRecording, knightHitsThiefWithLongswordEvent);
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
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
        RecordingHandler.addEvent(battleEventRecording, knightHitsThiefWithLongswordEvent);
        mockActionTimerPhase(animator.actionAnimationTimer, ActionAnimationPhase.INITIALIZED);
        const state: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
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
        RecordingHandler.addEvent(battleEventRecording, knightHitsThiefWithLongswordEvent);

        mockActionTimerPhase(animator.actionAnimationTimer, ActionAnimationPhase.INITIALIZED);
        const state: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
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
