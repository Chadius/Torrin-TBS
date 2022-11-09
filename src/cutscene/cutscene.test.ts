import {DialogueBox} from "./dialogueBox";
import {Cutscene} from "./cutscene";

describe('Cutscene', () => {
  const frontDoorGreeting = new DialogueBox("Doorman", "Welcome, come inside");
  const hostGreeting = new DialogueBox("Host", "Someone will lead you to your table shortly.");

  it('should not start upon construction', () => {
    const dinnerDate = new Cutscene([
      frontDoorGreeting
    ]);

    expect(dinnerDate.isInProgress()).toBeFalsy();
  });

  it('should start with the first action when started', () => {
    const dinnerDate = new Cutscene([
      frontDoorGreeting
    ]);

    dinnerDate.start();
    expect(dinnerDate.isInProgress()).toBeTruthy();
    expect(dinnerDate.getCurrentAction()).toBe(frontDoorGreeting);
  });

  it('should stop when requested', () => {
    const dinnerDate = new Cutscene([
      frontDoorGreeting
    ]);

    dinnerDate.start();
    dinnerDate.stop();
    expect(dinnerDate.isInProgress()).toBeFalsy();
  });

  it('should move to the next action when the mouse clicks', () => {
    const dinnerDate = new Cutscene([
      frontDoorGreeting,
      hostGreeting
    ]);

    dinnerDate.start();
    expect(dinnerDate.getCurrentAction()).toBe(frontDoorGreeting);
    dinnerDate.mouseClicked(100, 100);
    expect(dinnerDate.getCurrentAction()).toBe(hostGreeting);
  });
});
