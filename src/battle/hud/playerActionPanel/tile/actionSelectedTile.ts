import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import { getResultOrThrowError } from "../../../../utils/ResultOrError"
import { ResourceHandler } from "../../../../resource/resourceHandler"
import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "./actionTilePosition"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import {
    ImageUI,
    ImageUILoadingBehavior,
    ImageUIService,
} from "../../../../ui/imageUI/imageUI"
import { RectArea, RectAreaService } from "../../../../ui/rectArea"
import { WINDOW_SPACING } from "../../../../ui/constants"
import { isValidValue } from "../../../../utils/objectValidityCheck"
import { TextBox, TextBoxService } from "../../../../ui/textBox/textBox"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../graphicsConstants"
import { TextHandlingService } from "../../../../utils/graphics/textHandlingService"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../../action/template/actionTemplate"
import { AttributeModifierService } from "../../../../squaddie/attribute/attributeModifier"
import { AttributeType } from "../../../../squaddie/attribute/attributeType"

const layoutConstants = {
    actionNameText: {
        fontSizeRange: {
            preferred: 24,
            minimum: 10,
        },
        linesOfTextRange: { minimum: 1 },
    },
    actionIcon: {
        defaultTop: 24,
    },
    actionDescription: {
        fontSizeRange: {
            preferred: 10,
            minimum: 10,
        },
        linesOfTextRange: { minimum: 1 },
        topMargin: 2,
        fontColor: [0, 0, 192 - 64],
    },
}

export interface ActionSelectedTile {
    actionName: string
    horizontalPosition: ActionTilePosition
    squaddieAffiliation: SquaddieAffiliation
    buttonIconResourceName: string
    actionIconImage?: ImageUI
    actionNameTextBox?: TextBox
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
        resourceHandler,
        objectRepository,
    }: {
        tile: ActionSelectedTile
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
        objectRepository: ObjectRepository
    }) => {
        ActionTilePositionService.drawBackground({
            squaddieAffiliation: tile.squaddieAffiliation,
            graphicsContext,
            horizontalPosition: tile.horizontalPosition,
        })
        createActionNameTextBox(tile, graphicsContext)
        drawActionNameTextBox(tile, graphicsContext)

        createActionIconImage(tile)
        repositionActionIconImageUnderActionNameTextBox(tile)
        drawActionIconImage({
            tile: tile,
            graphicsContext: graphicsContext,
            resourceHandler: resourceHandler,
        })
        createActionInformationTextBoxes({
            tile: tile,
            graphicsContext: graphicsContext,
            objectRepository,
        })
        repositionActionInformationTextBoxesUnderActionIconImage(tile)
        drawActionInformationTextBoxes(tile, graphicsContext)
    },
}

const createActionIconImage = (tile: ActionSelectedTile) => {
    if (tile.actionIconImage) return

    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            tile.horizontalPosition
        )

    tile.actionIconImage = new ImageUI({
        imageLoadingBehavior: {
            resourceKey: tile.buttonIconResourceName,
            loadingBehavior: ImageUILoadingBehavior.USE_CUSTOM_AREA_CALLBACK,
            customAreaCallback: ({
                imageSize,
                originalArea,
            }: {
                imageSize: { width: number; height: number }
                originalArea: RectArea
            }): RectArea => {
                const imageWidth = Math.min(
                    imageSize.width,
                    RectAreaService.width(overallBoundingBox)
                )
                const imageHeight = ImageUIService.scaleImageHeight({
                    desiredWidth: imageWidth,
                    imageWidth: imageSize.width,
                    imageHeight: imageSize.height,
                })

                return RectAreaService.new({
                    centerX: RectAreaService.centerX(originalArea),
                    top: RectAreaService.top(originalArea),
                    width: imageWidth,
                    height: imageHeight,
                })
            },
        },
        area: RectAreaService.new({
            left: RectAreaService.left(overallBoundingBox),
            top:
                RectAreaService.top(overallBoundingBox) +
                layoutConstants.actionIcon.defaultTop,
            width: RectAreaService.width(overallBoundingBox),
            height: 0,
        }),
    })
}

const repositionActionIconImageUnderActionNameTextBox = (
    tile: ActionSelectedTile
) => {
    if (!tile.actionNameTextBox) return

    RectAreaService.move(tile.actionIconImage.drawArea, {
        left: RectAreaService.left(tile.actionIconImage.drawArea),
        top:
            RectAreaService.bottom(tile.actionNameTextBox.area) +
            WINDOW_SPACING.SPACING1,
    })
}

const repositionActionInformationTextBoxesUnderActionIconImage = (
    tile: ActionSelectedTile
) => {
    if (!tile.actionIconImage) return
    if (!tile.actionIconImage.isImageLoaded()) return
    if (tile.actionInformationTextBoxes.length === 0) return

    RectAreaService.move(tile.actionInformationTextBoxes[0].area, {
        left: RectAreaService.left(tile.actionInformationTextBoxes[0].area),
        top:
            RectAreaService.bottom(tile.actionIconImage.drawArea) +
            WINDOW_SPACING.SPACING1,
    })

    for (let i = 1; i < tile.actionInformationTextBoxes.length; i++) {
        RectAreaService.move(tile.actionInformationTextBoxes[i].area, {
            left: RectAreaService.left(tile.actionInformationTextBoxes[i].area),
            top:
                RectAreaService.bottom(
                    tile.actionInformationTextBoxes[i - 1].area
                ) + WINDOW_SPACING.SPACING1,
        })
    }
}

const drawActionIconImage = ({
    tile,
    graphicsContext,
    resourceHandler,
}: {
    tile: ActionSelectedTile
    graphicsContext: GraphicsBuffer
    resourceHandler: ResourceHandler
}) => {
    tile.actionIconImage.draw({ graphicsContext, resourceHandler })
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
        width:
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

    let top =
        RectAreaService.bottom(tile.actionIconImage.drawArea) +
        WINDOW_SPACING.SPACING1
    if (shouldDrawActionPoints(actionTemplate)) {
        createActionPointCostTextBoxUnderIcon({
            tile,
            graphicsContext,
            actionTemplate,
            top,
        })
        top +=
            RectAreaService.height(
                tile.actionInformationTextBoxes[
                    tile.actionInformationTextBoxes.length - 1
                ].area
            ) + WINDOW_SPACING.SPACING1
    }

    if (shouldDrawActionsPerRound(actionTemplate)) {
        createActionsPerRoundTextBox({
            tile,
            graphicsContext,
            actionTemplate,
            top,
        })
        top +=
            RectAreaService.height(
                tile.actionInformationTextBoxes[
                    tile.actionInformationTextBoxes.length - 1
                ].area
            ) + WINDOW_SPACING.SPACING1
    }

    if (shouldDrawCooldown(actionTemplate)) {
        createCooldownTextBox({
            graphicsContext,
            actionTemplate,
            tile,
            top,
        })
        top +=
            RectAreaService.height(
                tile.actionInformationTextBoxes[
                    tile.actionInformationTextBoxes.length - 1
                ].area
            ) + WINDOW_SPACING.SPACING1
    }

    if (shouldDrawActionRange(actionTemplate)) {
        createActionRangeTextBox({
            graphicsContext,
            actionTemplate,
            tile,
            top,
        })
        top +=
            RectAreaService.height(
                tile.actionInformationTextBoxes[
                    tile.actionInformationTextBoxes.length - 1
                ].area
            ) + WINDOW_SPACING.SPACING1
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

const createActionPointCostTextBoxUnderIcon = ({
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
    const text = `Action Points: ${actionTemplate.resourceCost.actionPoints}`
    createActionDescriptionTextBoxAndAdd({
        tile: tile,
        text: text,
        graphicsContext: graphicsContext,
        top,
    })
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
    const text = `${actionTemplate.resourceCost.numberOfTimesPerRound} per round`
    createActionDescriptionTextBoxAndAdd({
        tile: tile,
        text: text,
        graphicsContext: graphicsContext,
        top,
    })
}

const createActionDescriptionTextBoxAndAdd = ({
    tile,
    text,
    graphicsContext,
    top,
}: {
    tile: ActionSelectedTile
    text: string
    graphicsContext: GraphicsBuffer
    top: number
}) => {
    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            tile.horizontalPosition
        )

    const textInfo = TextHandlingService.fitTextWithinSpace({
        text,
        width:
            RectAreaService.width(overallBoundingBox) - WINDOW_SPACING.SPACING2,
        graphicsContext,
        fontSizeRange: layoutConstants.actionDescription.fontSizeRange,
        linesOfTextRange: layoutConstants.actionDescription.linesOfTextRange,
    })

    tile.actionInformationTextBoxes.push(
        TextBoxService.new({
            area: RectAreaService.new({
                left:
                    RectAreaService.left(overallBoundingBox) +
                    WINDOW_SPACING.SPACING1,
                top,
                width: textInfo.width,
                height: textInfo.text.split("\n").length * textInfo.fontSize,
            }),
            fontColor: layoutConstants.actionDescription.fontColor,
            text: textInfo.text,
            fontSize: textInfo.fontSize,
        })
    )
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
    const text =
        cooldownTurns == 1
            ? "Cooldown: next turn"
            : `Cooldown: ${cooldownTurns}turns`

    createActionDescriptionTextBoxAndAdd({
        tile: tile,
        text: text,
        graphicsContext: graphicsContext,
        top,
    })
}

const createActionRangeTextBox = ({
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
    const templateRange =
        ActionTemplateService.getActionTemplateRange(actionTemplate)
    const minimumRange = isValidValue(templateRange) ? templateRange[0] : 0
    const maximumRange = isValidValue(templateRange) ? templateRange[1] : 0

    const text = `Range: ${minimumRange} - ${maximumRange}`

    createActionDescriptionTextBoxAndAdd({
        tile: tile,
        text: text,
        graphicsContext: graphicsContext,
        top,
    })
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
    const {
        damageDescription,
        healingDescription,
        attributeModifierDescription,
    } = getActionTemplateEffectDescriptions(actionTemplate)

    const text = [
        damageDescription,
        healingDescription,
        attributeModifierDescription,
    ].join(" ")

    createActionDescriptionTextBoxAndAdd({
        tile: tile,
        text: text,
        graphicsContext: graphicsContext,
        top,
    })
}

const getActionTemplateEffectDescriptions = (
    actionTemplate: ActionTemplate
): {
    damageDescription: string
    healingDescription: string
    attributeModifierDescription: string
} => {
    const totalDamage = ActionTemplateService.getTotalDamage(actionTemplate)
    const totalHealing = ActionTemplateService.getTotalHealing(actionTemplate)
    const damageDescription = totalDamage > 0 ? `${totalDamage} damage` : ""
    const healingDescription = totalHealing > 0 ? `${totalHealing} healing` : ""

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

const shouldDrawActionPoints = (actionTemplate: ActionTemplate) =>
    actionTemplate.resourceCost.actionPoints !== 1

const shouldDrawActionsPerRound = (actionTemplate: ActionTemplate) =>
    actionTemplate.resourceCost.numberOfTimesPerRound != undefined

const shouldDrawCooldown = (actionTemplate: ActionTemplate) =>
    actionTemplate.resourceCost.cooldownTurns != undefined &&
    actionTemplate.resourceCost.cooldownTurns > 0

const shouldDrawActionRange = (actionTemplate: ActionTemplate) => {
    const templateRange =
        ActionTemplateService.getActionTemplateRange(actionTemplate)
    const minRangeIsWorthDescribing =
        !isValidValue(templateRange) || templateRange[0] > 1
    const maxRangeIsWorthDescribing =
        !isValidValue(templateRange) || templateRange[1] > 1
    return minRangeIsWorthDescribing || maxRangeIsWorthDescribing
}
const shouldDrawActionTemplateEffects = (actionTemplate: ActionTemplate) => {
    const totalDamage = ActionTemplateService.getTotalDamage(actionTemplate)
    const totalHealing = ActionTemplateService.getTotalHealing(actionTemplate)
    const attributeModifiers =
        ActionTemplateService.getAttributeModifiers(actionTemplate)

    return totalDamage > 0 || totalHealing > 0 || attributeModifiers.length > 0
}

const drawActionInformationTextBoxes = (
    tile: ActionSelectedTile,
    graphicsContext: GraphicsBuffer
) => {
    tile?.actionInformationTextBoxes.forEach((textBox) => {
        TextBoxService.draw(textBox, graphicsContext)
    })
}
