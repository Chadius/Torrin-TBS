import { TextBox, TextBoxService } from "../../../ui/textBox/textBox"
import { RectAreaService } from "../../../ui/rectArea"
import { Rectangle, RectangleService } from "../../../ui/rectangle/rectangle"
import { ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME } from "./actionAnimationConstants"
import { WINDOW_SPACING } from "../../../ui/constants"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"

export const HIT_POINT_METER_HP_WIDTH = 20
const HIT_POINT_METER_HEIGHT = 20
const HIT_POINT_TEXT_WIDTH = 80
const HIT_POINT_TEXT_SIZE = 18

export class HitPointMeter {
    private currentHitPointsTextBox: TextBox | undefined
    private maxHitPointsTextBox: TextBox | undefined
    private currentHitPointsRectangle: Rectangle | undefined
    private maxHitPointsRectangle: Rectangle | undefined
    private changedHitPointsRectangle: Rectangle | undefined
    private changedHitPointsRectangleStartWidth: number | undefined
    private changedHitPointsRectangleEndWidth: number | undefined
    private changedHitPointsTimestamp: number | undefined

    constructor({
        maxHitPoints,
        currentHitPoints,
        left,
        top,
        hue,
    }: {
        maxHitPoints: number
        currentHitPoints: number
        left: number
        top: number
        hue: number
    }) {
        this._maxHitPoints = maxHitPoints
        this._currentHitPoints = currentHitPoints
        this._left = left
        this._top = top
        this._hue = hue

        this.createMaxHitPointTextBox()
        this.createCurrentHitPointTextBox(this.currentHitPoints)

        this.createMaxHitPointRect()
        this.createCurrentHitPointRect(this.currentHitPoints)
    }

    private _maxHitPoints: number

    get maxHitPoints(): number {
        return this._maxHitPoints
    }

    private _currentHitPoints: number

    get currentHitPoints(): number {
        return this._currentHitPoints
    }

    private _left: number

    get left(): number {
        return this._left
    }

    private _top: number

    get top(): number {
        return this._top
    }

    private _hue: number

    get hue(): number {
        return this._hue
    }

    draw(graphicsContext: GraphicsBuffer) {
        this.drawHitPointsText(graphicsContext)
        this.drawHitPointRectangle(graphicsContext)
    }

    changeHitPoints(hitPointChange: number) {
        this.createCurrentHitPointTextBox(
            this.currentHitPoints + hitPointChange
        )
        const displayedHitPointsAtStartOfChange: number =
            hitPointChange < 0
                ? this.currentHitPoints + hitPointChange
                : this.currentHitPoints
        this.createCurrentHitPointRect(displayedHitPointsAtStartOfChange)

        this.createChangedHitPointRect(hitPointChange)
        this.changedHitPointsTimestamp = Date.now()
    }

    private drawHitPointRectangle(graphicsContext: GraphicsBuffer) {
        if (
            this.currentHitPointsRectangle == undefined ||
            this.maxHitPointsRectangle == undefined
        )
            return
        RectangleService.draw(this.maxHitPointsRectangle, graphicsContext)
        RectangleService.draw(this.currentHitPointsRectangle, graphicsContext)
        this.updateChangedHitPointsRectangle()
        if (this.changedHitPointsRectangle !== undefined) {
            RectangleService.draw(
                this.changedHitPointsRectangle,
                graphicsContext
            )
        }
    }

    private drawHitPointsText(graphicsContext: GraphicsBuffer) {
        if (
            this.currentHitPointsTextBox == undefined ||
            this.maxHitPointsTextBox == undefined
        )
            return
        TextBoxService.draw(this.currentHitPointsTextBox, graphicsContext)
        TextBoxService.draw(this.maxHitPointsTextBox, graphicsContext)
    }

    private createCurrentHitPointTextBox(currentHitPoints: number) {
        this.currentHitPointsTextBox = TextBoxService.new({
            text: currentHitPoints.toString(),
            fontSize: HIT_POINT_TEXT_SIZE,
            fontColor: this.getColorsBasedOnHue().textColor,
            area: RectAreaService.new({
                left: this.left,
                top: this.top,
                width: HIT_POINT_TEXT_WIDTH / 2,
                height: HIT_POINT_METER_HEIGHT,
            }),
        })
    }

    private createMaxHitPointTextBox() {
        this.maxHitPointsTextBox = TextBoxService.new({
            text: `/${this.maxHitPoints}`,
            fontSize: HIT_POINT_TEXT_SIZE,
            fontColor: this.getColorsBasedOnHue().textColor,
            area: RectAreaService.new({
                left: this.left + HIT_POINT_TEXT_WIDTH / 2,
                top: this.top,
                width: HIT_POINT_TEXT_WIDTH / 2,
                height: HIT_POINT_METER_HEIGHT,
            }),
        })
    }

    private createMaxHitPointRect() {
        this.maxHitPointsRectangle = RectangleService.new({
            area: RectAreaService.new({
                left:
                    this.left + HIT_POINT_TEXT_WIDTH + WINDOW_SPACING.SPACING1,
                top: this.top,
                height: HIT_POINT_METER_HEIGHT,
                width: HIT_POINT_METER_HP_WIDTH * this.maxHitPoints,
            }),
            fillColor: this.getColorsBasedOnHue().max.fillColor,
            strokeColor: this.getColorsBasedOnHue().max.strokeColor,
            strokeWeight: 2,
        })
    }

    private createCurrentHitPointRect(currentHitPoints: number) {
        this.currentHitPointsRectangle = RectangleService.new({
            area: RectAreaService.new({
                left:
                    this.left + HIT_POINT_TEXT_WIDTH + WINDOW_SPACING.SPACING1,
                top: this.top,
                height: HIT_POINT_METER_HEIGHT,
                width: HIT_POINT_METER_HP_WIDTH * currentHitPoints,
            }),
            fillColor: this.getColorsBasedOnHue().current.fillColor,
            noStroke: true,
        })
    }

    private createChangedHitPointRect(hitPointChange: number) {
        if (hitPointChange === 0) {
            this.changedHitPointsRectangle = undefined
            return
        }

        if (hitPointChange < 0) {
            this.changedHitPointsRectangleStartWidth =
                -1 * hitPointChange * HIT_POINT_METER_HP_WIDTH
            this.changedHitPointsRectangleEndWidth = 0
        }

        if (hitPointChange > 0) {
            this.changedHitPointsRectangleStartWidth = 0
            this.changedHitPointsRectangleEndWidth =
                hitPointChange * HIT_POINT_METER_HP_WIDTH
        }

        if (
            this.currentHitPointsRectangle == undefined ||
            this.changedHitPointsRectangleStartWidth == undefined
        )
            return
        this.changedHitPointsRectangle = RectangleService.new({
            area: RectAreaService.new({
                left: RectAreaService.right(
                    this.currentHitPointsRectangle.area
                ),
                top: this.top,
                height: HIT_POINT_METER_HEIGHT,
                width: this.changedHitPointsRectangleStartWidth,
            }),
            fillColor: this.getColorsBasedOnHue().changed.fillColor,
            noStroke: true,
        })
    }

    private updateChangedHitPointsRectangle() {
        if (this.changedHitPointsRectangle === undefined) {
            return
        }

        if (
            this.currentHitPointsRectangle == undefined ||
            this.changedHitPointsRectangleStartWidth == undefined ||
            this.changedHitPointsRectangleEndWidth == undefined ||
            this.changedHitPointsTimestamp == undefined
        )
            return
        const timeElapsed = Date.now() - this.changedHitPointsTimestamp
        if (timeElapsed > ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME) {
            this.changedHitPointsRectangle = RectangleService.new({
                area: RectAreaService.new({
                    left: this.changedHitPointsRectangle.area.left,
                    top: this.changedHitPointsRectangle.area.top,
                    height: this.changedHitPointsRectangle.area.height,
                    width: this.changedHitPointsRectangleEndWidth,
                }),
                fillColor: this.getColorsBasedOnHue().changed.fillColor,
                noStroke: true,
            })
            return
        }

        const changeDistance =
            this.changedHitPointsRectangleEndWidth -
            this.changedHitPointsRectangleStartWidth

        const changedHitPointsRectangleCurrentWidth =
            (timeElapsed * changeDistance) /
                ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME +
            this.changedHitPointsRectangleStartWidth

        this.changedHitPointsRectangle = RectangleService.new({
            area: RectAreaService.new({
                left: this.changedHitPointsRectangle.area.left,
                top: this.changedHitPointsRectangle.area.top,
                height: this.changedHitPointsRectangle.area.height,
                width: changedHitPointsRectangleCurrentWidth,
            }),
            fillColor: this.getColorsBasedOnHue().changed.fillColor,
            noStroke: true,
        })
    }

    private getColorsBasedOnHue() {
        return {
            textColor: [0, 0, 0],
            current: {
                fillColor: [this.hue, 30, 50],
            },
            max: {
                fillColor: [this.hue, 2, 2],
                strokeColor: [this.hue, 70, 70],
            },
            changed: {
                fillColor: [this.hue, 20, 70],
            },
        }
    }
}
