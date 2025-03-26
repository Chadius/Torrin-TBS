import { RectArea } from "../rectArea"
import { isValidValue } from "../../utils/objectValidityCheck"
import { GraphicsBuffer } from "../../utils/graphics/graphicsRenderer"

type RequiredOptions = {
    area: RectArea
}

type Options = {
    fillColor?: number[]
    strokeColor?: number[]
    strokeWeight?: number
    noStroke?: boolean
    noFill?: boolean
}

export type RectangleArguments = RequiredOptions & Partial<Options>

export interface Rectangle {
    area: RectArea
    fillColor?: number[]
    strokeColor?: number[]
    strokeWeight?: number
    noStroke?: boolean
    noFill?: boolean
}

export const RectangleService = {
    new: ({
        area,
        fillColor,
        strokeColor,
        strokeWeight,
        noStroke,
        noFill,
    }:
        | {
              area: RectArea
              fillColor?: number[]
              strokeColor?: number[]
              strokeWeight?: number
              noStroke?: boolean
              noFill?: boolean
          }
        | RectangleArguments): Rectangle => {
        return {
            area: area,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWeight: strokeWeight,
            noStroke: noStroke,
            noFill: noFill,
        }
    },
    draw: (rectangle: Rectangle, graphics: GraphicsBuffer): void => {
        graphics.push()
        if (isValidValue(rectangle.fillColor)) {
            graphics.fill(
                rectangle.fillColor[0],
                rectangle.fillColor[1],
                rectangle.fillColor[2],
                rectangle.fillColor?.[3]
            )
        }
        if (isValidValue(rectangle.strokeColor)) {
            graphics.stroke(
                rectangle.strokeColor[0],
                rectangle.strokeColor[1],
                rectangle.strokeColor[2]
            )
        }
        if (isValidValue(rectangle.strokeWeight)) {
            graphics.strokeWeight(rectangle.strokeWeight)
        }
        if (rectangle.noFill) {
            graphics.noFill()
        }
        if (rectangle.noStroke) {
            graphics.noStroke()
        }
        graphics.rect(
            rectangle.area.left,
            rectangle.area.top,
            rectangle.area.width,
            rectangle.area.height
        )
        graphics.pop()
    },
}
