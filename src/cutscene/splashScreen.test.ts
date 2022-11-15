import {SplashScreen} from "./splashScreen";

describe('splash screen', () => {
  const restaurantEntrance = new SplashScreen({ imageName: "restaurant_entrance.png"});

  it('should mark as finished if clicked on after showing text', () => {
    jest.spyOn(Date, 'now').mockImplementation(() => 0);
    restaurantEntrance.start();
    expect(restaurantEntrance.isAnimating()).toBeTruthy();
    expect(restaurantEntrance.isFinished()).toBeFalsy();

    restaurantEntrance.mouseClicked(100, 100);

    expect(restaurantEntrance.isAnimating()).toBeFalsy();
    expect(restaurantEntrance.isFinished()).toBeTruthy();
  });
});
