import * as mocks from "../utils/test/mocks";
import {TitleScreen} from "./titleScreen";
import {TitleScreenState} from "./titleScreenState";

describe('Title Screen', () => {
    let titleScreen: TitleScreen;
    let titleScreenState: TitleScreenState
    let mockedP5: p5;

    beforeEach(() => {
        mockedP5 = mocks.mockedP5();
        titleScreen = new TitleScreen();
        titleScreenState = titleScreen.setup({graphicsContext: mockedP5});
    });

    it('will setup when called and generate an empty state', () => {
        expect(titleScreenState).not.toBeUndefined();
    });
});
