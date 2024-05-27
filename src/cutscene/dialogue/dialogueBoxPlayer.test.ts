import {DialoguePlayerService, DialoguePlayerState} from "./dialogueBoxPlayer";
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService
} from "../../battle/orchestrator/battleOrchestratorState";
import {BattlePhase} from "../../battle/orchestratorComponents/battlePhaseTracker";
import {BattleStateService} from "../../battle/orchestrator/battleState";
import {Dialogue, DialogueService} from "./dialogue";
import {RectAreaService} from "../../ui/rectArea";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {config} from "../../configuration/config";
import {KeyButtonName} from "../../utils/keyboardConfig";
import {MockedP5GraphicsBuffer} from "../../utils/test/mocks";

describe('dialogue box player', () => {
    describe('dialog box without answers finishes', () => {
        let dialogue: Dialogue;
        let dialoguePlayerState: DialoguePlayerState;
        beforeEach(() => {
            dialogue = DialogueService.new({
                id: "1",
                speakerName: "Doorman",
                speakerText: "Welcome, come inside",
                animationDuration: 500,
                speakerPortraitResourceKey: "",
            });

            dialoguePlayerState = DialoguePlayerService.new({
                dialogue,
            });
        })

        it('should wait for a certain amount of time before saying it is finished', () => {
            const dateSpy = jest.spyOn(Date, 'now').mockImplementation(() => 0);
            DialoguePlayerService.start(dialoguePlayerState, {});
            expect(DialoguePlayerService.isAnimating(dialoguePlayerState)).toBeTruthy();
            expect(DialoguePlayerService.isFinished(dialoguePlayerState)).toBeFalsy();

            jest.spyOn(Date, 'now').mockImplementation(() => 501);
            expect(DialoguePlayerService.isAnimating(dialoguePlayerState)).toBeFalsy();
            expect(DialoguePlayerService.isFinished(dialoguePlayerState)).toBeTruthy();

            expect(dateSpy).toBeCalled()
            dateSpy.mockRestore()
        });

        it('should finish if the user clicks the mouse', () => {
            DialoguePlayerService.start(dialoguePlayerState, {});
            expect(DialoguePlayerService.isAnimating(dialoguePlayerState)).toBeTruthy();
            expect(DialoguePlayerService.isFinished(dialoguePlayerState)).toBeFalsy();

            DialoguePlayerService.mouseClicked(dialoguePlayerState, 0, 0)
            expect(DialoguePlayerService.isAnimating(dialoguePlayerState)).toBeFalsy();
            expect(DialoguePlayerService.isFinished(dialoguePlayerState)).toBeTruthy();
        })

        it('should finish if the user presses ACCEPT', () => {
            DialoguePlayerService.start(dialoguePlayerState, {});
            expect(DialoguePlayerService.isAnimating(dialoguePlayerState)).toBeTruthy();
            expect(DialoguePlayerService.isFinished(dialoguePlayerState)).toBeFalsy();

            DialoguePlayerService.keyPressed(dialoguePlayerState, config.KEYBOARD_SHORTCUTS[KeyButtonName.ACCEPT][0])
            expect(DialoguePlayerService.isAnimating(dialoguePlayerState)).toBeFalsy();
            expect(DialoguePlayerService.isFinished(dialoguePlayerState)).toBeTruthy();
        })
    })

    describe('player needs to answer a question', () => {
        let dialogue: Dialogue;
        let dialoguePlayerState: DialoguePlayerState;

        beforeEach(() => {
            dialogue = DialogueService.new({
                id: "buy my stuff",
                speakerName: "Sales Clerk",
                speakerText: "Would you like to buy this sword?",
                animationDuration: 500,
                answers: ["Yes", "No"],
                speakerPortraitResourceKey: "",
            });

            dialoguePlayerState = DialoguePlayerService.new({
                dialogue,
            });
        });
        it('should not finish if the player needs to answer', () => {
            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            DialoguePlayerService.start(dialoguePlayerState, {});
            expect(DialoguePlayerService.isAnimating(dialoguePlayerState)).toBeTruthy();
            expect(DialoguePlayerService.isFinished(dialoguePlayerState)).toBeFalsy();

            jest.spyOn(Date, 'now').mockImplementation(() => 501);
            expect(DialoguePlayerService.isAnimating(dialoguePlayerState)).toBeTruthy();
            expect(DialoguePlayerService.isFinished(dialoguePlayerState)).toBeFalsy();
        });

        it('should not finish if the player does not click on an answer', () => {
            DialoguePlayerService.start(dialoguePlayerState, {});
            expect(DialoguePlayerService.isAnimating(dialoguePlayerState)).toBeTruthy();
            expect(DialoguePlayerService.isFinished(dialoguePlayerState)).toBeFalsy();

            DialoguePlayerService.mouseClicked(dialoguePlayerState, 0, 0);

            expect(DialoguePlayerService.isAnimating(dialoguePlayerState)).toBeTruthy();
            expect(DialoguePlayerService.isFinished(dialoguePlayerState)).toBeFalsy();
        });

        it('should finish if the player clicks on an answer', () => {
            DialoguePlayerService.start(dialoguePlayerState, {});
            expect(DialoguePlayerService.isAnimating(dialoguePlayerState)).toBeTruthy();
            expect(DialoguePlayerService.isFinished(dialoguePlayerState)).toBeFalsy();

            const buttonLocation = dialoguePlayerState.answerButtons[0].buttonRect;

            DialoguePlayerService.mouseClicked(
                dialoguePlayerState,
                RectAreaService.centerX(buttonLocation),
                RectAreaService.centerY(buttonLocation),
            );

            expect(DialoguePlayerService.isAnimating(dialoguePlayerState)).toBeFalsy();
            expect(DialoguePlayerService.isFinished(dialoguePlayerState)).toBeTruthy();
        });

        it('should remember the answer selected', () => {
            DialoguePlayerService.start(dialoguePlayerState, {});
            expect(DialoguePlayerService.isAnimating(dialoguePlayerState)).toBeTruthy();
            expect(DialoguePlayerService.isFinished(dialoguePlayerState)).toBeFalsy();

            const buttonLocation = dialoguePlayerState.answerButtons[1].buttonRect;

            DialoguePlayerService.mouseClicked(
                dialoguePlayerState,
                RectAreaService.centerX(buttonLocation),
                RectAreaService.centerY(buttonLocation),
            );

            expect(dialoguePlayerState.answerSelected).toBe(1);
        });
    });

    describe('text substitution', () => {
        let textSpy: jest.SpyInstance;
        let mockedP5GraphicsContext: MockedP5GraphicsBuffer;
        let dialoguePlayerState: DialoguePlayerState;

        beforeEach(() => {
            const dialogue = DialogueService.new({
                id: "1",
                speakerName: "Turn count",
                speakerText: "How many turns did this take? $$TURN_COUNT turns",
                answers: ["Yes, $$TURN_COUNT", "No, $$TURN_COUNT"],
                speakerPortraitResourceKey: "",
            });

            dialoguePlayerState = DialoguePlayerService.new({
                dialogue,
            });

            const battleState: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    battlePhaseState: {
                        currentAffiliation: BattlePhase.UNKNOWN,
                        turnCount: 5
                    }
                }),
            });

            DialoguePlayerService.start(dialoguePlayerState, {battleOrchestratorState: battleState});

            mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
            textSpy = jest.spyOn(mockedP5GraphicsContext, "text");
        });

        afterEach(() => {
            textSpy.mockRestore();
        });

        it('will set the text to the substituted text', () => {
            expect(dialoguePlayerState.textBox.speakerText).toContain("How many turns did this take? 5 turns");
            expect(dialoguePlayerState.answerButtons[0].answerText).toContain("Yes, 5");
            expect(dialoguePlayerState.answerButtons[1].answerText).toContain("No, 5");
        });

        it('will draw the substituted text', () => {
            DialoguePlayerService.draw(dialoguePlayerState, mockedP5GraphicsContext);
            expect(textSpy).toBeCalledWith(
                "How many turns did this take? 5 turns",
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything(),
            );
            expect(textSpy).toBeCalledWith(
                "Yes, 5",
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything(),
            );
            expect(textSpy).toBeCalledWith(
                "No, 5",
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything(),
            );
        });
    });

    describe('backgroundColor', () => {
        let drawRectSpy: jest.SpyInstance;
        let mockedP5GraphicsContext: MockedP5GraphicsBuffer;

        beforeEach(() => {
            mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
            drawRectSpy = jest.spyOn(mockedP5GraphicsContext, "rect");
        });

        afterEach(() => {
            drawRectSpy.mockRestore();
        });

        it('will draw the background when it is set', () => {
            const dialogueWithBackgroundState = DialogueService.new({
                id: "dialogue",
                speakerText: "I'm saying something",
                backgroundColor: [1, 2, 3],
            });

            const dialoguePlayerState = DialoguePlayerService.new({
                dialogue: dialogueWithBackgroundState
            });

            DialoguePlayerService.draw(dialoguePlayerState, mockedP5GraphicsContext);
            expect(drawRectSpy).toBeCalled();
            expect(drawRectSpy).toBeCalledWith(0, 0, ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT);
        });

        it('will not draw the background when it is not set', () => {
            const dialogueWithoutBackgroundState = DialogueService.new({
                id: "dialogue",
                speakerText: "I'm saying something",
            });

            const dialoguePlayerState = DialoguePlayerService.new({
                dialogue: dialogueWithoutBackgroundState
            });

            DialoguePlayerService.draw(dialoguePlayerState, mockedP5GraphicsContext);
            expect(drawRectSpy).not.toBeCalled();
        });
    });
});
