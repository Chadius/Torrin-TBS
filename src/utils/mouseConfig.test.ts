import {GetMouseButton, MouseButton} from "./mouseConfig";
import {config} from "../configuration/config";

describe('Mouse Config', () => {
    it('knows when the mouse button was clicked and what functional button to assign it to', () => {
        expect(GetMouseButton(config.MOUSE_BUTTON_BINDINGS[MouseButton.ACCEPT])).toBe(MouseButton.ACCEPT);
        expect(GetMouseButton(config.MOUSE_BUTTON_BINDINGS[MouseButton.INFO])).toBe(MouseButton.INFO);
        expect(GetMouseButton(config.MOUSE_BUTTON_BINDINGS[MouseButton.CANCEL])).toBe(MouseButton.CANCEL);
    });
});
