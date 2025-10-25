import { TextBox, TextBoxService } from "../../../ui/textBox/textBox"
import { RectAreaService } from "../../../ui/rectArea"
import { Rectangle, RectangleService } from "../../../ui/rectangle/rectangle"
import { WINDOW_SPACING } from "../../../ui/constants"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { TextGraphicalHandlingService } from "../../../utils/graphics/textGraphicalHandlingService"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"

export type ActionNameDisplayArguments = {
    actionName: string
    left: number
    bottom: number
    graphicsContext: GraphicsBuffer
}

export interface ActionNameDisplay {
    actionName: string
    actionNameTextBox: TextBox
    textBackgroundRectangle: Rectangle
}

const constants = {
    textSize: 18,
    padding: WINDOW_SPACING.SPACING1,
    strokeWeight: 1,
}

export const ActionNameDisplayService = {
    new: ({
        actionName,
        left,
        bottom,
        graphicsContext,
    }: ActionNameDisplayArguments): ActionNameDisplay => {
        const actionNameTextBox = createActionNameTextBox({
            actionName,
            left,
            bottom,
            graphicsContext,
        })

        const textBackgroundRectangle =
            createBackgroundRectangle(actionNameTextBox)

        return {
            actionName,
            actionNameTextBox,
            textBackgroundRectangle,
        }
    },

    draw: (
        actionNameDisplay: ActionNameDisplay | undefined,
        graphicsContext: GraphicsBuffer
    ): void => {
        if (!actionNameDisplay) return

        RectangleService.draw(
            actionNameDisplay.textBackgroundRectangle,
            graphicsContext
        )
        TextBoxService.draw(
            actionNameDisplay.actionNameTextBox,
            graphicsContext
        )
    },
}

const createActionNameTextBox = ({
    actionName,
    left,
    bottom,
    graphicsContext,
}: ActionNameDisplayArguments): TextBox => {
    const textFit = TextGraphicalHandlingService.fitTextWithinSpace({
        text: actionName,
        maximumWidth: ScreenDimensions.SCREEN_WIDTH * 0.5,
        graphics: graphicsContext,
        fontDescription: {
            preferredFontSize: constants.textSize,
            strokeWeight: constants.strokeWeight,
        },
        mitigations: [{ maximumNumberOfLines: 1 }],
    })

    return TextBoxService.new({
        text: actionName,
        fontSize: constants.textSize,
        fontColor: [0, 0, 0],
        area: RectAreaService.new({
            left: left + constants.padding + WINDOW_SPACING.SPACING1,
            bottom: bottom - constants.padding,
            width: textFit.width + constants.padding * 2,
            height: constants.textSize + constants.padding,
        }),
    })
}

const createBackgroundRectangle = (textBox: TextBox): Rectangle => {
    return RectangleService.new({
        area: RectAreaService.new({
            left: RectAreaService.left(textBox.area) - constants.padding,
            right: RectAreaService.right(textBox.area),
            top: RectAreaService.top(textBox.area) - constants.padding / 2,
            bottom:
                RectAreaService.bottom(textBox.area) + constants.padding / 2,
        }),
        fillColor: [0, 0, 100, 255 - 128],
        noStroke: true,
    })
}
