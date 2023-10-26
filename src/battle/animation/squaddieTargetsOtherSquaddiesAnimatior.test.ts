import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {SquaddieAction} from "../../squaddie/action";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {ResourceHandler} from "../../resource/resourceHandler";
import {makeResult} from "../../utils/ResultOrError";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewKnightSquaddie, CreateNewThiefSquaddie} from "../../utils/test/squaddie";
import {Recording} from "../history/recording";
import {BattleEvent} from "../history/battleEvent";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {DamageType} from "../../squaddie/squaddieService";
import {SquaddieTargetsOtherSquaddiesAnimator} from "./squaddieTargetsOtherSquaddiesAnimatior";
import {ActionResultPerSquaddie} from "../history/actionResultPerSquaddie";
import {ActionAnimationPhase} from "./actionAnimation/actionAnimationConstants";
import {ActionTimer} from "./actionAnimation/actionTimer";
import {SquaddieActionType} from "../history/anySquaddieAction";

describe('SquaddieTargetsOtherSquaddiesAnimation', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let knightBattleSquaddie: BattleSquaddie;
    let knightDynamicId = "knight_0";
    let knightTemplateId = "knight_0";
    let thiefBattleSquaddie: BattleSquaddie;
    let thiefDynamicId = "thief_0";
    let thiefStaticId = "thief_0";

    let longswordAction: SquaddieAction;
    let powerAttacklongswordAction: SquaddieAction;
    let animator: SquaddieTargetsOtherSquaddiesAnimator;
    let oneActionInstruction: SquaddieActionsForThisRound;
    let mockResourceHandler: jest.Mocked<ResourceHandler>;
    let battleEventRecording: Recording;

    let knightHitsThiefWithLongswordInstructionInProgress: SquaddieInstructionInProgress;
    let knightHitsThiefWithLongswordEvent: BattleEvent;

    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        squaddieRepository = new BattleSquaddieRepository();

        ({
            thiefBattleSquaddie,
        } = CreateNewThiefSquaddie({
            squaddieRepository,
            templateId: thiefStaticId,
            battleId: thiefDynamicId,
        }));

        longswordAction = new SquaddieAction({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage({
                initialTraitValues: {
                    [Trait.ATTACK]: true,
                    [Trait.TARGET_ARMOR]: true,
                }
            }).filterCategory(TraitCategory.ACTION),
            minimumRange: 1,
            maximumRange: 1,
            actionPointCost: 1,
            damageDescriptions: {
                [DamageType.Body]: 2,
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

        oneActionInstruction = new SquaddieActionsForThisRound({
            squaddieTemplateId: "static_squaddie",
            battleSquaddieId: "dynamic_squaddie",
        });

        oneActionInstruction.addAction({
            type: SquaddieActionType.SQUADDIE,
            data: {
                squaddieAction: longswordAction,
                targetLocation: {q: 0, r: 0},
            }
        });

        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        knightHitsThiefWithLongswordInstructionInProgress = new SquaddieInstructionInProgress({
            actionsForThisRound: oneActionInstruction,
            currentSquaddieAction: powerAttacklongswordAction,
        });
        knightHitsThiefWithLongswordInstructionInProgress.addSelectedAction(longswordAction);

        knightHitsThiefWithLongswordEvent = new BattleEvent({
            currentSquaddieInstruction: knightHitsThiefWithLongswordInstructionInProgress,
            results: new SquaddieSquaddieResults({
                actingBattleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                targetedBattleSquaddieIds: [thiefDynamicId],
                resultPerTarget: {[thiefDynamicId]: new ActionResultPerSquaddie({damageTaken: 1})},
            })
        });
        battleEventRecording = new Recording({});
    });

    function mockActionTimerPhase(timer: ActionTimer, actionAnimationPhase: ActionAnimationPhase) {
        return jest.spyOn(timer, "currentPhase", "get").mockReturnValue(actionAnimationPhase);
    }

    it('will create an actor sprite and a target sprite', () => {
        battleEventRecording.addEvent(knightHitsThiefWithLongswordEvent);
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieCurrentlyActing: knightHitsThiefWithLongswordInstructionInProgress,
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleEventRecording,
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
        battleEventRecording.addEvent(knightHitsThiefWithLongswordEvent);
        mockActionTimerPhase(animator.actionAnimationTimer, ActionAnimationPhase.INITIALIZED);
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieCurrentlyActing: knightHitsThiefWithLongswordInstructionInProgress,
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleEventRecording,
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
        battleEventRecording.addEvent(knightHitsThiefWithLongswordEvent);

        mockActionTimerPhase(animator.actionAnimationTimer, ActionAnimationPhase.INITIALIZED);
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieCurrentlyActing: knightHitsThiefWithLongswordInstructionInProgress,
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleEventRecording,
        })
        animator.reset(state);
        animator.update(state, mockedP5GraphicsContext);
        expect(animator.hasCompleted(state)).toBeFalsy();

        mockActionTimerPhase(animator.actionAnimationTimer, ActionAnimationPhase.FINISHED_SHOWING_RESULTS);
        animator.update(state, mockedP5GraphicsContext);
        expect(animator.hasCompleted(state)).toBeTruthy();
    });
});
