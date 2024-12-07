import { RectArea, RectAreaService } from "../../../../ui/rectArea"
import { ScreenDimensions } from "../../../../utils/graphics/graphicsConfig"
import { GOLDEN_RATIO } from "../../../../ui/constants"
import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../graphicsConstants"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"

export enum ActionTilePosition {
    ACTOR_NAME = "ACTOR_NAME",
    PEEK_PLAYABLE_NAME = "PEEK_PLAYABLE_NAME",
    PEEK_RIGHT_NAME = "PEEK_RIGHT_NAME",
    PEEK_PLAYABLE_STATUS = "PEEK_PLAYABLE_STATUS",
    PEEK_RIGHT_STATUS = "PEEK_RIGHT_STATUS",
    TARGET_NAME = "TARGET_NAME",
    ACTOR_STATUS = "ACTOR_STATUS",
    TARGET_STATUS = "TARGET_STATUS",
}

export const ActionTilePositionService = {
    getBoundingBoxBasedOnActionTilePosition: (
        horizontalPosition: ActionTilePosition
    ): RectArea => getBoundingBoxBasedOnActionPanelPosition(horizontalPosition),
    drawBackground: ({
        squaddieAffiliation,
        horizontalPosition,
        graphicsContext,
    }: {
        squaddieAffiliation: SquaddieAffiliation
        horizontalPosition: ActionTilePosition
        graphicsContext: GraphicsBuffer
    }) => {
        const squaddieAffiliationHue: number =
            HUE_BY_SQUADDIE_AFFILIATION[squaddieAffiliation]
        const overallBoundingBox =
            getBoundingBoxBasedOnActionPanelPosition(horizontalPosition)

        graphicsContext.push()
        graphicsContext.fill(squaddieAffiliationHue, 10, 20)
        graphicsContext.rect(
            RectAreaService.left(overallBoundingBox),
            RectAreaService.top(overallBoundingBox),
            RectAreaService.width(overallBoundingBox),
            RectAreaService.height(overallBoundingBox)
        )
        graphicsContext.pop()
    },
}

const getBoundingBoxBasedOnActionPanelPosition = (
    horizontalPosition: ActionTilePosition
): RectArea => {
    const columnsByPosition: {
        [q in ActionTilePosition]: {
            startColumn: number
            endColumn: number
        }
    } = {
        [ActionTilePosition.ACTOR_NAME]: {
            startColumn: 0,
            endColumn: 0,
        },
        [ActionTilePosition.ACTOR_STATUS]: {
            startColumn: 1,
            endColumn: 2,
        },
        [ActionTilePosition.PEEK_PLAYABLE_NAME]: {
            startColumn: 0,
            endColumn: 0,
        },
        [ActionTilePosition.PEEK_PLAYABLE_STATUS]: {
            startColumn: 1,
            endColumn: 2,
        },
        [ActionTilePosition.TARGET_STATUS]: {
            startColumn: 9,
            endColumn: 10,
        },
        [ActionTilePosition.TARGET_NAME]: {
            startColumn: 11,
            endColumn: 11,
        },
        [ActionTilePosition.PEEK_RIGHT_STATUS]: {
            startColumn: 9,
            endColumn: 10,
        },
        [ActionTilePosition.PEEK_RIGHT_NAME]: {
            startColumn: 11,
            endColumn: 11,
        },
    }

    return RectAreaService.new({
        screenWidth: ScreenDimensions.SCREEN_WIDTH,
        startColumn: columnsByPosition[horizontalPosition].startColumn,
        endColumn: columnsByPosition[horizontalPosition].endColumn,
        top:
            ScreenDimensions.SCREEN_HEIGHT -
            (ScreenDimensions.SCREEN_WIDTH / 12) * GOLDEN_RATIO,
        bottom: ScreenDimensions.SCREEN_HEIGHT,
    })
}
