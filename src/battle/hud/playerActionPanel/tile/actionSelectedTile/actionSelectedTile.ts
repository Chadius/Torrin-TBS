import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../objectRepository"
import { GraphicsBuffer } from "../../../../../utils/graphics/graphicsRenderer"
import {
    ActionTilePosition,
    ActionTilePositionService,
    TActionTilePosition,
} from "../actionTilePosition"
import { TSquaddieAffiliation } from "../../../../../squaddie/squaddieAffiliation"
import { RectArea, RectAreaService } from "../../../../../ui/rectArea"
import { WINDOW_SPACING } from "../../../../../ui/constants"
import { isValidValue } from "../../../../../utils/objectValidityCheck"
import { TextBox, TextBoxService } from "../../../../../ui/textBox/textBox"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../../graphicsConstants"
import {
    FontSizeRange,
    LinesOfTextRange,
    TextGraphicalHandlingService,
} from "../../../../../utils/graphics/textGraphicalHandlingService"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../../../action/template/actionTemplate"
import { AttributeModifierService } from "../../../../../squaddie/attribute/attributeModifier"
import {
    AttributeTypeService,
    TAttribute,
} from "../../../../../squaddie/attribute/attribute"
import {
    TileAttributeLabelStack,
    TileAttributeLabelStackService,
} from "../tileAttributeLabel/tileAttributeLabelStack"
import { Glossary } from "../../../../../campaign/glossary/glossary"
import { ScreenLocation } from "../../../../../utils/mouseConfig"
import { TextFormatService } from "../../../../../utils/graphics/textFormatService"
import { TargetConstraintsService } from "../../../../../action/targetConstraints"
import { ResourceRepository } from "../../../../../resource/resourceRepository.ts"

type ActionSelectedTileLayout = {
    actionNameText: {
        strokeWeight: number
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
        strokeWeight: number
    }
    description: {
        fontSizeRange: FontSizeRange
        strokeWeight: number
        linesOfTextRange: LinesOfTextRange
        bottomMargin: number
    }
}

const layoutConstants: ActionSelectedTileLayout = {
    actionNameText: {
        strokeWeight: 2,
        fontSizeRange: {
            preferred: 24,
            minimum: 4,
        },
        linesOfTextRange: {},
    },
    information: {
        strokeWeight: 1,
        fontSizeRange: {
            preferred: 10,
            minimum: 10,
        },
        linesOfTextRange: {},
        topMargin: 2,
        variableNameFontColor: [0, 0, 192 - 64],
        amountLeftOffsetRatio: 0.7,
        amountFontColor: [0, 0, 192 - 48],
    },
    description: {
        strokeWeight: 2,
        fontSizeRange: {
            preferred: 10,
            minimum: 8,
        },
        linesOfTextRange: { maximum: 3 },
        bottomMargin: 0,
    },
}

export interface ActionSelectedTile {
    glossaryLabelStack: TileAttributeLabelStack
    actionName: string
    horizontalPosition: TActionTilePosition
    squaddieAffiliation: TSquaddieAffiliation
    buttonIconResourceName: string
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
        glossary,
    }: {
        objectRepository: ObjectRepository
        battleSquaddieId: string
        horizontalPosition: TActionTilePosition
        actionTemplateId: string
        glossary: Glossary
    }): ActionSelectedTile => {
        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            actionTemplateId
        )

        const { squaddieTemplate } =
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                battleSquaddieId
            )

        const glossaryLabelStack = createGlossaryLabelStack({
            actionTemplate: actionTemplate,
            glossary: glossary,
        })

        return {
            squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
            actionName: actionTemplate.name,
            horizontalPosition,
            buttonIconResourceName: actionTemplate.buttonIconResourceKey,
            actionTemplateId,
            actionInformationTextBoxes: [],
            glossaryLabelStack,
        }
    },
    draw: ({
        tile,
        graphicsContext,
        objectRepository,
        resourceRepository,
    }: {
        tile: ActionSelectedTile
        graphicsContext: GraphicsBuffer
        objectRepository: ObjectRepository | undefined
        resourceRepository: ResourceRepository | undefined
    }) => {
        if (objectRepository == undefined) return
        if (resourceRepository == undefined) return
        ActionTilePositionService.drawBackground({
            squaddieAffiliation: tile.squaddieAffiliation,
            graphicsContext,
            horizontalPosition: tile.horizontalPosition,
        })

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
        TileAttributeLabelStackService.draw({
            stack: tile.glossaryLabelStack,
            graphicsBuffer: graphicsContext,
            resourceRepository: resourceRepository,
        })
    },
    mouseMoved: ({
        tile,
        mouseLocation,
    }: {
        tile: ActionSelectedTile
        mouseLocation: ScreenLocation
    }) => {
        TileAttributeLabelStackService.mouseMoved({
            stack: tile.glossaryLabelStack,
            mouseLocation,
        })
    },
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

    let top = RectAreaService.top(overallBoundingBox) + WINDOW_SPACING.SPACING1

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
        variableAmountDescription: `${actionTemplate.resourceCost?.actionPoints ?? "undefined"}`,
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
                strokeWeight: layoutConstants.information.strokeWeight,
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
                strokeWeight: layoutConstants.information.strokeWeight,
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
        variableAmountDescription: `${actionTemplate.resourceCost?.numberOfTimesPerRound ?? "undefined"}`,
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
        strokeWeight,
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
        strokeWeight: number
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

    const textInfo = TextGraphicalHandlingService.fitTextWithinSpace({
        text,
        currentContainerWidth: availableTextWidth,
        graphics: graphicsContext,
        fontDescription: {
            preferredFontSize: fontSizeRange.preferred,
            strokeWeight,
        },
        mitigations: linesOfTextRange?.maximum
            ? [{ maximumNumberOfLines: linesOfTextRange.maximum }]
            : [],
    })

    const textBox: TextBox = TextBoxService.new({
        ...textInfo,
        area: RectAreaService.new({
            left:
                RectAreaService.left(overallBoundingBox) +
                WINDOW_SPACING.SPACING1 +
                leftOffset,
            width: textInfo.maximumWidthOfText,
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
    const cooldownTurns: number | string =
        actionTemplate.resourceCost?.cooldownTurns ?? "undefined"
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
    let rangeNameText = TargetConstraintsService.getDistanceDescriptor(
        actionTemplate.targetConstraints
    )

    const textBoxAreas = createNameAndAmountTextBoxes({
        tile,
        graphicsContext,
        top,
        variableName: rangeNameText,
        variableAmountDescription: undefined,
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
        type: TAttribute
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
                    : `${TextFormatService.padPlusOnPositiveNumber(currentDescription.amount)}`,
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
    actionTemplate.resourceCost?.numberOfTimesPerRound != undefined

const shouldDrawCooldown = (actionTemplate: ActionTemplate) =>
    actionTemplate.resourceCost?.cooldownTurns != undefined &&
    actionTemplate.resourceCost?.cooldownTurns > 0

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

    const textInfo = TextGraphicalHandlingService.fitTextWithinSpace({
        text: actionTemplate.userInformation.userReadableDescription,
        currentContainerWidth:
            RectAreaService.width(overallBoundingBox) - WINDOW_SPACING.SPACING2,
        graphics: graphicsContext,
        fontDescription: {
            preferredFontSize:
                layoutConstants.description.fontSizeRange.preferred,
            strokeWeight: layoutConstants.description.strokeWeight,
        },
        mitigations: layoutConstants.description.linesOfTextRange?.maximum
            ? [
                  {
                      maximumNumberOfLines:
                          layoutConstants.description.linesOfTextRange.maximum,
                  },
              ]
            : [],
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
            height:
                TextGraphicalHandlingService.calculateMaximumHeightOfFont({
                    fontSize: textInfo.fontSize,
                    graphicsContext,
                }) * textInfo.text.split("\n").length,
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

const createGlossaryLabelStack = ({
    actionTemplate,
    glossary,
}: {
    actionTemplate: ActionTemplate
    glossary: Glossary
}) => {
    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            ActionTilePosition.SELECTED_ACTION
        )
    const glossaryLabelStack: TileAttributeLabelStack =
        TileAttributeLabelStackService.new({
            tilePosition: ActionTilePosition.SELECTED_ACTION,
            bottom: RectAreaService.top(overallBoundingBox) - 1,
        })

    glossary
        .getGlossaryTermsFromActionTemplate(actionTemplate)
        .forEach((term) => {
            TileAttributeLabelStackService.add({
                stack: glossaryLabelStack,
                newTile: {
                    id: term.name,
                    title: term.name,
                    descriptionText: term.definition,
                    iconResourceKey: term.iconResourceKey,
                },
            })
        })
    return glossaryLabelStack
}
