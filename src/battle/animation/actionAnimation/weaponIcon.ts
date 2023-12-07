import {ActionAnimationFontColor} from "./actionAnimationConstants";
import {RectArea, RectAreaHelper} from "../../../ui/rectArea";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER, WINDOW_SPACING1, WINDOW_SPACING2} from "../../../ui/constants";
import {Label, LabelHelper} from "../../../ui/label";
import {GraphicsContext} from "../../../utils/graphics/graphicsContext";

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

    draw(graphicsContext: GraphicsContext, actorImageArea: RectArea) {
        if (this.attackingLabel === undefined) {
            this.lazyLoadAttackingTextBox(actorImageArea);
        }

        RectAreaHelper.move(this.attackingLabel.rectangle.area, {
            left: RectAreaHelper.right(actorImageArea) + WINDOW_SPACING1,
            top: RectAreaHelper.centerY(actorImageArea) - (this.attackingLabel.rectangle.area.height / 2),
        });
        RectAreaHelper.move(this.attackingLabel.textBox.area, {
            left: RectAreaHelper.right(actorImageArea) + WINDOW_SPACING1,
            top: RectAreaHelper.centerY(actorImageArea) - (this.attackingLabel.rectangle.area.height / 2),
        });
        LabelHelper.draw(this.attackingLabel, graphicsContext);
    }

    private lazyLoadAttackingTextBox(actorImageArea: RectArea) {
        const labelBackgroundColor = [
            0,
            10,
            80
        ];

        this._attackingLabel = LabelHelper.new({
            padding: 0,
            area: RectAreaHelper.new({
                left: RectAreaHelper.right(actorImageArea) + WINDOW_SPACING1,
                top: RectAreaHelper.centerY(actorImageArea),
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
