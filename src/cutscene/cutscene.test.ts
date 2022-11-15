import {DialogueBox} from "./dialogueBox";
import {SplashScreen} from "./splashScreen";
import {Cutscene} from "./cutscene";

describe('Cutscene', () => {
  const splash1 = new SplashScreen({imageName: "splash1.png"})
  const splash2 = new SplashScreen({imageName: "splash2.png"})

  const frontDoorGreeting = new DialogueBox({ name: "Doorman", text: "Welcome, come inside", animationDuration: 0});
  const hostGreeting = new DialogueBox({ name: "Host", text: "Someone will lead you to your table shortly.", animationDuration: 0});

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
      splash1,
      splash2
    ]);

    dinnerDate.start();
    expect(dinnerDate.getCurrentAction()).toBe(splash1);
    dinnerDate.mouseClicked(100, 100);
    expect(dinnerDate.getCurrentAction()).toBe(splash2);
  });

  it('should wait for the DialogueAction to end before sending more messages', () => {
    const dinnerDate = new Cutscene([
      frontDoorGreeting,
      hostGreeting
    ]);

    dinnerDate.start();
    expect(dinnerDate.getCurrentAction()).toBe(frontDoorGreeting);
    dinnerDate.mouseClicked(100, 100);
    expect(dinnerDate.getCurrentAction()).toBe(frontDoorGreeting);
  });
});
