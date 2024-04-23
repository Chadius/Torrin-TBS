import {DialoguePlayerService, DialoguePlayerState} from "./dialogue/dialogueBoxPlayer";
import {SplashScreenPlayerState} from "./splashScreenPlayer";
import {Cutscene, CutsceneService} from "./cutscene";
import {CutsceneDecisionTriggerService} from "./DecisionTrigger";
import {ResourceHandlerService, ResourceType} from "../resource/resourceHandler";
import {StubImmediateLoader} from "../resource/resourceHandlerTestUtils";
import {BattleOrchestratorState, BattleOrchestratorStateService} from "../battle/orchestrator/battleOrchestratorState";
import {BattleStateService} from "../battle/orchestrator/battleState";
import {SplashScreen, SplashScreenService} from "./splashScreen";
import {Dialogue, DialogueService} from "./dialogue/dialogue";
import {MockedP5GraphicsContext, mockResourceHandler} from "../utils/test/mocks";
import {RectAreaService} from "../ui/rectArea";

describe('Cutscene', () => {
    let splash1: SplashScreen;
    let splash2: SplashScreen;
    let frontDoorGreeting: Dialogue;
    let hostGreeting: Dialogue;

    beforeEach(() => {
        splash1 = SplashScreenService.new({
            id: "splash1",
            screenImageResourceKey: undefined,
        });

        splash2 = SplashScreenService.new({
            id: "splash2",
            screenImageResourceKey: undefined,
        });

        frontDoorGreeting = DialogueService.new({
            id: "1",
            speakerName: "Doorman",
            speakerText: "Welcome, come inside",
            animationDuration: 0,
            speakerPortraitResourceKey: undefined,
        });

        hostGreeting = DialogueService.new({
            id: "1",
            speakerName: "Host",
            speakerText: "Someone will lead you to your table shortly.",
            animationDuration: 0,
            speakerPortraitResourceKey: undefined,
        })
    });

    it('should not start upon construction', () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [
                frontDoorGreeting
            ]
        });

        expect(CutsceneService.isInProgress(dinnerDate)).toBeFalsy();
    });

    it('should start with the first action when started', () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [
                frontDoorGreeting
            ]
        });

        CutsceneService.start(dinnerDate, mockResourceHandler(), {});
        expect(CutsceneService.isInProgress(dinnerDate)).toBeTruthy();
        expect(dinnerDate.currentDirection).toEqual(frontDoorGreeting);
    });

    it('should stop when requested', () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [
                frontDoorGreeting
            ]
        });

        CutsceneService.start(dinnerDate, mockResourceHandler(), {});
        CutsceneService.stop(dinnerDate);
        expect(CutsceneService.isInProgress(dinnerDate)).toBeFalsy();
    });

    it('should move to the next action when the mouse clicks', () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [
                splash1,
                splash2
            ]
        });

        CutsceneService.start(dinnerDate, mockResourceHandler(), {});

        expect(dinnerDate.currentDirection).toEqual(splash1);
        CutsceneService.mouseClicked(dinnerDate, 100, 100, {});
        expect(dinnerDate.currentDirection).toEqual(splash2);
    });

    it('should be finished when all of the actions are finished', () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [
                frontDoorGreeting,
                hostGreeting
            ]
        });

        CutsceneService.start(dinnerDate, mockResourceHandler(), {});
        expect(CutsceneService.isInProgress(dinnerDate)).toBeTruthy();

        expect(dinnerDate.currentDirection).toEqual(frontDoorGreeting);
        CutsceneService.mouseClicked(dinnerDate, 100, 100, {});

        expect(dinnerDate.currentDirection).toEqual(hostGreeting);
        CutsceneService.mouseClicked(dinnerDate, 100, 100, {});

        expect(dinnerDate.currentDirection).toBeUndefined();
        expect(CutsceneService.isInProgress(dinnerDate)).toBeFalsy();
        expect(CutsceneService.isFinished(dinnerDate)).toBeTruthy();
    });

    describe('DecisionTriggers', () => {
        it('should use Answer based DecisionTriggers to select a different dialog when it is triggered', () => {
            const dialoguePrompt = DialogueService.new({
                id: "buy my stuff",
                speakerName: "Sales Clerk",
                speakerText: "Would you like to buy this sword?",
                answers: ["Yes", "No"],
                speakerPortraitResourceKey: undefined,
            });
            const purchasePrompt = CutsceneService.new({
                directions: [
                    dialoguePrompt,
                    DialogueService.new({
                        id: "test failed",
                        speakerName: "No",
                        speakerText: "The cutscene should not have gotten here",
                        speakerPortraitResourceKey: undefined,
                    }),
                    DialogueService.new({
                        id: "test passes",
                        speakerName: "Clerk",
                        speakerText: "Thank you for your business",
                        speakerPortraitResourceKey: undefined,
                    }),
                ],
                decisionTriggers: [
                    CutsceneDecisionTriggerService.new({
                        sourceDialogId: "buy my stuff",
                        sourceDialogAnswer: 0,
                        destinationDialogId: "test passes",
                    })
                ],
            });

            CutsceneService.start(purchasePrompt, mockResourceHandler(), {});
            expect(purchasePrompt.currentDirection.id).toBe("buy my stuff");
            CutsceneService.mouseClicked(
                purchasePrompt,
                RectAreaService.centerX((purchasePrompt.cutscenePlayerStateById[dialoguePrompt.id] as DialoguePlayerState).answerButtons[0].buttonRect),
                RectAreaService.centerY((purchasePrompt.cutscenePlayerStateById[dialoguePrompt.id] as DialoguePlayerState).answerButtons[0].buttonRect),
                {}
            );

            expect(purchasePrompt.currentDirection.id).toBe("test passes");
        });

        it('should ignore Answer based DecisionTriggers if a different answer is selected', () => {
            const dialoguePrompt = DialogueService.new({
                id: "buy my stuff",
                speakerName: "Sales Clerk",
                speakerText: "Would you like to buy this sword?",
                answers: ["Yes", "No"],
            });
            const purchasePrompt = CutsceneService.new({
                directions: [
                    dialoguePrompt,
                    DialogueService.new({
                        id: "test passed",
                        speakerName: "Clerk",
                        speakerText: "Okay, here you go!",
                    }),
                    DialogueService.new({
                        id: "test failed",
                        speakerName: "No",
                        speakerText: "Test should not have gone here",
                    }),
                ],
                decisionTriggers: [
                    CutsceneDecisionTriggerService.new({
                        sourceDialogId: "buy my stuff",
                        sourceDialogAnswer: 1,
                        destinationDialogId: "test failed",
                    })
                ],
            });

            CutsceneService.start(purchasePrompt, mockResourceHandler(), {});
            expect(purchasePrompt.currentDirection.id).toBe("buy my stuff");
            CutsceneService.mouseClicked(
                purchasePrompt,
                RectAreaService.centerX((purchasePrompt.cutscenePlayerStateById[dialoguePrompt.id] as DialoguePlayerState).answerButtons[0].buttonRect),
                RectAreaService.centerY((purchasePrompt.cutscenePlayerStateById[dialoguePrompt.id] as DialoguePlayerState).answerButtons[0].buttonRect),
                {}
            );

            expect(purchasePrompt.currentDirection.id).toBe("test passed");
        });

        it('should always use a DecisionTrigger if no answer is given', () => {
            const purchasePrompt = CutsceneService.new({
                directions: [
                    DialogueService.new({
                        id: "act serious",
                        speakerName: "your brain",
                        speakerText: "Do not embarrass yourself. Easy.",
                    }),
                    DialogueService.new({
                        id: "test failed",
                        speakerName: "Fart",
                        speakerText: "Ack! You farted! The test has failed!",
                    }),
                    DialogueService.new({
                        id: "test passes",
                        speakerName: "Handshake",
                        speakerText: "An easy handshake to set a professional meeting.",
                    }),
                ],
                decisionTriggers: [
                    CutsceneDecisionTriggerService.new({
                        sourceDialogId: "act serious",
                        destinationDialogId: "test passes",
                    })
                ],
            });

            CutsceneService.start(purchasePrompt, mockResourceHandler(), {});
            expect(purchasePrompt.currentDirection.id).toBe("act serious");
            CutsceneService.mouseClicked(purchasePrompt, 100, 100, {});

            expect(purchasePrompt.currentDirection.id).toBe("test passes");
        });

        it('when returning to an older dialogue box, should not persist previous answer upon mouse click', () => {
            const dialoguePrompt = DialogueService.new({
                id: "buy my stuff",
                speakerName: "Sales Clerk",
                speakerText: "Would you like to buy this sword?",
                answers: ["Yes", "No"],
            });
            const purchasePrompt = CutsceneService.new({
                directions: [
                    dialoguePrompt,
                    DialogueService.new({
                        id: "reconsider",
                        speakerName: "Sales Clerk",
                        speakerText: "I implore you to reconsider...",
                    }),
                    DialogueService.new({
                        id: "test failed",
                        speakerName: "No",
                        speakerText: "The cutscene should not have gotten here",
                    }),
                    DialogueService.new({
                        id: "test passes",
                        speakerName: "Clerk",
                        speakerText: "Thank you for your business",
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
                        destinationDialogId: "buy my stuff"
                    })
                ],
            });

            CutsceneService.start(purchasePrompt, mockResourceHandler(), {});
            expect(purchasePrompt.currentDirection.id).toBe("buy my stuff");
            CutsceneService.mouseClicked(
                purchasePrompt,
                RectAreaService.centerX((purchasePrompt.cutscenePlayerStateById[dialoguePrompt.id] as DialoguePlayerState).answerButtons[1].buttonRect),
                RectAreaService.centerY((purchasePrompt.cutscenePlayerStateById[dialoguePrompt.id] as DialoguePlayerState).answerButtons[1].buttonRect),
                {}
            );

            expect(purchasePrompt.currentDirection.id).toBe("reconsider");
            CutsceneService.mouseClicked(purchasePrompt, 0, 0, {});

            expect(purchasePrompt.currentDirection.id).toBe("buy my stuff");
            CutsceneService.mouseClicked(purchasePrompt, 0, 0, {});
            expect(purchasePrompt.currentDirection.id).toBe("buy my stuff");
        });
    });

    describe('fast-forward mode', () => {
        let waiterGreets: Dialogue;
        let waiterHandsMenu: Dialogue;
        let waiterAsks: Dialogue;

        beforeEach(() => {
            waiterGreets = DialogueService.new({
                id: "waiterGreets",
                speakerName: "Waiter",
                speakerText: "Hello, I'm your Waiter for the evening.",
                animationDuration: 100,
            });

            waiterHandsMenu = DialogueService.new({
                id: "waiterHandsMenu",
                speakerName: "Waiter",
                speakerText: "Here is your menu.",
                animationDuration: 100,
            });

            waiterAsks = DialogueService.new({
                id: "waiterAsks",
                speakerName: "Waiter",
                speakerText: "Would you like some bread?",
                animationDuration: 100,
                answers: ["Yes", "No"]
            });
        });

        it('should enter fast-forward mode when you click on the fast forward button', () => {
            const dinnerDate = CutsceneService.new({
                directions: [
                    waiterGreets,
                    waiterHandsMenu
                ],
            });

            CutsceneService.start(dinnerDate, mockResourceHandler(), {});
            CutsceneService.mouseClicked(
                dinnerDate,
                RectAreaService.centerX(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                RectAreaService.centerY(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                {}
            );
            expect(CutsceneService.isFastForward(dinnerDate)).toBeTruthy();
        });

        it('should auto progress dialog messages when in fast-forward mode', () => {
            const dinnerDate = CutsceneService.new({
                directions: [
                    waiterGreets,
                    waiterHandsMenu
                ],
            });

            CutsceneService.start(dinnerDate, mockResourceHandler(), {});
            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            CutsceneService.mouseClicked(
                dinnerDate,
                RectAreaService.centerX(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                RectAreaService.centerY(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                {}
            );
            expect(CutsceneService.isFastForward(dinnerDate)).toBeTruthy();
            expect(dinnerDate.currentDirection).toEqual(waiterGreets);

            jest.spyOn(Date, 'now').mockImplementation(() => 101);
            CutsceneService.update(dinnerDate, {});
            expect(dinnerDate.currentDirection).toEqual(waiterHandsMenu);
        });

        it('should stop fast-forward mode if the dialog is on the last action', () => {
            const dinnerDate = CutsceneService.new({
                directions: [
                    waiterGreets,
                    waiterHandsMenu
                ],
            });

            CutsceneService.start(dinnerDate, mockResourceHandler(), {});
            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            expect(CutsceneService.canFastForward(dinnerDate)).toBeTruthy();
            CutsceneService.mouseClicked(
                dinnerDate,
                RectAreaService.centerX(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                RectAreaService.centerY(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                {}
            );
            jest.spyOn(Date, 'now').mockImplementation(() => 101);
            CutsceneService.update(dinnerDate, {});
            jest.spyOn(Date, 'now').mockImplementation(() => 202);
            CutsceneService.update(dinnerDate, {});
            expect(dinnerDate.currentDirection).toEqual(waiterHandsMenu);
            expect(CutsceneService.isFastForward(dinnerDate)).toBeFalsy();
            expect(CutsceneService.canFastForward(dinnerDate)).toBeFalsy();
        });

        it('should stop fast-forward mode if the action requires an answer', () => {
            const dinnerDate = CutsceneService.new({
                directions: [
                    waiterGreets,
                    waiterHandsMenu,
                    waiterAsks,
                    DialogueService.new({
                        id: "testFailed",
                        speakerText: "failure",
                    })
                ],
                decisionTriggers: [
                    CutsceneDecisionTriggerService.new({
                        sourceDialogAnswer: 0,
                        sourceDialogId: "waiterAsks",
                        destinationDialogId: "does not matter"
                    })
                ],
            });

            CutsceneService.start(dinnerDate, mockResourceHandler(), {});
            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            expect(dinnerDate.currentDirection.id).toBe("waiterGreets");
            CutsceneService.mouseClicked(
                dinnerDate,
                RectAreaService.centerX(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                RectAreaService.centerY(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                {}
            );

            jest.spyOn(Date, 'now').mockImplementation(() => 101);
            CutsceneService.update(dinnerDate, {});
            expect(dinnerDate.currentDirection.id).toBe("waiterHandsMenu");

            jest.spyOn(Date, 'now').mockImplementation(() => 202);
            CutsceneService.update(dinnerDate, {});
            expect(dinnerDate.currentDirection.id).toBe("waiterAsks");

            jest.spyOn(Date, 'now').mockImplementation(() => 303);
            CutsceneService.update(dinnerDate, {});
            expect(dinnerDate.currentDirection.id).toBe("waiterAsks");

            expect(CutsceneService.isFastForward(dinnerDate)).toBeFalsy();
            expect(CutsceneService.canFastForward(dinnerDate)).toBeFalsy();
        });
    });

    it('can start after loading if no actions require loading', () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [
                splash1,
                frontDoorGreeting
            ]
        });

        CutsceneService.loadResources(dinnerDate, mockResourceHandler());
        expect(CutsceneService.hasLoaded(dinnerDate, mockResourceHandler())).toBeTruthy();
        const error = CutsceneService.start(dinnerDate, mockResourceHandler(), {});
        expect(error).toBeUndefined();
        expect(CutsceneService.isInProgress(dinnerDate)).toBeTruthy();
    });

    it('can load required resources and indicate if it is ready to load', () => {
        const restaurantEntrance = SplashScreenService.new({
            id: "splash1",
            screenImageResourceKey: "restaurant_entrance"
        })

        const handler = ResourceHandlerService.new({
            graphicsContext: new MockedP5GraphicsContext(),
            imageLoader: new StubImmediateLoader(),
            resourceLocators: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "restaurant_entrance",
                }
            ]
        });

        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [
                restaurantEntrance
            ]
        });

        CutsceneService.loadResources(dinnerDate, handler);
        CutsceneService.setResources(dinnerDate, handler);

        expect((dinnerDate.cutscenePlayerStateById[restaurantEntrance.id] as SplashScreenPlayerState).screenImage).toBeTruthy();

        expect(CutsceneService.hasLoaded(dinnerDate, handler)).toBeTruthy();
        const error = CutsceneService.start(dinnerDate, handler, {});
        expect(error).toBeUndefined();
        expect(CutsceneService.isInProgress(dinnerDate)).toBeTruthy();
    });

    it('will pass on the TextSubstitution context when starting a cutscene', () => {
        const dinnerDate: Cutscene = CutsceneService.new({
            directions: [
                frontDoorGreeting
            ]
        });
        const battleState: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({

            battleState: BattleStateService.newBattleState({
                campaignId: "test campaign",
                missionId: "test mission",
            }),
        });

        const frontDoorPlayer = (dinnerDate.cutscenePlayerStateById[frontDoorGreeting.id] as DialoguePlayerState);

        const greetingSpy = jest.spyOn(DialoguePlayerService, "start");
        CutsceneService.start(dinnerDate, mockResourceHandler(), {battleOrchestratorState: battleState});
        expect(greetingSpy).toBeCalledWith(
            frontDoorPlayer,
            {
                battleOrchestratorState: battleState,
            }
        );
    });
});
