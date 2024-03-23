import {ActionAnimationFontColor} from "./actionAnimationConstants";
import {RectArea, RectAreaService} from "../../../ui/rectArea";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER, WINDOW_SPACING1, WINDOW_SPACING2} from "../../../ui/constants";
import {Label, LabelService} from "../../../ui/label";
import {GraphicsContext} from "../../../utils/graphics/graphicsContext";
import {
    ActionEffectSquaddieTemplate,
    ActionEffectSquaddieTemplateService
} from "../../../action/template/actionEffectSquaddieTemplate";

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
             actionEffectSquaddieTemplate,
             graphicsContext,
             actorImageArea,
         }:
             {
                 actionEffectSquaddieTemplate: ActionEffectSquaddieTemplate,
                 graphicsContext: GraphicsContext,
                 actorImageArea: RectArea,
             }
    ) {
        if (this.attackingLabel === undefined) {
            this.lazyLoadAttackingTextBox(actionEffectSquaddieTemplate, actorImageArea);
        }

        RectAreaService.move(this.attackingLabel.rectangle.area, {
            left: RectAreaService.right(actorImageArea) + WINDOW_SPACING1,
            top: RectAreaService.centerY(actorImageArea) - (this.attackingLabel.rectangle.area.height / 2),
        });
        RectAreaService.move(this.attackingLabel.textBox.area, {
            left: RectAreaService.right(actorImageArea) + WINDOW_SPACING1,
            top: RectAreaService.centerY(actorImageArea) - (this.attackingLabel.rectangle.area.height / 2),
        });
        LabelService.draw(this.attackingLabel, graphicsContext);
    }

    private lazyLoadAttackingTextBox(action: ActionEffectSquaddieTemplate, actorImageArea: RectArea) {
        const labelBackgroundColor = [
            0,
            10,
            80
        ];

        let labelText: string = "(Using)";
        if (ActionEffectSquaddieTemplateService.isHindering(action)) {
            labelText = "Attacking!";
        } else if (ActionEffectSquaddieTemplateService.isHelpful(action)) {
            labelText = "Helping...";
        }

        this._attackingLabel = LabelService.new({
            padding: 0,
            area: RectAreaService.new({
                left: RectAreaService.right(actorImageArea) + WINDOW_SPACING1,
                top: RectAreaService.centerY(actorImageArea),
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
