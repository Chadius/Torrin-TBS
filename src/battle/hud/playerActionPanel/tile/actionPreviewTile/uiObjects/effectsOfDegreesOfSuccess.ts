import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
import {
    Blackboard,
    BlackboardService,
} from "../../../../../../utils/blackboard/blackboard"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "../../actionTilePosition"
import { ActionEffectTemplateService } from "../../../../../../action/template/actionEffectTemplate"
import { TextHandlingService } from "../../../../../../utils/graphics/textHandlingService"
import { TextBoxService } from "../../../../../../ui/textBox/textBox"
import { RectAreaService } from "../../../../../../ui/rectArea"
import {
    ActionPreviewTileContext,
    ActionPreviewTileLayout,
    ActionPreviewTileUIObjects,
} from "../actionPreviewTile"
import { ActionPreviewTileDegreesOfSuccessService } from "./degreesOfSuccess"
import {
    BattleActionSquaddieChange,
    BattleActionSquaddieChangeService,
} from "../../../../../history/battleAction/battleActionSquaddieChange"
import { ActionTemplate } from "../../../../../../action/template/actionTemplate"
import {
    AttributeModifierService,
    AttributeTypeAndAmount,
} from "../../../../../../squaddie/attributeModifier"
import { InBattleAttributesService } from "../../../../../stats/inBattleAttributes"

export class CreateNextEffectsOfDegreesOfSuccessTextBoxAction
    implements BehaviorTreeTask
{
    blackboard: Blackboard

    constructor(blackboard: Blackboard) {
        this.blackboard = blackboard
    }

    run(): boolean {
        const uiObjects = BlackboardService.get<ActionPreviewTileUIObjects>(
            this.blackboard,
            "uiObjects"
        )

        let context: ActionPreviewTileContext = BlackboardService.get(
            this.blackboard,
            "context"
        )

        const degreesOfSuccessLayoutConstants =
            BlackboardService.get<ActionPreviewTileLayout>(
                this.blackboard,
                "layout"
            ).degreesOfSuccess

        const effectsOfDegreesOfSuccessLayoutConstants =
            BlackboardService.get<ActionPreviewTileLayout>(
                this.blackboard,
                "layout"
            ).effectsOfDegreesOfSuccess

        const targetForecast = context.forecast.changesPerEffect[0]
        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )

        uiObjects.effectsOfDegreesOfSuccessTextBoxes ||= []
        const { forecastedChange, degreeOfSuccessToDraw } =
            ActionPreviewTileDegreesOfSuccessService.findNextDegreeOfSuccessToDraw(
                degreesOfSuccessLayoutConstants.rowOrder,
                uiObjects.effectsOfDegreesOfSuccessTextBoxes,
                targetForecast,
                context.actionTemplate
            )

        if (!degreeOfSuccessToDraw) return false

        let messageToShow: string
        if (
            ActionEffectTemplateService.doesItTargetFoes(
                context.actionTemplate.actionEffectTemplates[0]
            )
        ) {
            messageToShow = generateEffectMessageForFoe(
                forecastedChange,
                context.actionTemplate
            )
        } else {
            messageToShow = generateEffectMessageForFriendAndSelf(
                forecastedChange,
                context.actionTemplate
            )
        }

        const top =
            ActionPreviewTileDegreesOfSuccessService.calculateTopOfNextDegreesOfSuccessRow(
                {
                    blackboard: this.blackboard,
                    degreeOfSuccessUIObjects:
                        uiObjects.effectsOfDegreesOfSuccessTextBoxes,
                    boundingBox,
                }
            )

        const textInfo = TextHandlingService.fitTextWithinSpace({
            text: messageToShow,
            width: effectsOfDegreesOfSuccessLayoutConstants.width,
            graphicsContext: uiObjects.graphicsContext,
            fontSizeRange:
                effectsOfDegreesOfSuccessLayoutConstants.fontSizeRange,
            linesOfTextRange:
                effectsOfDegreesOfSuccessLayoutConstants.linesOfTextRange,
        })

        uiObjects.effectsOfDegreesOfSuccessTextBoxes.push({
            degreeOfSuccess: degreeOfSuccessToDraw.degreeOfSuccess,
            textBox: TextBoxService.new({
                fontColor: effectsOfDegreesOfSuccessLayoutConstants.fontColor,
                fontSize: textInfo.fontSize,
                area: RectAreaService.new({
                    right: RectAreaService.right(boundingBox),
                    top,
                    width: effectsOfDegreesOfSuccessLayoutConstants.width,
                    height: degreesOfSuccessLayoutConstants.height,
                    margin: effectsOfDegreesOfSuccessLayoutConstants.margin,
                }),
                text: textInfo.text,
                horizAlign: effectsOfDegreesOfSuccessLayoutConstants.horizAlign,
            }),
        })

        BlackboardService.add<ActionPreviewTileUIObjects>(
            this.blackboard,
            "uiObjects",
            uiObjects
        )

        return true
    }

    clone(): BehaviorTreeTask {
        return new CreateNextEffectsOfDegreesOfSuccessTextBoxAction(
            this.blackboard
        )
    }
}

const generateEffectMessageForFoe = (
    forecastedChange: BattleActionSquaddieChange,
    actionTemplate: ActionTemplate
): string => {
    const dealsDamage =
        BattleActionSquaddieChangeService.isSquaddieHindered(forecastedChange)
    const triesToDealDamage = actionTemplate.actionEffectTemplates.some(
        (template) =>
            Object.values(template.damageDescriptions).reduce(
                (sum, currentValue) => sum + currentValue,
                0
            ) > 0
    )

    const attributeModifierDifferences: AttributeTypeAndAmount[] =
        InBattleAttributesService.calculateAttributeModifiersGainedAfterChanges(
            forecastedChange.attributesBefore,
            forecastedChange.attributesAfter
        )

    if (
        (triesToDealDamage && !dealsDamage) ||
        (!triesToDealDamage && attributeModifierDifferences.length === 0)
    ) {
        return "NO DAMAGE"
    }

    let messageToShow = ""
    messageToShow = generateMessageForAttributeModifiers(
        attributeModifierDifferences,
        messageToShow
    )
    if (dealsDamage) {
        messageToShow += `${forecastedChange.damage.net} damage`
    }
    return messageToShow
}

const generateEffectMessageForFriendAndSelf = (
    forecastedChange: BattleActionSquaddieChange,
    actionTemplate: ActionTemplate
): string => {
    const healsTarget =
        BattleActionSquaddieChangeService.isSquaddieHelped(forecastedChange)
    const triesToHealTarget = actionTemplate.actionEffectTemplates.some(
        (template) =>
            template.healingDescriptions.LOST_HIT_POINTS !== undefined &&
            template.healingDescriptions.LOST_HIT_POINTS > 0
    )

    const attributeModifierDifferences: AttributeTypeAndAmount[] =
        InBattleAttributesService.calculateAttributeModifiersGainedAfterChanges(
            forecastedChange.attributesBefore,
            forecastedChange.attributesAfter
        )

    if (
        (triesToHealTarget && !healsTarget) ||
        (!triesToHealTarget && attributeModifierDifferences.length === 0)
    ) {
        return "NO CHANGE"
    }

    let messageToShow = ""
    messageToShow = generateMessageForAttributeModifiers(
        attributeModifierDifferences,
        messageToShow
    )
    if (healsTarget) {
        messageToShow += `${forecastedChange.healingReceived} heal`
    }
    return messageToShow
}

const generateMessageForAttributeModifiers = (
    attributeModifierDifferences: AttributeTypeAndAmount[],
    messageToShow: string
) => {
    if (attributeModifierDifferences.length > 0) {
        let attributeMessages = attributeModifierDifferences.map(
            (typeAndAmount) => {
                if (
                    AttributeModifierService.isAttributeTypeABinaryEffect(
                        typeAndAmount.type
                    )
                ) {
                    return `${AttributeModifierService.readableNameForAttributeType(typeAndAmount.type)}`
                }

                const printedAmount =
                    typeAndAmount.amount > 0
                        ? `+${typeAndAmount.amount}`
                        : `${typeAndAmount.amount}`
                return `${printedAmount} ${AttributeModifierService.readableNameForAttributeType(typeAndAmount.type)}`
            }
        )
        messageToShow += attributeMessages.join(", ")
    }
    return messageToShow
}
