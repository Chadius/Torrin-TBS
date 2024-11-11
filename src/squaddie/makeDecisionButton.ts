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
import { AttributeModifierService, AttributeType } from "./attributeModifier"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"

const DECISION_BUTTON_LAYOUT_COLORS = {
    hover: {
        strokeSaturation: 85,
        strokeBrightness: 50,
        fillSaturation: 85,
        fillBrightness: 50,
        fillAlpha: 127,
        strokeWeight: 4,
    },
    disabled: {
        fillSaturation: 15,
        fillBrightness: 0,
        fillAlpha: 192,
    },
    templateNameTextTopMargin: 4,
    templateNameTextSize: 12,
    templateNameFontColor: [0, 0, 192],
    infoTextTopMargin: 2,
    infoTextSize: 10,
    infoFontColor: [0, 0, 192 - 64],
}

export class MakeDecisionButton {
    buttonArea: RectArea
    actionTemplateId: string
    hue: number
    buttonIconResourceKey: string
    buttonIcon: ImageUI
    name: string
    popupMessage: string

    constructor({
        buttonArea,
        actionTemplateId,
        hue,
        resourceHandler,
        buttonIconResourceKey,
        popupMessage,
    }: {
        buttonArea?: RectArea
        actionTemplateId: string
        hue?: number
        buttonIconResourceKey: string
        resourceHandler: ResourceHandler
        popupMessage?: string
    }) {
        this.buttonArea = buttonArea
        this.actionTemplateId = actionTemplateId
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
        this.popupMessage = popupMessage
    }

    private _status: ButtonStatus

    get status(): ButtonStatus {
        return this._status
    }

    set status(value: ButtonStatus) {
        this._status = value
    }

    draw(objectRepository: ObjectRepository, graphicsContext: GraphicsBuffer) {
        this.buttonIcon.draw(graphicsContext)
        if (this.status === ButtonStatus.HOVER) {
            const hoverOutline = RectangleHelper.new({
                area: this.buttonArea,
                strokeColor: [
                    this.hue,
                    DECISION_BUTTON_LAYOUT_COLORS.hover.strokeSaturation,
                    DECISION_BUTTON_LAYOUT_COLORS.hover.strokeBrightness,
                ],
                fillColor: [
                    this.hue,
                    DECISION_BUTTON_LAYOUT_COLORS.hover.fillSaturation,
                    DECISION_BUTTON_LAYOUT_COLORS.hover.fillBrightness,
                    DECISION_BUTTON_LAYOUT_COLORS.hover.fillAlpha,
                ],
                strokeWeight: DECISION_BUTTON_LAYOUT_COLORS.hover.strokeWeight,
            })

            RectangleHelper.draw(hoverOutline, graphicsContext)
        }
        if (this.status === ButtonStatus.DISABLED) {
            const disabledFill = RectangleHelper.new({
                area: this.buttonArea,
                fillColor: [
                    this.hue,
                    DECISION_BUTTON_LAYOUT_COLORS.disabled.fillSaturation,
                    DECISION_BUTTON_LAYOUT_COLORS.disabled.fillBrightness,
                    DECISION_BUTTON_LAYOUT_COLORS.disabled.fillAlpha,
                ],
            })

            RectangleHelper.draw(disabledFill, graphicsContext)
        }

        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            this.actionTemplateId
        )

        let actionDescription = actionTemplate.name
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
        if (this.shouldDrawActionPoints(actionTemplate)) {
            this.drawActionPoints(graphicsContext, actionTemplate, infoTextTop)
            infoTextTop +=
                DECISION_BUTTON_LAYOUT_COLORS.infoTextSize +
                DECISION_BUTTON_LAYOUT_COLORS.infoTextTopMargin
        }

        if (this.shouldDrawActionRange(actionTemplate)) {
            this.drawActionRange(graphicsContext, actionTemplate, infoTextTop)
            infoTextTop +=
                DECISION_BUTTON_LAYOUT_COLORS.infoTextSize +
                DECISION_BUTTON_LAYOUT_COLORS.infoTextTopMargin
        }

        if (this.shouldDrawActionTemplateEffects(actionTemplate)) {
            this.drawActionTemplateEffect(
                graphicsContext,
                actionTemplate,
                infoTextTop
            )
        }
    }

    drawActionPoints(
        graphicsContext: GraphicsBuffer,
        actionTemplate: ActionTemplate,
        top: number
    ) {
        this.drawInfoTextBox(
            graphicsContext,
            top,
            `Action Points: ${actionTemplate.actionPoints}`
        )
    }

    drawActionRange = (
        graphicsContext: GraphicsBuffer,
        actionTemplate: ActionTemplate,
        top: number
    ) => {
        const templateRange =
            ActionTemplateService.getActionTemplateRange(actionTemplate)
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
        actionTemplate: ActionTemplate,
        top: number
    ) => {
        const {
            damageDescription,
            healingDescription,
            attributeModifierDescription,
        } = this.getActionTemplateEffectDescriptions(actionTemplate)

        this.drawInfoTextBox(
            graphicsContext,
            top,
            [
                damageDescription,
                healingDescription,
                attributeModifierDescription,
            ].join(" ")
        )
    }

    drawInfoTextBox = (
        graphicsContext: GraphicsBuffer,
        top: number,
        text: string
    ) => {
        const lineBreaksFound: RegExpMatchArray = text?.match(/\n/gi)
        const numberOfLines: number = lineBreaksFound
            ? lineBreaksFound.length + 1
            : 1
        const buttonTextBox: TextBox = TextBoxService.new({
            area: RectAreaService.new({
                left: RectAreaService.left(this.buttonIcon.area),
                top: top,
                width: RectAreaService.width(this.buttonIcon.area) * 2,
                height:
                    DECISION_BUTTON_LAYOUT_COLORS.infoTextSize * numberOfLines +
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
    ): {
        damageDescription: string
        healingDescription: string
        attributeModifierDescription: string
    } => {
        const totalDamage = ActionTemplateService.getTotalDamage(actionTemplate)
        const totalHealing =
            ActionTemplateService.getTotalHealing(actionTemplate)
        const damageDescription = totalDamage > 0 ? `${totalDamage} damage` : ""
        const healingDescription =
            totalHealing > 0 ? `${totalHealing} healing` : ""

        const attributeModifierSums: {
            type: AttributeType
            amount: number
        }[] = AttributeModifierService.calculateCurrentAttributeModifiers(
            ActionTemplateService.getAttributeModifiers(actionTemplate)
        )

        const attributeModifierDescription = attributeModifierSums
            .map((attributeModifierDescription) =>
                AttributeModifierService.readableDescription(
                    attributeModifierDescription
                )
            )
            .join("\n")

        return {
            damageDescription,
            healingDescription,
            attributeModifierDescription,
        }
    }

    private shouldDrawActionPoints = (actionTemplate: ActionTemplate) => {
        return actionTemplate.actionPoints !== 1
    }

    private shouldDrawActionRange = (actionTemplate: ActionTemplate) => {
        const templateRange =
            ActionTemplateService.getActionTemplateRange(actionTemplate)
        const minRangeIsWorthDescribing =
            !isValidValue(templateRange) || templateRange[0] > 1
        const maxRangeIsWorthDescribing =
            !isValidValue(templateRange) || templateRange[1] > 1
        return minRangeIsWorthDescribing || maxRangeIsWorthDescribing
    }
    private shouldDrawActionTemplateEffects = (
        actionTemplate: ActionTemplate
    ) => {
        const totalDamage = ActionTemplateService.getTotalDamage(actionTemplate)
        const totalHealing =
            ActionTemplateService.getTotalHealing(actionTemplate)
        const attributeModifiers =
            ActionTemplateService.getAttributeModifiers(actionTemplate)

        return (
            totalDamage > 0 || totalHealing > 0 || attributeModifiers.length > 0
        )
    }
}
