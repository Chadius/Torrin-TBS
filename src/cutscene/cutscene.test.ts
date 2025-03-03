import {
    DialoguePlayerService,
    DialoguePlayerState,
} from "./dialogue/dialogueBoxPlayer"
import { Cutscene, CutsceneService } from "./cutscene"
import { CutsceneDecisionTriggerService } from "./DecisionTrigger"
import {
    ResourceHandler,
    ResourceHandlerService,
    ResourceType,
} from "../resource/resourceHandler"
import { StubImmediateLoader } from "../resource/resourceHandlerTestUtils"
import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
} from "../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battle/battleState/battleState"
import { SplashScreen, SplashScreenService } from "./splashScreen"
import { Dialogue, DialogueService } from "./dialogue/dialogue"
import {
    MockedP5GraphicsBuffer,
    mockResourceHandler,
} from "../utils/test/mocks"
import { RectAreaService } from "../ui/rectArea"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlayerInputTestService } from "../utils/test/playerInput"
import { PlayerInputStateService } from "../ui/playerInput/playerInputState"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { Button } from "../ui/button/button"
import { MouseButton } from "../utils/mouseConfig"

describe("Cutscene", () => {
    let splash1: SplashScreen
    let splash2: SplashScreen
    let frontDoorGreeting: Dialogue
    let hostGreeting: Dialogue
    let graphicsContext: GraphicsBuffer
    let resourceHandler: ResourceHandler

    beforeEach(() => {
        splash1 = SplashScreenService.new({
            id: "splash1",
            screenImageResourceKey: undefined,
        })

        splash2 = SplashScreenService.new({
            id: "splash2",
            screenImageResourceKey: undefined,
        })

        frontDoorGreeting = DialogueService.new({
            id: "1",
            speakerName: "Doorman",
            dialogueText: "Welcome, come inside",
            animationDuration: 0,
            speakerPortraitResourceKey: undefined,
        })

        hostGreeting = DialogueService.new({
            id: "1",
            speakerName: "Host",
            dialogueText: "Someone will lead you to your table shortly.",
            animationDuration: 0,
            speakerPortraitResourceKey: undefined,
        })
        graphicsContext = new MockedP5GraphicsBuffer()
        resourceHandler = mockResourceHandler(graphicsContext)
    })

    it("should not start upon construction", () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [frontDoorGreeting],
        })

        expect(CutsceneService.isInProgress(dinnerDate)).toBeFalsy()
    })

    it("should start with the first action when started", () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [frontDoorGreeting],
        })

        CutsceneService.start(
            dinnerDate,
            mockResourceHandler(new MockedP5GraphicsBuffer()),
            {}
        )
        expect(CutsceneService.isInProgress(dinnerDate)).toBeTruthy()
        expect(dinnerDate.currentDirection).toEqual(frontDoorGreeting)
    })

    it("should stop when requested", () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [frontDoorGreeting],
        })

        CutsceneService.start(
            dinnerDate,
            mockResourceHandler(new MockedP5GraphicsBuffer()),
            {}
        )
        CutsceneService.stop(dinnerDate)
        expect(CutsceneService.isInProgress(dinnerDate)).toBeFalsy()
    })

    it("should move to the next action when the mouse clicks", () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [splash1, splash2],
        })

        CutsceneService.start(
            dinnerDate,
            mockResourceHandler(new MockedP5GraphicsBuffer()),
            {}
        )

        expect(dinnerDate.currentDirection).toEqual(splash1)
        CutsceneService.draw(dinnerDate, graphicsContext, resourceHandler)
        CutsceneService.mousePressed({
            cutscene: dinnerDate,
            mousePress: { x: 100, y: 100, button: MouseButton.ACCEPT },
            context: {},
        })
        expect(dinnerDate.currentDirection).toEqual(splash2)
    })

    it("should move to the next action when the keyboard presses accept", () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [splash1, splash2],
        })

        CutsceneService.start(
            dinnerDate,
            mockResourceHandler(new MockedP5GraphicsBuffer()),
            {}
        )

        expect(dinnerDate.currentDirection).toEqual(splash1)
        CutsceneService.keyboardPressed({
            cutscene: dinnerDate,
            event: PlayerInputTestService.pressAcceptKey(),
            context: {},
            playerInputState: PlayerInputStateService.newFromEnvironment(),
        })
        expect(dinnerDate.currentDirection).toEqual(splash2)
    })

    it("should be finished when all of the actions are finished", () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [frontDoorGreeting, hostGreeting],
        })

        CutsceneService.start(
            dinnerDate,
            mockResourceHandler(new MockedP5GraphicsBuffer()),
            {}
        )
        expect(CutsceneService.isInProgress(dinnerDate)).toBeTruthy()

        expect(dinnerDate.currentDirection).toEqual(frontDoorGreeting)
        CutsceneService.mousePressed({
            cutscene: dinnerDate,
            mousePress: { x: 100, y: 100, button: MouseButton.ACCEPT },
            context: {},
        })

        expect(dinnerDate.currentDirection).toEqual(hostGreeting)
        CutsceneService.mousePressed({
            cutscene: dinnerDate,
            mousePress: { x: 100, y: 100, button: MouseButton.ACCEPT },
            context: {},
        })

        expect(dinnerDate.currentDirection).toBeUndefined()
        expect(CutsceneService.isInProgress(dinnerDate)).toBeFalsy()
        expect(CutsceneService.isFinished(dinnerDate)).toBeTruthy()
    })

    describe("DecisionTriggers", () => {
        it("should use Answer based DecisionTriggers to select a different dialog when it is triggered", () => {
            const dialoguePrompt = DialogueService.new({
                id: "buy my stuff",
                speakerName: "Sales Clerk",
                dialogueText: "Would you like to buy this sword?",
                answers: ["Yes", "No"],
                speakerPortraitResourceKey: undefined,
            })
            const purchasePrompt = CutsceneService.new({
                directions: [
                    dialoguePrompt,
                    DialogueService.new({
                        id: "test failed",
                        speakerName: "No",
                        dialogueText:
                            "The cutscene should not have gotten here",
                        speakerPortraitResourceKey: undefined,
                    }),
                    DialogueService.new({
                        id: "test passes",
                        speakerName: "Clerk",
                        dialogueText: "Thank you for your business",
                        speakerPortraitResourceKey: undefined,
                    }),
                ],
                decisionTriggers: [
                    CutsceneDecisionTriggerService.new({
                        sourceDialogId: "buy my stuff",
                        sourceDialogAnswer: 0,
                        destinationDialogId: "test passes",
                    }),
                ],
            })

            CutsceneService.start(
                purchasePrompt,
                mockResourceHandler(new MockedP5GraphicsBuffer()),
                {}
            )
            expect(purchasePrompt.currentDirection.id).toBe("buy my stuff")
            const answerButtonRectArea = (
                purchasePrompt.cutscenePlayerStateById[
                    dialoguePrompt.id
                ] as DialoguePlayerState
            ).answerButtons[0].buttonRect
            CutsceneService.mousePressed({
                cutscene: purchasePrompt,
                mousePress: {
                    x: RectAreaService.centerX(answerButtonRectArea),
                    y: RectAreaService.centerY(answerButtonRectArea),
                    button: MouseButton.ACCEPT,
                },
                context: {},
            })

            expect(purchasePrompt.currentDirection.id).toBe("test passes")
        })

        it("should ignore Answer based DecisionTriggers if a different answer is selected", () => {
            const dialoguePrompt = DialogueService.new({
                id: "buy my stuff",
                speakerName: "Sales Clerk",
                dialogueText: "Would you like to buy this sword?",
                answers: ["Yes", "No"],
            })
            const purchasePrompt = CutsceneService.new({
                directions: [
                    dialoguePrompt,
                    DialogueService.new({
                        id: "test passed",
                        speakerName: "Clerk",
                        dialogueText: "Okay, here you go!",
                    }),
                    DialogueService.new({
                        id: "test failed",
                        speakerName: "No",
                        dialogueText: "Test should not have gone here",
                    }),
                ],
                decisionTriggers: [
                    CutsceneDecisionTriggerService.new({
                        sourceDialogId: "buy my stuff",
                        sourceDialogAnswer: 1,
                        destinationDialogId: "test failed",
                    }),
                ],
            })

            CutsceneService.start(
                purchasePrompt,
                mockResourceHandler(new MockedP5GraphicsBuffer()),
                {}
            )
            expect(purchasePrompt.currentDirection.id).toBe("buy my stuff")
            const answerButtonRectArea = (
                purchasePrompt.cutscenePlayerStateById[
                    dialoguePrompt.id
                ] as DialoguePlayerState
            ).answerButtons[0].buttonRect
            CutsceneService.mousePressed({
                cutscene: purchasePrompt,
                mousePress: {
                    x: RectAreaService.centerX(answerButtonRectArea),
                    y: RectAreaService.centerY(answerButtonRectArea),
                    button: MouseButton.ACCEPT,
                },
                context: {},
            })

            expect(purchasePrompt.currentDirection.id).toBe("test passed")
        })

        it("should always use a DecisionTrigger if no answer is given", () => {
            const purchasePrompt = CutsceneService.new({
                directions: [
                    DialogueService.new({
                        id: "act serious",
                        speakerName: "your brain",
                        dialogueText: "Do not embarrass yourself. Easy.",
                    }),
                    DialogueService.new({
                        id: "test failed",
                        speakerName: "Fart",
                        dialogueText: "Ack! You farted! The test has failed!",
                    }),
                    DialogueService.new({
                        id: "test passes",
                        speakerName: "Handshake",
                        dialogueText:
                            "An easy handshake to set a professional meeting.",
                    }),
                ],
                decisionTriggers: [
                    CutsceneDecisionTriggerService.new({
                        sourceDialogId: "act serious",
                        destinationDialogId: "test passes",
                    }),
                ],
            })

            CutsceneService.start(
                purchasePrompt,
                mockResourceHandler(new MockedP5GraphicsBuffer()),
                {}
            )
            expect(purchasePrompt.currentDirection.id).toBe("act serious")
            CutsceneService.mousePressed({
                cutscene: purchasePrompt,
                mousePress: { x: 100, y: 100, button: MouseButton.ACCEPT },
                context: {},
            })

            expect(purchasePrompt.currentDirection.id).toBe("test passes")
        })

        it("when returning to an older dialogue box, should not persist previous answer upon mouse click", () => {
            const dialoguePrompt = DialogueService.new({
                id: "buy my stuff",
                speakerName: "Sales Clerk",
                dialogueText: "Would you like to buy this sword?",
                answers: ["Yes", "No"],
            })
            const purchasePrompt = CutsceneService.new({
                directions: [
                    dialoguePrompt,
                    DialogueService.new({
                        id: "reconsider",
                        speakerName: "Sales Clerk",
                        dialogueText: "I implore you to reconsider...",
                    }),
                    DialogueService.new({
                        id: "test failed",
                        speakerName: "No",
                        dialogueText:
                            "The cutscene should not have gotten here",
                    }),
                    DialogueService.new({
                        id: "test passes",
                        speakerName: "Clerk",
                        dialogueText: "Thank you for your business",
                    }),
                ],
                decisionTriggers: [
                    CutsceneDecisionTriggerService.new({
                        sourceDialogId: "buy my stuff",
                        sourceDialogAnswer: 0,
                        destinationDialogId: "test passes",
                    }),
                    CutsceneDecisionTriggerService.new({
                        sourceDialogId: "buy my stuff",
                        sourceDialogAnswer: 1,
                        destinationDialogId: "reconsider",
                    }),
                    CutsceneDecisionTriggerService.new({
                        sourceDialogId: "reconsider",
                        destinationDialogId: "buy my stuff",
                    }),
                ],
            })

            CutsceneService.start(
                purchasePrompt,
                mockResourceHandler(new MockedP5GraphicsBuffer()),
                {}
            )
            expect(purchasePrompt.currentDirection.id).toBe("buy my stuff")
            CutsceneService.mousePressed({
                cutscene: purchasePrompt,
                mousePress: {
                    x: RectAreaService.centerX(
                        (
                            purchasePrompt.cutscenePlayerStateById[
                                dialoguePrompt.id
                            ] as DialoguePlayerState
                        ).answerButtons[1].buttonRect
                    ),
                    y: RectAreaService.centerY(
                        (
                            purchasePrompt.cutscenePlayerStateById[
                                dialoguePrompt.id
                            ] as DialoguePlayerState
                        ).answerButtons[1].buttonRect
                    ),
                    button: MouseButton.ACCEPT,
                },
                context: {},
            })

            expect(purchasePrompt.currentDirection.id).toBe("reconsider")
            CutsceneService.mousePressed({
                cutscene: purchasePrompt,
                mousePress: { x: 0, y: 0, button: MouseButton.ACCEPT },
                context: {},
            })

            expect(purchasePrompt.currentDirection.id).toBe("buy my stuff")
            CutsceneService.mousePressed({
                cutscene: purchasePrompt,
                mousePress: { x: 0, y: 0, button: MouseButton.ACCEPT },
                context: {},
            })
            expect(purchasePrompt.currentDirection.id).toBe("buy my stuff")
        })
    })

    describe("fast-forward mode", () => {
        let waiterGreets: Dialogue
        let waiterHandsMenu: Dialogue
        let waiterAsks: Dialogue
        let dinnerDate: Cutscene

        beforeEach(() => {
            waiterGreets = DialogueService.new({
                id: "waiterGreets",
                speakerName: "Waiter",
                dialogueText: "Hello, I'm your Waiter for the evening.",
                animationDuration: 100,
            })

            waiterHandsMenu = DialogueService.new({
                id: "waiterHandsMenu",
                speakerName: "Waiter",
                dialogueText: "Here is your menu.",
                animationDuration: 100,
            })

            waiterAsks = DialogueService.new({
                id: "waiterAsks",
                speakerName: "Waiter",
                dialogueText: "Would you like some bread?",
                animationDuration: 100,
                answers: ["Yes", "No"],
            })

            dinnerDate = CutsceneService.new({
                directions: [waiterGreets, waiterHandsMenu],
            })
        })

        it("should enter fast-forward mode when you click on the fast forward button", () => {
            CutsceneService.start(dinnerDate, resourceHandler, {})
            CutsceneService.draw(dinnerDate, graphicsContext, resourceHandler)
            const fastForwardButton = getFastForwardButton(dinnerDate)
            CutsceneService.mousePressed({
                cutscene: dinnerDate,
                mousePress: {
                    x: RectAreaService.centerX(fastForwardButton.getArea()),
                    y: RectAreaService.centerY(fastForwardButton.getArea()),
                    button: MouseButton.ACCEPT,
                },
                context: {},
            })
            expect(CutsceneService.isFastForward(dinnerDate)).toBeTruthy()
        })

        it("should enter fast-forward mode when you press the cancel key", () => {
            CutsceneService.start(dinnerDate, resourceHandler, {})
            CutsceneService.draw(dinnerDate, graphicsContext, resourceHandler)

            CutsceneService.keyboardPressed({
                cutscene: dinnerDate,
                event: PlayerInputTestService.pressCancelKey(),
                context: {},
                playerInputState: PlayerInputStateService.newFromEnvironment(),
            })
            expect(CutsceneService.isFastForward(dinnerDate)).toBeTruthy()
        })

        it("should auto progress dialog messages when in fast-forward mode", () => {
            CutsceneService.start(dinnerDate, resourceHandler, {})
            CutsceneService.draw(dinnerDate, graphicsContext, resourceHandler)

            vi.spyOn(Date, "now").mockImplementation(() => 0)
            const fastForwardButton = getFastForwardButton(dinnerDate)
            CutsceneService.mousePressed({
                cutscene: dinnerDate,
                mousePress: {
                    x: RectAreaService.centerX(fastForwardButton.getArea()),
                    y: RectAreaService.centerY(fastForwardButton.getArea()),
                    button: MouseButton.ACCEPT,
                },
                context: {},
            })
            expect(CutsceneService.isFastForward(dinnerDate)).toBeTruthy()
            expect(dinnerDate.currentDirection).toEqual(waiterGreets)

            vi.spyOn(Date, "now").mockImplementation(() => 101)
            CutsceneService.update(dinnerDate, {})
            expect(dinnerDate.currentDirection).toEqual(waiterHandsMenu)
        })

        it("should stop fast-forward mode if the dialog is on the last action", () => {
            CutsceneService.start(dinnerDate, resourceHandler, {})
            CutsceneService.draw(dinnerDate, graphicsContext, resourceHandler)

            vi.spyOn(Date, "now").mockImplementation(() => 0)
            expect(CutsceneService.canFastForward(dinnerDate)).toBeTruthy()
            const fastForwardButton = getFastForwardButton(dinnerDate)
            CutsceneService.mousePressed({
                cutscene: dinnerDate,
                mousePress: {
                    x: RectAreaService.centerX(fastForwardButton.getArea()),
                    y: RectAreaService.centerY(fastForwardButton.getArea()),
                    button: MouseButton.ACCEPT,
                },
                context: {},
            })
            vi.spyOn(Date, "now").mockImplementation(() => 101)
            CutsceneService.update(dinnerDate, {})
            vi.spyOn(Date, "now").mockImplementation(() => 202)
            CutsceneService.update(dinnerDate, {})
            expect(dinnerDate.currentDirection).toEqual(waiterHandsMenu)
            expect(CutsceneService.isFastForward(dinnerDate)).toBeFalsy()
            expect(CutsceneService.canFastForward(dinnerDate)).toBeFalsy()
        })

        it("should stop fast-forward mode if the action requires an answer", () => {
            const dinnerDate = CutsceneService.new({
                directions: [
                    waiterGreets,
                    waiterHandsMenu,
                    waiterAsks,
                    DialogueService.new({
                        id: "testFailed",
                        dialogueText: "failure",
                    }),
                ],
                decisionTriggers: [
                    CutsceneDecisionTriggerService.new({
                        sourceDialogAnswer: 0,
                        sourceDialogId: "waiterAsks",
                        destinationDialogId: "does not matter",
                    }),
                ],
            })

            CutsceneService.start(dinnerDate, resourceHandler, {})
            CutsceneService.draw(dinnerDate, graphicsContext, resourceHandler)

            vi.spyOn(Date, "now").mockImplementation(() => 0)
            expect(dinnerDate.currentDirection.id).toBe("waiterGreets")
            const fastForwardButton: Button = getFastForwardButton(dinnerDate)
            CutsceneService.mousePressed({
                cutscene: dinnerDate,
                mousePress: {
                    x: RectAreaService.centerX(fastForwardButton.getArea()),
                    y: RectAreaService.centerY(fastForwardButton.getArea()),
                    button: MouseButton.ACCEPT,
                },
                context: {},
            })

            vi.spyOn(Date, "now").mockImplementation(() => 101)
            CutsceneService.update(dinnerDate, {})
            expect(dinnerDate.currentDirection.id).toBe("waiterHandsMenu")

            vi.spyOn(Date, "now").mockImplementation(() => 202)
            CutsceneService.update(dinnerDate, {})
            expect(dinnerDate.currentDirection.id).toBe("waiterAsks")

            vi.spyOn(Date, "now").mockImplementation(() => 303)
            CutsceneService.update(dinnerDate, {})
            expect(dinnerDate.currentDirection.id).toBe("waiterAsks")

            expect(CutsceneService.isFastForward(dinnerDate)).toBeFalsy()
            expect(CutsceneService.canFastForward(dinnerDate)).toBeFalsy()
        })
    })

    it("can start after loading if no actions require loading", () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [splash1, frontDoorGreeting],
        })

        CutsceneService.loadResources(
            dinnerDate,
            mockResourceHandler(new MockedP5GraphicsBuffer())
        )
        expect(
            CutsceneService.hasLoaded(
                dinnerDate,
                mockResourceHandler(new MockedP5GraphicsBuffer())
            )
        ).toBeTruthy()
        const error = CutsceneService.start(
            dinnerDate,
            mockResourceHandler(new MockedP5GraphicsBuffer()),
            {}
        )
        expect(error).toBeUndefined()
        expect(CutsceneService.isInProgress(dinnerDate)).toBeTruthy()
    })

    it("can load required resources and indicate if it is ready to load", () => {
        const restaurantEntrance = SplashScreenService.new({
            id: "splash1",
            screenImageResourceKey: "restaurant_entrance",
        })

        const graphicsContext = new MockedP5GraphicsBuffer()

        const handler = ResourceHandlerService.new({
            graphics: graphicsContext,
            imageLoader: new StubImmediateLoader(graphicsContext),
            resourceLocators: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "restaurant_entrance",
                },
            ],
        })

        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [restaurantEntrance],
        })

        CutsceneService.loadResources(dinnerDate, handler)
        CutsceneService.setResources(dinnerDate, handler)

        expect(CutsceneService.hasLoaded(dinnerDate, handler)).toBeTruthy()
        const error = CutsceneService.start(dinnerDate, handler, {})
        expect(error).toBeUndefined()
        expect(CutsceneService.isInProgress(dinnerDate)).toBeTruthy()
    })

    it("will pass on the TextSubstitution context when starting a cutscene", () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [frontDoorGreeting],
        })
        const battleState: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                }),
            })

        const frontDoorPlayer = dinnerDate.cutscenePlayerStateById[
            frontDoorGreeting.id
        ] as DialoguePlayerState

        const greetingSpy = vi.spyOn(DialoguePlayerService, "start")
        CutsceneService.start(
            dinnerDate,
            mockResourceHandler(new MockedP5GraphicsBuffer()),
            { battleOrchestratorState: battleState }
        )
        expect(greetingSpy).toBeCalledWith(frontDoorPlayer, {
            battleOrchestratorState: battleState,
        })
    })
})

const getFastForwardButton = (cutscene: Cutscene): Button =>
    cutscene.uiData.getUIObjects()?.fastForwardButton
