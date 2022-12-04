import {DialogueBox} from "./dialogueBox";
import {SplashScreen} from "./splashScreen";
import {Cutscene} from "./cutscene";
import {DecisionTrigger} from "./DecisionTrigger";

describe('Cutscene', () => {
  const splash1 = new SplashScreen({})
  const splash2 = new SplashScreen({})

  const frontDoorGreeting = new DialogueBox({ id: "1", name: "Doorman", text: "Welcome, come inside", animationDuration: 0});
  const hostGreeting = new DialogueBox({ id: "1", name: "Host", text: "Someone will lead you to your table shortly.", animationDuration: 0});

  it('should not start upon construction', () => {
    const dinnerDate = new Cutscene({ actions: [
      frontDoorGreeting
    ]});

    expect(dinnerDate.isInProgress()).toBeFalsy();
  });

  it('should start with the first action when started', () => {
    const dinnerDate = new Cutscene({ actions: [
      frontDoorGreeting
    ]});

    dinnerDate.start();
    expect(dinnerDate.isInProgress()).toBeTruthy();
    expect(dinnerDate.getCurrentAction()).toBe(frontDoorGreeting);
  });

  it('should stop when requested', () => {
    const dinnerDate = new Cutscene({ actions: [
      frontDoorGreeting
    ]});

    dinnerDate.start();
    dinnerDate.stop();
    expect(dinnerDate.isInProgress()).toBeFalsy();
  });

  it('should move to the next action when the mouse clicks', () => {
    const dinnerDate = new Cutscene({ actions: [
      splash1,
      splash2
    ]});

    dinnerDate.start();
    expect(dinnerDate.getCurrentAction()).toBe(splash1);
    dinnerDate.mouseClicked(100, 100);
    expect(dinnerDate.getCurrentAction()).toBe(splash2);
  });

  it('should be finished when all of the actions are finished', () => {
    const dinnerDate = new Cutscene({ actions: [
      frontDoorGreeting,
      hostGreeting
    ]});

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
    expect(purchasePrompt.getCurrentAction().id).toBe("buy my stuff");
    purchasePrompt.mouseClicked(0, 800);

    expect(purchasePrompt.getCurrentAction().id).toBe("test passes");
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
    expect(purchasePrompt.getCurrentAction().id).toBe("buy my stuff");
    purchasePrompt.mouseClicked(0, 800);

    expect(purchasePrompt.getCurrentAction().id).toBe("test passed");
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
    expect(purchasePrompt.getCurrentAction().id).toBe("act serious");
    purchasePrompt.mouseClicked(100, 100);

    expect(purchasePrompt.getCurrentAction().id).toBe("test passes");
  });
});
