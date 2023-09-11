import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieActivity} from "../../squaddie/activity";
import {ResourceHandler} from "../../resource/resourceHandler";
import {makeResult} from "../../utils/ResultOrError";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {Recording} from "../history/recording";
import {ANIMATE_TEXT_WINDOW_WAIT_TIME, SquaddieSkipsAnimationAnimator} from "./squaddieSkipsAnimationAnimator";
import {Trait, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleEvent} from "../history/battleEvent";
import {SquaddieSquaddieResults} from "../history/squaddieSquaddieResults";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {SquaddieActivitiesForThisRound} from "../history/squaddieActivitiesForThisRound";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {Label} from "../../ui/label";
import * as activityResultTextWriter from "./activityResultTextWriter";

describe('SquaddieSkipsAnimationAnimator', () => {
    let mockResourceHandler: jest.Mocked<ResourceHandler>;

    let squaddieRepository: BattleSquaddieRepository;
    let monkStaticId = "monk static";
    let monkDynamicId = "monk dynamic";
    let monkKoanActivity: SquaddieActivity;
    let monkMeditatesEvent: BattleEvent;
    let monkMeditatesInstruction: SquaddieInstructionInProgress;

    let battleEventRecording: Recording;

    let animator: SquaddieSkipsAnimationAnimator;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        monkKoanActivity = new SquaddieActivity({
            id: "koan",
            name: "koan",
            traits: new TraitStatusStorage({
                [Trait.SKIP_ANIMATION]: true
            }),
            maximumRange: 0,
            minimumRange: 0,
        });

        squaddieRepository = new BattleSquaddieRepository();
        CreateNewSquaddieAndAddToRepository({
            activities: [monkKoanActivity],
            affiliation: SquaddieAffiliation.PLAYER,
            dynamicId: monkDynamicId,
            name: "Monk",
            staticId: monkStaticId,
            squaddieRepository,
        });

        battleEventRecording = new Recording({});
        const oneActionInstruction = new SquaddieActivitiesForThisRound({
            staticSquaddieId: monkStaticId,
            dynamicSquaddieId: monkDynamicId,
        });
        oneActionInstruction.addActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({q: 0, r: 0}),
            squaddieActivity: monkKoanActivity,
        }));

        monkMeditatesInstruction = new SquaddieInstructionInProgress({
            activitiesForThisRound: oneActionInstruction,
            currentSquaddieActivity: monkKoanActivity,
        });
        monkMeditatesInstruction.addSelectedActivity(monkKoanActivity);

        monkMeditatesEvent = new BattleEvent({
            currentSquaddieInstruction: monkMeditatesInstruction,
            results: new SquaddieSquaddieResults({
                actingSquaddieDynamicId: monkDynamicId,
                targetedSquaddieDynamicIds: [],
                resultPerTarget: {},
            })
        });
        battleEventRecording.addEvent(monkMeditatesEvent);

        animator = new SquaddieSkipsAnimationAnimator();
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
    });

    it('will create a text window with the activity results', () => {
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieCurrentlyActing: monkMeditatesInstruction,
            squaddieRepo: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleEventRecording,
        })

        const formatResultSpy = jest.spyOn(activityResultTextWriter, "FormatResult");
        const drawLabelSpy = jest.spyOn(Label.prototype, "draw");

        animator.reset(state);
        animator.update(state, mockedP5GraphicsContext);

        expect(animator.outputTextDisplay).not.toBeUndefined();
        expect(formatResultSpy).toBeCalled();
        expect(formatResultSpy).toBeCalledWith({
            currentActivity: monkKoanActivity,
            result: monkMeditatesEvent.results,
            squaddieRepository,
        });
        expect(drawLabelSpy).toBeCalled();
    });

    it('will complete at the end of the display time', () => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieCurrentlyActing: monkMeditatesInstruction,
            squaddieRepo: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleEventRecording,
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
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieCurrentlyActing: monkMeditatesInstruction,
            squaddieRepo: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleEventRecording,
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
