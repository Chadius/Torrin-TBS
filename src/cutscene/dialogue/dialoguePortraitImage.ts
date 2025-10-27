import { RectArea, RectAreaService } from "../../ui/rectArea"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import p5 from "p5"
import {
    DIALOGUE_SPEAKER_PORTRAIT_STYLE_CONSTANTS,
    DialoguePlacementService,
    DialoguePosition,
    TDialoguePosition,
} from "./constants"
import { ImageUI, ImageUILoadingBehavior } from "../../ui/imageUI/imageUI"
import { ResourceHandler } from "../../resource/resourceHandler"
import { DialogueTextBox } from "./dialogueTextBox.ts"
import { WINDOW_SPACING } from "../../ui/constants.ts"

export interface DialoguePortraitImage {
    speakerPortrait: p5.Image | undefined
    speakerImage: ImageUI | undefined
    position: TDialoguePosition
}

export const DialoguePortraitImageService = {
    new: ({
        speakerPortrait,
        position,
        relativePlacementArea,
        speakerNameBox,
    }: Partial<DialoguePortraitImage> & {
        relativePlacementArea?: RectArea
        speakerNameBox?: DialogueTextBox
    }): DialoguePortraitImage => {
        const uiObjects = createUIObjects({
            speakerPortrait,
            position: position ?? DialoguePosition.LEFT,
            speakerNameBox,
            relativePlacementArea,
        })
        return {
            speakerImage: uiObjects?.speakerImage,
            speakerPortrait,
            position: position ?? DialoguePosition.LEFT,
        }
    },
    draw: ({
        portraitImage,
        graphics,
        resourceHandler,
    }: {
        portraitImage: DialoguePortraitImage
        graphics: GraphicsBuffer
        resourceHandler: ResourceHandler
    }): void => {
        portraitImage?.speakerImage?.draw({
            graphicsContext: graphics,
            resourceHandler,
        })
    },
}

const moveSpeakerPortraitIfOverlappingNameBox = ({
    speakerNameBox,
    speakerPortraitLeft,
    speakerPortrait,
    speakerPortraitBottom,
    relativePlacementArea,
}: {
    speakerNameBox: DialogueTextBox | undefined
    speakerPortraitLeft: number
    speakerPortrait: p5.Image
    speakerPortraitBottom: number
    relativePlacementArea?: RectArea
}) => {
    if (speakerNameBox?.dialogueTextLabel?.rectangle.area == undefined) {
        return {
            speakerBoxBottom: speakerPortraitBottom,
            speakerBoxLeft: speakerPortraitLeft,
        }
    }

    let speakerNameBoxLeft = RectAreaService.left(
        speakerNameBox.dialogueTextLabel.rectangle.area
    )
    let speakerNameBoxTop = RectAreaService.top(
        speakerNameBox.dialogueTextLabel.rectangle.area
    )
    let speakerNameBoxRight = RectAreaService.right(
        speakerNameBox.dialogueTextLabel.rectangle.area
    )

    if (relativePlacementArea == undefined)
        return {
            speakerBoxLeft: speakerPortraitLeft,
            speakerBoxBottom: speakerPortraitBottom,
        }

    const canPortraitFitOnTheRightSide =
        speakerNameBoxRight + speakerPortrait.width <
        RectAreaService.right(relativePlacementArea)
    const canPortraitFitOnTheLeftSide =
        speakerNameBoxLeft - speakerPortrait.width >
        RectAreaService.left(relativePlacementArea)

    if (!canPortraitFitOnTheLeftSide && !canPortraitFitOnTheRightSide)
        return {
            speakerBoxBottom: RectAreaService.top(
                speakerNameBox.dialogueTextLabel.rectangle.area
            ),
            speakerBoxLeft: RectAreaService.left(relativePlacementArea),
        }

    if (canPortraitFitOnTheLeftSide) {
        const speakerPortraitRight = speakerPortraitLeft + speakerPortrait.width
        const areOverlapping =
            (speakerPortraitLeft >= speakerNameBoxLeft &&
                speakerPortraitLeft <= speakerNameBoxRight) ||
            (speakerPortraitRight >= speakerNameBoxLeft &&
                speakerPortraitRight <= speakerNameBoxRight) ||
            (speakerNameBoxLeft >= speakerPortraitLeft &&
                speakerNameBoxLeft <= speakerPortraitRight) ||
            (speakerNameBoxRight >= speakerPortraitLeft &&
                speakerNameBoxRight <= speakerPortraitRight)
        if (areOverlapping) {
            return {
                speakerBoxLeft: speakerPortraitLeft,
                speakerBoxBottom: speakerNameBoxTop - 1,
            }
        }
        return {
            speakerBoxLeft: speakerPortraitLeft,
            speakerBoxBottom: speakerPortraitBottom,
        }
    }

    return {
        speakerBoxBottom: speakerPortraitBottom,
        speakerBoxLeft: speakerNameBoxRight + WINDOW_SPACING.SPACING1,
    }
}
const createUIObjects = ({
    speakerPortrait,
    position,
    relativePlacementArea,
    speakerNameBox,
}: {
    speakerPortrait: p5.Image | undefined
    position: TDialoguePosition
    speakerNameBox?: DialogueTextBox
    relativePlacementArea?: RectArea
}) => {
    if (speakerPortrait == undefined) return
    const rectStyle = DIALOGUE_SPEAKER_PORTRAIT_STYLE_CONSTANTS[position]
    if (rectStyle.horizontalMargin == undefined) return
    if (rectStyle.bottomFraction == undefined) return
    if (rectStyle.bottomOffset == undefined) return

    let speakerBoxLeft: number =
        DialoguePlacementService.getRelativePlacementLeftSide({
            relativePlacementArea,
            position,
            objectWidth: speakerPortrait.width,
        })

    if (speakerBoxLeft < 0) {
        speakerBoxLeft = 0
    } else if (
        speakerBoxLeft + speakerPortrait.width >
        ScreenDimensions.SCREEN_WIDTH
    ) {
        speakerBoxLeft = ScreenDimensions.SCREEN_WIDTH - speakerPortrait.width
    }

    let speakerBoxBottom =
        ScreenDimensions.SCREEN_HEIGHT * rectStyle.bottomFraction

    ;({ speakerBoxLeft, speakerBoxBottom } =
        moveSpeakerPortraitIfOverlappingNameBox({
            speakerNameBox: speakerNameBox,
            speakerPortraitLeft: speakerBoxLeft,
            speakerPortrait: speakerPortrait,
            speakerPortraitBottom: speakerBoxBottom,
            relativePlacementArea,
        }))

    const speakerImage = new ImageUI({
        imageLoadingBehavior: {
            loadingBehavior: ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
            resourceKey: undefined,
        },
        graphic: speakerPortrait,
        area: RectAreaService.new({
            left: speakerBoxLeft,
            top: speakerBoxBottom - speakerPortrait.height,
            width: speakerPortrait.width,
            height: speakerPortrait.height,
        }),
    })

    return { speakerImage }
}
