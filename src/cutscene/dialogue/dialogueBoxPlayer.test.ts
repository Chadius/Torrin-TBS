import { DialoguePlayerService, DialoguePlayerState } from "./dialogueBoxPlayer"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../../battle/orchestrator/battleOrchestratorState"
import { BattlePhase } from "../../battle/orchestratorComponents/battlePhaseTracker"
import { BattleStateService } from "../../battle/battleState/battleState"
import { Dialogue, DialogueService } from "./dialogue"
import { RectAreaService } from "../../ui/rectArea"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { PlayerInputTestService } from "../../utils/test/playerInput"
import { PlayerInputStateService } from "../../ui/playerInput/playerInputState"
import { MouseButton } from "../../utils/mouseConfig"
import {
    ResourceRepository,
    ResourceRepositoryService,
} from "../../resource/resourceRepository.ts"
import { TestLoadImmediatelyImageLoader } from "../../resource/resourceRepositoryTestUtils.ts"
import { LoadCampaignData } from "../../utils/fileHandling/loadCampaignData.ts"

describe("dialogue box player", () => {
    let resourceRepository: ResourceRepository
    beforeEach(() => {
        let loadImmediatelyImageLoader = new TestLoadImmediatelyImageLoader({})
        resourceRepository = ResourceRepositoryService.new({
            imageLoader: loadImmediatelyImageLoader,
            urls: Object.fromEntries(
                LoadCampaignData.getResourceKeys().map((key) => [key, "url"])
            ),
        })
    })
    describe("dialog box without answers finishes", () => {
        let dialogue: Dialogue
        let dialoguePlayerState: DialoguePlayerState
        beforeEach(() => {
            dialogue = DialogueService.new({
                id: "1",
                speakerName: "Doorman",
                dialogueText: "Welcome, come inside",
                animationDuration: 500,
                speakerPortraitResourceKey: "",
            })

            dialoguePlayerState = DialoguePlayerService.new({
                dialogue,
            })
        })

        it("should wait for a certain amount of time before saying it is finished", () => {
            const dateSpy = vi.spyOn(Date, "now").mockImplementation(() => 0)
            DialoguePlayerService.start(dialoguePlayerState, {})
            expect(
                DialoguePlayerService.isAnimating(dialoguePlayerState)
            ).toBeTruthy()
            expect(
                DialoguePlayerService.isFinished(dialoguePlayerState)
            ).toBeFalsy()

            vi.spyOn(Date, "now").mockImplementation(() => 501)
            expect(
                DialoguePlayerService.isAnimating(dialoguePlayerState)
            ).toBeFalsy()
            expect(
                DialoguePlayerService.isFinished(dialoguePlayerState)
            ).toBeTruthy()

            expect(dateSpy).toBeCalled()
            dateSpy.mockRestore()
        })

        it("should finish if the user clicks the mouse", () => {
            DialoguePlayerService.start(dialoguePlayerState, {})
            expect(
                DialoguePlayerService.isAnimating(dialoguePlayerState)
            ).toBeTruthy()
            expect(
                DialoguePlayerService.isFinished(dialoguePlayerState)
            ).toBeFalsy()

            DialoguePlayerService.mouseClicked(dialoguePlayerState, {
                x: 0,
                y: 0,
                button: MouseButton.ACCEPT,
            })
            expect(
                DialoguePlayerService.isAnimating(dialoguePlayerState)
            ).toBeFalsy()
            expect(
                DialoguePlayerService.isFinished(dialoguePlayerState)
            ).toBeTruthy()
        })

        it("should finish if the user presses ACCEPT", () => {
            DialoguePlayerService.start(dialoguePlayerState, {})
            expect(
                DialoguePlayerService.isAnimating(dialoguePlayerState)
            ).toBeTruthy()
            expect(
                DialoguePlayerService.isFinished(dialoguePlayerState)
            ).toBeFalsy()

            DialoguePlayerService.keyPressed({
                dialoguePlayerState,
                event: PlayerInputTestService.pressAcceptKey(),
                playerInputState: PlayerInputStateService.newFromEnvironment(),
            })
            expect(
                DialoguePlayerService.isAnimating(dialoguePlayerState)
            ).toBeFalsy()
            expect(
                DialoguePlayerService.isFinished(dialoguePlayerState)
            ).toBeTruthy()
        })
    })

    describe("player needs to answer a question", () => {
        let dialogue: Dialogue
        let dialoguePlayerState: DialoguePlayerState

        beforeEach(() => {
            dialogue = DialogueService.new({
                id: "buy my stuff",
                speakerName: "Sales Clerk",
                dialogueText: "Would you like to buy this sword?",
                animationDuration: 500,
                answers: ["Yes", "No"],
                speakerPortraitResourceKey: "",
            })

            dialoguePlayerState = DialoguePlayerService.new({
                dialogue,
            })
        })
        it("should not finish if the player needs to answer", () => {
            vi.spyOn(Date, "now").mockImplementation(() => 0)
            DialoguePlayerService.start(dialoguePlayerState, {})
            expect(
                DialoguePlayerService.isAnimating(dialoguePlayerState)
            ).toBeTruthy()
            expect(
                DialoguePlayerService.isFinished(dialoguePlayerState)
            ).toBeFalsy()

            vi.spyOn(Date, "now").mockImplementation(() => 501)
            expect(
                DialoguePlayerService.isAnimating(dialoguePlayerState)
            ).toBeTruthy()
            expect(
                DialoguePlayerService.isFinished(dialoguePlayerState)
            ).toBeFalsy()
        })

        it("should not finish if the player does not click on an answer", () => {
            DialoguePlayerService.start(dialoguePlayerState, {})
            expect(
                DialoguePlayerService.isAnimating(dialoguePlayerState)
            ).toBeTruthy()
            expect(
                DialoguePlayerService.isFinished(dialoguePlayerState)
            ).toBeFalsy()

            DialoguePlayerService.mouseClicked(dialoguePlayerState, {
                x: 0,
                y: 0,
                button: MouseButton.ACCEPT,
            })

            expect(
                DialoguePlayerService.isAnimating(dialoguePlayerState)
            ).toBeTruthy()
            expect(
                DialoguePlayerService.isFinished(dialoguePlayerState)
            ).toBeFalsy()
        })

        it("should finish if the player clicks on an answer", () => {
            DialoguePlayerService.start(dialoguePlayerState, {})
            expect(
                DialoguePlayerService.isAnimating(dialoguePlayerState)
            ).toBeTruthy()
            expect(
                DialoguePlayerService.isFinished(dialoguePlayerState)
            ).toBeFalsy()

            const buttonLocation =
                dialoguePlayerState.answerButtons[0]!.buttonRect!

            DialoguePlayerService.mouseClicked(dialoguePlayerState, {
                x: RectAreaService.centerX(buttonLocation),
                y: RectAreaService.centerY(buttonLocation),
                button: MouseButton.ACCEPT,
            })

            expect(
                DialoguePlayerService.isAnimating(dialoguePlayerState)
            ).toBeFalsy()
            expect(
                DialoguePlayerService.isFinished(dialoguePlayerState)
            ).toBeTruthy()
        })

        it("should remember the answer selected", () => {
            DialoguePlayerService.start(dialoguePlayerState, {})
            expect(
                DialoguePlayerService.isAnimating(dialoguePlayerState)
            ).toBeTruthy()
            expect(
                DialoguePlayerService.isFinished(dialoguePlayerState)
            ).toBeFalsy()

            const buttonLocation =
                dialoguePlayerState.answerButtons[1]!.buttonRect!

            DialoguePlayerService.mouseClicked(dialoguePlayerState, {
                x: RectAreaService.centerX(buttonLocation),
                y: RectAreaService.centerY(buttonLocation),
                button: MouseButton.ACCEPT,
            })

            expect(dialoguePlayerState.answerSelected).toBe(1)
        })
    })

    describe("text substitution", () => {
        let textSpy: MockInstance
        let mockedP5GraphicsContext: MockedP5GraphicsBuffer
        let dialoguePlayerState: DialoguePlayerState

        beforeEach(() => {
            const dialogue = DialogueService.new({
                id: "1",
                speakerName: "Turn count",
                dialogueText: "Turns: $$TURN_COUNT",
                answers: ["Yes, $$TURN_COUNT", "No, $$TURN_COUNT"],
                speakerPortraitResourceKey: "",
            })

            dialoguePlayerState = DialoguePlayerService.new({
                dialogue,
            })

            const battleState: BattleOrchestratorState =
                BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        battlePhaseState: {
                            battlePhase: BattlePhase.UNKNOWN,
                            turnCount: 5,
                        },
                    }),
                })

            DialoguePlayerService.start(dialoguePlayerState, {
                battleOrchestratorState: battleState,
            })

            mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
            textSpy = vi.spyOn(mockedP5GraphicsContext, "text")
        })

        afterEach(() => {
            textSpy.mockRestore()
        })

        it("will set the text to the substituted text", () => {
            expect(dialoguePlayerState.textBox!.dialogueText).toContain(
                "Turns: 5"
            )
            expect(dialoguePlayerState.answerButtons[0]!.answerText).toContain(
                "Yes, 5"
            )
            expect(dialoguePlayerState.answerButtons[1]!.answerText).toContain(
                "No, 5"
            )
        })

        it("will draw the substituted text", () => {
            DialoguePlayerService.draw({
                dialoguePlayerState: dialoguePlayerState,
                graphicsContext: mockedP5GraphicsContext,
                resourceRepository,
            })
            expect(textSpy).toBeCalledWith(
                "Turns: 5",
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )
            expect(textSpy).toBeCalledWith(
                "Yes, 5",
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )
            expect(textSpy).toBeCalledWith(
                "No, 5",
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )
        })
    })

    describe("backgroundColor", () => {
        let drawRectSpy: MockInstance
        let mockedP5GraphicsContext: MockedP5GraphicsBuffer

        beforeEach(() => {
            mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
            drawRectSpy = vi.spyOn(mockedP5GraphicsContext, "rect")
        })

        afterEach(() => {
            drawRectSpy.mockRestore()
        })

        it("will draw the background when it is set", () => {
            const dialogueWithBackgroundState = DialogueService.new({
                id: "dialogue",
                dialogueText: "I'm saying something",
                backgroundColor: [1, 2, 3],
            })

            const dialoguePlayerState = DialoguePlayerService.new({
                dialogue: dialogueWithBackgroundState,
            })

            DialoguePlayerService.draw({
                dialoguePlayerState: dialoguePlayerState,
                graphicsContext: mockedP5GraphicsContext,
                resourceRepository,
            })
            expect(drawRectSpy).toBeCalled()
            expect(drawRectSpy).toBeCalledWith(
                0,
                0,
                ScreenDimensions.SCREEN_WIDTH,
                ScreenDimensions.SCREEN_HEIGHT
            )
        })

        it("will not draw the background when it is not set", () => {
            const dialogueWithoutBackgroundState = DialogueService.new({
                id: "dialogue",
                dialogueText: "I'm saying something",
            })

            const dialoguePlayerState = DialoguePlayerService.new({
                dialogue: dialogueWithoutBackgroundState,
            })

            DialoguePlayerService.draw({
                dialoguePlayerState: dialoguePlayerState,
                graphicsContext: mockedP5GraphicsContext,
                resourceRepository,
            })
            expect(drawRectSpy).not.toBeCalled()
        })
    })
})
