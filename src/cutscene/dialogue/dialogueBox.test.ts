import {DialogueBox} from "./dialogueBox";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService
} from "../../battle/orchestrator/battleOrchestratorState";
import {BattlePhase} from "../../battle/orchestratorComponents/battlePhaseTracker";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {BattleStateService} from "../../battle/orchestrator/battleState";

describe('dialogue box', () => {

    it('should wait for a certain amount of time before saying it is finished', () => {
        const frontDoorGreeting = new DialogueBox({
            id: "1",
            name: "Doorman",
            text: "Welcome, come inside",
            animationDuration: 500
        });
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        frontDoorGreeting.start({});
        expect(frontDoorGreeting.isAnimating()).toBeTruthy();
        expect(frontDoorGreeting.isFinished()).toBeFalsy();

        jest.spyOn(Date, 'now').mockImplementation(() => 501);
        expect(frontDoorGreeting.isAnimating()).toBeFalsy();
        expect(frontDoorGreeting.isFinished()).toBeTruthy();
    });

    it('should not finish if the player needs to answer', () => {
        const purchasePrompt = new DialogueBox({
            id: "buy my stuff",
            name: "Sales Clerk",
            text: "Would you like to buy this sword?",
            animationDuration: 500,
            answers: ["Yes", "No"]
        });
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        purchasePrompt.start({});
        expect(purchasePrompt.isAnimating()).toBeTruthy();
        expect(purchasePrompt.isFinished()).toBeFalsy();

        jest.spyOn(Date, 'now').mockImplementation(() => 501);
        expect(purchasePrompt.isAnimating()).toBeTruthy();
        expect(purchasePrompt.isFinished()).toBeFalsy();
    });

    it('should not finish if the player does not click on an answer', () => {
        const purchasePrompt = new DialogueBox({
            id: "1",
            name: "Sales Clerk",
            text: "Would you like to buy this sword?",
            answers: ["Yes", "No"],
            screenDimensions: [1000, 800]
        });
        purchasePrompt.start({});
        expect(purchasePrompt.isAnimating()).toBeTruthy();
        expect(purchasePrompt.isFinished()).toBeFalsy();

        purchasePrompt.mouseClicked(0, 0);

        expect(purchasePrompt.isAnimating()).toBeTruthy();
        expect(purchasePrompt.isFinished()).toBeFalsy();
    });

    it('should finish if the player clicks on an answer', () => {
        const purchasePrompt = new DialogueBox({
            id: "1",
            name: "Sales Clerk",
            text: "Would you like to buy this sword?",
            answers: ["Yes", "No"],
            screenDimensions: [1000, 800]
        });
        purchasePrompt.start({});
        expect(purchasePrompt.isAnimating()).toBeTruthy();
        expect(purchasePrompt.isFinished()).toBeFalsy();

        purchasePrompt.mouseClicked(0, 800);

        expect(purchasePrompt.isAnimating()).toBeFalsy();
        expect(purchasePrompt.isFinished()).toBeTruthy();
    });

    it('should remember the answer selected', () => {
        const purchasePrompt = new DialogueBox({
            id: "1",
            name: "Sales Clerk",
            text: "Would you like to buy this sword?",
            answers: ["Yes", "No"],
            screenDimensions: [1000, 800]
        });
        purchasePrompt.start({});
        expect(purchasePrompt.isAnimating()).toBeTruthy();
        expect(purchasePrompt.isFinished()).toBeFalsy();

        purchasePrompt.mouseClicked(1000, 800);

        expect(purchasePrompt.answerSelected).toBe(1);
    });

    it('will use text substitution', () => {
        const purchasePrompt = new DialogueBox({
            id: "1",
            name: "Turn count",
            text: "How many turns did this take? $$TURN_COUNT turns",
            answers: ["Yes, $$TURN_COUNT", "No, $$TURN_COUNT"],
            screenDimensions: [ScreenDimensions.SCREEN_WIDTH, ScreenDimensions.SCREEN_HEIGHT],
        });

        const battleState: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            squaddieRepository: undefined,
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                battlePhaseState: {
                    currentAffiliation: BattlePhase.UNKNOWN,
                    turnCount: 5
                }
            }),
        });

        purchasePrompt.start({battleOrchestratorState: battleState});
        const mockedP5GraphicsContext = new MockedP5GraphicsContext();
        const textSpy = jest.spyOn(mockedP5GraphicsContext, "text");
        purchasePrompt.draw(mockedP5GraphicsContext);
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
