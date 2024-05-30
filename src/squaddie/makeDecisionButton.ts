import { RectArea, RectAreaService } from "../ui/rectArea"
import { RectangleHelper } from "../ui/rectangle"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../graphicsConstants"
import { SquaddieAffiliation } from "./squaddieAffiliation"
import { TextBox, TextBoxService } from "../ui/textBox"
import { ButtonStatus } from "../ui/button"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"
import { getValidValueOrDefault, isValidValue } from "../utils/validityCheck"
import { ImageUI } from "../ui/imageUI"
import { ResourceHandler } from "../resource/resourceHandler"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"

const DECISION_BUTTON_LAYOUT_COLORS = {
    strokeSaturation: 50,
    strokeBrightness: 100,
    strokeWeight: 4,
    fillSaturation: 50,
    fillBrightness: 100,
    fillAlpha: 127,
    templateNameTextTopMargin: 4,
    templateNameTextSize: 12,
    templateNameFontColor: [0, 0, 192],
    infoTextTopMargin: 2,
    infoTextSize: 10,
    infoFontColor: [0, 0, 192 - 64],
}

export class MakeDecisionButton {
    buttonArea: RectArea
    actionTemplate: ActionTemplate
    hue: number
    buttonIconResourceKey: string
    buttonIcon: ImageUI
    name: string

    constructor({
        buttonArea,
        actionTemplate,
        hue,
        resourceHandler,
        buttonIconResourceKey,
    }: {
        buttonArea?: RectArea
        actionTemplate: ActionTemplate
        hue?: number
        buttonIconResourceKey: string
        resourceHandler: ResourceHandler
    }) {
        this.buttonArea = buttonArea
        this.actionTemplate = actionTemplate
        this.hue = getValidValueOrDefault(
            hue,
            HUE_BY_SQUADDIE_AFFILIATION[SquaddieAffiliation.UNKNOWN]
        )
        this.buttonIconResourceKey = buttonIconResourceKey
        this.createButtonGraphic(resourceHandler)
        this.buttonArea = RectAreaService.new({
            left: this.buttonIcon.area.left,
            top: this.buttonIcon.area.top,
            width: this.buttonIcon.area.width,
            height: this.buttonIcon.area.height,
        })
    }

    private _status: ButtonStatus

    get status(): ButtonStatus {
        return this._status
    }

    set status(value: ButtonStatus) {
        this._status = value
    }

    draw(graphicsContext: GraphicsBuffer) {
        this.buttonIcon.draw(graphicsContext)

        if (this.status === ButtonStatus.HOVER) {
            const hoverOutline = RectangleHelper.new({
                area: this.buttonArea,
                strokeColor: [
                    this.hue,
                    DECISION_BUTTON_LAYOUT_COLORS.strokeSaturation,
                    DECISION_BUTTON_LAYOUT_COLORS.strokeBrightness,
                ],
                fillColor: [
                    this.hue,
                    DECISION_BUTTON_LAYOUT_COLORS.fillSaturation,
                    DECISION_BUTTON_LAYOUT_COLORS.fillBrightness,
                    DECISION_BUTTON_LAYOUT_COLORS.fillAlpha,
                ],
                strokeWeight: DECISION_BUTTON_LAYOUT_COLORS.strokeWeight,
            })

            RectangleHelper.draw(hoverOutline, graphicsContext)
        }

        let actionDescription = this.actionTemplate.name
        const buttonTextBox: TextBox = TextBoxService.new({
            area: RectAreaService.new({
                left: RectAreaService.left(this.buttonIcon.area),
                top:
                    RectAreaService.bottom(this.buttonIcon.area) +
                    DECISION_BUTTON_LAYOUT_COLORS.templateNameTextTopMargin,
                width: RectAreaService.width(this.buttonIcon.area) * 2,
                height:
                    DECISION_BUTTON_LAYOUT_COLORS.templateNameTextSize * 1.5,
            }),
            fontColor: DECISION_BUTTON_LAYOUT_COLORS.templateNameFontColor,
            text: actionDescription,
            textSize: DECISION_BUTTON_LAYOUT_COLORS.templateNameTextSize,
        })
        TextBoxService.draw(buttonTextBox, graphicsContext)

        let infoTextTop =
            RectAreaService.bottom(buttonTextBox.area) +
            DECISION_BUTTON_LAYOUT_COLORS.infoTextTopMargin
        if (this.shouldDrawActionPoints()) {
            this.drawActionPoints(graphicsContext, infoTextTop)
            infoTextTop +=
                DECISION_BUTTON_LAYOUT_COLORS.infoTextSize +
                DECISION_BUTTON_LAYOUT_COLORS.infoTextTopMargin
        }

        if (this.shouldDrawActionRange()) {
            this.drawActionRange(graphicsContext, infoTextTop)
            infoTextTop +=
                DECISION_BUTTON_LAYOUT_COLORS.infoTextSize +
                DECISION_BUTTON_LAYOUT_COLORS.infoTextTopMargin
        }

        if (this.shouldDrawActionTemplateEffects()) {
            this.drawActionTemplateEffect(graphicsContext, infoTextTop)
        }
    }

    drawActionPoints(graphicsContext: GraphicsBuffer, top: number) {
        this.drawInfoTextBox(
            graphicsContext,
            top,
            `Action Points: ${this.actionTemplate.actionPoints}`
        )
    }

    drawActionRange = (graphicsContext: GraphicsBuffer, top: number) => {
        const templateRange = ActionTemplateService.getActionTemplateRange(
            this.actionTemplate
        )
        const minimumRange = isValidValue(templateRange) ? templateRange[0] : 0
        const maximumRange = isValidValue(templateRange) ? templateRange[1] : 0

        this.drawInfoTextBox(
            graphicsContext,
            top,
            `Range: ${minimumRange} - ${maximumRange}`
        )
    }

    drawActionTemplateEffect = (
        graphicsContext: GraphicsBuffer,
        top: number
    ) => {
        const { damageDescription, healingDescription } =
            this.getActionTemplateEffectDescriptions(this.actionTemplate)

        this.drawInfoTextBox(
            graphicsContext,
            top,
            [`${damageDescription}`, `${healingDescription}`].join(" ")
        )
    }

    drawInfoTextBox = (
        graphicsContext: GraphicsBuffer,
        top: number,
        text: string
    ) => {
        const buttonTextBox: TextBox = TextBoxService.new({
            area: RectAreaService.new({
                left: RectAreaService.left(this.buttonIcon.area),
                top: top,
                width: RectAreaService.width(this.buttonIcon.area) * 2,
                height:
                    DECISION_BUTTON_LAYOUT_COLORS.infoTextSize +
                    DECISION_BUTTON_LAYOUT_COLORS.infoTextTopMargin,
            }),
            fontColor: DECISION_BUTTON_LAYOUT_COLORS.infoFontColor,
            text,
            textSize: DECISION_BUTTON_LAYOUT_COLORS.infoTextSize,
        })
        TextBoxService.draw(buttonTextBox, graphicsContext)
    }

    createButtonGraphic(resourceHandler: ResourceHandler) {
        const image = resourceHandler.getResource(this.buttonIconResourceKey)
        this.buttonIcon = new ImageUI({
            graphic: image,
            area: RectAreaService.new({
                left: this.buttonArea.left,
                top: this.buttonArea.top,
                width: image.width,
                height: image.height,
            }),
        })
    }

    private getActionTemplateEffectDescriptions = (
        actionTemplate: ActionTemplate
    ) => {
        const totalDamage = ActionTemplateService.getTotalDamage(actionTemplate)
        const totalHealing =
            ActionTemplateService.getTotalHealing(actionTemplate)
        const damageDescription = totalDamage > 0 ? `${totalDamage} damage` : ""
        const healingDescription =
            totalHealing > 0 ? `${totalHealing} healing` : ""
        return { damageDescription, healingDescription }
    }

    private shouldDrawActionPoints = () => {
        return this.actionTemplate.actionPoints !== 1
    }

    private shouldDrawActionRange = () => {
        const templateRange = ActionTemplateService.getActionTemplateRange(
            this.actionTemplate
        )
        const minRangeIsWorthDescribing =
            !isValidValue(templateRange) || templateRange[0] > 1
        const maxRangeIsWorthDescribing =
            !isValidValue(templateRange) || templateRange[1] > 1
        return minRangeIsWorthDescribing || maxRangeIsWorthDescribing
    }
    private shouldDrawActionTemplateEffects = () => {
        const totalDamage = ActionTemplateService.getTotalDamage(
            this.actionTemplate
        )
        const totalHealing = ActionTemplateService.getTotalHealing(
            this.actionTemplate
        )
        return totalDamage > 0 || totalHealing > 0
    }
}
