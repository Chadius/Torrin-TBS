import {DialoguePlayerService, DialoguePlayerState} from "./dialogue/dialogueBoxPlayer";
import {SplashScreenPlayerState} from "./splashScreenPlayer";
import {Cutscene} from "./cutscene";
import {CutsceneDecisionTriggerService} from "./DecisionTrigger";
import {ResourceHandler, ResourceType} from "../resource/resourceHandler";
import {StubImmediateLoader} from "../resource/resourceHandlerTestUtils";
import {BattleOrchestratorState, BattleOrchestratorStateService} from "../battle/orchestrator/battleOrchestratorState";
import {BattleStateService} from "../battle/orchestrator/battleState";
import {SplashScreen, SplashScreenService} from "./splashScreen";
import {Dialogue, DialogueService} from "./dialogue/dialogue";
import {mockResourceHandler} from "../utils/test/mocks";
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
        const dinnerDate = new Cutscene({
            directions: [
                frontDoorGreeting
            ],
            resourceHandler: mockResourceHandler(),
        });

        expect(dinnerDate.isInProgress()).toBeFalsy();
    });

    it('should start with the first action when started', () => {
        const dinnerDate = new Cutscene({
            directions: [
                frontDoorGreeting
            ],
            resourceHandler: mockResourceHandler(),
        });

        dinnerDate.start({});
        expect(dinnerDate.isInProgress()).toBeTruthy();
        expect(dinnerDate.getCurrentDirection()).toBe(frontDoorGreeting);
    });

    it('should stop when requested', () => {
        const dinnerDate = new Cutscene({
            directions: [
                frontDoorGreeting
            ],
            resourceHandler: mockResourceHandler(),
        });

        dinnerDate.start({});
        dinnerDate.stop();
        expect(dinnerDate.isInProgress()).toBeFalsy();
    });

    it('should move to the next action when the mouse clicks', () => {
        const dinnerDate = new Cutscene({
            directions: [
                splash1,
                splash2
            ],
            resourceHandler: mockResourceHandler(),
        });

        dinnerDate.start({});
        expect(dinnerDate.getCurrentDirection()).toBe(splash1);
        dinnerDate.mouseClicked(100, 100, {});
        expect(dinnerDate.getCurrentDirection()).toBe(splash2);
    });

    it('should be finished when all of the actions are finished', () => {
        const dinnerDate = new Cutscene({
            directions: [
                frontDoorGreeting,
                hostGreeting
            ],
            resourceHandler: mockResourceHandler(),
        });

        dinnerDate.start({});
        expect(dinnerDate.isInProgress()).toBeTruthy();

        expect(dinnerDate.getCurrentDirection()).toBe(frontDoorGreeting);
        dinnerDate.mouseClicked(100, 100, {});

        expect(dinnerDate.getCurrentDirection()).toBe(hostGreeting);
        dinnerDate.mouseClicked(100, 100, {});

        expect(dinnerDate.getCurrentDirection()).toBeUndefined();
        expect(dinnerDate.isInProgress()).toBeFalsy();
        expect(dinnerDate.isFinished()).toBeTruthy();
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
            const purchasePrompt = new Cutscene({
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
                resourceHandler: mockResourceHandler(),
            });

            purchasePrompt.start({});
            expect(purchasePrompt.getCurrentDirection().id).toBe("buy my stuff");
            purchasePrompt.mouseClicked(
                RectAreaService.centerX((purchasePrompt.cutscenePlayerStateById[dialoguePrompt.id] as DialoguePlayerState).answerButtons[0].buttonRect),
                RectAreaService.centerY((purchasePrompt.cutscenePlayerStateById[dialoguePrompt.id] as DialoguePlayerState).answerButtons[0].buttonRect),
                {}
            );

            expect(purchasePrompt.getCurrentDirection().id).toBe("test passes");
        });

        it('should ignore Answer based DecisionTriggers if a different answer is selected', () => {
            const dialoguePrompt = DialogueService.new({
                id: "buy my stuff",
                speakerName: "Sales Clerk",
                speakerText: "Would you like to buy this sword?",
                answers: ["Yes", "No"],
            });
            const purchasePrompt = new Cutscene({
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
                resourceHandler: mockResourceHandler(),
            });

            purchasePrompt.start({});
            expect(purchasePrompt.getCurrentDirection().id).toBe("buy my stuff");
            purchasePrompt.mouseClicked(
                RectAreaService.centerX((purchasePrompt.cutscenePlayerStateById[dialoguePrompt.id] as DialoguePlayerState).answerButtons[0].buttonRect),
                RectAreaService.centerY((purchasePrompt.cutscenePlayerStateById[dialoguePrompt.id] as DialoguePlayerState).answerButtons[0].buttonRect),
                {}
            );

            expect(purchasePrompt.getCurrentDirection().id).toBe("test passed");
        });

        it('should always use a DecisionTrigger if no answer is given', () => {
            const purchasePrompt = new Cutscene({
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
                resourceHandler: mockResourceHandler(),
            });

            purchasePrompt.start({});
            expect(purchasePrompt.getCurrentDirection().id).toBe("act serious");
            purchasePrompt.mouseClicked(100, 100, {});

            expect(purchasePrompt.getCurrentDirection().id).toBe("test passes");
        });

        it('when returning to an older dialogue box, should not persist previous answer upon mouse click', () => {
            const dialoguePrompt = DialogueService.new({
                id: "buy my stuff",
                speakerName: "Sales Clerk",
                speakerText: "Would you like to buy this sword?",
                answers: ["Yes", "No"],
            });
            const purchasePrompt = new Cutscene({
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
                resourceHandler: mockResourceHandler(),
            });

            purchasePrompt.start({});
            expect(purchasePrompt.getCurrentDirection().id).toBe("buy my stuff");
            purchasePrompt.mouseClicked(
                RectAreaService.centerX((purchasePrompt.cutscenePlayerStateById[dialoguePrompt.id] as DialoguePlayerState).answerButtons[1].buttonRect),
                RectAreaService.centerY((purchasePrompt.cutscenePlayerStateById[dialoguePrompt.id] as DialoguePlayerState).answerButtons[1].buttonRect),
                {}
            );

            expect(purchasePrompt.getCurrentDirection().id).toBe("reconsider");
            purchasePrompt.mouseClicked(0, 0, {});

            expect(purchasePrompt.getCurrentDirection().id).toBe("buy my stuff");
            purchasePrompt.mouseClicked(0, 0, {});
            expect(purchasePrompt.getCurrentDirection().id).toBe("buy my stuff");
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
            const dinnerDate = new Cutscene({
                directions: [
                    waiterGreets,
                    waiterHandsMenu
                ],
                resourceHandler: mockResourceHandler(),
            });

            dinnerDate.start({});
            dinnerDate.mouseClicked(
                RectAreaService.centerX(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                RectAreaService.centerY(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                {}
            );
            expect(dinnerDate.isFastForward()).toBeTruthy();
        });

        it('should auto progress dialog messages when in fast-forward mode', () => {
            const dinnerDate = new Cutscene({
                directions: [
                    waiterGreets,
                    waiterHandsMenu
                ],
                resourceHandler: mockResourceHandler(),
            });

            dinnerDate.start({});
            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            dinnerDate.mouseClicked(
                RectAreaService.centerX(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                RectAreaService.centerY(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                {}
            );
            expect(dinnerDate.isFastForward()).toBeTruthy();
            expect(dinnerDate.getCurrentDirection()).toBe(waiterGreets);

            jest.spyOn(Date, 'now').mockImplementation(() => 101);
            dinnerDate.update({});
            expect(dinnerDate.getCurrentDirection()).toBe(waiterHandsMenu);
        });

        it('should stop fast-forward mode if the dialog is on the last action', () => {
            const dinnerDate = new Cutscene({
                directions: [
                    waiterGreets,
                    waiterHandsMenu
                ],
                resourceHandler: mockResourceHandler(),
            });

            dinnerDate.start({});
            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            expect(dinnerDate.canFastForward()).toBeTruthy();
            dinnerDate.mouseClicked(
                RectAreaService.centerX(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                RectAreaService.centerY(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                {}
            );
            jest.spyOn(Date, 'now').mockImplementation(() => 101);
            dinnerDate.update({});
            jest.spyOn(Date, 'now').mockImplementation(() => 202);
            dinnerDate.update({});
            expect(dinnerDate.getCurrentDirection()).toBe(waiterHandsMenu);
            expect(dinnerDate.isFastForward()).toBeFalsy();
            expect(dinnerDate.canFastForward()).toBeFalsy();
        });

        it('should stop fast-forward mode if the action requires an answer', () => {
            const dinnerDate = new Cutscene({
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
                resourceHandler: mockResourceHandler(),
            });

            dinnerDate.start({});
            jest.spyOn(Date, 'now').mockImplementation(() => 0);
            expect(dinnerDate.getCurrentDirection().id).toBe("waiterGreets");
            dinnerDate.mouseClicked(
                RectAreaService.centerX(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                RectAreaService.centerY(dinnerDate.fastForwardButton.readyLabel.rectangle.area),
                {}
            );

            jest.spyOn(Date, 'now').mockImplementation(() => 101);
            dinnerDate.update({});
            expect(dinnerDate.getCurrentDirection().id).toBe("waiterHandsMenu");

            jest.spyOn(Date, 'now').mockImplementation(() => 202);
            dinnerDate.update({});
            expect(dinnerDate.getCurrentDirection().id).toBe("waiterAsks");

            jest.spyOn(Date, 'now').mockImplementation(() => 303);
            dinnerDate.update({});
            expect(dinnerDate.getCurrentDirection().id).toBe("waiterAsks");

            expect(dinnerDate.isFastForward()).toBeFalsy();
            expect(dinnerDate.canFastForward()).toBeFalsy();
        });
    });

    it('can start after loading if no actions require loading', () => {
        const dinnerDate = new Cutscene({
            directions: [
                splash1,
                frontDoorGreeting
            ],
            resourceHandler: mockResourceHandler(),
        });

        dinnerDate.loadResources();
        expect(dinnerDate.hasLoaded()).toBeTruthy();
        const error = dinnerDate.start({});
        expect(error).toBeUndefined();
        expect(dinnerDate.isInProgress()).toBeTruthy();
    });

    it('can load required resources and indicate if it is ready to load', () => {
        const restaurantEntrance = SplashScreenService.new({
            id: "splash1",
            screenImageResourceKey: "restaurant_entrance"
        })

        const handler = new ResourceHandler({
            imageLoader: new StubImmediateLoader(),
            allResources: [
                {
                    type: ResourceType.IMAGE,
                    path: "path/to/image",
                    key: "restaurant_entrance",
                }
            ]
        });

        const dinnerDate = new Cutscene({
            directions: [
                restaurantEntrance
            ],
            resourceHandler: handler,
        });

        dinnerDate.loadResources();

        dinnerDate.setResources();
        expect((dinnerDate.cutscenePlayerStateById[restaurantEntrance.id] as SplashScreenPlayerState).screenImage).toBeTruthy();

        expect(dinnerDate.hasLoaded()).toBeTruthy();
        const error = dinnerDate.start({});
        expect(error).toBeUndefined();
        expect(dinnerDate.isInProgress()).toBeTruthy();
    });

    it('will pass on the TextSubstitution context when starting a cutscene', () => {
        const dinnerDate = new Cutscene({
            directions: [
                frontDoorGreeting
            ],
            resourceHandler: mockResourceHandler(),
        });
        const battleState: BattleOrchestratorState = BattleOrchestratorStateService.newOrchestratorState({
            squaddieRepository: undefined,
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
            }),
        });

        const frontDoorPlayer = (dinnerDate.cutscenePlayerStateById[frontDoorGreeting.id] as DialoguePlayerState);

        const greetingSpy = jest.spyOn(DialoguePlayerService, "start");
        dinnerDate.start({battleOrchestratorState: battleState});
        expect(greetingSpy).toBeCalledWith(
            frontDoorPlayer,
            {
                battleOrchestratorState: battleState,
            }
        );
    });
});
