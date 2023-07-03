import p5 from "p5";

jest.mock('p5', () => () => {
    return {
        colorMode: jest.fn(),
        background: jest.fn(),
        push: jest.fn(),
        pop: jest.fn(),
        fill: jest.fn(),
        text: jest.fn(),
        textSize: jest.fn(),
        textAlign: jest.fn(),
    }
});

export const mockedP5 = new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>;
