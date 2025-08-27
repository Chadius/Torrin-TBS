import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import { getResultOrThrowError } from "../../../../utils/ResultOrError"
import { SquaddieEmotion } from "../../../animation/actionAnimation/actionAnimationConstants"
import { BattleSquaddieTeam } from "../../../battleSquaddieTeam"
import {
    getValidValueOrDefault,
    isValidValue,
} from "../../../../utils/objectValidityCheck"
import { ResourceHandler } from "../../../../resource/resourceHandler"
import { RectArea, RectAreaService } from "../../../../ui/rectArea"
import { TextBox, TextBoxService } from "../../../../ui/textBox/textBox"
import { WINDOW_SPACING } from "../../../../ui/constants"
import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../graphicsConstants"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import { TextGraphicalHandlingService } from "../../../../utils/graphics/textGraphicalHandlingService"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "./actionTilePosition"
import {
    ImageUI,
    ImageUILoadingBehavior,
    ImageUIService,
} from "../../../../ui/imageUI/imageUI"
import {
    TileAttributeLabelStack,
    TileAttributeLabelStackService,
} from "./tileAttributeLabel/tileAttributeLabelStack"
import { Glossary } from "../../../../campaign/glossary/glossary"
import { ScreenLocation } from "../../../../utils/mouseConfig"

const layoutConstants = {
    portraitNameText: {
        strokeWeight: 2,
        fontSizeRange: {
            preferred: 32,
            minimum: 10,
        },
        linesOfTextRange: { minimum: 1 },
    },
}

export interface SquaddieNameAndPortraitTile {
    squaddieNameTextBox?: TextBox
    portraitImage?: ImageUI
    squaddieName: string
    squaddieAffiliation: SquaddieAffiliation
    squaddiePortraitResourceKey: string
    horizontalPosition: ActionTilePosition
    battleSquaddieId: string
    glossaryLabelStack: TileAttributeLabelStack
}

export const SquaddieNameAndPortraitTileService = {
    newFromBattleSquaddieId: ({
        objectRepository,
        battleSquaddieId,
        team,
        horizontalPosition,
        glossary,
    }: {
        objectRepository: ObjectRepository
        battleSquaddieId: string
        team: BattleSquaddieTeam
        horizontalPosition: ActionTilePosition
        glossary: Glossary
    }): SquaddieNameAndPortraitTile => {
        const { squaddieTemplate } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                battleSquaddieId
            )
        )

        const squaddiePortraitResourceKey = getValidValueOrDefault(
            squaddieTemplate.squaddieId.resources?.actionSpritesByEmotion[
                SquaddieEmotion.NEUTRAL
            ],
            team?.iconResourceKey
        )

        return {
            squaddieName: squaddieTemplate.squaddieId.name,
            squaddiePortraitResourceKey,
            horizontalPosition,
            squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
            battleSquaddieId,
            glossaryLabelStack: createGlossaryLabelStack({
                glossary,
                horizontalPosition,
                objectRepository,
                battleSquaddieId,
            }),
        }
    },
    draw: ({
        tile,
        graphicsContext,
        resourceHandler,
    }: {
        tile: SquaddieNameAndPortraitTile
        graphicsContext: GraphicsBuffer
        resourceHandler: ResourceHandler
    }) => {
        ActionTilePositionService.drawBackground({
            squaddieAffiliation: tile.squaddieAffiliation,
            horizontalPosition: tile.horizontalPosition,
            graphicsContext: graphicsContext,
        })

        drawPortraitImage({ tile, graphicsContext, resourceHandler })

        if (!tile.squaddieNameTextBox) {
            setPortraitNameTextBox(tile, graphicsContext)
        }
        drawPortraitNameTextBox(tile, graphicsContext)
        TileAttributeLabelStackService.draw({
            stack: tile.glossaryLabelStack,
            graphicsBuffer: graphicsContext,
            resourceHandler,
        })
    },
    getBoundingBoxBasedOnActionPanelPosition: (
        horizontalPosition: ActionTilePosition
    ): RectArea =>
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            horizontalPosition
        ),
    mouseMoved: ({
        tile,
        mouseLocation,
    }: {
        tile: SquaddieNameAndPortraitTile
        mouseLocation: ScreenLocation
    }) => {
        TileAttributeLabelStackService.mouseMoved({
            stack: tile.glossaryLabelStack,
            mouseLocation,
        })
    },
}

const setPortraitNameTextBox = (
    tile: SquaddieNameAndPortraitTile,
    graphicsContext: GraphicsBuffer
) => {
    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            tile.horizontalPosition
        )
    const squaddieAffiliationHue: number =
        HUE_BY_SQUADDIE_AFFILIATION[tile.squaddieAffiliation]
    const textColor = [squaddieAffiliationHue, 7, 192]

    const textInfo = TextGraphicalHandlingService.fitTextWithinSpace({
        text: tile.squaddieName,
        maximumWidth:
            RectAreaService.width(overallBoundingBox) - WINDOW_SPACING.SPACING2,
        graphicsContext,
        fontDescription: {
            fontSizeRange: layoutConstants.portraitNameText.fontSizeRange,
            strokeWeight: layoutConstants.portraitNameText.strokeWeight,
        },
        linesOfTextRange: layoutConstants.portraitNameText.linesOfTextRange,
    })

    tile.squaddieNameTextBox = TextBoxService.new({
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
            height: RectAreaService.height(overallBoundingBox) / 2,
        }),
    })
}

const drawPortraitImage = ({
    tile,
    graphicsContext,
    resourceHandler,
}: {
    tile: SquaddieNameAndPortraitTile
    graphicsContext: GraphicsBuffer
    resourceHandler: ResourceHandler
}) => {
    if (!isValidValue(tile.portraitImage)) {
        const overallBoundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                tile.horizontalPosition
            )

        tile.portraitImage = new ImageUI({
            imageLoadingBehavior: {
                resourceKey: tile.squaddiePortraitResourceKey,
                loadingBehavior:
                    ImageUILoadingBehavior.USE_CUSTOM_AREA_CALLBACK,
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
                        bottom: RectAreaService.bottom(originalArea),
                        width: imageWidth,
                        height: imageHeight,
                    })
                },
            },
            area: RectAreaService.new({
                left:
                    RectAreaService.left(overallBoundingBox) +
                    WINDOW_SPACING.SPACING1,
                top: RectAreaService.bottom(overallBoundingBox),
                width:
                    RectAreaService.width(overallBoundingBox) -
                    WINDOW_SPACING.SPACING2,
                height: 0,
            }),
        })
    }
    tile.portraitImage.draw({ graphicsContext, resourceHandler })
}

const drawPortraitNameTextBox = (
    tile: SquaddieNameAndPortraitTile,
    graphicsContext: GraphicsBuffer
) => {
    if (!isValidValue(tile.squaddieNameTextBox)) return
    TextBoxService.draw(tile.squaddieNameTextBox, graphicsContext)
}

const createGlossaryLabelStack = ({
    horizontalPosition,
    glossary,
    objectRepository,
    battleSquaddieId,
}: {
    horizontalPosition: ActionTilePosition
    glossary: Glossary
    objectRepository: ObjectRepository
    battleSquaddieId: string
}) => {
    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            horizontalPosition
        )
    const glossaryLabelStack: TileAttributeLabelStack =
        TileAttributeLabelStackService.new({
            tilePosition: horizontalPosition,
            bottom: RectAreaService.top(overallBoundingBox) - 1,
        })

    const { battleSquaddie } = getResultOrThrowError(
        ObjectRepositoryService.getSquaddieByBattleId(
            objectRepository,
            battleSquaddieId
        )
    )
    const glossaryTerms = glossary.getGlossaryTermsFromInBattleAttributes(
        battleSquaddie.inBattleAttributes
    )
    glossaryTerms.forEach((term) => {
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
