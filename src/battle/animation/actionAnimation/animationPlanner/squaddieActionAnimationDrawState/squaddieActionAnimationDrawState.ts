import {
    SquaddieActionAnimationPlan,
    SquaddieActionAnimationPlanService,
    SquaddieAnimationDrawingInstructions,
} from "../squaddieActionAnimationPlanService"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../../objectRepository"
import {
    ImageUI,
    ImageUILoadingBehavior,
} from "../../../../../ui/imageUI/imageUI"
import {
    SquaddieEmotion,
    TSquaddieEmotion,
} from "../../actionAnimationConstants"
import { SquaddieActionAnimationEvent } from "../squaddieActionAnimationEvent/squaddieActionAnimationEvent"
import { RectAreaService } from "../../../../../ui/rectArea"
import { GraphicsBuffer } from "../../../../../utils/graphics/graphicsRenderer"
import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "../../../../../ui/constants"
import {
    ResourceRepository,
    ResourceRepositoryService,
} from "../../../../../resource/resourceRepository.ts"

export interface SquaddieActionAnimationDrawState {
    animationPlan: SquaddieActionAnimationPlan
    resourceRepository: ResourceRepository
    repository: ObjectRepository
    imagesBySquaddieAndEmotion: {
        [battleSquaddieId: string]: {
            [emotion in TSquaddieEmotion]?: ImageUI | undefined
        }
    }
    timestampAnimationStarted: number | undefined
}

export const SquaddieActionAnimationDrawStateService = {
    new: ({
        animationPlan,
        resourceRepository,
        repository,
    }: {
        animationPlan: SquaddieActionAnimationPlan
        resourceRepository: ResourceRepository
        repository: ObjectRepository
    }): SquaddieActionAnimationDrawState => {
        return {
            animationPlan,
            resourceRepository,
            repository,
            imagesBySquaddieAndEmotion: {},
            timestampAnimationStarted: undefined,
        }
    },
    draw: ({
        drawState,
        graphicsContext,
    }: {
        drawState: SquaddieActionAnimationDrawState
        graphicsContext: GraphicsBuffer
    }) => {
        const squaddieDrawingInstructions =
            getSquaddieDrawingInstructions(drawState)
        createImagesWithResources(drawState, squaddieDrawingInstructions)
        positionImages({ drawState, squaddieDrawingInstructions })
        drawImages({
            drawState,
            graphicsContext,
            squaddieDrawingInstructions,
        })
    },
}

const createImagesWithResources = (
    drawState: SquaddieActionAnimationDrawState,
    squaddieDrawingInstructions: {
        [_: string]: SquaddieAnimationDrawingInstructions
    }
) => {
    drawState.animationPlan.events.forEach((event) => {
        const squaddieImageResourceKey = getSquaddieEmotionResourceKey({
            drawState: drawState,
            event: event,
        })
        if (squaddieImageResourceKey == undefined) {
            return
        }

        drawState.imagesBySquaddieAndEmotion[event.battleSquaddieId] ??= {}

        if (
            drawState.imagesBySquaddieAndEmotion[event.battleSquaddieId][
                event.squaddieEmotion
            ]
        ) {
            return
        }

        const drawingInstructions =
            squaddieDrawingInstructions[event.battleSquaddieId]
        drawState.imagesBySquaddieAndEmotion[event.battleSquaddieId][
            event.squaddieEmotion
        ] = new ImageUI({
            imageLoadingBehavior: {
                resourceKey: squaddieImageResourceKey,
                loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
            },
            graphic: ResourceRepositoryService.getImage({
                resourceRepository: drawState.resourceRepository,
                key: squaddieImageResourceKey,
            }),
            area: RectAreaService.new({
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                horizAlign:
                    drawingInstructions?.locationAnchor.horizontal ??
                    HORIZONTAL_ALIGN.CENTER,
                vertAlign:
                    drawingInstructions?.locationAnchor.vertical ??
                    VERTICAL_ALIGN.BASELINE,
            }),
        })
    })
}

const getSquaddieEmotionResourceKey = ({
    drawState,
    event,
}: {
    drawState: SquaddieActionAnimationDrawState
    event: SquaddieActionAnimationEvent
}): string | undefined => {
    const { squaddieTemplate } = ObjectRepositoryService.getSquaddieByBattleId(
        drawState.repository,
        event.battleSquaddieId
    )
    return (
        squaddieTemplate.squaddieId.resources.actionSpritesByEmotion[
            event.squaddieEmotion
        ] ??
        squaddieTemplate.squaddieId.resources.actionSpritesByEmotion[
            SquaddieEmotion.NEUTRAL
        ]
    )
}

const getSquaddieDrawingInstructions: (
    drawState: SquaddieActionAnimationDrawState
) => {
    [battleSquaddieId: string]: SquaddieAnimationDrawingInstructions
} = (drawState: SquaddieActionAnimationDrawState) => {
    if (drawState.timestampAnimationStarted == undefined) {
        drawState.timestampAnimationStarted = Date.now()
    }

    return SquaddieActionAnimationPlanService.getSquaddieDrawingInstructions({
        animationPlan: drawState.animationPlan,
        timeElapsed: Date.now() - drawState.timestampAnimationStarted,
    })
}

const positionImages = ({
    drawState,
    squaddieDrawingInstructions,
}: {
    drawState: SquaddieActionAnimationDrawState
    squaddieDrawingInstructions: {
        [_: string]: SquaddieAnimationDrawingInstructions
    }
}) => {
    Object.entries(squaddieDrawingInstructions).forEach(
        ([battleSquaddieId, drawingInstructions]) => {
            const squaddieImage =
                drawState.imagesBySquaddieAndEmotion[battleSquaddieId]?.[
                    drawingInstructions.squaddieEmotion
                ]
            if (squaddieImage == undefined || !squaddieImage.isImageLoaded()) {
                return
            }

            RectAreaService.move(squaddieImage.drawArea, {
                left: drawingInstructions.screenLocation.x,
                top: drawingInstructions.screenLocation.y,
            })
        }
    )
}

const drawImages = ({
    drawState,
    graphicsContext,
    squaddieDrawingInstructions,
}: {
    drawState: SquaddieActionAnimationDrawState
    graphicsContext: GraphicsBuffer
    squaddieDrawingInstructions: {
        [_: string]: SquaddieAnimationDrawingInstructions
    }
}) => {
    Object.entries(squaddieDrawingInstructions).forEach(
        ([battleSquaddieId, drawingInstructions]) => {
            const squaddieImage =
                drawState.imagesBySquaddieAndEmotion[battleSquaddieId]?.[
                    drawingInstructions.squaddieEmotion
                ]
            if (squaddieImage == undefined || !squaddieImage.isImageLoaded()) {
                return
            }
            squaddieImage.draw({
                graphicsContext,
                resourceRepository: drawState.resourceRepository,
            })
        }
    )
}
