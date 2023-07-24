import {UIControlSettings} from "./uiControlSettings";

describe('UI Control Settings', () => {
    it('can override UI Control Setting values with another UI Control Settings', () => {
        const settings1: UIControlSettings = new UIControlSettings({
            scrollCamera: false,
        });

        const settings2: UIControlSettings = new UIControlSettings({
            scrollCamera: true,
        });

        settings1.update(settings2);

        expect(settings1.letMouseScrollCamera).toBe(true);
        expect(settings1.displayBattleMap).toBeUndefined();
    });

    it('can will ignore undefined Setting values when overriding', () => {
        const settings1: UIControlSettings = new UIControlSettings({
            scrollCamera: false,
            displayMap: true,
        });

        const settings2: UIControlSettings = new UIControlSettings({
            displayMap: false,
        });

        settings1.update(settings2);

        expect(settings1.letMouseScrollCamera).toBe(false);
        expect(settings1.displayBattleMap).toBe(false);
    });
});
