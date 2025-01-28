import { RectArea, RectAreaService } from "../../../../ui/rectArea"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import { MouseButton } from "../../../../utils/mouseConfig"
import { ResourceHandler } from "../../../../resource/resourceHandler"
import { ImageUI, ImageUILoadingBehavior } from "../../../../ui/imageUI/imageUI"
import { GraphicsBuffer } from "../../../../utils/graphics/graphicsRenderer"
import { ActionTemplate } from "../../../../action/template/actionTemplate"
import { WINDOW_SPACING } from "../../../../ui/constants"
import { Rectangle, RectangleService } from "../../../../ui/rectangle"
import { ColorUtils } from "../../../../hexMap/colorUtils"
import { TextBox, TextBoxService } from "../../../../ui/textBox/textBox"

interface ActionButtonLayout {
    creationTime: number
    background: {
        fill: {
            saturation: number
            brightness: number
        }
        stroke: {
            saturation: number
            brightness: number
        }
    }
    actionName: {
        textBoxMargin: number
        fontSize: number
        fontColor: number[]
    }
    selectedBorder: {
        strokeWeight: number
        strokeHue: number
        strokeSaturation: number
        strokeBrightnessRange: number[]
        pulsePeriod: number
    }
    disabled: {
        fillColor: number[]
        fillAlphaRange: number[]
        pulsePeriod: number
    }
}

interface ActionButtonUIObjects {
    buttonIcon: ImageUI
    actionName: TextBox
    decorator: Rectangle
}

export interface ActionButton {
    layout: ActionButtonLayout
    uiObjects: ActionButtonUIObjects
    actionTemplate: ActionTemplate
    actionTemplateOverride?: {
        name: string
        buttonIconResourceKey: string
    }
}

export const ActionButtonService = {
    new: ({
        actionTemplateId,
        objectRepository,
        buttonArea,
        defaultButtonIconResourceKey,
        actionTemplateOverride,
    }: {
        actionTemplateId: string
        objectRepository: ObjectRepository
        buttonArea: RectArea
        defaultButtonIconResourceKey?: string
        actionTemplateOverride?: {
            name: string
            buttonIconResourceKey: string
        }
    }): ActionButton => {
        let actionTemplate: ActionTemplate = undefined
        let buttonIconResourceKey: string
        if (actionTemplateId) {
            actionTemplate = ObjectRepositoryService.getActionTemplateById(
                objectRepository,
                actionTemplateId
            )
            buttonIconResourceKey = actionTemplate.buttonIconResourceKey
        } else {
            buttonIconResourceKey = actionTemplateOverride.buttonIconResourceKey
        }

        return {
            actionTemplate,
            actionTemplateOverride,
            uiObjects: {
                buttonIcon: new ImageUI({
                    imageLoadingBehavior: {
                        resourceKey:
                            buttonIconResourceKey ??
                            defaultButtonIconResourceKey,
                        loadingBehavior:
                            ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
                    },
                    area: buttonArea,
                }),
                actionName: undefined,
                decorator: undefined,
            },
            layout: {
                creationTime: Date.now(),
                background: {
                    fill: {
                        saturation: 85,
                        brightness: 50,
                    },
                    stroke: {
                        saturation: 85,
                        brightness: 50,
                    },
                },
                actionName: {
                    textBoxMargin: WINDOW_SPACING.SPACING1,
                    fontSize: 14,
                    fontColor: [0, 0, 100],
                },
                selectedBorder: {
                    strokeWeight: 4,
                    strokeHue: 0,
                    strokeSaturation: 85,
                    strokeBrightnessRange: [30, 70],
                    pulsePeriod: 2000,
                },
                disabled: {
                    fillColor: [0, 15, 0],
                    fillAlphaRange: [192 - 8, 192 + 8],
                    pulsePeriod: 10000,
                },
            },
        }
    },
    shouldConsiderActionBecauseOfMouseMovement(
        actionButton: ActionButton,
        mouseLocation: { x: number; y: number }
    ) {
        return RectAreaService.isInside(
            actionButton.uiObjects.buttonIcon.drawArea,
            mouseLocation.x,
            mouseLocation.y
        )
    },
    shouldSelectActionBecauseOfMouseButton(
        actionButton: ActionButton,
        mouseSelection: {
            button: MouseButton
            x: number
            y: number
        }
    ) {
        return (
            RectAreaService.isInside(
                actionButton.uiObjects.buttonIcon.drawArea,
                mouseSelection.x,
                mouseSelection.y
            ) && mouseSelection.button == MouseButton.ACCEPT
        )
    },
    draw({
        actionButton,
        graphicsBuffer,
        resourceHandler,
        selected,
        fade,
    }: {
        actionButton: ActionButton
        graphicsBuffer: GraphicsBuffer
        resourceHandler: ResourceHandler
        selected?: boolean
        fade?: boolean
    }) {
        drawButtonIcon(actionButton, graphicsBuffer, resourceHandler)
        drawActionName(actionButton, graphicsBuffer)
        if (selected || fade) {
            drawDecorator(actionButton, graphicsBuffer, selected, fade)
        }
    },
    getExpectedDrawBoundingBox: (
        actionButton: ActionButton,
        graphicsContext: GraphicsBuffer
    ): RectArea => {
        const actionNameBoundingBox = getExpectedActionNameDrawBoundingBox(
            actionButton,
            graphicsContext
        )
        return RectAreaService.new({
            left: RectAreaService.left(
                actionButton.uiObjects.buttonIcon.drawArea
            ),
            top: RectAreaService.top(
                actionButton.uiObjects.buttonIcon.drawArea
            ),
            width: Math.max(
                RectAreaService.width(
                    actionButton.uiObjects.buttonIcon.drawArea
                ),
                actionNameBoundingBox.width
            ),
            height:
                RectAreaService.height(
                    actionButton.uiObjects.buttonIcon.drawArea
                ) + actionNameBoundingBox.height,
        })
    },
    getActionTemplateId: (actionButton: ActionButton): string =>
        getActionTemplateId(actionButton),
}

const drawButtonIcon = (
    actionButton: ActionButton,
    graphicsContext: GraphicsBuffer,
    resourceHandler: ResourceHandler
) => {
    actionButton.uiObjects.buttonIcon.draw({ graphicsContext, resourceHandler })
}

const drawActionName = (
    actionButton: ActionButton,
    graphicsContext: GraphicsBuffer
) => {
    if (actionButton.uiObjects.actionName == undefined) {
        actionButton.uiObjects.actionName = createActionNameTextBox(
            actionButton,
            graphicsContext
        )
    }

    TextBoxService.draw(actionButton.uiObjects.actionName, graphicsContext)
}

const getExpectedActionNameDrawBoundingBox = (
    actionButton: ActionButton,
    graphicsContext: GraphicsBuffer
) => {
    graphicsContext.push()
    graphicsContext.textSize(actionButton.layout.actionName.fontSize)
    const boundingBox = {
        width:
            graphicsContext.textWidth(getActionName(actionButton)) +
            WINDOW_SPACING.SPACING1,
        height:
            actionButton.layout.actionName.fontSize + WINDOW_SPACING.SPACING1,
    }
    graphicsContext.pop()
    return boundingBox
}

const createActionNameTextBox = (
    actionButton: ActionButton,
    graphicsContext: GraphicsBuffer
): TextBox => {
    const actionName = getActionName(actionButton)
    return TextBoxService.new({
        area: RectAreaService.new({
            left: RectAreaService.left(
                actionButton.uiObjects.buttonIcon.drawArea
            ),
            top:
                RectAreaService.bottom(
                    actionButton.uiObjects.buttonIcon.drawArea
                ) + actionButton.layout.actionName.textBoxMargin,
            ...getExpectedActionNameDrawBoundingBox(
                actionButton,
                graphicsContext
            ),
        }),
        fontSize: actionButton.layout.actionName.fontSize,
        text: actionName,
        fontColor: actionButton.layout.actionName.fontColor,
    })
}

const drawDecorator = (
    actionButton: ActionButton,
    graphicsBuffer: GraphicsBuffer,
    selected: boolean,
    fade: boolean
) => {
    const strokeBrightness: number = ColorUtils.calculatePulseValueOverTime({
        low: actionButton.layout.selectedBorder.strokeBrightnessRange[0],
        high: actionButton.layout.selectedBorder.strokeBrightnessRange[1],
        periodInMilliseconds: actionButton.layout.selectedBorder.pulsePeriod,
    })
    const fillAlpha: number = ColorUtils.calculatePulseValueOverTime({
        low: actionButton.layout.disabled.fillAlphaRange[0],
        high: actionButton.layout.disabled.fillAlphaRange[1],
        periodInMilliseconds: actionButton.layout.disabled.pulsePeriod,
    })

    actionButton.uiObjects.decorator = RectangleService.new({
        area: actionButton.uiObjects.buttonIcon.drawArea,
        noStroke: !selected,
        strokeWeight: selected
            ? actionButton.layout.selectedBorder.strokeWeight
            : undefined,
        strokeColor: selected
            ? [
                  actionButton.layout.selectedBorder.strokeHue,
                  actionButton.layout.selectedBorder.strokeSaturation,
                  strokeBrightness,
              ]
            : undefined,
        noFill: !fade,
        fillColor: fade
            ? [...actionButton.layout.disabled.fillColor, fillAlpha]
            : undefined,
    })

    RectangleService.draw(actionButton.uiObjects.decorator, graphicsBuffer)
}

const getActionName = (actionButton: ActionButton): string =>
    actionButton.actionTemplateOverride?.name ??
    actionButton.actionTemplate.name

const getActionTemplateId = (actionButton: ActionButton): string =>
    actionButton.actionTemplateOverride?.name ?? actionButton.actionTemplate.id
