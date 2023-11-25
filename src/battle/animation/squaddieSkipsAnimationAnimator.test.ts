import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAction, SquaddieActionHandler} from "../../squaddie/action";
import {ResourceHandler} from "../../resource/resourceHandler";
import {makeResult} from "../../utils/ResultOrError";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {Recording, RecordingHandler} from "../history/recording";
import {ANIMATE_TEXT_WINDOW_WAIT_TIME, SquaddieSkipsAnimationAnimator} from "./squaddieSkipsAnimationAnimator";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleEvent} from "../history/battleEvent";
import {
    SquaddieInstructionInProgress,
    SquaddieInstructionInProgressHandler
} from "../history/squaddieInstructionInProgress";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/battleOrchestratorComponent";
import {Label} from "../../ui/label";
import * as actionResultTextWriter from "./actionResultTextWriter";
import {SquaddieActionType} from "../history/anySquaddieAction";
import {BattleStateHelper} from "../orchestrator/battleState";

describe('SquaddieSkipsAnimationAnimator', () => {
    let mockResourceHandler: jest.Mocked<ResourceHandler>;

    let squaddieRepository: BattleSquaddieRepository;
    let monkStaticId = "monk static";
    let monkDynamicId = "monk dynamic";
    let monkKoanAction: SquaddieAction;
    let monkMeditatesEvent: BattleEvent;
    let monkMeditatesInstruction: SquaddieInstructionInProgress;

    let battleEventRecording: Recording;

    let animator: SquaddieSkipsAnimationAnimator;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockResourceHandler = mocks.mockResourceHandler();
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));

        monkKoanAction = SquaddieActionHandler.new({
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

        squaddieRepository = new BattleSquaddieRepository();
        CreateNewSquaddieAndAddToRepository({
            actions: [monkKoanAction],
            affiliation: SquaddieAffiliation.PLAYER,
            battleId: monkDynamicId,
            name: "Monk",
            templateId: monkStaticId,
            squaddieRepository,
        });

        battleEventRecording = {history: []};
        const oneActionInstruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: monkStaticId,
            battleSquaddieId: monkDynamicId,
            startingLocation: {q: 0, r: 0},
            actions: [],
        };

        SquaddieActionsForThisRoundHandler.addAction(oneActionInstruction, {
            type: SquaddieActionType.SQUADDIE,
            data: {
                squaddieAction: monkKoanAction,
                targetLocation: {q: 0, r: 0},
            }
        });

        monkMeditatesInstruction = {
            currentlySelectedAction: monkKoanAction,
            movingBattleSquaddieIds: [],
            squaddieActionsForThisRound: oneActionInstruction,
        };
        SquaddieInstructionInProgressHandler.addSelectedAction(monkMeditatesInstruction, monkKoanAction);

        monkMeditatesEvent = {
            instruction: monkMeditatesInstruction,
            results: {
                actingBattleSquaddieId: monkDynamicId,
                targetedBattleSquaddieIds: [],
                resultPerTarget: {},
            }
        };
        RecordingHandler.addEvent(battleEventRecording, monkMeditatesEvent);

        animator = new SquaddieSkipsAnimationAnimator();
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
    });

    it('will create a text window with the action results', () => {
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                squaddieCurrentlyActing: monkMeditatesInstruction,
                recording: battleEventRecording,
            }),
        })

        const formatResultSpy = jest.spyOn(actionResultTextWriter, "FormatResult");
        const drawLabelSpy = jest.spyOn(Label.prototype, "draw");

        animator.reset(state);
        animator.update(state, mockedP5GraphicsContext);

        expect(animator.outputTextDisplay).not.toBeUndefined();
        expect(formatResultSpy).toBeCalled();
        expect(formatResultSpy).toBeCalledWith({
            currentAction: monkKoanAction,
            result: monkMeditatesEvent.results,
            squaddieRepository,
        });
        expect(drawLabelSpy).toBeCalled();
    });

    it('will complete at the end of the display time', () => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
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
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepository: squaddieRepository,
            resourceHandler: mockResourceHandler,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
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
