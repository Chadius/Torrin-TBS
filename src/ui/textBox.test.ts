import {TextBox} from "./textBox";
import {RectArea} from "./rectArea";
import {MockedP5GraphicsContext} from "../utils/test/mocks";

describe('Pop up text', () => {
    let p5TextSpy: jest.SpyInstance;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        p5TextSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text").mockReturnValue(undefined);
    });

    it('will try to draw the text for a given amount of time', () => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const textBox: TextBox = new TextBox({
            text: "A text box",
            textSize: 18,
            fontColor: [0, 0, 0],
            area: new RectArea({
                left: 0,
                top: 0,
                width: 100,
                height: 50,
            }),
            duration: 1000,
        });

        textBox.draw(mockedP5GraphicsContext);
        expect(textBox.isDone()).toBeFalsy();

        jest.spyOn(Date, 'now').mockImplementation(() => 1000);
        textBox.draw(mockedP5GraphicsContext);
        expect(p5TextSpy).toBeCalledTimes(1);
        expect(textBox.isDone()).toBeTruthy();
    });

    it('will draw the text if there is no duration', () => {
        const textBox: TextBox = new TextBox({
            text: "A text box",
            textSize: 18,
            fontColor: [0, 0, 0],
            area: new RectArea({
                left: 0,
                top: 0,
                width: 100,
                height: 50,
            }),
            duration: undefined,
        });


        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        textBox.draw(mockedP5GraphicsContext);

        jest.spyOn(Date, 'now').mockImplementation(() => 1000);
        textBox.draw(mockedP5GraphicsContext);
        expect(p5TextSpy).toBeCalledTimes(2);
        expect(textBox.isDone()).toBeFalsy();
    });
});
