import {ActionAnimationFontColor} from "./actionAnimationConstants";
import {RectArea, RectAreaHelper} from "../../../ui/rectArea";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER, WINDOW_SPACING1, WINDOW_SPACING2} from "../../../ui/constants";
import {Label, LabelHelper} from "../../../ui/label";
import {GraphicsContext} from "../../../utils/graphics/graphicsContext";
import {SquaddieSquaddieAction, SquaddieSquaddieActionService} from "../../../squaddie/action";

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

    draw({
             action,
             graphicsContext,
             actorImageArea,
         }:
             {
                 action: SquaddieSquaddieAction,
                 graphicsContext: GraphicsContext,
                 actorImageArea: RectArea,
             }
    ) {
        if (this.attackingLabel === undefined) {
            this.lazyLoadAttackingTextBox(action, actorImageArea);
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

    private lazyLoadAttackingTextBox(action: SquaddieSquaddieAction, actorImageArea: RectArea) {
        const labelBackgroundColor = [
            0,
            10,
            80
        ];

        let labelText: string = "(Using)";
        if (SquaddieSquaddieActionService.isHindering(action)) {
            labelText = "Attacking!";
        } else if (SquaddieSquaddieActionService.isHelpful(action)) {
            labelText = "Helping...";
        }

        this._attackingLabel = LabelHelper.new({
            padding: 0,
            area: RectAreaHelper.new({
                left: RectAreaHelper.right(actorImageArea) + WINDOW_SPACING1,
                top: RectAreaHelper.centerY(actorImageArea),
                height: WINDOW_SPACING2,
                width: WINDOW_SPACING1 * 15,
            }),
            text: labelText,
            textSize: WINDOW_SPACING2,
            vertAlign: VERT_ALIGN_CENTER,
            horizAlign: HORIZ_ALIGN_CENTER,
            fillColor: labelBackgroundColor,
            fontColor: ActionAnimationFontColor,
        });
    }
}
