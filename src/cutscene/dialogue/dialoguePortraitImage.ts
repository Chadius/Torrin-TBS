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

    let speakerPortraitRight = speakerPortraitLeft + speakerPortrait.width
    let speakerNameBoxLeft = RectAreaService.left(
        speakerNameBox.dialogueTextLabel.rectangle.area
    )
    let speakerNameBoxRight = RectAreaService.right(
        speakerNameBox.dialogueTextLabel.rectangle.area
    )

    const arePortraitAndNameTooWideToFitInRelativeArea =
        relativePlacementArea != undefined &&
        speakerPortrait.width +
            RectAreaService.width(
                speakerNameBox.dialogueTextLabel.rectangle.area
            ) >=
            RectAreaService.width(relativePlacementArea)

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
        if (arePortraitAndNameTooWideToFitInRelativeArea) {
            return {
                speakerBoxBottom: RectAreaService.top(
                    speakerNameBox.dialogueTextLabel.rectangle.area
                ),
                speakerBoxLeft: relativePlacementArea
                    ? RectAreaService.left(relativePlacementArea)
                    : speakerPortraitLeft,
            }
        }

        if (relativePlacementArea == undefined) {
            return {
                speakerBoxBottom: speakerPortraitBottom,
                speakerBoxLeft: speakerPortraitLeft,
            }
        }

        if (
            RectAreaService.left(relativePlacementArea) +
                speakerPortrait.width >=
            speakerNameBoxLeft
        ) {
            return {
                speakerBoxBottom: speakerPortraitBottom,
                speakerBoxLeft:
                    RectAreaService.right(relativePlacementArea) -
                    speakerPortrait.width,
            }
        }

        return {
            speakerBoxBottom: speakerPortraitBottom,
            speakerBoxLeft: RectAreaService.left(relativePlacementArea),
        }
    }
    return {
        speakerBoxLeft: speakerPortraitLeft,
        speakerBoxBottom: speakerPortraitBottom,
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
