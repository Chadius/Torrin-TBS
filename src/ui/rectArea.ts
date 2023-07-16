import * as p5 from "p5";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "./constants";

const notFound = [NaN, false, undefined, null];

export enum HorizontalAnchor {
    NONE,
    LEFT,
    MIDDLE,
    RIGHT
}

export enum VerticalAnchor {
    NONE,
    TOP,
    CENTER,
    BOTTOM
}

type PositionTop = {
    top: number;
}

type PositionLeft = {
    left: number;
}

type PositionWidth = {
    width: number;
}

type PositionHeight = {
    height: number;
}

type PositionBottom = {
    bottom: number;
}

type PositionRight = {
    right: number;
}

type ScreenWidth = {
    screenWidth: number;
}

type ScreenHeight = {
    screenHeight: number;
}

type ScreenPercentTop = {
    percentTop: number;
}

type ScreenPercentLeft = {
    percentLeft: number;
}

type ScreenPercentBottom = {
    percentBottom: number;
}

type ScreenPercentWidth = {
    percentWidth: number;
}

type ScreenPercentHeight = {
    percentHeight: number;
}

type ScreenPercentRight = {
    percentRight: number;
}

type TwelvePointColumnStart = {
    startColumn: number;
}

type TwelvePointColumnEnd = {
    endColumn: number;
}

type AnchorLeft = {
    anchorLeft: HorizontalAnchor
}

type AnchorTop = {
    anchorTop: VerticalAnchor
}

type Margins = {
    margin: number | [number, number] | [number, number, number] | [number, number, number, number];
}

type Alignment = {
    horizAlign: p5.HORIZ_ALIGN;
    vertAlign: p5.VERT_ALIGN;
}

type BaseRectangle = {
    baseRectangle: RectArea;
}

type RectTop = PositionTop
    | (ScreenHeight & ScreenPercentTop)
    | BaseRectangle & (AnchorTop | PositionTop | ScreenPercentTop | Margins)
type RectLeft = PositionLeft
    | (ScreenWidth & ScreenPercentLeft)
    | (ScreenWidth & TwelvePointColumnStart)
    | BaseRectangle & (AnchorLeft | PositionLeft | ScreenPercentLeft | Margins)
type RectHeightTopBottom = RectTop & PositionBottom
type RectHeightPercentHeight = ScreenHeight & ScreenPercentHeight
type RectHeightTopPercentBottom = ScreenHeight & RectTop & ScreenPercentBottom

type RectHeight = PositionHeight
    | RectHeightTopBottom
    | RectHeightPercentHeight
    | RectHeightTopPercentBottom
    | Margins
    | BaseRectangle
type RectWidthLeftRight = RectLeft & PositionRight
type RectWidthPercentWidth = ScreenWidth & ScreenPercentWidth
type RectWidthLeftPercentRight = ScreenWidth & RectLeft & ScreenPercentRight
type RectWidthLeftColumnEnd = ScreenWidth & RectLeft & TwelvePointColumnEnd

type RectWidth = PositionWidth
    | RectWidthLeftRight
    | RectWidthPercentWidth
    | RectWidthLeftPercentRight
    | RectWidthLeftColumnEnd
    | Margins
    | BaseRectangle
export type RectArguments = RectTop & RectLeft & RectHeight & RectWidth & Partial<Alignment>

export class RectArea {
    get height(): number {
        return this._height;
    }

    get width(): number {
        return this._width;
    }

    get left(): number {
        return this._left;
    }

    get top(): number {
        return this._top;
    }

    private _top: number;
    private _left: number;
    private _width: number;
    private _height: number;

    constructor(params: RectArguments) {
        this.setRectTop(params);
        this.setRectLeft(params);

        this.setRectHeight(params);
        this.setRectWidth(params);

        this.alignVertically(params as Alignment);
        this.alignHorizontally(params as Alignment);
    }

    private setRectTop(params: RectTop) {
        let top = undefined;
        const {baseRectangle} = (params as BaseRectangle);
        if (baseRectangle && !notFound.includes(baseRectangle._top)) {
            top = top ?? 0;
            top = baseRectangle.top;
        }

        const positionTop = (params as PositionTop)
        if (!notFound.includes(positionTop.top)) {
            top = top ?? 0;
            top += positionTop.top;
        }

        const percentTop = (params as (ScreenHeight & ScreenPercentTop))
        if (
            !notFound.includes(percentTop.screenHeight)
            && !notFound.includes(percentTop.percentTop)
        ) {
            top = top ?? 0;
            top += percentTop.screenHeight * percentTop.percentTop / 100;
        }

        const anchorTop = (params as AnchorTop)
        const anchorTopIsValid: boolean = !notFound.includes(anchorTop.anchorTop)
            && anchorTop.anchorTop != VerticalAnchor.NONE
            && baseRectangle !== undefined;

        const marginsAll = (params as Margins);
        const marginsAllIsValid: boolean = (marginsAll.margin || marginsAll.margin === 0)
            && baseRectangle !== undefined;

        if (anchorTopIsValid) {
            if (anchorTop.anchorTop == VerticalAnchor.CENTER) {
                top += baseRectangle._height / 2;
            } else if (anchorTop.anchorTop == VerticalAnchor.BOTTOM) {
                top += baseRectangle._height;
            }
        }

        if (marginsAllIsValid) {
            if (typeof marginsAll.margin === "number") {
                top += marginsAll.margin;
            } else {
                top += marginsAll.margin[0];
            }
        }

        this._top = top;
    }

    move(params: RectLeft & RectTop) {
        this.setRectLeft(params);
        this.setRectTop(params);
    }

    private setRectLeft(params: RectLeft) {
        let left = undefined;
        const {baseRectangle} = (params as BaseRectangle);
        if (baseRectangle && !notFound.includes(baseRectangle._left)) {
            left = baseRectangle._left;
        }

        const positionLeft = (params as PositionLeft)
        if (!notFound.includes(positionLeft.left)) {
            left = left ?? 0;
            left += positionLeft.left;
        }

        const percentLeft = (params as (ScreenWidth & ScreenPercentLeft))
        if (
            !notFound.includes(percentLeft.screenWidth)
            && !notFound.includes(percentLeft.percentLeft)
        ) {
            left = left ?? 0;
            left += percentLeft.screenWidth * percentLeft.percentLeft / 100;
        }

        const columnLeft = (params as (ScreenWidth & TwelvePointColumnStart))
        if (
            !notFound.includes(columnLeft.screenWidth)
            && !notFound.includes(columnLeft.startColumn)
        ) {
            left = left ?? 0;
            left += columnLeft.screenWidth * columnLeft.startColumn / 12;
        }

        const anchorLeft = (params as AnchorLeft);
        const anchorLeftIsValid: boolean = !notFound.includes(anchorLeft.anchorLeft)
            && anchorLeft.anchorLeft != HorizontalAnchor.NONE
            && baseRectangle !== undefined;

        const marginsAll = (params as Margins);
        const marginsAllIsValid: boolean = (marginsAll.margin || marginsAll.margin === 0)
            && baseRectangle !== undefined;

        if (anchorLeftIsValid) {
            if (anchorLeft.anchorLeft == HorizontalAnchor.MIDDLE) {
                left += baseRectangle._width / 2;
            } else if (anchorLeft.anchorLeft == HorizontalAnchor.RIGHT) {
                left += baseRectangle._width;
            }
        }

        if (marginsAllIsValid) {
            if (typeof marginsAll.margin === "number") {
                left += marginsAll.margin;
            } else if ([2, 3].includes(marginsAll.margin.length)) {
                left += marginsAll.margin[1];
            } else if (marginsAll.margin.length > 3) {
                left += marginsAll.margin[3];
            }
        }

        this._left = left;
    }

    private setRectHeight(params: RectHeight) {
        const height = (params as PositionHeight)
        const {baseRectangle} = (params as BaseRectangle);
        if (baseRectangle && !notFound.includes(baseRectangle._height)) {
            this._height = baseRectangle._height;
        }

        if (!notFound.includes(height.height)) {
            this._height = height.height;
            return;
        }

        const topBottom = (params as RectHeightTopBottom)
        if (
            !notFound.includes(this._top)
            && !notFound.includes(topBottom.bottom)
        ) {
            this._height = topBottom.bottom - this._top;
            return;
        }
        const percentHeight = (params as RectHeightPercentHeight)

        if (
            !notFound.includes(percentHeight.screenHeight)
            && !notFound.includes(percentHeight.percentHeight)
        ) {
            this._height = percentHeight.screenHeight * percentHeight.percentHeight / 100;
            return;
        }

        const percentTopBottom = (params as RectHeightTopPercentBottom)
        if (
            !notFound.includes(this._top)
            && !notFound.includes(percentTopBottom.percentBottom)
            && !notFound.includes(percentTopBottom.screenHeight)
        ) {
            this._height = ((percentTopBottom.screenHeight * percentTopBottom.percentBottom) / 100) - this._top;
            return;
        }

        const marginsAll = (params as Margins)
        if (
            (marginsAll.margin || marginsAll.margin === 0)
            && baseRectangle
        ) {
            if (typeof marginsAll.margin === "number") {
                const margin = marginsAll.margin
                this._height = baseRectangle._height - 2 * margin;
            } else if (marginsAll.margin.length == 2) {
                const margin = marginsAll.margin[0]
                this._height = baseRectangle._height - 2 * margin;
            } else if (marginsAll.margin.length >= 3) {
                this._height = baseRectangle._height - marginsAll.margin[0] - marginsAll.margin[2];
            }
        }
    }

    private setRectWidth(params: RectWidth) {
        const width = (params as PositionWidth)
        const {baseRectangle} = (params as BaseRectangle);
        if (baseRectangle && !notFound.includes(baseRectangle._width)) {
            this._width = baseRectangle._width;
        }

        if (!notFound.includes(width.width)) {
            this._width = width.width;
            return;
        }

        const leftRight = (params as RectWidthLeftRight)
        if (
            !notFound.includes(this._left)
            && !notFound.includes(leftRight.right)
        ) {
            this._width = leftRight.right - this._left;
            return;
        }

        const percentWidth = (params as RectWidthPercentWidth)
        if (
            !notFound.includes(percentWidth.screenWidth)
            && !notFound.includes(percentWidth.percentWidth)
        ) {
            this._width = percentWidth.screenWidth * percentWidth.percentWidth / 100;
            return;
        }

        const percentLeftRight = (params as RectWidthLeftPercentRight)
        if (
            !notFound.includes(this._left)
            && !notFound.includes(percentLeftRight.percentRight)
            && !notFound.includes(percentLeftRight.screenWidth)
        ) {
            this._width = ((percentLeftRight.screenWidth * percentLeftRight.percentRight) / 100) - this._left;
            return;
        }

        const columnLeftRight = (params as RectWidthLeftColumnEnd)
        if (
            !notFound.includes(columnLeftRight.screenWidth)
            && !notFound.includes(this._left)
            && !notFound.includes(columnLeftRight.endColumn)
        ) {
            this._width = (columnLeftRight.screenWidth * (columnLeftRight.endColumn + 1) / 12) - this._left;
            return;
        }

        const marginsAll = (params as Margins)
        if (
            (marginsAll.margin || marginsAll.margin === 0)
            && baseRectangle
        ) {
            if (typeof marginsAll.margin === "number") {
                const margin = marginsAll.margin
                this._width = baseRectangle._width - 2 * margin;
            } else if ([2, 3].includes(marginsAll.margin.length)) {
                const margin = marginsAll.margin[1]
                this._width = baseRectangle._width - 2 * margin;
            } else if (marginsAll.margin.length > 3) {
                this._width = baseRectangle._width - marginsAll.margin[1] - marginsAll.margin[3];
            }
        }
    }

    get bottom(): number {
        return this._top + this._height;
    }

    get right(): number {
        return this._left + this._width;
    }

    get centerY(): number {
        return this._top + (this._height / 2);
    }

    get centerX(): number {
        return this._left + (this._width / 2);
    }

    align(params: Alignment) {
        this.alignHorizontally(params);
        this.alignVertically(params);
    }

    private alignHorizontally(params: Alignment) {
        if (!params) {
            return;
        }

        switch (params.horizAlign) {
            case HORIZ_ALIGN_CENTER:
                this._left -= this.width / 2;
                break;
            default:
                break;
        }
    }

    private alignVertically(params: Alignment) {
        if (!params) {
            return;
        }

        switch (params.vertAlign) {
            case VERT_ALIGN_CENTER:
                this._top -= this.height / 2;
                break;
            default:
                break;
        }
    }

    public isInside(coordinateX: number, coordinateY: number): boolean {
        return (
            coordinateX >= this._left
            && coordinateX <= this._left + this._width
            && coordinateY >= this._top
            && coordinateY <= this._top + this._height
        );
    }
}
