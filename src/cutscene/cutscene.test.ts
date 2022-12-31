import {DialogueBox} from "./dialogueBox";
import {SplashScreen} from "./splashScreen";
import {Cutscene} from "./cutscene";
import {DecisionTrigger} from "./DecisionTrigger";
import {ResourceHandler, ResourceType} from "../resource/resourceHandler";
import {stubImmediateLoader} from "../resource/resourceHandlerTestUtils";

describe('Cutscene', () => {
  const splash1 = new SplashScreen({id: "splash1"})
  const splash2 = new SplashScreen({id: "splash2"})

  const frontDoorGreeting = new DialogueBox({
    id: "1",
    name: "Doorman",
    text: "Welcome, come inside",
    animationDuration: 0
  });
  const hostGreeting = new DialogueBox({
    id: "1",
    name: "Host",
    text: "Someone will lead you to your table shortly.",
    animationDuration: 0
  });

  it('should not start upon construction', () => {
    const dinnerDate = new Cutscene({
      actions: [
        frontDoorGreeting
      ]
    });

    expect(dinnerDate.isInProgress()).toBeFalsy();
  });

  it('should start with the first action when started', () => {
    const dinnerDate = new Cutscene({
      actions: [
        frontDoorGreeting
      ]
    });

    dinnerDate.start();
    expect(dinnerDate.isInProgress()).toBeTruthy();
    expect(dinnerDate.getCurrentAction()).toBe(frontDoorGreeting);
  });

  it('should stop when requested', () => {
    const dinnerDate = new Cutscene({
      actions: [
        frontDoorGreeting
      ]
    });

    dinnerDate.start();
    dinnerDate.stop();
    expect(dinnerDate.isInProgress()).toBeFalsy();
  });

  it('should move to the next action when the mouse clicks', () => {
    const dinnerDate = new Cutscene({
      actions: [
        splash1,
        splash2
      ]
    });

    dinnerDate.start();
    expect(dinnerDate.getCurrentAction()).toBe(splash1);
    dinnerDate.mouseClicked(100, 100);
    expect(dinnerDate.getCurrentAction()).toBe(splash2);
  });

  it('should be finished when all of the actions are finished', () => {
    const dinnerDate = new Cutscene({
      actions: [
        frontDoorGreeting,
        hostGreeting
      ]
    });

    dinnerDate.start();
    expect(dinnerDate.isInProgress()).toBeTruthy();

    expect(dinnerDate.getCurrentAction()).toBe(frontDoorGreeting);
    dinnerDate.mouseClicked(100, 100);

    expect(dinnerDate.getCurrentAction()).toBe(hostGreeting);
    dinnerDate.mouseClicked(100, 100);

    expect(dinnerDate.getCurrentAction()).toBeUndefined();
    expect(dinnerDate.isInProgress()).toBeFalsy();
    expect(dinnerDate.isFinished()).toBeTruthy();
  });

  describe('DecisionTriggers', () => {
    it('should use Answer based DecisionTriggers to select a different dialog when it is triggered', () => {
      const purchasePrompt = new Cutscene({
        actions: [
          new DialogueBox({
            id: "buy my stuff",
            name: "Sales Clerk",
            text: "Would you like to buy this sword?",
            answers: ["Yes", "No"],
            screenDimensions: [1000, 800]
          }),
          new DialogueBox({
            id: "test failed",
            name: "No",
            text: "The cutscene should not have gotten here",
          }),
          new DialogueBox({
            id: "test passes",
            name: "Clerk",
            text: "Thank you for your business",
          }),
        ],
        decisionTriggers: [
          new DecisionTrigger({
            source_dialog_id: "buy my stuff",
            source_dialog_answer: 0,
            destination_dialog_id: "test passes",
          })
        ]
      });

      purchasePrompt.start();
      expect(purchasePrompt.getCurrentAction().getId()).toBe("buy my stuff");
      purchasePrompt.mouseClicked(0, 800);

      expect(purchasePrompt.getCurrentAction().getId()).toBe("test passes");
    });

    it('should ignore Answer based DecisionTriggers if a different answer is selected', () => {
      const purchasePrompt = new Cutscene({
        actions: [
          new DialogueBox({
            id: "buy my stuff",
            name: "Sales Clerk",
            text: "Would you like to buy this sword?",
            answers: ["Yes", "No"],
            screenDimensions: [1000, 800]
          }),
          new DialogueBox({
            id: "test passed",
            name: "Clerk",
            text: "Okay, here you go!",
          }),
          new DialogueBox({
            id: "test failed",
            name: "No",
            text: "Test should not have gone here",
          }),
        ],
        decisionTriggers: [
          new DecisionTrigger({
            source_dialog_id: "buy my stuff",
            source_dialog_answer: 1,
            destination_dialog_id: "test failed",
          })
        ]
      });

      purchasePrompt.start();
      expect(purchasePrompt.getCurrentAction().getId()).toBe("buy my stuff");
      purchasePrompt.mouseClicked(0, 800);

      expect(purchasePrompt.getCurrentAction().getId()).toBe("test passed");
    });

    it('should always use a DecisionTrigger if no answer is given', () => {
      const purchasePrompt = new Cutscene({
        actions: [
          new DialogueBox({
            id: "act serious",
            name: "your brain",
            text: "Do not embarrass yourself. Easy.",
            screenDimensions: [1000, 800]
          }),
          new DialogueBox({
            id: "test failed",
            name: "Fart",
            text: "Ack! You farted! The test has failed!",
          }),
          new DialogueBox({
            id: "test passes",
            name: "Handshake",
            text: "An easy handshake to set a professional meeting.",
          }),
        ],
        decisionTriggers: [
          new DecisionTrigger({
            source_dialog_id: "act serious",
            destination_dialog_id: "test passes",
          })
        ]
      });

      purchasePrompt.start();
      expect(purchasePrompt.getCurrentAction().getId()).toBe("act serious");
      purchasePrompt.mouseClicked(100, 100);

      expect(purchasePrompt.getCurrentAction().getId()).toBe("test passes");
    });
  });

  describe('fast-forward mode', () => {
    let waiterGreets: DialogueBox;
    let waiterHandsMenu: DialogueBox;
    let waiterAsks: DialogueBox;

    beforeEach(() => {
      waiterGreets = new DialogueBox({
        id: "waiterGreets",
        name: "Waiter",
        text: "Hello, I'm your Waiter for the evening.",
        animationDuration: 100,
      });

      waiterHandsMenu = new DialogueBox({
        id: "waiterHandsMenu",
        name: "Waiter",
        text: "Here is your menu.",
        animationDuration: 100,
      });

      waiterAsks = new DialogueBox({
        id: "waiterAsks",
        name: "Waiter",
        text: "Would you like some bread?",
        animationDuration: 100,
        screenDimensions: [1000, 800],
        answers: ["Yes", "No"]
      });
    });

    it('should enter fast-forward mode when you click on the fast forward button', () => {
      const dinnerDate = new Cutscene({
        actions: [
          waiterGreets,
          waiterHandsMenu
        ],
        screenDimensions: [1000, 800]
      });

      dinnerDate.start();
      dinnerDate.mouseClicked(900, 100);
      expect(dinnerDate.isFastForward()).toBeTruthy();
    });

    it('should auto progress dialog messages when in fast-forward mode', () => {
      const dinnerDate = new Cutscene({
        actions: [
          waiterGreets,
          waiterHandsMenu
        ],
        screenDimensions: [1000, 800]
      });

      dinnerDate.start();
      jest.spyOn(Date, 'now').mockImplementation(() => 0);
      dinnerDate.mouseClicked(900, 100);
      expect(dinnerDate.isFastForward()).toBeTruthy();
      expect(dinnerDate.getCurrentAction()).toBe(waiterGreets);

      jest.spyOn(Date, 'now').mockImplementation(() => 101);
      dinnerDate.update();
      expect(dinnerDate.getCurrentAction()).toBe(waiterHandsMenu);
    });

    it('should stop fast-forward mode if the dialog is on the last action', () => {
      const dinnerDate = new Cutscene({
        actions: [
          waiterGreets,
          waiterHandsMenu
        ],
        screenDimensions: [1000, 800]
      });

      dinnerDate.start();
      jest.spyOn(Date, 'now').mockImplementation(() => 0);
      expect(dinnerDate.canFastForward()).toBeTruthy();
      dinnerDate.mouseClicked(900, 100);
      jest.spyOn(Date, 'now').mockImplementation(() => 101);
      dinnerDate.update();
      jest.spyOn(Date, 'now').mockImplementation(() => 202);
      dinnerDate.update();
      expect(dinnerDate.getCurrentAction()).toBe(waiterHandsMenu);
      expect(dinnerDate.isFastForward()).toBeFalsy();
      expect(dinnerDate.canFastForward()).toBeFalsy();
    });

    it('should stop fast-forward mode if the action requires an answer', () => {
      const dinnerDate = new Cutscene({
        actions: [
          waiterGreets,
          waiterHandsMenu,
          waiterAsks,
          new DialogueBox({
            id: "testFailed"
          })
        ],
        screenDimensions: [1000, 800],
        decisionTriggers: [
          new DecisionTrigger({
            source_dialog_answer: 0,
            source_dialog_id: "waiterAsks",
            destination_dialog_id: "does not matter"
          })
        ]
      });

      dinnerDate.start();
      jest.spyOn(Date, 'now').mockImplementation(() => 0);
      expect(dinnerDate.getCurrentAction().getId()).toBe("waiterGreets");
      dinnerDate.mouseClicked(900, 100);

      jest.spyOn(Date, 'now').mockImplementation(() => 101);
      dinnerDate.update();
      expect(dinnerDate.getCurrentAction().getId()).toBe("waiterHandsMenu");

      jest.spyOn(Date, 'now').mockImplementation(() => 202);
      dinnerDate.update();
      expect(dinnerDate.getCurrentAction().getId()).toBe("waiterAsks");

      jest.spyOn(Date, 'now').mockImplementation(() => 303);
      dinnerDate.update();
      expect(dinnerDate.getCurrentAction().getId()).toBe("waiterAsks");

      expect(dinnerDate.isFastForward()).toBeFalsy();
      expect(dinnerDate.canFastForward()).toBeFalsy();
    });
  });

  it('can start after loading if no actions require loading', () => {
    const dinnerDate = new Cutscene({
      actions: [
        splash1,
        frontDoorGreeting
      ]
    });

    dinnerDate.loadResources();
    expect(dinnerDate.hasLoaded()).toBeTruthy();
    const error = dinnerDate.start();
    expect(error).toBeUndefined();
    expect(dinnerDate.isInProgress()).toBeTruthy();
  });

  it('can load required resources and indicate if it is ready to load', () => {
    const restaurantEntrance = new SplashScreen({
      id: "splash1",
      screenImageResourceKey: "restaurant_entrance"
    })

    const handler = new ResourceHandler({
      imageLoader: new stubImmediateLoader(),
      allResources: [
        {
          type: ResourceType.IMAGE,
          path: "path/to/image",
          key: "restaurant_entrance",
        }
      ]
    });

    const dinnerDate = new Cutscene({
      actions: [
        restaurantEntrance
      ],
      resourceHandler: handler,
    });

    dinnerDate.loadResources();

    dinnerDate.setResources();
    expect(restaurantEntrance.screenImage).toBeTruthy();

    expect(dinnerDate.hasLoaded()).toBeTruthy();
    const error = dinnerDate.start();
    expect(error).toBeUndefined();
    expect(dinnerDate.isInProgress()).toBeTruthy();
  });
});
