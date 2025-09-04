import { RectArea, RectAreaService } from "../../../../ui/rectArea"
import { ScreenDimensions } from "../../../../utils/graphics/graphicsConfig"
import { GOLDEN_RATIO } from "../../../../ui/constants"
import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../graphicsConstants"
import { TSquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"

export const ActionTilePosition = {
    ACTOR_NAME: "ACTOR_NAME",
    PEEK_PLAYABLE_NAME: "PEEK_PLAYABLE_NAME",
    PEEK_RIGHT_NAME: "PEEK_RIGHT_NAME",
    PEEK_PLAYABLE_STATUS: "PEEK_PLAYABLE_STATUS",
    PEEK_RIGHT_STATUS: "PEEK_RIGHT_STATUS",
    TARGET_NAME: "TARGET_NAME",
    ACTOR_STATUS: "ACTOR_STATUS",
    TARGET_STATUS: "TARGET_STATUS",
    SELECTED_ACTION: "SELECTED_ACTION",
    ACTION_PREVIEW: "ACTION_PREVIEW",
} as const satisfies Record<string, string>
export type TActionTilePosition = EnumLike<typeof ActionTilePosition>

export const ActionTilePositionService = {
    getBoundingBoxBasedOnActionTilePosition: (
        horizontalPosition: TActionTilePosition
    ): RectArea => getBoundingBoxBasedOnActionPanelPosition(horizontalPosition),
    drawBackground: ({
        squaddieAffiliation,
        horizontalPosition,
        graphicsContext,
    }: {
        squaddieAffiliation: TSquaddieAffiliation
        horizontalPosition: TActionTilePosition
        graphicsContext: GraphicsBuffer
    }) => {
        const fillColor = getBackgroundColorByAffiliation(squaddieAffiliation)

        const overallBoundingBox =
            getBoundingBoxBasedOnActionPanelPosition(horizontalPosition)

        graphicsContext.push()
        graphicsContext.fill(fillColor[0], fillColor[1], fillColor[2])
        graphicsContext.rect(
            RectAreaService.left(overallBoundingBox),
            RectAreaService.top(overallBoundingBox),
            RectAreaService.width(overallBoundingBox),
            RectAreaService.height(overallBoundingBox)
        )
        graphicsContext.pop()
    },
    getBackgroundColorByAffiliation: (
        squaddieAffiliation: TSquaddieAffiliation
    ): [number, number, number] =>
        getBackgroundColorByAffiliation(squaddieAffiliation),
}

const getBoundingBoxBasedOnActionPanelPosition = (
    horizontalPosition: TActionTilePosition
): RectArea => {
    const columnsByPosition: {
        [q in TActionTilePosition]: {
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
        [ActionTilePosition.SELECTED_ACTION]: {
            startColumn: 3,
            endColumn: 3,
        },
        [ActionTilePosition.ACTION_PREVIEW]: {
            startColumn: 4,
            endColumn: 5,
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

const getBackgroundColorByAffiliation = (
    squaddieAffiliation: TSquaddieAffiliation
): [number, number, number] => {
    const squaddieAffiliationHue: number =
        HUE_BY_SQUADDIE_AFFILIATION[squaddieAffiliation]
    return [squaddieAffiliationHue, 10, 20]
}
