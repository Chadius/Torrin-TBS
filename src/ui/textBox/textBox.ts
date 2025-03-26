import { RectArea } from "../rectArea"
import * as p5 from "p5"
import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "../constants"
import { isValidValue } from "../../utils/objectValidityCheck"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"

export type TextBoxArguments = {
    text: string
    fontSize: number
    fontColor: number[]
    area: RectArea
    horizAlign?: p5.HORIZ_ALIGN
    vertAlign?: p5.VERT_ALIGN
    duration?: number
    lastTimeDrawn?: number
}

export interface TextBox {
    fontSize: number
    fontColor: number[]
    area: RectArea
    horizAlign: p5.HORIZ_ALIGN
    vertAlign: p5.VERT_ALIGN
    duration: number
    lastTimeDrawn: number
    text: string
}

export const TextBoxService = {
    new: ({
        fontSize,
        fontColor,
        area,
        horizAlign,
        vertAlign,
        duration,
        lastTimeDrawn,
        text,
    }: TextBoxArguments): TextBox => {
        return {
            fontSize: fontSize,
            fontColor: fontColor,
            area: area,
            horizAlign: horizAlign || HORIZONTAL_ALIGN.LEFT,
            vertAlign: vertAlign || VERTICAL_ALIGN.BASELINE,
            duration: duration,
            lastTimeDrawn: lastTimeDrawn || Date.now(),
            text: text,
        }
    },
    draw: (textBox: TextBox, graphics: GraphicsBuffer): void => {
        if (isDone(textBox)) {
            return
        }

        graphics.push()
        graphics.textSize(textBox.fontSize)
        graphics.fill(
            textBox.fontColor[0],
            textBox.fontColor[1],
            textBox.fontColor[2]
        )
        graphics.textAlign(textBox.horizAlign, textBox.vertAlign)
        graphics.text(
            textBox.text,
            textBox.area.left,
            textBox.area.top,
            textBox.area.width,
            textBox.area.height
        )
        graphics.textAlign(HORIZONTAL_ALIGN.LEFT, VERTICAL_ALIGN.BASELINE)
        graphics.pop()
    },
    isDone: (textBox: TextBox): boolean => {
        return isDone(textBox)
    },
    stop: (textBox: TextBox) => {
        textBox.duration = 0
    },
}

const isDone = (textBox: TextBox): boolean => {
    return (
        !isValidValue(textBox) ||
        Date.now() - textBox.lastTimeDrawn >= textBox.duration
    )
}
