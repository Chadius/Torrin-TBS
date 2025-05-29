import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
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
import { InBattleAttributesService } from "../../../../../stats/inBattleAttributes"
import {
    AttributeTypeAndAmount,
    AttributeTypeService,
} from "../../../../../../squaddie/attribute/attributeType"
import { DegreeOfSuccess } from "../../../../../calculator/actionCalculator/degreeOfSuccess"
import { ComponentDataBlob } from "../../../../../../utils/dataBlob/componentDataBlob"

export class CreateNextEffectsOfDegreesOfSuccessTextBoxAction
    implements BehaviorTreeTask
{
    dataBlob: ComponentDataBlob<
        ActionPreviewTileLayout,
        ActionPreviewTileContext,
        ActionPreviewTileUIObjects
    >

    constructor(
        blackboard: ComponentDataBlob<
            ActionPreviewTileLayout,
            ActionPreviewTileContext,
            ActionPreviewTileUIObjects
        >
    ) {
        this.dataBlob = blackboard
    }

    run(): boolean {
        const uiObjects = this.dataBlob.getUIObjects()
        let context: ActionPreviewTileContext = this.dataBlob.getContext()
        const degreesOfSuccessLayoutConstants =
            this.dataBlob.getLayout().degreesOfSuccess

        const effectsOfDegreesOfSuccessLayoutConstants =
            this.dataBlob.getLayout().effectsOfDegreesOfSuccess

        const namesOfDegreesOfSuccessLayoutConstants =
            this.dataBlob.getLayout().namesOfDegreesOfSuccess

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
                    blackboard: this.dataBlob,
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
                    left:
                        RectAreaService.left(boundingBox) +
                        namesOfDegreesOfSuccessLayoutConstants.width +
                        namesOfDegreesOfSuccessLayoutConstants.margin[1],
                    top,
                    width: effectsOfDegreesOfSuccessLayoutConstants.width,
                    height: degreesOfSuccessLayoutConstants.height,
                    margin: effectsOfDegreesOfSuccessLayoutConstants.margin,
                }),
                text: textInfo.text,
            }),
        })

        this.dataBlob.setUIObjects(uiObjects)
        return true
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
        (triesToDealDamage &&
            !dealsDamage &&
            [
                DegreeOfSuccess.CRITICAL_SUCCESS,
                DegreeOfSuccess.SUCCESS,
            ].includes(forecastedChange.actorDegreeOfSuccess)) ||
        (!triesToDealDamage && attributeModifierDifferences.length === 0)
    ) {
        return "NO DAMAGE"
    }

    let messageToShow = ""
    messageToShow = generateMessageForAttributeModifiers(
        attributeModifierDifferences,
        messageToShow
    )
    if (dealsDamage && !forecastedChange.damage.willKo) {
        messageToShow += `${forecastedChange.damage.net} damage`
    } else if (dealsDamage && forecastedChange.damage.willKo) {
        messageToShow += `KO!`
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
        ).filter((attributeTypeAndAmount) =>
            actionTemplate.actionEffectTemplates.some((actionEffectTemplate) =>
                actionEffectTemplate.attributeModifiers.some(
                    (modifier) => modifier.type === attributeTypeAndAmount.type
                )
            )
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
                if (AttributeTypeService.isBinary(typeAndAmount.type)) {
                    return `${AttributeTypeService.readableName(typeAndAmount.type)}`
                }
                return `${TextHandlingService.padPlusOnPositiveNumber(typeAndAmount.amount)} ${AttributeTypeService.readableName(typeAndAmount.type)}`
            }
        )
        messageToShow += attributeMessages.join(", ")
    }
    return messageToShow
}
