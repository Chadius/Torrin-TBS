import p5 from "p5";
import {ActionAnimationFontColor} from "./actionAnimationConstants";
import {RectArea} from "../../../ui/rectArea";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER, WINDOW_SPACING1, WINDOW_SPACING2} from "../../../ui/constants";
import {Label} from "../../../ui/label";

export class WeaponIcon {
    constructor() {
        this.reset();
    }

    private _attackingLabel: Label;

    get attackingLabel(): Label {
        return this._attackingLabel;
    }

    reset() {
        this._attackingLabel = undefined;
    }

    start() {
    }

    draw(graphicsContext: p5, actorImageArea: RectArea) {
        if (this.attackingLabel === undefined) {
            this.lazyLoadAttackingTextBox(actorImageArea);
        }

        this.attackingLabel.rectangle.area.move({
            left: actorImageArea.right + WINDOW_SPACING1,
            top: actorImageArea.centerY - (this.attackingLabel.rectangle.area.height / 2),
        });
        this.attackingLabel.textBox.area.move({
            left: actorImageArea.right + WINDOW_SPACING1,
            top: actorImageArea.centerY - (this.attackingLabel.rectangle.area.height / 2),
        });
        this.attackingLabel.draw(graphicsContext);
    }

    private lazyLoadAttackingTextBox(actorImageArea: RectArea) {
        const labelBackgroundColor = [
            0,
            10,
            80
        ];

        this._attackingLabel = new Label({
            padding: 0,
            area: new RectArea({
                left: actorImageArea.right + WINDOW_SPACING1,
                top: actorImageArea.centerY,
                height: WINDOW_SPACING2,
                width: WINDOW_SPACING1 * 15,
            }),
            text: "Attacking!",
            textSize: WINDOW_SPACING2,
            vertAlign: VERT_ALIGN_CENTER,
            horizAlign: HORIZ_ALIGN_CENTER,
            fillColor: labelBackgroundColor,
            fontColor: ActionAnimationFontColor,
        });
    }
}
