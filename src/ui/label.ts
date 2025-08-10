import { RectAreaService } from "./rectArea"
import { TextBox, TextBoxArguments, TextBoxService } from "./textBox/textBox"
import {
    Rectangle,
    RectangleArguments,
    RectangleService,
} from "./rectangle/rectangle"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"

export type TextBoxMargin = {
    textBoxMargin:
        | number
        | [number, number]
        | [number, number, number]
        | [number, number, number, number]
        | number[]
}

export interface Label {
    rectangle: Rectangle
    textBox: TextBox
}

export const LabelService = {
    new: (
        options: RectangleArguments & TextBoxArguments & TextBoxMargin
    ): Label => {
        let rectangle = RectangleService.new(options)

        const innerTextRect = RectAreaService.new({
            baseRectangle: options.area,
            margin: options.textBoxMargin,
        })

        let textBox = TextBoxService.new({
            ...options,
            ...{
                area: innerTextRect,
            },
        })

        return {
            textBox,
            rectangle,
        }
    },
    draw: (label: Label, graphics: GraphicsBuffer): void => {
        if (!label) return
        RectangleService.draw(label.rectangle, graphics)
        TextBoxService.draw(label.textBox, graphics)
    },
}
