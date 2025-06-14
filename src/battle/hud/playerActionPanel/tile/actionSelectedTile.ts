import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import { getResultOrThrowError } from "../../../../utils/ResultOrError"
import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "./actionTilePosition"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import { RectArea, RectAreaService } from "../../../../ui/rectArea"
import { WINDOW_SPACING } from "../../../../ui/constants"
import { isValidValue } from "../../../../utils/objectValidityCheck"
import { TextBox, TextBoxService } from "../../../../ui/textBox/textBox"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../graphicsConstants"
import {
    FontSizeRange,
    LinesOfTextRange,
    TextHandlingService,
} from "../../../../utils/graphics/textHandlingService"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../../action/template/actionTemplate"
import { AttributeModifierService } from "../../../../squaddie/attribute/attributeModifier"
import {
    AttributeType,
    AttributeTypeService,
} from "../../../../squaddie/attribute/attributeType"

// TODO Must update text constraints, must break up on lines (do this in a separate branch)
// TODO Must update text constraints, add an optional maximum size (do this in a separate branch)

type ActionSelectedTileLayout = {
    actionNameText: {
        fontSizeRange: FontSizeRange
        linesOfTextRange: LinesOfTextRange
    }
    information: {
        fontSizeRange: FontSizeRange
        linesOfTextRange: LinesOfTextRange
        topMargin: number
        variableNameFontColor: number[]
        amountLeftOffsetRatio: number
        amountFontColor: number[]
    }
    description: {
        fontSizeRange: FontSizeRange
        linesOfTextRange: LinesOfTextRange
        bottomMargin: number
    }
}

const layoutConstants: ActionSelectedTileLayout = {
    actionNameText: {
        fontSizeRange: {
            preferred: 24,
            minimum: 10,
        },
        linesOfTextRange: { minimum: 1 },
    },
    information: {
        fontSizeRange: {
            preferred: 10,
            minimum: 10,
        },
        linesOfTextRange: { minimum: 1 },
        topMargin: 2,
        variableNameFontColor: [0, 0, 192 - 64],
        amountLeftOffsetRatio: 0.7,
        amountFontColor: [0, 0, 192 - 48],
    },
    description: {
        fontSizeRange: {
            preferred: 10,
            minimum: 10,
        },
        linesOfTextRange: { minimum: 1 },
        bottomMargin: WINDOW_SPACING.SPACING2,
    },
}

export interface ActionSelectedTile {
    actionName: string
    horizontalPosition: ActionTilePosition
    squaddieAffiliation: SquaddieAffiliation
    buttonIconResourceName: string
    actionNameTextBox?: TextBox
    actionDescriptionTextBox?: TextBox
    actionTemplateId: string
    actionInformationTextBoxes: TextBox[]
}

export const ActionSelectedTileService = {
    new: ({
        objectRepository,
        battleSquaddieId,
        horizontalPosition,
        actionTemplateId,
    }: {
        objectRepository: ObjectRepository
        battleSquaddieId: string
        horizontalPosition: ActionTilePosition
        actionTemplateId: string
    }): ActionSelectedTile => {
        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            actionTemplateId
        )

        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                battleSquaddieId
            )
        )

        return {
            squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
            actionName: actionTemplate.name,
            horizontalPosition,
            buttonIconResourceName: actionTemplate.buttonIconResourceKey,
            actionTemplateId,
            actionInformationTextBoxes: [],
        }
    },
    draw: ({
        tile,
        graphicsContext,
        objectRepository,
    }: {
        tile: ActionSelectedTile
        graphicsContext: GraphicsBuffer
        objectRepository: ObjectRepository
    }) => {
        ActionTilePositionService.drawBackground({
            squaddieAffiliation: tile.squaddieAffiliation,
            graphicsContext,
            horizontalPosition: tile.horizontalPosition,
        })
        createActionNameTextBox(tile, graphicsContext)
        drawActionNameTextBox(tile, graphicsContext)

        createActionInformationTextBoxes({
            tile: tile,
            graphicsContext: graphicsContext,
            objectRepository,
        })
        drawActionInformationTextBoxes(tile, graphicsContext)

        createActionTemplateDescriptionTextBox({
            tile,
            graphicsContext,
            objectRepository,
        })
        drawActionTemplateDescriptionTextBox(tile, graphicsContext)
    },
}

const createActionNameTextBox = (
    tile: ActionSelectedTile,
    graphicsContext: GraphicsBuffer
) => {
    if (tile.actionNameTextBox) return

    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            tile.horizontalPosition
        )
    const squaddieAffiliationHue: number =
        HUE_BY_SQUADDIE_AFFILIATION[tile.squaddieAffiliation]
    const textColor = [squaddieAffiliationHue, 7, 192]

    const textInfo = TextHandlingService.fitTextWithinSpace({
        text: tile.actionName,
        maximumWidth:
            RectAreaService.width(overallBoundingBox) - WINDOW_SPACING.SPACING2,
        graphicsContext,
        fontSizeRange: layoutConstants.actionNameText.fontSizeRange,
        linesOfTextRange: layoutConstants.actionNameText.linesOfTextRange,
    })

    tile.actionNameTextBox = TextBoxService.new({
        text: textInfo.text,
        fontSize: textInfo.fontSize,
        fontColor: textColor,
        area: RectAreaService.new({
            left:
                RectAreaService.left(overallBoundingBox) +
                WINDOW_SPACING.SPACING1,
            top:
                RectAreaService.top(overallBoundingBox) +
                WINDOW_SPACING.SPACING1,
            width:
                RectAreaService.width(overallBoundingBox) -
                WINDOW_SPACING.SPACING2,
            height: textInfo.fontSize * textInfo.text.split("\n").length,
        }),
    })
}

const drawActionNameTextBox = (
    tile: ActionSelectedTile,
    graphicsContext: GraphicsBuffer
) => {
    if (!isValidValue(tile.actionNameTextBox)) return
    TextBoxService.draw(tile.actionNameTextBox, graphicsContext)
}

const createActionInformationTextBoxes = ({
    tile,
    graphicsContext,
    objectRepository,
}: {
    tile: ActionSelectedTile
    graphicsContext: GraphicsBuffer
    objectRepository: ObjectRepository
}) => {
    const actionTemplate = ObjectRepositoryService.getActionTemplateById(
        objectRepository,
        tile.actionTemplateId
    )
    if (!actionTemplate) return
    if (tile.actionInformationTextBoxes.length > 0) return

    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            tile.horizontalPosition
        )

    let top =
        RectAreaService.top(overallBoundingBox) +
        WINDOW_SPACING.SPACING1 +
        layoutConstants.actionNameText.fontSizeRange.preferred

    const actionPointCostBottom = createActionPointCostTextBoxesAndGetBottom({
        graphicsContext,
        actionTemplate,
        tile,
        top,
    })
    top = actionPointCostBottom + layoutConstants.information.topMargin

    const rangesBottom = createRangeTextBoxesAndGetBottom({
        graphicsContext,
        actionTemplate,
        tile,
        top,
    })
    top = rangesBottom + layoutConstants.information.topMargin

    if (shouldDrawActionsPerRound(actionTemplate)) {
        const perRoundBottom = createActionsPerRoundTextBox({
            tile,
            graphicsContext,
            actionTemplate,
            top,
        })
        top = perRoundBottom + layoutConstants.information.topMargin
    }

    if (shouldDrawCooldown(actionTemplate)) {
        const cooldownBottom = createCooldownTextBox({
            graphicsContext,
            actionTemplate,
            tile,
            top,
        })
        top = cooldownBottom + layoutConstants.information.topMargin
    }

    if (shouldDrawDamageOrHealing(actionTemplate)) {
        const damageOrHealingBottom = createDamageOrHealingTextBoxes({
            graphicsContext,
            actionTemplate,
            tile,
            top,
        })
        top = damageOrHealingBottom + layoutConstants.information.topMargin
    }

    if (shouldDrawActionTemplateEffects(actionTemplate)) {
        createActionTemplateEffectTextBox({
            graphicsContext,
            actionTemplate,
            tile,
            top,
        })
    }
}

const createActionPointCostTextBoxesAndGetBottom = ({
    tile,
    graphicsContext,
    actionTemplate,
    top,
}: {
    tile: ActionSelectedTile
    graphicsContext: GraphicsBuffer
    actionTemplate: ActionTemplate
    top: number
}): number => {
    const textBoxAreas = createNameAndAmountTextBoxes({
        tile,
        graphicsContext,
        top,
        variableName: `AP`,
        variableAmountDescription: `${actionTemplate.resourceCost.actionPoints}`,
    })
    return Math.max(...textBoxAreas.map((area) => RectAreaService.bottom(area)))
}

const createNameAndAmountTextBoxes = ({
    tile,
    graphicsContext,
    top,
    variableName,
    variableAmountDescription,
}: {
    tile: ActionSelectedTile
    graphicsContext: GraphicsBuffer
    top: number
    variableName?: string
    variableAmountDescription?: string
}): RectArea[] => {
    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            tile.horizontalPosition
        )
    const overallWidth =
        RectAreaService.width(overallBoundingBox) - WINDOW_SPACING.SPACING2
    const textBoxAreas: RectArea[] = []

    if (!variableName) return textBoxAreas
    textBoxAreas.push(
        createInformationTextBox({
            tile,
            textFitting: {
                text: variableName,
                widthRatio: layoutConstants.information.amountLeftOffsetRatio,
                graphicsContext,
                fontSizeRange: layoutConstants.information.fontSizeRange,
                linesOfTextRange: layoutConstants.information.linesOfTextRange,
            },
            textBox: {
                leftOffset: 0,
                topOffset: top,
                fontColor: layoutConstants.information.variableNameFontColor,
            },
        })
    )

    if (!variableAmountDescription) return textBoxAreas

    textBoxAreas.push(
        createInformationTextBox({
            tile,
            textFitting: {
                text: variableAmountDescription,
                widthRatio:
                    1 - layoutConstants.information.amountLeftOffsetRatio,
                graphicsContext,
                fontSizeRange: layoutConstants.information.fontSizeRange,
                linesOfTextRange: layoutConstants.information.linesOfTextRange,
            },
            textBox: {
                leftOffset:
                    overallWidth *
                    layoutConstants.information.amountLeftOffsetRatio,
                topOffset: top,
                fontColor: layoutConstants.information.amountFontColor,
            },
        })
    )

    return textBoxAreas
}

const createActionsPerRoundTextBox = ({
    tile,
    graphicsContext,
    actionTemplate,
    top,
}: {
    tile: ActionSelectedTile
    graphicsContext: GraphicsBuffer
    actionTemplate: ActionTemplate
    top: number
}) => {
    const textBoxAreas = createNameAndAmountTextBoxes({
        tile,
        graphicsContext,
        top,
        variableName: `Per round`,
        variableAmountDescription: `${actionTemplate.resourceCost.numberOfTimesPerRound}`,
    })
    return Math.max(...textBoxAreas.map((area) => RectAreaService.bottom(area)))
}

const createInformationTextBox = ({
    tile,
    textFitting: {
        text,
        widthRatio,
        graphicsContext,
        fontSizeRange,
        linesOfTextRange,
    },
    textBox: { leftOffset, topOffset, fontColor },
}: {
    tile: ActionSelectedTile
    textFitting: {
        text: string
        widthRatio: number
        graphicsContext: GraphicsBuffer
        fontSizeRange: FontSizeRange
        linesOfTextRange: LinesOfTextRange
    }
    textBox: {
        leftOffset: number
        topOffset: number
        fontColor: number[]
    }
}): RectArea => {
    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            tile.horizontalPosition
        )

    const availableTextWidth =
        (RectAreaService.width(overallBoundingBox) - WINDOW_SPACING.SPACING2) *
        widthRatio

    const textInfo = TextHandlingService.fitTextWithinSpace({
        text,
        maximumWidth: availableTextWidth,
        graphicsContext,
        fontSizeRange,
        linesOfTextRange,
    })

    const textBox: TextBox = TextBoxService.new({
        ...textInfo,
        area: RectAreaService.new({
            left:
                RectAreaService.left(overallBoundingBox) +
                WINDOW_SPACING.SPACING1 +
                leftOffset,
            width: textInfo.width,
            top: topOffset,
            height: textInfo.text.split("\n").length * textInfo.fontSize,
        }),
        fontColor,
    })

    tile.actionInformationTextBoxes.push(textBox)
    return textBox.area
}

const createCooldownTextBox = ({
    tile,
    graphicsContext,
    actionTemplate,
    top,
}: {
    tile: ActionSelectedTile
    graphicsContext: GraphicsBuffer
    actionTemplate: ActionTemplate
    top: number
}) => {
    const cooldownTurns: number = actionTemplate.resourceCost.cooldownTurns
    const textBoxAreas = createNameAndAmountTextBoxes({
        tile,
        graphicsContext,
        top,
        variableName: `Cooldown`,
        variableAmountDescription: `${cooldownTurns}`,
    })
    return Math.max(...textBoxAreas.map((area) => RectAreaService.bottom(area)))
}

const createRangeTextBoxesAndGetBottom = ({
    tile,
    graphicsContext,
    actionTemplate,
    top,
}: {
    tile: ActionSelectedTile
    graphicsContext: GraphicsBuffer
    actionTemplate: ActionTemplate
    top: number
}): number => {
    const templateRange =
        ActionTemplateService.getActionTemplateRange(actionTemplate)
    const minimumRange = isValidValue(templateRange) ? templateRange[0] : 0
    const maximumRange = isValidValue(templateRange) ? templateRange[1] : 0

    let rangeNameText = `Range`
    let showRangeAmount = true
    switch (true) {
        case minimumRange <= 1 && maximumRange == 1:
            rangeNameText = "Melee"
            showRangeAmount = false
            break
        case minimumRange == 0 && maximumRange == 0:
            rangeNameText = "Self Only"
            showRangeAmount = false
            break
    }

    const textBoxAreas = createNameAndAmountTextBoxes({
        tile,
        graphicsContext,
        top,
        variableName: rangeNameText,
        variableAmountDescription: showRangeAmount
            ? `${minimumRange}-${maximumRange}`
            : undefined,
    })
    return Math.max(...textBoxAreas.map((area) => RectAreaService.bottom(area)))
}

const createDamageOrHealingTextBoxes = ({
    tile,
    graphicsContext,
    actionTemplate,
    top,
}: {
    tile: ActionSelectedTile
    graphicsContext: GraphicsBuffer
    actionTemplate: ActionTemplate
    top: number
}) => {
    const totalDamage = ActionTemplateService.getTotalDamage(actionTemplate)
    const totalHealing = ActionTemplateService.getTotalHealing(actionTemplate)

    const textBoxAreas = createNameAndAmountTextBoxes({
        tile,
        graphicsContext,
        top,
        variableName: totalDamage > 0 ? "Damage" : "Healing",
        variableAmountDescription:
            totalDamage > 0 ? `${totalDamage}` : `${totalHealing}`,
    })
    return Math.max(...textBoxAreas.map((area) => RectAreaService.bottom(area)))
}

const createActionTemplateEffectTextBox = ({
    tile,
    graphicsContext,
    actionTemplate,
    top,
}: {
    tile: ActionSelectedTile
    graphicsContext: GraphicsBuffer
    actionTemplate: ActionTemplate
    top: number
}) => {
    const attributeModifierSums: {
        type: AttributeType
        amount: number
    }[] = AttributeModifierService.calculateCurrentAttributeModifiers(
        ActionTemplateService.getAttributeModifiers(actionTemplate)
    )

    let textBoxTop = top
    const textBoxAreas = attributeModifierSums.reduce(
        (allTextBoxRectAreas: RectArea[], currentDescription) => {
            const textBoxAreas = createNameAndAmountTextBoxes({
                tile,
                graphicsContext,
                top: textBoxTop,
                variableName: AttributeTypeService.readableName(
                    currentDescription.type
                ),
                variableAmountDescription: AttributeTypeService.isBinary(
                    currentDescription.type
                )
                    ? undefined
                    : `${TextHandlingService.padPlusOnPositiveNumber(currentDescription.amount)}`,
            })

            allTextBoxRectAreas.push(...textBoxAreas)

            textBoxTop =
                Math.max(
                    ...textBoxAreas.map((area) => RectAreaService.bottom(area))
                ) + layoutConstants.information.topMargin

            return allTextBoxRectAreas
        },
        []
    )
    return Math.max(...textBoxAreas.map((area) => RectAreaService.bottom(area)))
}

const shouldDrawActionsPerRound = (actionTemplate: ActionTemplate) =>
    actionTemplate.resourceCost.numberOfTimesPerRound != undefined

const shouldDrawCooldown = (actionTemplate: ActionTemplate) =>
    actionTemplate.resourceCost.cooldownTurns != undefined &&
    actionTemplate.resourceCost.cooldownTurns > 0

const shouldDrawDamageOrHealing = (actionTemplate: ActionTemplate) => {
    const totalDamage = ActionTemplateService.getTotalDamage(actionTemplate)
    const totalHealing = ActionTemplateService.getTotalHealing(actionTemplate)
    return totalDamage > 0 || totalHealing > 0
}

const shouldDrawActionTemplateEffects = (actionTemplate: ActionTemplate) => {
    const attributeModifiers =
        ActionTemplateService.getAttributeModifiers(actionTemplate)
    return attributeModifiers.length > 0
}

const drawActionInformationTextBoxes = (
    tile: ActionSelectedTile,
    graphicsContext: GraphicsBuffer
) => {
    tile?.actionInformationTextBoxes.forEach((textBox) => {
        TextBoxService.draw(textBox, graphicsContext)
    })
}

const createActionTemplateDescriptionTextBox = ({
    tile,
    graphicsContext,
    objectRepository,
}: {
    tile: ActionSelectedTile
    graphicsContext: GraphicsBuffer
    objectRepository: ObjectRepository
}) => {
    if (tile.actionDescriptionTextBox) return

    const actionTemplate = ObjectRepositoryService.getActionTemplateById(
        objectRepository,
        tile.actionTemplateId
    )
    if (!actionTemplate) return

    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            tile.horizontalPosition
        )
    const squaddieAffiliationHue: number =
        HUE_BY_SQUADDIE_AFFILIATION[tile.squaddieAffiliation]
    const textColor = [squaddieAffiliationHue, 7, 192]

    const textInfo = TextHandlingService.fitTextWithinSpace({
        text: actionTemplate.userReadableDescription,
        maximumWidth:
            RectAreaService.width(overallBoundingBox) - WINDOW_SPACING.SPACING2,
        graphicsContext,
        fontSizeRange: layoutConstants.description.fontSizeRange, // TODO use different constants for the description should be smaller
        linesOfTextRange: layoutConstants.description.linesOfTextRange, // TODO use different constants for the description should have 3 lines
    })

    tile.actionDescriptionTextBox = TextBoxService.new({
        text: textInfo.text,
        fontSize: textInfo.fontSize,
        fontColor: textColor,
        area: RectAreaService.new({
            left:
                RectAreaService.left(overallBoundingBox) +
                WINDOW_SPACING.SPACING1,
            width:
                RectAreaService.width(overallBoundingBox) -
                WINDOW_SPACING.SPACING2,
            bottom:
                RectAreaService.bottom(overallBoundingBox) -
                layoutConstants.description.bottomMargin,
            height: textInfo.fontSize * textInfo.text.split("\n").length,
        }),
    })
}

const drawActionTemplateDescriptionTextBox = (
    tile: ActionSelectedTile,
    graphicsContext: GraphicsBuffer
) => {
    if (isValidValue(tile.actionDescriptionTextBox)) {
        TextBoxService.draw(tile.actionDescriptionTextBox, graphicsContext)
    }
}
