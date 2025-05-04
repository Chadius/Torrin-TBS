import { RectArea } from "../../../../ui/rectArea"

export interface PlayerActionTargetLayout {
    targetExplanationLabel: {
        area: RectArea
        fontSize: number
        fillColor: [number, number, number, number]
        noStroke: boolean
        fontColor: [number, number, number]
        textBoxMargin: [number, number, number, number]
        margin: [number, number]
    }
    cancelButton: {
        topOffset: number
        height: number
        width: number
        text: string
        fontSize: number
        fillColor: number[]
        strokeColor: number[]
        strokeWeight: number
        fontColor: number[]
        textBoxMargin: number[]
        margin: number
        selectedBorder: {
            strokeColor: number[]
            strokeWeight: number
        }
        activeFill: {
            fillColor: number[]
        }
    }
}
