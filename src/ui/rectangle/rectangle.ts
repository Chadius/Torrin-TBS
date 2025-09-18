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
    cornerRadius?: number[]
}

export type RectangleArguments = RequiredOptions & Partial<Options>

export interface Rectangle {
    area: RectArea
    fillColor?: number[]
    strokeColor?: number[]
    strokeWeight?: number
    noStroke?: boolean
    noFill?: boolean
    cornerRadius?: number[]
}

export const RectangleService = {
    new: ({
        area,
        fillColor,
        strokeColor,
        strokeWeight,
        noStroke,
        noFill,
        cornerRadius,
    }:
        | {
              area: RectArea
              fillColor?: number[]
              strokeColor?: number[]
              strokeWeight?: number
              noStroke?: boolean
              noFill?: boolean
              cornerRadius?: number[]
          }
        | RectangleArguments): Rectangle => {
        return {
            area: area,
            fillColor: fillColor,
            strokeColor: strokeColor,
            strokeWeight: strokeWeight,
            noStroke: noStroke,
            noFill: noFill,
            cornerRadius: cornerRadius,
        }
    },
    draw: (
        rectangle: Rectangle | undefined,
        graphics: GraphicsBuffer
    ): void => {
        if (!rectangle) return
        graphics.push()
        if (
            isValidValue(rectangle.fillColor) &&
            rectangle.fillColor != undefined
        ) {
            graphics.fill(
                rectangle.fillColor[0],
                rectangle.fillColor[1],
                rectangle.fillColor[2],
                rectangle.fillColor?.[3]
            )
        }
        if (
            isValidValue(rectangle.strokeColor) &&
            rectangle.strokeColor != undefined
        ) {
            graphics.stroke(
                rectangle.strokeColor[0],
                rectangle.strokeColor[1],
                rectangle.strokeColor[2]
            )
        }
        if (
            isValidValue(rectangle.strokeWeight) &&
            rectangle.strokeWeight != undefined
        ) {
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
            rectangle.area.height,
            ...(rectangle.cornerRadius ?? [])
        )
        graphics.pop()
    },
}
