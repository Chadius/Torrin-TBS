import {DialogueBox} from "./dialogueBox";

describe('dialogue box', () => {

  it('should wait for a certain amount of time before saying it is finished', () => {
    const frontDoorGreeting = new DialogueBox({ name: "Doorman", text: "Welcome, come inside", animationDuration: 500});
    jest.spyOn(Date, 'now').mockImplementation(() => 0);
    frontDoorGreeting.start();
    expect(frontDoorGreeting.isAnimating()).toBeTruthy();
    expect(frontDoorGreeting.isFinished()).toBeFalsy();

    jest.spyOn(Date, 'now').mockImplementation(() => 501);
    expect(frontDoorGreeting.isAnimating()).toBeFalsy();
    expect(frontDoorGreeting.isFinished()).toBeTruthy();
  });

  it('should not finish if the player needs to answer', () => {
    const purchasePrompt = new DialogueBox({
      name: "Sales Clerk",
      text: "Would you like to buy this sword?",
      animationDuration: 500,
      answers: ["Yes", "No"]
    });
    jest.spyOn(Date, 'now').mockImplementation(() => 0);
    purchasePrompt.start();
    expect(purchasePrompt.isAnimating()).toBeTruthy();
    expect(purchasePrompt.isFinished()).toBeFalsy();

    jest.spyOn(Date, 'now').mockImplementation(() => 501);
    expect(purchasePrompt.isAnimating()).toBeTruthy();
    expect(purchasePrompt.isFinished()).toBeFalsy();
  });

  it('should not finish if the player does not click on an answer', () => {
    const purchasePrompt = new DialogueBox({
      name: "Sales Clerk",
      text: "Would you like to buy this sword?",
      answers: ["Yes", "No"],
      screenDimensions: [1000, 800]
    });
    purchasePrompt.start();
    expect(purchasePrompt.isAnimating()).toBeTruthy();
    expect(purchasePrompt.isFinished()).toBeFalsy();

    purchasePrompt.mouseClicked(0, 0);

    expect(purchasePrompt.isAnimating()).toBeTruthy();
    expect(purchasePrompt.isFinished()).toBeFalsy();
  });

  it('should finish if the player clicks on an answer', () => {
    const purchasePrompt = new DialogueBox({
      name: "Sales Clerk",
      text: "Would you like to buy this sword?",
      answers: ["Yes", "No"],
      screenDimensions: [1000, 800]
    });
    purchasePrompt.start();
    expect(purchasePrompt.isAnimating()).toBeTruthy();
    expect(purchasePrompt.isFinished()).toBeFalsy();

    purchasePrompt.mouseClicked(0, 800);

    expect(purchasePrompt.isAnimating()).toBeFalsy();
    expect(purchasePrompt.isFinished()).toBeTruthy();
  });

  it('should remember the answer selected', () => {
    const purchasePrompt = new DialogueBox({
      name: "Sales Clerk",
      text: "Would you like to buy this sword?",
      answers: ["Yes", "No"],
      screenDimensions: [1000, 800]
    });
    purchasePrompt.start();
    expect(purchasePrompt.isAnimating()).toBeTruthy();
    expect(purchasePrompt.isFinished()).toBeFalsy();

    purchasePrompt.mouseClicked(1000, 800);

    expect(purchasePrompt.answerSelected).toBe(1);
  });
});
