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
} from "../../../../utils/validityCheck"
import { ResourceHandler } from "../../../../resource/resourceHandler"
import { ImageUI, ImageUIService } from "../../../../ui/imageUI"
import { RectArea, RectAreaService } from "../../../../ui/rectArea"
import { TextBox, TextBoxService } from "../../../../ui/textBox"
import { WINDOW_SPACING } from "../../../../ui/constants"
import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../graphicsConstants"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import { TextHandlingService } from "../../../../utils/graphics/textHandlingService"
import {
    ActionTilePosition,
    ActionTilePositionService,
} from "./actionTilePosition"

export interface SquaddieNameAndPortraitTile {
    squaddieNameTextBox?: TextBox
    portraitImage?: ImageUI
    squaddieName: string
    squaddieAffiliation: SquaddieAffiliation
    squaddiePortraitResourceKey: string
    horizontalPosition: ActionTilePosition
    battleSquaddieId: string
}

export const SquaddieNameAndPortraitTileService = {
    newFromBattleSquaddieId: ({
        objectRepository,
        battleSquaddieId,
        team,
        horizontalPosition,
    }: {
        objectRepository: ObjectRepository
        battleSquaddieId: string
        team: BattleSquaddieTeam
        horizontalPosition: ActionTilePosition
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

        setPortraitImage(tile, resourceHandler)
        drawPortraitImage(tile, graphicsContext)

        setPortraitNameTextBox(tile, graphicsContext)
        drawPortraitNameTextBox(tile, graphicsContext)
    },
    getBoundingBoxBasedOnActionPanelPosition: (
        horizontalPosition: ActionTilePosition
    ): RectArea =>
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            horizontalPosition
        ),
}

const setPortraitImage = (
    tile: SquaddieNameAndPortraitTile,
    resourceHandler: ResourceHandler
) => {
    if (isValidValue(tile.portraitImage)) return
    if (!resourceHandler.isResourceLoaded(tile.squaddiePortraitResourceKey))
        return
    const image = resourceHandler.getResource(tile.squaddiePortraitResourceKey)
    const overallBoundingBox =
        ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
            tile.horizontalPosition
        )
    const imageWidth = Math.min(
        image.width,
        RectAreaService.width(overallBoundingBox)
    )
    const imageHeight = ImageUIService.ScaleImageHeight({
        desiredWidth: imageWidth,
        imageHeight: image.height,
        imageWidth: image.width,
    })

    tile.portraitImage = new ImageUI({
        graphic: image,
        area: RectAreaService.new({
            left: RectAreaService.centerX(overallBoundingBox) - imageWidth / 2,
            top: RectAreaService.bottom(overallBoundingBox) - image.height,
            width: imageWidth,
            height: imageHeight,
        }),
    })
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

    const textInfo = TextHandlingService.fitTextWithinSpace({
        text: tile.squaddieName,
        width:
            RectAreaService.width(overallBoundingBox) - WINDOW_SPACING.SPACING2,
        graphicsContext,
        fontSizeRange: {
            preferred: 32,
            minimum: 10,
        },
        linesOfTextRange: { minimum: 2 },
    })

    tile.squaddieNameTextBox = TextBoxService.new({
        text: textInfo.text,
        textSize: textInfo.textSize,
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

const drawPortraitImage = (
    tile: SquaddieNameAndPortraitTile,
    graphicsContext: GraphicsBuffer
) => {
    if (!isValidValue(tile.portraitImage)) return
    tile.portraitImage.draw(graphicsContext)
}

const drawPortraitNameTextBox = (
    tile: SquaddieNameAndPortraitTile,
    graphicsContext: GraphicsBuffer
) => {
    if (!isValidValue(tile.squaddieNameTextBox)) return
    TextBoxService.draw(tile.squaddieNameTextBox, graphicsContext)
}
