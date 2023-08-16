import p5 from "p5";
import {ImageUI} from "../../ui/imageUI";
import {ResourceHandler} from "../../resource/resourceHandler";
import {stubImmediateLoader} from "../../resource/resourceHandlerTestUtils";
import {BattleSquaddieSelectedHUD} from "../../battle/battleSquaddieSelectedHUD";
import {SquaddieEndTurnActivity} from "../../battle/history/squaddieEndTurnActivity";
import {RectArea} from "../../ui/rectArea";

jest.mock('p5', () => () => {
    return {
        background: jest.fn(),
        colorMode: jest.fn(),
        createImage: jest.fn().mockReturnValue({
            loadPixels: jest.fn(),
            width: 1,
            height: 1,
        }),
        fill: jest.fn(),
        image: jest.fn(),
        loadImage: jest.fn(),
        noStroke: jest.fn(),
        noTint: jest.fn(),
        pop: jest.fn(),
        push: jest.fn(),
        rect: jest.fn(),
        stroke: jest.fn(),
        strokeWeight: jest.fn(),
        text: jest.fn(),
        textAlign: jest.fn(),
        textSize: jest.fn(),
        tint: jest.fn(),
    }
});

export const mockedP5 = () => {
    return new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>;
}

export const mockImageUI = () => {
    const imageUI = new (<new (options: any) => ImageUI>ImageUI)({}) as jest.Mocked<ImageUI>;
    imageUI.area = new RectArea({left: 10, right: 20, top: 10, bottom: 20});
    imageUI.draw = jest.fn();
    return imageUI;
}

export const mockResourceHandler = () => {
    const handler = new (
        <new (options: any) => ResourceHandler>ResourceHandler
    )({
        imageLoader: new stubImmediateLoader(),
    }) as jest.Mocked<ResourceHandler>;

    handler.loadResources = jest.fn();
    handler.areAllResourcesLoaded = jest.fn().mockReturnValueOnce(true);
    return handler;
}

export const battleSquaddieSelectedHUD = () => {
    const hud = new (<new (options: any) => BattleSquaddieSelectedHUD>BattleSquaddieSelectedHUD)({}) as jest.Mocked<BattleSquaddieSelectedHUD>;
    hud.draw = jest.fn();
    hud.wasActivitySelected = jest.fn().mockReturnValue(true);
    hud.getSelectedActivity = jest.fn().mockReturnValue(new SquaddieEndTurnActivity());
    hud.shouldDrawTheHUD = jest.fn().mockReturnValue(true);
    hud.didMouseClickOnHUD = jest.fn().mockReturnValue(true);
    hud.mouseClicked = jest.fn();
    return hud;
}
