import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import { getResultOrThrowError } from "../../../../utils/ResultOrError"
import { ResourceHandler } from "../../../../resource/resourceHandler"
import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "./actionTilePosition"
import {
    InBattleAttributes,
    InBattleAttributesService,
} from "../../../stats/inBattleAttributes"
import { TextBox, TextBoxService } from "../../../../ui/textBox/textBox"
import { RectAreaService } from "../../../../ui/rectArea"
import { WINDOW_SPACING } from "../../../../ui/constants"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../graphicsConstants"
import { isValidValue } from "../../../../utils/validityCheck"
import {
    AttributeModifierService,
    AttributeType,
    AttributeTypeAndAmount,
} from "../../../../squaddie/attributeModifier"
import { BattleSquaddie } from "../../../battleSquaddie"
import {
    SquaddieActionPointsExplanation,
    SquaddieArmorExplanation,
    SquaddieMovementExplanation,
    SquaddieService,
} from "../../../../squaddie/squaddieService"
import { SquaddieTemplate } from "../../../../campaign/squaddieTemplate"
import {
    MissionMap,
    MissionMapService,
} from "../../../../missionMap/missionMap"
import { CalculateAgainstArmor } from "../../../calculator/actionCalculator/calculateAgainstArmor"
import { ImageUI, ImageUILoadingBehavior } from "../../../../ui/ImageUI"

const layoutConstants = {
    rowSize: 28,
    armor: {
        row: 0,
        fontSize: 14,
    },
    hitPoints: {
        row: 1,
        fontSize: 16,
    },
    actionPoints: {
        row: 2,
        fontSize: 14,
    },
    movement: {
        row: 3,
        fontSize: 14,
    },
    coordinates: {
        fontSize: 12,
    },
    attributeModifiers: {
        fontSize: 12,
        iconSize: 20,
        positionByType: [
            {
                type: AttributeType.ARMOR,
                row: 0,
                percentLeft: 40,
            },
            {
                type: AttributeType.MOVEMENT,
                row: 3,
                percentLeft: 40,
            },
            {
                type: AttributeType.IGNORE_TERRAIN_COST,
                row: 3,
                percentLeft: 45,
            },
            {
                type: AttributeType.ELUSIVE,
                row: 3,
                percentLeft: 55,
            },
        ],
        arrowIconWidth: 16,
        arrowIconHeight: 24,
    },
}

export interface SquaddieStatusTile {
    armor: { textBox?: TextBox }
    actionPoints: {
        textBox?: TextBox
    }
    hitPoints: {
        textBox?: TextBox
    }
    movement: {
        textBox?: TextBox
    }
    coordinates: {
        textBox?: TextBox
    }
    attributeModifiers: {
        graphicsByAttributeType: {
            [t in AttributeType]?: {
                icon: ImageUI
                arrowIcon?: ImageUI
                textBox: TextBox
            }
        }
    }
    squaddieAffiliation: SquaddieAffiliation
    horizontalPosition: ActionTilePosition
    battleSquaddieId: string
    inBattleAttributes?: InBattleAttributes
    squaddieActionPointsExplanation?: SquaddieActionPointsExplanation
}

export const SquaddieStatusTileService = {
    new: ({
        objectRepository,
        battleSquaddieId,
        horizontalPosition,
    }: {
        objectRepository: ObjectRepository
        battleSquaddieId: string
        horizontalPosition: ActionTilePosition
    }): SquaddieStatusTile => {
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                battleSquaddieId
            )
        )

        const tile: SquaddieStatusTile = {
            horizontalPosition,
            squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
            battleSquaddieId,
            inBattleAttributes: undefined,
            hitPoints: {},
            actionPoints: {},
            movement: {},
            coordinates: {},
            armor: {},
            attributeModifiers: {
                graphicsByAttributeType: {},
            },
        }

        tile.inBattleAttributes = InBattleAttributesService.clone(
            battleSquaddie.inBattleAttributes
        )
        return tile
    },
    draw: ({
        tile,
        graphicsContext,
        resourceHandler,
    }: {
        tile: SquaddieStatusTile
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }) => {
        ActionTilePositionService.drawBackground({
            squaddieAffiliation: tile.squaddieAffiliation,
            graphicsContext,
            horizontalPosition: tile.horizontalPosition,
        })

        drawTextBoxes({ tile, graphicsContext })
        drawImages({ tile, graphicsContext, resourceHandler })
    },
    updateTileUsingSquaddie: ({
        tile,
        objectRepository,
        graphicsContext,
        missionMap,
        resourceHandler,
    }: {
        tile: SquaddieStatusTile
        objectRepository: ObjectRepository
        missionMap: MissionMap
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }) => {
        const { battleSquaddie, squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                tile.battleSquaddieId
            )
        )
        updateTileUsingBattleSquaddie({
            tile,
            battleSquaddie,
            squaddieTemplate,
            missionMap,
            graphicsContext,
            resourceHandler,
        })
    },
}

const updateTileUsingBattleSquaddie = ({
    tile,
    battleSquaddie,
    squaddieTemplate,
    missionMap,
    graphicsContext,
    resourceHandler,
}: {
    tile: SquaddieStatusTile
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
    missionMap: MissionMap
    graphicsContext: GraphicsBuffer
    resourceHandler: ResourceHandler
}) => {
    tile.inBattleAttributes = InBattleAttributesService.clone(
        battleSquaddie.inBattleAttributes
    )
    tile.squaddieActionPointsExplanation =
        SquaddieService.getNumberOfActionPoints({
            battleSquaddie,
            squaddieTemplate,
        })

    updateArmor({ tile, graphicsContext, battleSquaddie, squaddieTemplate })
    updateHitPoints({ tile, graphicsContext })
    updateActionPoints({ tile, graphicsContext })
    updateMovement({ tile, graphicsContext, battleSquaddie, squaddieTemplate })
    updateCoordinates({ tile, missionMap, graphicsContext })
    updateAttributeModifiers({ tile, graphicsContext, resourceHandler })
}

const updateArmor = ({
    tile,
    graphicsContext,
    battleSquaddie,
    squaddieTemplate,
}: {
    tile: SquaddieStatusTile
    graphicsContext: GraphicsBuffer
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
}) => {
    const squaddieArmorExplanation: SquaddieArmorExplanation =
        SquaddieService.getArmorClass({
            battleSquaddie,
            squaddieTemplate,
        })

    let armorText = `Armor ${squaddieArmorExplanation.net}`

    let armorModifierTotal =
        CalculateAgainstArmor.getTargetSquaddieModifierTotal(
            battleSquaddie
        ).reduce(
            (currentTotal, attributeTypeAndAmount) =>
                currentTotal + attributeTypeAndAmount.amount,
            0
        )
    if (armorModifierTotal != 0) {
        armorText += ` +${armorModifierTotal}`
    }

    const squaddieAffiliationHue: number =
        HUE_BY_SQUADDIE_AFFILIATION[tile.squaddieAffiliation]

    tile.armor.textBox = createTextBoxOnLeftSideOfRow({
        actionTilePosition: tile.horizontalPosition,
        text: armorText,
        fontSize: layoutConstants.armor.fontSize,
        fontColor: [squaddieAffiliationHue, 7, 112],
        topOffset: layoutConstants.armor.row * layoutConstants.rowSize,
        graphicsContext,
    })
}

const updateHitPoints = ({
    tile,
    graphicsContext,
}: {
    tile: SquaddieStatusTile
    graphicsContext: GraphicsBuffer
}) => {
    let hitPointText = "???"
    if (isValidValue(tile.inBattleAttributes)) {
        const currentAttributes =
            InBattleAttributesService.calculateCurrentAttributeModifiers(
                tile.inBattleAttributes
            )
        hitPointText = `HP ${tile.inBattleAttributes.currentHitPoints}`

        const absorbAttribute = currentAttributes.find(
            (attributeTypeAndAmount) =>
                attributeTypeAndAmount.type === AttributeType.ABSORB
        )
        if (absorbAttribute) {
            hitPointText += ` + ${absorbAttribute.amount}`
        }

        hitPointText += `/${tile.inBattleAttributes.armyAttributes.maxHitPoints}`
    }

    const squaddieAffiliationHue: number =
        HUE_BY_SQUADDIE_AFFILIATION[tile.squaddieAffiliation]

    tile.hitPoints.textBox = createTextBoxOnLeftSideOfRow({
        actionTilePosition: tile.horizontalPosition,
        text: hitPointText,
        fontSize: layoutConstants.hitPoints.fontSize,
        fontColor: [squaddieAffiliationHue, 7, 112],
        topOffset: layoutConstants.hitPoints.row * layoutConstants.rowSize,
        graphicsContext,
    })
}

const updateActionPoints = ({
    tile,
    graphicsContext,
}: {
    tile: SquaddieStatusTile
    graphicsContext: GraphicsBuffer
}) => {
    let actionPointText = "???"
    if (isValidValue(tile.squaddieActionPointsExplanation)) {
        actionPointText = `AP ${tile.squaddieActionPointsExplanation.actionPointsRemaining}`
    }

    const squaddieAffiliationHue: number =
        HUE_BY_SQUADDIE_AFFILIATION[tile.squaddieAffiliation]

    tile.actionPoints.textBox = createTextBoxOnLeftSideOfRow({
        actionTilePosition: tile.horizontalPosition,
        text: actionPointText,
        fontSize: layoutConstants.actionPoints.fontSize,
        fontColor: [squaddieAffiliationHue, 7, 112],
        topOffset: layoutConstants.actionPoints.row * layoutConstants.rowSize,
        graphicsContext,
    })
}

const updateMovement = ({
    tile,
    graphicsContext,
    battleSquaddie,
    squaddieTemplate,
}: {
    tile: SquaddieStatusTile
    graphicsContext: GraphicsBuffer
    battleSquaddie: BattleSquaddie
    squaddieTemplate: SquaddieTemplate
}) => {
    const squaddieMovementExplanation: SquaddieMovementExplanation =
        SquaddieService.getSquaddieMovementAttributes({
            battleSquaddie,
            squaddieTemplate,
        })
    let movementText = `Move ${squaddieMovementExplanation.initial.movementPerAction}`
    let movementChange =
        squaddieMovementExplanation.net.movementPerAction -
        squaddieMovementExplanation.initial.movementPerAction
    if (movementChange !== 0) {
        movementText += ` ${movementChange > 0 ? "+" : ""}${movementChange}`
    }

    const squaddieAffiliationHue: number =
        HUE_BY_SQUADDIE_AFFILIATION[tile.squaddieAffiliation]

    tile.movement.textBox = createTextBoxOnLeftSideOfRow({
        actionTilePosition: tile.horizontalPosition,
        text: movementText,
        fontSize: layoutConstants.movement.fontSize,
        fontColor: [squaddieAffiliationHue, 7, 112],
        topOffset: layoutConstants.movement.row * layoutConstants.rowSize,
        graphicsContext,
    })
}

const updateCoordinates = ({
    tile,
    missionMap,
    graphicsContext,
}: {
    tile: SquaddieStatusTile
    missionMap: MissionMap
    graphicsContext: GraphicsBuffer
}) => {
    let coordinateText = "(??,??)"
    if (isValidValue(missionMap)) {
        const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
            missionMap,
            tile.battleSquaddieId
        )
        if (mapCoordinate) {
            coordinateText = `(${mapCoordinate.q}, ${mapCoordinate.r})`
        }
    }

    const squaddieAffiliationHue: number =
        HUE_BY_SQUADDIE_AFFILIATION[tile.squaddieAffiliation]

    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            tile.horizontalPosition
        )

    graphicsContext.push()
    graphicsContext.textSize(layoutConstants.coordinates.fontSize)
    tile.coordinates.textBox = TextBoxService.new({
        text: coordinateText,
        fontSize: layoutConstants.coordinates.fontSize,
        fontColor: [squaddieAffiliationHue, 7, 112],
        area: RectAreaService.new({
            left:
                RectAreaService.right(overallBoundingBox) -
                graphicsContext.textWidth(coordinateText) -
                WINDOW_SPACING.SPACING1,
            top:
                RectAreaService.top(overallBoundingBox) +
                RectAreaService.height(overallBoundingBox) -
                layoutConstants.coordinates.fontSize -
                WINDOW_SPACING.SPACING2 +
                WINDOW_SPACING.SPACING1,
            width:
                graphicsContext.textWidth(coordinateText) +
                WINDOW_SPACING.SPACING1,
            height: layoutConstants.coordinates.fontSize,
        }),
    })
    graphicsContext.pop()
}

const updateAttributeModifiers = ({
    tile,
    graphicsContext,
    resourceHandler,
}: {
    tile: SquaddieStatusTile
    graphicsContext: GraphicsBuffer
    resourceHandler: ResourceHandler
}) => {
    const currentAttributeModifiersToShow =
        InBattleAttributesService.calculateCurrentAttributeModifiers(
            tile.inBattleAttributes
        ).filter(
            (attributeTypeAndAmount) =>
                ![AttributeType.ABSORB].includes(attributeTypeAndAmount.type)
        )

    const currentNumericalAttributeModifiersToShow =
        currentAttributeModifiersToShow.filter(
            (attributeTypeAndAmount) =>
                !AttributeModifierService.isAttributeTypeABinaryEffect(
                    attributeTypeAndAmount.type
                ) &&
                ![AttributeType.ABSORB].includes(attributeTypeAndAmount.type)
        )

    if (currentNumericalAttributeModifiersToShow.length > 0) {
        updateNumericalAttributeModifiers({
            tile,
            graphicsContext,
            currentNumericalAttributeModifiersToShow,
            resourceHandler,
        })
    }

    const currentBinaryAttributeModifiersToShow =
        currentAttributeModifiersToShow.filter(
            (attributeTypeAndAmount) =>
                AttributeModifierService.isAttributeTypeABinaryEffect(
                    attributeTypeAndAmount.type
                ) &&
                ![AttributeType.ABSORB].includes(attributeTypeAndAmount.type)
        )

    if (currentBinaryAttributeModifiersToShow.length > 0) {
        updateBinaryAttributeModifiers({
            tile,
            graphicsContext,
            currentBinaryAttributeModifiersToShow,
            resourceHandler,
        })
    }

    removeInactiveModifierIcons({ tile, currentAttributeModifiersToShow })
}

const removeInactiveModifierIcons = ({
    tile,
    currentAttributeModifiersToShow,
}: {
    tile: SquaddieStatusTile
    currentAttributeModifiersToShow: AttributeTypeAndAmount[]
}) => {
    const graphicalKeysToDelete = Object.keys(
        tile.attributeModifiers.graphicsByAttributeType
    )
        .map((typeStr) => typeStr as AttributeType)
        .filter(
            (type) =>
                !currentAttributeModifiersToShow.some(
                    (attributeTypeAndAmount) =>
                        attributeTypeAndAmount.type === type
                )
        )

    graphicalKeysToDelete.forEach((type) => {
        delete tile.attributeModifiers.graphicsByAttributeType[type]
    })
}

const updateNumericalAttributeModifiers = ({
    tile,
    graphicsContext,
    currentNumericalAttributeModifiersToShow,
    resourceHandler,
}: {
    tile: SquaddieStatusTile
    graphicsContext: GraphicsBuffer
    currentNumericalAttributeModifiersToShow: AttributeTypeAndAmount[]
    resourceHandler: ResourceHandler
}) => {
    ;[
        "attribute-up",
        "attribute-down",
        ...currentNumericalAttributeModifiersToShow.map(
            (attributeTypeAndAmount) =>
                AttributeModifierService.getAttributeIconResourceKeyForAttributeType(
                    attributeTypeAndAmount.type
                )
        ),
    ]
        .filter(
            (comparisonImageResourceKey) =>
                !resourceHandler.isResourceLoaded(comparisonImageResourceKey)
        )
        .forEach((comparisonImageResourceKey) =>
            resourceHandler.loadResource(comparisonImageResourceKey)
        )

    const squaddieAffiliationHue: number =
        HUE_BY_SQUADDIE_AFFILIATION[tile.squaddieAffiliation]

    currentNumericalAttributeModifiersToShow.forEach(
        (attributeTypeAndAmount) => {
            const { attributeLeft, attributeTop } =
                calculateAttributeTopLeftCorner(
                    tile.horizontalPosition,
                    attributeTypeAndAmount
                )

            const iconImageRectArea = RectAreaService.new({
                left: attributeLeft,
                top: attributeTop,
                width: layoutConstants.attributeModifiers.iconSize,
                height: layoutConstants.attributeModifiers.iconSize,
            })

            const text = `${attributeTypeAndAmount.amount > 0 ? "+" : "-"}${attributeTypeAndAmount.amount}`
            graphicsContext.push()
            graphicsContext.textSize(
                layoutConstants.attributeModifiers.fontSize
            )

            const textBox = TextBoxService.new({
                text,
                fontSize: layoutConstants.attributeModifiers.fontSize,
                fontColor: [squaddieAffiliationHue, 7, 80],
                area: RectAreaService.new({
                    left:
                        attributeLeft +
                        WINDOW_SPACING.SPACING1 +
                        layoutConstants.attributeModifiers.iconSize,
                    top: attributeTop,
                    width: graphicsContext.textWidth(text),
                    height: layoutConstants.attributeModifiers.fontSize,
                }),
            })
            graphicsContext.pop()

            const arrowImageRectArea = RectAreaService.new({
                left: RectAreaService.right(textBox.area),
                top: attributeTop,
                width: layoutConstants.attributeModifiers.arrowIconWidth,
                height: layoutConstants.attributeModifiers.arrowIconHeight,
            })

            tile.attributeModifiers.graphicsByAttributeType[
                attributeTypeAndAmount.type
            ] = {
                icon: new ImageUI({
                    imageLoadingBehavior: {
                        resourceKey:
                            AttributeModifierService.getAttributeIconResourceKeyForAttributeType(
                                attributeTypeAndAmount.type
                            ),
                        loadingBehavior:
                            ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
                    },
                    area: iconImageRectArea,
                }),
                arrowIcon: new ImageUI({
                    imageLoadingBehavior: {
                        resourceKey:
                            attributeTypeAndAmount.amount > 0
                                ? "attribute-up"
                                : "attribute-down",
                        loadingBehavior:
                            ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
                    },
                    area: arrowImageRectArea,
                }),
                textBox,
            }
        }
    )
}

const updateBinaryAttributeModifiers = ({
    tile,
    graphicsContext,
    currentBinaryAttributeModifiersToShow,
    resourceHandler,
}: {
    tile: SquaddieStatusTile
    graphicsContext: GraphicsBuffer
    currentBinaryAttributeModifiersToShow: AttributeTypeAndAmount[]
    resourceHandler: ResourceHandler
}) => {
    ;[
        ...currentBinaryAttributeModifiersToShow.map((attributeTypeAndAmount) =>
            AttributeModifierService.getAttributeIconResourceKeyForAttributeType(
                attributeTypeAndAmount.type
            )
        ),
    ]
        .filter(
            (comparisonImageResourceKey) =>
                !resourceHandler.isResourceLoaded(comparisonImageResourceKey)
        )
        .forEach((comparisonImageResourceKey) =>
            resourceHandler.loadResource(comparisonImageResourceKey)
        )

    currentBinaryAttributeModifiersToShow.forEach((attributeTypeAndAmount) => {
        const { attributeLeft, attributeTop } = calculateAttributeTopLeftCorner(
            tile.horizontalPosition,
            attributeTypeAndAmount
        )

        const iconImageRectArea = RectAreaService.new({
            left: attributeLeft,
            top: attributeTop,
            width: layoutConstants.attributeModifiers.iconSize,
            height: layoutConstants.attributeModifiers.iconSize,
        })

        tile.attributeModifiers.graphicsByAttributeType[
            attributeTypeAndAmount.type
        ] = {
            icon: new ImageUI({
                imageLoadingBehavior: {
                    resourceKey:
                        AttributeModifierService.getAttributeIconResourceKeyForAttributeType(
                            attributeTypeAndAmount.type
                        ),
                    loadingBehavior:
                        ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
                },
                area: iconImageRectArea,
            }),
            arrowIcon: undefined,
            textBox: undefined,
        }
    })
}

const calculateAttributeTopLeftCorner = (
    actionTilePosition: ActionTilePosition,
    attributeTypeAndAmount: AttributeTypeAndAmount
) => {
    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            actionTilePosition
        )

    const attributePosition =
        layoutConstants.attributeModifiers.positionByType.find(
            (a) => a.type === attributeTypeAndAmount.type
        ) ?? {
            row: 4,
            percentLeft: 0,
        }

    const attributeLeft =
        WINDOW_SPACING.SPACING1 +
        RectAreaService.left(overallBoundingBox) +
        (RectAreaService.width(overallBoundingBox) *
            attributePosition.percentLeft) /
            100
    const attributeTop =
        RectAreaService.top(overallBoundingBox) +
        attributePosition.row * layoutConstants.rowSize +
        WINDOW_SPACING.SPACING1
    return { attributeLeft, attributeTop }
}

const createTextBoxOnLeftSideOfRow = ({
    actionTilePosition,
    text,
    fontSize,
    fontColor,
    topOffset,
    graphicsContext,
}: {
    actionTilePosition: ActionTilePosition
    fontColor: number[]
    text: string
    fontSize: number
    topOffset: number
    graphicsContext: GraphicsBuffer
}): TextBox => {
    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            actionTilePosition
        )
    graphicsContext.push()
    graphicsContext.textSize(fontSize)
    const textBox = TextBoxService.new({
        text,
        fontSize: fontSize,
        fontColor,
        area: RectAreaService.new({
            left:
                RectAreaService.left(overallBoundingBox) +
                WINDOW_SPACING.SPACING1,
            top:
                RectAreaService.top(overallBoundingBox) +
                topOffset +
                WINDOW_SPACING.SPACING1,
            width: graphicsContext.textWidth(text) + WINDOW_SPACING.SPACING1,
            height: fontSize,
        }),
    })
    graphicsContext.pop()
    return textBox
}

const drawTextBoxes = ({
    tile,
    graphicsContext,
}: {
    tile: SquaddieStatusTile
    graphicsContext: GraphicsBuffer
}) => {
    ;[
        tile.armor.textBox,
        tile.hitPoints.textBox,
        tile.actionPoints.textBox,
        tile.movement.textBox,
        tile.coordinates.textBox,
        ...Object.values(tile.attributeModifiers.graphicsByAttributeType).map(
            (info) => info.textBox
        ),
    ]
        .filter((textBox) => !!textBox)
        .forEach((textBox) => {
            TextBoxService.draw(textBox, graphicsContext)
        })
}

const drawImages = ({
    tile,
    graphicsContext,
    resourceHandler,
}: {
    tile: SquaddieStatusTile
    graphicsContext: GraphicsBuffer
    resourceHandler: ResourceHandler
}) => {
    ;[
        ...Object.values(tile.attributeModifiers.graphicsByAttributeType).map(
            (info) => info.icon
        ),
        ...Object.values(tile.attributeModifiers.graphicsByAttributeType).map(
            (info) => info.arrowIcon
        ),
    ]
        .filter((icon) => !!icon)
        .forEach((icon) => {
            icon.draw({ graphicsContext, resourceHandler })
        })
}
