import { ActionAnimationFontColor } from "./actionAnimationConstants"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../../../ui/constants"
import { Label, LabelService } from "../../../ui/label"
import {
    ActionEffectTemplate,
    ActionEffectTemplateService,
} from "../../../action/template/actionEffectTemplate"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"

export class WeaponIcon {
    constructor() {
        this.reset()
    }

    private _attackingLabel: Label

    get attackingLabel(): Label {
        return this._attackingLabel
    }

    reset() {
        this._attackingLabel = undefined
    }

    start() {
        // Required by inheritance
    }

    draw({
        actionEffectSquaddieTemplate,
        graphicsContext,
        actorImageArea,
    }: {
        actionEffectSquaddieTemplate: ActionEffectTemplate
        graphicsContext: GraphicsBuffer
        actorImageArea: RectArea
    }) {
        if (this.attackingLabel === undefined) {
            this.lazyLoadAttackingTextBox(
                actionEffectSquaddieTemplate,
                actorImageArea
            )
        }

        RectAreaService.move(this.attackingLabel.rectangle.area, {
            left:
                RectAreaService.right(actorImageArea) + WINDOW_SPACING.SPACING1,
            top:
                RectAreaService.centerY(actorImageArea) -
                this.attackingLabel.rectangle.area.height / 2,
        })
        RectAreaService.move(this.attackingLabel.textBox.area, {
            left:
                RectAreaService.right(actorImageArea) + WINDOW_SPACING.SPACING1,
            top:
                RectAreaService.centerY(actorImageArea) -
                this.attackingLabel.rectangle.area.height / 2,
        })
        LabelService.draw(this.attackingLabel, graphicsContext)
    }

    private lazyLoadAttackingTextBox(
        action: ActionEffectTemplate,
        actorImageArea: RectArea
    ) {
        const labelBackgroundColor = [0, 10, 80]

        let labelText: string
        if (ActionEffectTemplateService.doesItTargetFoes(action)) {
            labelText = "Attacking!"
        } else if (ActionEffectTemplateService.doesItTargetFriends(action)) {
            labelText = "Helping..."
        } else {
            labelText = "Action!"
        }

        this._attackingLabel = LabelService.new({
            textBoxMargin: 0,
            area: RectAreaService.new({
                left:
                    RectAreaService.right(actorImageArea) +
                    WINDOW_SPACING.SPACING1,
                top: RectAreaService.centerY(actorImageArea),
                height: WINDOW_SPACING.SPACING2,
                width: WINDOW_SPACING.SPACING1 * 15,
            }),
            text: labelText,
            fontSize: WINDOW_SPACING.SPACING2,
            vertAlign: VERTICAL_ALIGN.CENTER,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            fillColor: labelBackgroundColor,
            fontColor: ActionAnimationFontColor,
        })
    }
}
