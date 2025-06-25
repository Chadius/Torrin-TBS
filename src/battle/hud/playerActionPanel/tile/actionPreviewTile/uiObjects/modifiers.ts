import { BehaviorTreeTask } from "../../../../../../utils/behaviorTree/task"
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
import { ComponentDataBlob } from "../../../../../../utils/dataBlob/componentDataBlob"

export class CreateLeftModifiersTextBoxAction implements BehaviorTreeTask {
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
        const modifiersLayoutConstants = this.dataBlob.getLayout().modifiers

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
            maximumWidth: modifiersLayoutConstants.leftColumn.width,
            graphicsContext: uiObjects.graphicsContext,
            fontDescription: {
                fontSizeRange: modifiersLayoutConstants.fontSizeRange,
                strokeWeight: modifiersLayoutConstants.strokeWeight,
            },
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

        this.dataBlob.setUIObjects(uiObjects)
        return true
    }
}

export class CreateRightModifiersTextBoxAction implements BehaviorTreeTask {
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
        const modifiersLayoutConstants = this.dataBlob.getLayout().modifiers

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
            maximumWidth: modifiersLayoutConstants.rightColumn.width,
            graphicsContext: uiObjects.graphicsContext,
            fontDescription: {
                strokeWeight: modifiersLayoutConstants.strokeWeight,
                fontSizeRange: modifiersLayoutConstants.fontSizeRange,
            },
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

        this.dataBlob.setUIObjects(uiObjects)
        return true
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
