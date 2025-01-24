import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
import {
    DataBlob,
    DataBlobService,
} from "../../../../../../utils/dataBlob/dataBlob"
import {
    RollModifierType,
    RollModifierTypeService,
} from "../../../../../calculator/actionCalculator/rollResult"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "../../actionTilePosition"
import { TextHandlingService } from "../../../../../../utils/graphics/textHandlingService"
import { TextBox, TextBoxService } from "../../../../../../ui/textBox/textBox"
import { RectArea, RectAreaService } from "../../../../../../ui/rectArea"
import { WINDOW_SPACING } from "../../../../../../ui/constants"
import {
    ActionPreviewTileContext,
    ActionPreviewTileLayout,
    ActionPreviewTileUIObjects,
} from "../actionPreviewTile"
import {
    AttributeTypeAndAmount,
    AttributeTypeService,
} from "../../../../../../squaddie/attribute/attributeType"

export class CreateLeftModifiersTextBoxAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(blackboard: DataBlob) {
        this.dataBlob = blackboard
    }

    run(): boolean {
        const uiObjects = DataBlobService.get<ActionPreviewTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )

        let context: ActionPreviewTileContext = DataBlobService.get(
            this.dataBlob,
            "context"
        )

        const modifiersLayoutConstants =
            DataBlobService.get<ActionPreviewTileLayout>(
                this.dataBlob,
                "layout"
            ).modifiers

        const leftSideRollModifiers =
            context.forecast.changesPerEffect[0].actorContext.actorRoll
                .rollModifiers || {}
        const leftSideActorAttributeModifiers =
            context.forecast.changesPerEffect[0].actorContext
                .actorAttributeModifiers || []
        const leftSideModifiers: {
            name: string
            amount: number | undefined
        }[] = [
            ...Object.entries(leftSideRollModifiers)
                .filter(([_, amount]) => amount !== 0)
                .map(([keyStr, amount]) => ({
                    name: RollModifierTypeService.readableName({
                        type: keyStr as RollModifierType,
                        abbreviate: true,
                    }),
                    amount,
                })),
            ...leftSideActorAttributeModifiers
                .filter(({ amount }) => amount != 0)
                .map(formatAttributeTypeAndAmount),
        ].sort(sortModifierDisplayDescending)

        uiObjects.modifiers ||= {
            leftSide: [],
            rightSide: [],
        }
        if (
            uiObjects.modifiers.leftSide.length >=
            modifiersLayoutConstants.leftColumn.limit
        )
            return false

        if (uiObjects.modifiers.leftSide.length >= leftSideModifiers.length)
            return false

        const modifierToShow =
            leftSideModifiers[uiObjects.modifiers.leftSide.length]
        let amountToShow: string = formatAmount(modifierToShow.amount)
        const messageToShow = `${amountToShow}${modifierToShow.name}`

        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )

        const bottom = calculateBottomOfModifierList(
            uiObjects.modifiers.leftSide,
            boundingBox
        )

        const textInfo = TextHandlingService.fitTextWithinSpace({
            text: messageToShow,
            width: modifiersLayoutConstants.leftColumn.width,
            graphicsContext: uiObjects.graphicsContext,
            fontSizeRange: modifiersLayoutConstants.fontSizeRange,
            linesOfTextRange: modifiersLayoutConstants.linesOfTextRange,
        })

        uiObjects.modifiers.leftSide.push(
            TextBoxService.new({
                fontColor: modifiersLayoutConstants.fontColor,
                fontSize: textInfo.fontSize,
                area: RectAreaService.new({
                    right: RectAreaService.centerX(boundingBox),
                    bottom,
                    width: modifiersLayoutConstants.leftColumn.width,
                    height: modifiersLayoutConstants.height,
                    margin: modifiersLayoutConstants.leftColumn.margin,
                }),
                text: textInfo.text,
                horizAlign: modifiersLayoutConstants.leftColumn.horizAlign,
            })
        )

        DataBlobService.add<ActionPreviewTileUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )

        return true
    }

    clone(): BehaviorTreeTask {
        return new CreateLeftModifiersTextBoxAction(this.dataBlob)
    }
}

export class CreateRightModifiersTextBoxAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(blackboard: DataBlob) {
        this.dataBlob = blackboard
    }

    run(): boolean {
        const uiObjects = DataBlobService.get<ActionPreviewTileUIObjects>(
            this.dataBlob,
            "uiObjects"
        )

        let context: ActionPreviewTileContext = DataBlobService.get(
            this.dataBlob,
            "context"
        )

        const modifiersLayoutConstants =
            DataBlobService.get<ActionPreviewTileLayout>(
                this.dataBlob,
                "layout"
            ).modifiers

        const rightSideTargetAttributeModifiers =
            context.forecast.changesPerEffect[0].actorContext
                .targetAttributeModifiers[context.focusedBattleSquaddieId] || []
        const rightSideModifiers: {
            name: string
            amount: number | undefined
        }[] = rightSideTargetAttributeModifiers
            .filter(({ amount }) => amount != 0)
            .map(formatAttributeTypeAndAmount)
            .sort(sortModifierDisplayDescending)

        uiObjects.modifiers ||= {
            leftSide: [],
            rightSide: [],
        }
        if (
            uiObjects.modifiers.rightSide.length >=
            modifiersLayoutConstants.rightColumn.limit
        )
            return false

        if (uiObjects.modifiers.rightSide.length >= rightSideModifiers.length)
            return false

        const modifierToShow =
            rightSideModifiers[uiObjects.modifiers.rightSide.length]
        let amountToShow: string = formatAmount(modifierToShow.amount)
        const messageToShow = `${amountToShow}${modifierToShow.name}`

        const boundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                ActionTilePosition.ACTION_PREVIEW
            )

        const bottom = calculateBottomOfModifierList(
            uiObjects.modifiers.rightSide,
            boundingBox
        )

        const textInfo = TextHandlingService.fitTextWithinSpace({
            text: messageToShow,
            width: modifiersLayoutConstants.rightColumn.width,
            graphicsContext: uiObjects.graphicsContext,
            fontSizeRange: modifiersLayoutConstants.fontSizeRange,
            linesOfTextRange: modifiersLayoutConstants.linesOfTextRange,
        })

        uiObjects.modifiers.rightSide.push(
            TextBoxService.new({
                fontColor: modifiersLayoutConstants.fontColor,
                fontSize: textInfo.fontSize,
                area: RectAreaService.new({
                    left: RectAreaService.centerX(boundingBox),
                    bottom,
                    width: modifiersLayoutConstants.rightColumn.width,
                    height: modifiersLayoutConstants.height,
                    margin: modifiersLayoutConstants.rightColumn.margin,
                }),
                text: textInfo.text,
            })
        )

        DataBlobService.add<ActionPreviewTileUIObjects>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )

        return true
    }

    clone(): BehaviorTreeTask {
        return new CreateRightModifiersTextBoxAction(this.dataBlob)
    }
}

const sortModifierDisplayDescending = (
    a: { name: string; amount: number | undefined },
    b: { name: string; amount: number | undefined }
) => {
    switch (true) {
        case a === undefined:
            return 1
        case b === undefined:
            return -1
        default:
            return a < b ? -1 : 1
    }
}

const formatAttributeTypeAndAmount = ({
    amount,
    type,
}: AttributeTypeAndAmount): {
    name: string
    amount: number | undefined
} => ({
    name: AttributeTypeService.readableName(type),
    amount: AttributeTypeService.isBinary(type) ? undefined : amount,
})

const formatAmount = (amount: number | undefined) => {
    if (amount == undefined) return ""
    return TextHandlingService.padPlusOnPositiveNumber(amount) + " "
}

const calculateBottomOfModifierList = (
    modifierTextBoxes: TextBox[],
    boundingBox: RectArea
) =>
    modifierTextBoxes.length > 0
        ? RectAreaService.top(
              modifierTextBoxes[modifierTextBoxes.length - 1].area
          )
        : RectAreaService.bottom(boundingBox) - WINDOW_SPACING.SPACING1
