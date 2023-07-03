import p5 from "p5";
import {TextBox} from "./textBox";
import {RectArea} from "./rectArea";

jest.mock('p5', () => () => {
    return {}
});

describe('Pop up text', () => {
    let mockedP5: p5;
    let p5TextSpy: jest.SpyInstance;

    beforeEach(() => {
        mockedP5 = new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>;
        mockedP5.push = jest.fn()
        mockedP5.pop = jest.fn()
        mockedP5.fill = jest.fn()
        mockedP5.text = jest.fn()
        mockedP5.textSize = jest.fn()
        mockedP5.textAlign = jest.fn()
        p5TextSpy = jest.spyOn(mockedP5, "text").mockReturnValue(undefined);
    });

    it('will try to draw the text for a given amount of time', () => {
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


        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        textBox.draw(mockedP5);
        expect(textBox.isDone()).toBeFalsy();

        jest.spyOn(Date, 'now').mockImplementation(() => 1000);
        textBox.draw(mockedP5);
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
        textBox.draw(mockedP5);

        jest.spyOn(Date, 'now').mockImplementation(() => 1000);
        textBox.draw(mockedP5);
        expect(p5TextSpy).toBeCalledTimes(2);
        expect(textBox.isDone()).toBeFalsy();
    });
});
