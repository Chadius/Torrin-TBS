import {DialogueBox} from "./dialogueBox";

describe('dialogue box', () => {
  const frontDoorGreeting = new DialogueBox("Doorman", "Welcome, come inside", 500);

  it('should wait for a certain amount of time before saying it is ready to clear', () => {
    jest.spyOn(Date, 'now').mockImplementation(() => 0);
    frontDoorGreeting.start();
    expect(frontDoorGreeting.isAnimating()).toBeTruthy();
    expect(frontDoorGreeting.isFinished()).toBeFalsy();

    jest.spyOn(Date, 'now').mockImplementation(() => 501);
    expect(frontDoorGreeting.isAnimating()).toBeFalsy();
    expect(frontDoorGreeting.isFinished()).toBeTruthy();
  });

  it('should mark as finished if clicked on after showing text', () => {
    jest.spyOn(Date, 'now').mockImplementation(() => 0);
    frontDoorGreeting.start();
    expect(frontDoorGreeting.isAnimating()).toBeTruthy();
    expect(frontDoorGreeting.isFinished()).toBeFalsy();

    frontDoorGreeting.mouseClicked(100, 100);

    expect(frontDoorGreeting.isAnimating()).toBeFalsy();
    expect(frontDoorGreeting.isFinished()).toBeTruthy();
  });
});
