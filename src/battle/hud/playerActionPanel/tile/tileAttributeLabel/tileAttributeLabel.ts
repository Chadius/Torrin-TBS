import {
    ImageUI,
    ImageUILoadingBehavior,
} from "../../../../../ui/imageUI/imageUI"
import { TextBox, TextBoxService } from "../../../../../ui/textBox/textBox"
import { RectArea, RectAreaService } from "../../../../../ui/rectArea"
import { Label } from "../../../../../ui/label"
import { isValidValue } from "../../../../../utils/objectValidityCheck"
import {
    Rectangle,
    RectangleService,
} from "../../../../../ui/rectangle/rectangle"
import {
    ActionTilePositionService,
    TActionTilePosition,
} from "../actionTilePosition"
import { WINDOW_SPACING } from "../../../../../ui/constants"
import { GraphicsBuffer } from "../../../../../utils/graphics/graphicsRenderer"
import {
    FontDescription,
    LinesOfTextRange,
    TextGraphicalHandlingService,
} from "../../../../../utils/graphics/textGraphicalHandlingService"
import { ResourceHandler } from "../../../../../resource/resourceHandler"
import { ScreenLocation } from "../../../../../utils/mouseConfig"
import { SquaddieAffiliation } from "../../../../../squaddie/squaddieAffiliation"
import { ScreenDimensions } from "../../../../../utils/graphics/graphicsConfig"
import { EnumLike } from "../../../../../utils/enum"

export interface TileAttributeLabel {
    id: string
    title: string
    description: {
        text: string
        renderHeight?: number
    }
    iconResourceKey?: string

    animationStatus: TTileAttributeLabelStatus
    animationStartTime: number | undefined
    isRightAligned?: boolean
    uiElements: {
        tileBoundingBox?: RectArea
        backgroundRectangle?: Rectangle
        icon?: ImageUI
        titleTextBox?: TextBox
        descriptionTextBox?: TextBox
        label?: Label
    }
}

export const TileAttributeLabelStatus = {
    UNKNOWN: "UNKNOWN",
    FULLY_CLOSED: "FULLY_CLOSED",
    FULLY_OPEN: "FULLY_OPEN",
    OPENING: "OPENING",
    CLOSING: "CLOSING",
} as const satisfies Record<string, string>
export type TTileAttributeLabelStatus = EnumLike<
    typeof TileAttributeLabelStatus
>

type TileAttributeLabelLayout = {
    description: {
        topMargin: number
        rightMargin: number
        bottomMargin: number
        leftMargin: number
        fontDescription: FontDescription
        linesOfTextRange: LinesOfTextRange
    }
    tileWidthRatioByAnimationStatus: {
        [TileAttributeLabelStatus.FULLY_OPEN]: number
        [TileAttributeLabelStatus.FULLY_CLOSED]: number
    }
    titleAndIconMargin: {
        topMargin: number
        iconLeftMargin: number
        titleLeftOffset: number
    }
    fullyClosed: { height: number }
    closing: { animationDuration: number }
    opening: { animationDuration: number }
    icon: {
        width: number
        height: number
    }
    title: {
        fontDescription: FontDescription
        linesOfTextRange: LinesOfTextRange
        fontColor: [number, number, number]
    }
}

const layout: TileAttributeLabelLayout = {
    tileWidthRatioByAnimationStatus: {
        [TileAttributeLabelStatus.FULLY_OPEN]: 1.9,
        [TileAttributeLabelStatus.FULLY_CLOSED]: 0.9,
    },
    description: {
        topMargin: WINDOW_SPACING.SPACING1 / 4,
        rightMargin: WINDOW_SPACING.SPACING1 / 4,
        bottomMargin: WINDOW_SPACING.SPACING1 / 4,
        leftMargin: WINDOW_SPACING.SPACING1 / 4,
        fontDescription: {
            fontSizeRange: { preferred: 12, minimum: 6 },
            strokeWeight: 1,
        },
        linesOfTextRange: { maximum: 3 },
    },
    titleAndIconMargin: {
        topMargin: WINDOW_SPACING.SPACING1 / 2,
        iconLeftMargin: WINDOW_SPACING.SPACING1 / 4,
        titleLeftOffset: WINDOW_SPACING.SPACING1 / 4,
    },
    fullyClosed: { height: 20 },
    closing: { animationDuration: 50 },
    opening: { animationDuration: 50 },
    icon: {
        width: 18,
        height: 18,
    },
    title: {
        fontDescription: {
            fontSizeRange: { preferred: 12, minimum: 8 },
            strokeWeight: 1,
        },
        linesOfTextRange: { maximum: 1 },
        fontColor: [0, 7, 200],
    },
}

export type TileAttributeLabelNewParameters = {
    id: string
    title: string
    iconResourceKey?: string
    descriptionText: string
}

export const TileAttributeLabelService = {
    new: ({
        id,
        title,
        iconResourceKey,
        descriptionText,
    }: TileAttributeLabelNewParameters): TileAttributeLabel => {
        return {
            id,
            title,
            iconResourceKey,
            animationStatus: TileAttributeLabelStatus.FULLY_CLOSED,
            description: {
                text: descriptionText,
                renderHeight: undefined,
            },
            uiElements: {},
            animationStartTime: undefined,
        }
    },
    setLocation: ({
        label,
        bottom,
        tilePosition,
    }: {
        label: TileAttributeLabel
        bottom: number
        tilePosition: TActionTilePosition
    }) => {
        label.uiElements.tileBoundingBox =
            ActionTilePositionService.getBoundingBoxBasedOnActionTilePosition(
                tilePosition
            )

        label.isRightAligned =
            label.uiElements.tileBoundingBox.left >
            ScreenDimensions.SCREEN_WIDTH / 2

        if (!isValidValue(label.uiElements.backgroundRectangle)) {
            label.uiElements.backgroundRectangle = createBackgroundRectangle(
                bottom,
                label.uiElements.tileBoundingBox
            )
        }
        if (label.uiElements.backgroundRectangle) {
            RectAreaService.setBottom(
                label.uiElements.backgroundRectangle.area,
                bottom
            )

            if (isValidValue(label.uiElements.titleTextBox)) {
                setTitleTextBoxRelativeToBackground({
                    label,
                    backgroundRectArea:
                        label.uiElements.backgroundRectangle.area,
                })
            }

            if (isValidValue(label.uiElements.icon)) {
                setIconRelativeToBackground({
                    label,
                    backgroundRectArea:
                        label.uiElements.backgroundRectangle.area,
                })
            }
        }
    },
    draw: ({
        label,
        graphicsBuffer,
        resourceHandler,
    }: {
        label: TileAttributeLabel
        graphicsBuffer: GraphicsBuffer
        resourceHandler: ResourceHandler
    }) => {
        if (
            !label.uiElements.descriptionTextBox &&
            label.uiElements.backgroundRectangle
        ) {
            label.uiElements.descriptionTextBox = createDescriptionTextBox({
                label,
                graphicsBuffer,
                backgroundRectArea: label.uiElements.backgroundRectangle.area,
            })
        }

        if (label.uiElements.backgroundRectangle) {
            updateAnimationTimeBasedOnAnimationStatus(label)
            updateRectangleHeightBasedOnAnimationStatus(label)
            updateRectangleWidthBasedOnAnimationStatus(label)
            updateAnimationStatusBasedOnAnimationTime(label)
            RectangleService.draw(
                label.uiElements.backgroundRectangle,
                graphicsBuffer
            )
        }

        if (
            label.uiElements.backgroundRectangle &&
            !isValidValue(label.uiElements.titleTextBox)
        ) {
            label.uiElements.titleTextBox = createTitleTextBox({
                title: label.title,
                graphicsBuffer,
                backgroundRectArea: label.uiElements.backgroundRectangle.area,
            })
            setTitleTextBoxRelativeToBackground({
                label,
                backgroundRectArea: label.uiElements.backgroundRectangle.area,
            })
        }
        if (isValidValue(label.uiElements.titleTextBox)) {
            TextBoxService.draw(label.uiElements.titleTextBox, graphicsBuffer)
        }

        if (
            label.animationStatus === TileAttributeLabelStatus.FULLY_OPEN &&
            isValidValue(label.uiElements.descriptionTextBox) &&
            (label.uiElements.titleTextBox || label.uiElements.icon)
        ) {
            let headerBottom: number = Math.max(
                label.uiElements.titleTextBox
                    ? RectAreaService.bottom(label.uiElements.titleTextBox.area)
                    : 0,
                label.uiElements.icon
                    ? RectAreaService.bottom(label.uiElements.icon.drawArea)
                    : 0
            )

            if (label.uiElements.backgroundRectangle)
                setDescriptionTextBoxRelativeToTitleAndBackground({
                    label,
                    headerBottom,
                    left: RectAreaService.left(
                        label.uiElements.backgroundRectangle.area
                    ),
                })

            TextBoxService.draw(
                label.uiElements.descriptionTextBox,
                graphicsBuffer
            )
        }

        if (
            !isValidValue(label.uiElements.icon) &&
            label.iconResourceKey &&
            label.uiElements.backgroundRectangle
        ) {
            label.uiElements.icon = createIcon({
                iconResourceKey: label.iconResourceKey,
                backgroundRectArea: label.uiElements.backgroundRectangle.area,
            })
            setIconRelativeToBackground({
                label,
                backgroundRectArea: label.uiElements.backgroundRectangle.area,
            })
        }
        if (label.uiElements.icon) {
            label.uiElements.icon.draw({
                graphicsContext: graphicsBuffer,
                resourceHandler,
            })
        }
    },
    getArea: (label: TileAttributeLabel): RectArea => getArea(label),
    mouseMoved: ({
        label,
        mouseLocation,
    }: {
        label: TileAttributeLabel
        mouseLocation: ScreenLocation
    }) => {
        const isMouseInside = RectAreaService.isInside(
            getArea(label),
            mouseLocation.x,
            mouseLocation.y
        )
        switch (true) {
            case label.animationStatus ===
                TileAttributeLabelStatus.FULLY_CLOSED && isMouseInside:
                label.animationStatus = TileAttributeLabelStatus.OPENING
                break
            case label.animationStatus === TileAttributeLabelStatus.OPENING &&
                !isMouseInside:
                label.animationStatus = TileAttributeLabelStatus.CLOSING
                break
            case label.animationStatus === TileAttributeLabelStatus.CLOSING &&
                isMouseInside:
                label.animationStatus = TileAttributeLabelStatus.OPENING
                break
            case label.animationStatus ===
                TileAttributeLabelStatus.FULLY_OPEN && !isMouseInside:
                label.animationStatus = TileAttributeLabelStatus.CLOSING
                break
        }
    },
}

const createBackgroundRectangle = (
    bottom: number,
    tileBoundingBox: RectArea
) => {
    const fillColor = ActionTilePositionService.getBackgroundColorByAffiliation(
        SquaddieAffiliation.PLAYER
    )
    fillColor[1] *= 0.75
    fillColor[2] *= 0.5

    return RectangleService.new({
        area: RectAreaService.new({
            height: layout.fullyClosed.height,
            bottom,
            centerX: RectAreaService.centerX(tileBoundingBox),
            width:
                RectAreaService.width(tileBoundingBox) *
                layout.tileWidthRatioByAnimationStatus[
                    TileAttributeLabelStatus.FULLY_CLOSED
                ],
        }),
        fillColor,
        noStroke: true,
    })
}

const createTitleTextBox = ({
    title,
    backgroundRectArea,
    graphicsBuffer,
}: {
    title: string
    backgroundRectArea: RectArea
    graphicsBuffer: GraphicsBuffer
}): TextBox => {
    const widthAvailableForText =
        RectAreaService.width(backgroundRectArea) -
        layout.titleAndIconMargin.iconLeftMargin -
        layout.titleAndIconMargin.titleLeftOffset -
        layout.icon.width
    const textFit = TextGraphicalHandlingService.fitTextWithinSpace({
        maximumWidth: widthAvailableForText,
        text: title,
        linesOfTextRange: layout.title.linesOfTextRange,
        fontDescription: layout.title.fontDescription,
        graphicsContext: graphicsBuffer,
    })

    return TextBoxService.new({
        text: textFit.text,
        area: RectAreaService.new({
            baseRectangle: backgroundRectArea,
            margin: [
                layout.titleAndIconMargin.topMargin,
                0,
                0,
                layout.titleAndIconMargin.iconLeftMargin +
                    layout.titleAndIconMargin.titleLeftOffset +
                    layout.icon.width,
            ],
        }),
        fontSize: textFit.fontSize,
        fontColor: layout.title.fontColor,
    })
}

const createDescriptionTextBox = ({
    label,
    backgroundRectArea,
    graphicsBuffer,
}: {
    label: TileAttributeLabel
    backgroundRectArea: RectArea
    graphicsBuffer: GraphicsBuffer
}): TextBox => {
    if (label.uiElements.tileBoundingBox == undefined) {
        throw new Error("label.uiElements.tileBoundingBox")
    }
    const widthAvailableForText =
        RectAreaService.width(label.uiElements.tileBoundingBox) *
            layout.tileWidthRatioByAnimationStatus[
                TileAttributeLabelStatus.FULLY_OPEN
            ] -
        layout.description.leftMargin -
        layout.description.rightMargin

    const textFit = TextGraphicalHandlingService.fitTextWithinSpace({
        maximumWidth: widthAvailableForText,
        text: label.description.text,
        linesOfTextRange: layout.description.linesOfTextRange,
        fontDescription: layout.description.fontDescription,
        graphicsContext: graphicsBuffer,
    })

    const heightNeededForText =
        TextGraphicalHandlingService.calculateMaximumHeightOfFont({
            fontSize: textFit.fontSize,
            graphicsContext: graphicsBuffer,
        }) * textFit.text.split("\n").length
    label.description.renderHeight = heightNeededForText

    return TextBoxService.new({
        text: textFit.text,
        area: RectAreaService.new({
            left: RectAreaService.left(backgroundRectArea),
            width: textFit.width,
            bottom: RectAreaService.bottom(backgroundRectArea),
            height: heightNeededForText,
            margin: [
                layout.description.topMargin,
                layout.description.rightMargin,
                layout.description.bottomMargin,
                layout.description.leftMargin,
            ],
        }),
        fontSize: textFit.fontSize,
        fontColor: layout.title.fontColor,
    })
}

const createIcon = ({
    iconResourceKey,
    backgroundRectArea,
}: {
    iconResourceKey: string
    backgroundRectArea: RectArea
}): ImageUI => {
    return new ImageUI({
        imageLoadingBehavior: {
            resourceKey: iconResourceKey,
            loadingBehavior:
                ImageUILoadingBehavior.KEEP_AREA_HEIGHT_USE_ASPECT_RATIO,
        },
        area: RectAreaService.new({
            left:
                RectAreaService.left(backgroundRectArea) +
                layout.titleAndIconMargin.iconLeftMargin,
            width: layout.icon.width,
            height: layout.icon.height,
            top:
                RectAreaService.top(backgroundRectArea) +
                layout.titleAndIconMargin.topMargin,
        }),
    })
}

const setIconRelativeToBackground = ({
    label,
    backgroundRectArea,
}: {
    label: TileAttributeLabel
    backgroundRectArea: RectArea
}) => {
    if (!label.uiElements.icon) return
    RectAreaService.setTop(
        label.uiElements.icon.drawArea,
        RectAreaService.top(backgroundRectArea) +
            layout.titleAndIconMargin.topMargin
    )
}

const setTitleTextBoxRelativeToBackground = ({
    label,
    backgroundRectArea,
}: {
    label: TileAttributeLabel
    backgroundRectArea: RectArea
}) => {
    if (!label.uiElements.titleTextBox) return
    RectAreaService.setTop(
        label.uiElements.titleTextBox.area,
        RectAreaService.top(backgroundRectArea) +
            layout.titleAndIconMargin.topMargin
    )
}

const setDescriptionTextBoxRelativeToTitleAndBackground = ({
    label,
    headerBottom,
    left,
}: {
    label: TileAttributeLabel
    headerBottom: number
    left: number
}) => {
    if (!label.uiElements.descriptionTextBox) return
    RectAreaService.setTop(
        label.uiElements.descriptionTextBox.area,
        headerBottom + layout.description.topMargin
    )
    RectAreaService.setLeft(
        label.uiElements.descriptionTextBox.area,
        left + layout.description.leftMargin
    )
}

const getArea = (label: TileAttributeLabel): RectArea => {
    return label.uiElements.backgroundRectangle?.area ?? RectAreaService.null()
}

const updateAnimationTimeBasedOnAnimationStatus = (
    label: TileAttributeLabel
) => {
    switch (label.animationStatus) {
        case TileAttributeLabelStatus.FULLY_CLOSED:
        case TileAttributeLabelStatus.FULLY_OPEN:
            label.animationStartTime = undefined
            break
        default:
            if (label.animationStartTime == undefined) {
                label.animationStartTime = Date.now()
            }
            break
    }
}

const updateRectangleHeightBasedOnAnimationStatus = (
    label: TileAttributeLabel
) => {
    if (!label.uiElements.backgroundRectangle) return
    if (!label.description.renderHeight) return
    let bottom = RectAreaService.bottom(
        label.uiElements.backgroundRectangle.area
    )

    switch (label.animationStatus) {
        case TileAttributeLabelStatus.FULLY_CLOSED:
            RectAreaService.setTop(
                label.uiElements.backgroundRectangle.area,
                bottom - layout.fullyClosed.height
            )
            return
        case TileAttributeLabelStatus.FULLY_OPEN:
            RectAreaService.setTop(
                label.uiElements.backgroundRectangle.area,
                bottom -
                    label.description.renderHeight -
                    layout.fullyClosed.height
            )
            return
        case TileAttributeLabelStatus.UNKNOWN:
            return
    }

    let timeElapsed =
        label.animationStartTime != undefined
            ? Date.now() - label.animationStartTime
            : undefined
    let heightDifference: number
    let newHeight: number = layout.fullyClosed.height

    if (timeElapsed != undefined) {
        switch (label.animationStatus) {
            case TileAttributeLabelStatus.CLOSING:
                if (timeElapsed >= layout.closing.animationDuration) {
                    newHeight = layout.fullyClosed.height
                    break
                }
                heightDifference = label.description.renderHeight
                    ? -label.description.renderHeight
                    : 0
                newHeight =
                    (heightDifference / layout.opening.animationDuration) *
                        timeElapsed +
                    layout.fullyClosed.height +
                    (label.description.renderHeight ?? 0)
                break
            case TileAttributeLabelStatus.OPENING:
                if (timeElapsed >= layout.opening.animationDuration) {
                    newHeight =
                        layout.fullyClosed.height +
                        (label.description.renderHeight ?? 0)
                    break
                }
                heightDifference = label.description.renderHeight ?? 0
                newHeight =
                    (heightDifference / layout.closing.animationDuration) *
                        timeElapsed +
                    layout.fullyClosed.height
                break
            default:
                newHeight = layout.fullyClosed.height
                break
        }
    }
    label.uiElements.backgroundRectangle.area.top = bottom - newHeight
    label.uiElements.backgroundRectangle.area.height = newHeight
}

const updateRectangleWidthBasedOnAnimationStatus = (
    label: TileAttributeLabel
) => {
    if (!label.uiElements.backgroundRectangle) return
    if (!label.uiElements.tileBoundingBox) return
    let left = RectAreaService.left(label.uiElements.backgroundRectangle.area)

    switch (label.animationStatus) {
        case TileAttributeLabelStatus.FULLY_CLOSED:
            RectAreaService.setRight(
                label.uiElements.backgroundRectangle.area,
                left +
                    RectAreaService.width(label.uiElements.tileBoundingBox) *
                        layout.tileWidthRatioByAnimationStatus[
                            TileAttributeLabelStatus.FULLY_CLOSED
                        ]
            )
            return
        case TileAttributeLabelStatus.FULLY_OPEN:
            RectAreaService.setRight(
                label.uiElements.backgroundRectangle.area,
                left +
                    RectAreaService.width(label.uiElements.tileBoundingBox) *
                        layout.tileWidthRatioByAnimationStatus[
                            TileAttributeLabelStatus.FULLY_OPEN
                        ]
            )
            return
        case TileAttributeLabelStatus.UNKNOWN:
            return
    }

    let timeElapsed =
        label.animationStartTime != undefined
            ? Date.now() - label.animationStartTime
            : undefined
    let widthDifference: number
    let newWidth: number =
        RectAreaService.width(label.uiElements.tileBoundingBox) *
        layout.tileWidthRatioByAnimationStatus[
            TileAttributeLabelStatus.FULLY_CLOSED
        ]

    if (timeElapsed != undefined) {
        switch (label.animationStatus) {
            case TileAttributeLabelStatus.CLOSING:
                if (timeElapsed >= layout.closing.animationDuration) {
                    newWidth =
                        RectAreaService.width(
                            label.uiElements.tileBoundingBox
                        ) *
                        layout.tileWidthRatioByAnimationStatus[
                            TileAttributeLabelStatus.FULLY_CLOSED
                        ]
                    break
                }
                widthDifference =
                    RectAreaService.width(label.uiElements.tileBoundingBox) *
                    (layout.tileWidthRatioByAnimationStatus[
                        TileAttributeLabelStatus.FULLY_CLOSED
                    ] -
                        layout.tileWidthRatioByAnimationStatus[
                            TileAttributeLabelStatus.FULLY_OPEN
                        ])
                newWidth =
                    (widthDifference / layout.opening.animationDuration) *
                        timeElapsed +
                    RectAreaService.width(label.uiElements.tileBoundingBox) *
                        layout.tileWidthRatioByAnimationStatus[
                            TileAttributeLabelStatus.FULLY_OPEN
                        ]
                break
            case TileAttributeLabelStatus.OPENING:
                if (timeElapsed >= layout.opening.animationDuration) {
                    newWidth =
                        RectAreaService.width(
                            label.uiElements.tileBoundingBox
                        ) *
                        layout.tileWidthRatioByAnimationStatus[
                            TileAttributeLabelStatus.FULLY_OPEN
                        ]
                    break
                }
                widthDifference =
                    RectAreaService.width(label.uiElements.tileBoundingBox) *
                    (layout.tileWidthRatioByAnimationStatus[
                        TileAttributeLabelStatus.FULLY_OPEN
                    ] -
                        layout.tileWidthRatioByAnimationStatus[
                            TileAttributeLabelStatus.FULLY_CLOSED
                        ])
                newWidth =
                    (widthDifference / layout.opening.animationDuration) *
                        timeElapsed +
                    RectAreaService.width(label.uiElements.tileBoundingBox) *
                        layout.tileWidthRatioByAnimationStatus[
                            TileAttributeLabelStatus.FULLY_CLOSED
                        ]
                break
            default:
                newWidth =
                    RectAreaService.width(label.uiElements.tileBoundingBox) *
                    layout.tileWidthRatioByAnimationStatus[
                        TileAttributeLabelStatus.FULLY_CLOSED
                    ]
                break
        }
    }
    label.uiElements.backgroundRectangle.area.width = newWidth
    if (label.isRightAligned) {
        RectAreaService.setRight(
            label.uiElements.backgroundRectangle.area,
            ScreenDimensions.SCREEN_WIDTH
        )
    }
}

const updateAnimationStatusBasedOnAnimationTime = (
    label: TileAttributeLabel
) => {
    switch (label.animationStatus) {
        case TileAttributeLabelStatus.FULLY_CLOSED:
        case TileAttributeLabelStatus.FULLY_OPEN:
        case TileAttributeLabelStatus.UNKNOWN:
            return
    }
    if (label.animationStartTime == undefined) return

    let timeElapsed = Date.now() - label.animationStartTime

    switch (label.animationStatus) {
        case TileAttributeLabelStatus.CLOSING:
            if (timeElapsed >= layout.closing.animationDuration) {
                label.animationStatus = TileAttributeLabelStatus.FULLY_CLOSED
                break
            }
            break
        case TileAttributeLabelStatus.OPENING:
            if (timeElapsed >= layout.opening.animationDuration) {
                label.animationStatus = TileAttributeLabelStatus.FULLY_OPEN
                break
            }
            break
        default:
            break
    }
}
