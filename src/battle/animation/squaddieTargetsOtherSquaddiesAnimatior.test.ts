import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {SquaddieActivitiesForThisRound} from "../history/squaddieActivitiesForThisRound";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieDynamic} from "../battleSquaddie";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {SquaddieActivity} from "../../squaddie/activity";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
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
import {ActivityResultOnSquaddie} from "../history/activityResultOnSquaddie";
import {ActionAnimationPhase} from "./actionAnimation/actionAnimationConstants";
import {ActionTimer} from "./actionAnimation/actionTimer";

describe('SquaddieTargetsOtherSquaddiesAnimation', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let knightDynamicSquaddie: BattleSquaddieDynamic;
    let knightDynamicId = "knight_0";
    let knightStaticId = "knight_0";
    let thiefDynamicSquaddie: BattleSquaddieDynamic;
    let thiefDynamicId = "thief_0";
    let thiefStaticId = "thief_0";

    let longswordActivity: SquaddieActivity;
    let powerAttackLongswordActivity: SquaddieActivity;
    let animator: SquaddieTargetsOtherSquaddiesAnimator;
    let oneActionInstruction: SquaddieActivitiesForThisRound;
    let mockResourceHandler: jest.Mocked<ResourceHandler>;
    let battleEventRecording: Recording;

    let knightHitsThiefWithLongswordInstructionInProgress: SquaddieInstructionInProgress;
    let knightHitsThiefWithLongswordEvent: BattleEvent;

    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        squaddieRepository = new BattleSquaddieRepository();

        ({
            thiefDynamicSquaddie,
        } = CreateNewThiefSquaddie({
            squaddieRepository,
            staticId: thiefStaticId,
            dynamicId: thiefDynamicId,
        }));

        longswordActivity = new SquaddieActivity({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 1,
            actionsToSpend: 1,
            damageDescriptions: {
                [DamageType.Body]: 2,
            },
        });

        ({
            knightDynamicSquaddie,
        } = CreateNewKnightSquaddie({
            squaddieRepository,
            staticId: knightStaticId,
            dynamicId: knightDynamicId,
            activities: [longswordActivity],
        }));

        animator = new SquaddieTargetsOtherSquaddiesAnimator();

        oneActionInstruction = new SquaddieActivitiesForThisRound({
            staticSquaddieId: "static_squaddie",
            dynamicSquaddieId: "dynamic_squaddie",
        });
        oneActionInstruction.addActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({q: 0, r: 0}),
            squaddieActivity: longswordActivity,
        }));

        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        knightHitsThiefWithLongswordInstructionInProgress = new SquaddieInstructionInProgress({
            activitiesForThisRound: oneActionInstruction,
            currentSquaddieActivity: powerAttackLongswordActivity,
        });
        knightHitsThiefWithLongswordInstructionInProgress.addSelectedActivity(longswordActivity);

        knightHitsThiefWithLongswordEvent = new BattleEvent({
            currentSquaddieInstruction: knightHitsThiefWithLongswordInstructionInProgress,
            results: new SquaddieSquaddieResults({
                actingSquaddieDynamicId: knightDynamicSquaddie.dynamicSquaddieId,
                targetedSquaddieDynamicIds: [thiefDynamicId],
                resultPerTarget: {[thiefDynamicId]: new ActivityResultOnSquaddie({damageTaken: 1})},
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
            squaddieRepo: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleEventRecording,
        })
        animator.reset(state);
        animator.update(state, mockedP5GraphicsContext);

        expect(animator.actorSprite).not.toBeUndefined();
        expect(animator.actorSprite.dynamicSquaddieId).toBe(knightDynamicId);

        expect(animator.targetSprites).not.toBeUndefined();
        expect(animator.targetSprites).toHaveLength(1);
        expect(animator.targetSprites[0].dynamicSquaddieId).toBe(thiefDynamicId);
    });

    it('will skip displaying the results if the user clicks', () => {
        battleEventRecording.addEvent(knightHitsThiefWithLongswordEvent);
        mockActionTimerPhase(animator.actionAnimationTimer, ActionAnimationPhase.INITIALIZED);
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieCurrentlyActing: knightHitsThiefWithLongswordInstructionInProgress,
            squaddieRepo: squaddieRepository,
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
            squaddieRepo: squaddieRepository,
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
