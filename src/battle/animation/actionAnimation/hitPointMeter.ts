import {TextBox} from "../../../ui/textBox";
import {RectArea} from "../../../ui/rectArea";
import p5 from "p5";
import {Rectangle} from "../../../ui/rectangle";
import {ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME} from "./actionAnimationConstants";
import {WINDOW_SPACING1} from "../../../ui/constants";

export const HIT_POINT_METER_HP_WIDTH = 20;
const HIT_POINT_METER_HEIGHT = 20;
const HIT_POINT_TEXT_WIDTH = 80;
const HIT_POINT_TEXT_SIZE = 18;

export class HitPointMeter {
    private currentHitPointsTextBox: TextBox;
    private maxHitPointsTextBox: TextBox;
    private currentHitPointsRectangle: Rectangle;
    private maxHitPointsRectangle: Rectangle;
    private changedHitPointsRectangle: Rectangle;
    private changedHitPointsRectangleStartWidth: number;
    private changedHitPointsRectangleEndWidth: number;
    private changedHitPointsTimestamp: number;

    constructor({
                    maxHitPoints,
                    currentHitPoints,
                    left,
                    top,
                    hue,
                }: {
        maxHitPoints: number,
        currentHitPoints: number,
        left: number,
        top: number,
        hue: number,
    }) {
        this._maxHitPoints = maxHitPoints;
        this._currentHitPoints = currentHitPoints;
        this._left = left;
        this._top = top;
        this._hue = hue;

        this.createCurrentHitPointTextBox();
        this.createMaxHitPointTextBox();

        this.createMaxHitPointRect();
        this.createCurrentHitPointRect();
    }

    private _maxHitPoints: number;

    get maxHitPoints(): number {
        return this._maxHitPoints;
    }

    private _currentHitPoints: number;

    get currentHitPoints(): number {
        return this._currentHitPoints;
    }

    private _left: number;

    get left(): number {
        return this._left;
    }

    private _top: number;

    get top(): number {
        return this._top;
    }

    private _hue: number;

    get hue(): number {
        return this._hue;
    }

    draw(graphicsContext: p5) {
        this.drawHitPointsText(graphicsContext);
        this.drawHitPointRectangle(graphicsContext);
    }

    changeHitPoints(hitPointChange: number) {
        this._currentHitPoints += hitPointChange;
        this.createCurrentHitPointTextBox();
        this.createCurrentHitPointRect();
        this.createChangedHitPointRect(hitPointChange);
        this.changedHitPointsTimestamp = Date.now();
    }

    private drawHitPointRectangle(graphicsContext: p5) {
        this.maxHitPointsRectangle.draw(graphicsContext);
        this.currentHitPointsRectangle.draw(graphicsContext);
        this.updateChangedHitPointsRectangle();
        if (this.changedHitPointsRectangle !== undefined) {
            this.changedHitPointsRectangle.draw(graphicsContext);
        }
    }

    private drawHitPointsText(graphicsContext: p5) {
        this.currentHitPointsTextBox.draw(graphicsContext);
        this.maxHitPointsTextBox.draw(graphicsContext);
    }

    private createCurrentHitPointTextBox() {
        this.currentHitPointsTextBox = new TextBox({
            text: this.currentHitPoints.toString(),
            textSize: HIT_POINT_TEXT_SIZE,
            fontColor: this.getColorsBasedOnHue().textColor,
            area: new RectArea({
                left: this.left,
                top: this.top,
                width: HIT_POINT_TEXT_WIDTH / 2,
                height: HIT_POINT_METER_HEIGHT,
            }),
        });
    }

    private createMaxHitPointTextBox() {
        this.maxHitPointsTextBox = new TextBox({
            text: `/${this.maxHitPoints}`,
            textSize: HIT_POINT_TEXT_SIZE,
            fontColor: this.getColorsBasedOnHue().textColor,
            area: new RectArea({
                left: this.left + (HIT_POINT_TEXT_WIDTH / 2),
                top: this.top,
                width: HIT_POINT_TEXT_WIDTH / 2,
                height: HIT_POINT_METER_HEIGHT,
            }),
        });
    }

    private createMaxHitPointRect() {
        this.maxHitPointsRectangle = new Rectangle({
            area: new RectArea({
                left: this.left + HIT_POINT_TEXT_WIDTH + WINDOW_SPACING1,
                top: this.top,
                height: HIT_POINT_METER_HEIGHT,
                width: HIT_POINT_METER_HP_WIDTH * this.maxHitPoints,
            }),
            fillColor: this.getColorsBasedOnHue().max.fillColor,
            strokeColor: this.getColorsBasedOnHue().max.strokeColor,
            strokeWeight: 2,
        });
    }

    private createCurrentHitPointRect() {
        this.currentHitPointsRectangle = new Rectangle({
            area: new RectArea({
                left: this.left + HIT_POINT_TEXT_WIDTH + WINDOW_SPACING1,
                top: this.top,
                height: HIT_POINT_METER_HEIGHT,
                width: HIT_POINT_METER_HP_WIDTH * this.currentHitPoints,
            }),
            fillColor: this.getColorsBasedOnHue().current.fillColor,
            noStroke: true,
        });
    }

    private createChangedHitPointRect(hitPointChange: number) {
        if (hitPointChange === 0) {
            this.changedHitPointsRectangle = undefined;
            return;
        }

        if (hitPointChange < 0) {
            this.changedHitPointsRectangleStartWidth = (-1 * hitPointChange) * HIT_POINT_METER_HP_WIDTH;
            this.changedHitPointsRectangleEndWidth = 0;
        }

        if (hitPointChange > 0) {
            this.changedHitPointsRectangleStartWidth = 0;
            this.changedHitPointsRectangleEndWidth = hitPointChange * HIT_POINT_METER_HP_WIDTH;
        }

        this.changedHitPointsRectangle = new Rectangle({
            area: new RectArea({
                left: this.currentHitPointsRectangle.area.right,
                top: this.top,
                height: HIT_POINT_METER_HEIGHT,
                width: this.changedHitPointsRectangleStartWidth,
            }),
            fillColor: this.getColorsBasedOnHue().changed.fillColor,
            noStroke: true,
        });
    }

    private updateChangedHitPointsRectangle() {
        if (this.changedHitPointsRectangle === undefined) {
            return;
        }

        const timeElapsed = Date.now() - this.changedHitPointsTimestamp;
        if (timeElapsed > ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME) {
            this.changedHitPointsRectangle = undefined;
            return;
        }

        const changeDistance = this.changedHitPointsRectangleEndWidth - this.changedHitPointsRectangleStartWidth;

        const changedHitPointsRectangleCurrentWidth = (
                timeElapsed
                * changeDistance
                / ACTION_ANIMATION_TARGET_REACTS_TO_ACTION_TIME
            )
            + this.changedHitPointsRectangleStartWidth;

        this.changedHitPointsRectangle = new Rectangle({
            area: new RectArea({
                left: this.changedHitPointsRectangle.area.left,
                top: this.changedHitPointsRectangle.area.top,
                height: this.changedHitPointsRectangle.area.height,
                width: changedHitPointsRectangleCurrentWidth,
            }),
            fillColor: this.getColorsBasedOnHue().changed.fillColor,
            noStroke: true,
        });
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
                fillColor: [this.hue, 20, 70]
            }
        }
    }
}
