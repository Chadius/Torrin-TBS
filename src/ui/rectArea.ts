import * as p5 from "p5";
import {HORIZ_ALIGN_CENTER, HORIZ_ALIGN_LEFT, VERT_ALIGN_CENTER} from "./constants";

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
  baseRectangle: RectArea
  anchorLeft: HorizontalAnchor
}

type AnchorTop = {
  baseRectangle: RectArea
  anchorTop: VerticalAnchor
}

type Margins = {
  baseRectangle: RectArea;
  margin: number | [number, number] | [number, number, number] | [number, number, number, number];
}

type Alignment = {
  horizAlign: p5.HORIZ_ALIGN;
  vertAlign: p5.VERT_ALIGN;
}

type RectTop = PositionTop
  | (ScreenHeight & ScreenPercentTop)
  | AnchorTop
  | Margins
type RectLeft = PositionLeft
  | (ScreenWidth & ScreenPercentLeft)
  | (ScreenWidth & TwelvePointColumnStart)
  | AnchorLeft
  | Margins
type RectHeightTopBottom = RectTop & PositionBottom
type RectHeightPercentHeight = ScreenHeight & ScreenPercentHeight
type RectHeightTopPercentBottom = ScreenHeight & RectTop & ScreenPercentBottom

type RectHeight = PositionHeight
  | RectHeightTopBottom
  | RectHeightPercentHeight
  | RectHeightTopPercentBottom
  | Margins
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
export type RectArguments = RectTop & RectLeft & RectHeight & RectWidth & Partial<Alignment>

export class RectArea {
  top: number;
  left: number;
  width: number;
  height: number;

  constructor(params: RectArguments) {
    this.setRectTop(params);
    this.setRectLeft(params);

    this.setRectHeight(params);
    this.setRectWidth(params);

    this.alignVertically(params as Alignment);
    this.alignHorizontally(params as Alignment);
  }

  setRectTop(params: RectTop) {
    let top = undefined;

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
    if (
      !notFound.includes(anchorTop.anchorTop)
      && anchorTop.anchorTop != VerticalAnchor.NONE
      && anchorTop.baseRectangle
    ) {
      top = top ?? 0;
      top += anchorTop.baseRectangle.top;
      if (anchorTop.anchorTop == VerticalAnchor.CENTER) {
        top += anchorTop.baseRectangle.height / 2;
      } else if (anchorTop.anchorTop == VerticalAnchor.BOTTOM) {
        top += anchorTop.baseRectangle.height;
      }
    }

    const marginsAll = (params as Margins)
    if (
      (marginsAll.margin || marginsAll.margin === 0)
      && marginsAll.baseRectangle
    ) {
      top = top ?? 0;
      if (typeof marginsAll.margin === "number") {
        top += marginsAll.baseRectangle.top + marginsAll.margin;
      } else {
        top += marginsAll.baseRectangle.top + marginsAll.margin[0];
      }
    }

    this.top = top;
  }

  setRectLeft(params: RectLeft) {
    let left = undefined;

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

    const anchorLeft = (params as AnchorLeft)
    if (
      !notFound.includes(anchorLeft.anchorLeft)
      && anchorLeft.anchorLeft != HorizontalAnchor.NONE
      && anchorLeft.baseRectangle
    ) {
      left = left ?? 0;
      left += anchorLeft.baseRectangle.left;
      if (anchorLeft.anchorLeft == HorizontalAnchor.MIDDLE) {
        left += anchorLeft.baseRectangle.width / 2;
      } else if (anchorLeft.anchorLeft == HorizontalAnchor.RIGHT) {
        left += anchorLeft.baseRectangle.width;
      }
    }

    const marginsAll = (params as Margins)
    if (
      (marginsAll.margin || marginsAll.margin === 0)
      && marginsAll.baseRectangle
    ) {
      left = left ?? 0;
      if (typeof marginsAll.margin === "number") {
        left += marginsAll.baseRectangle.left + marginsAll.margin;
      } else if ([2, 3].includes(marginsAll.margin.length)) {
        left += marginsAll.baseRectangle.left + marginsAll.margin[1];
      } else if (marginsAll.margin.length > 3) {
        left += marginsAll.baseRectangle.left + marginsAll.margin[3];
      }
    }

    this.left = left;
  }

  setRectHeight(params: RectHeight) {
    const height = (params as PositionHeight)
    if (!notFound.includes(height.height)) {
      this.height = height.height;
      return;
    }

    const topBottom = (params as RectHeightTopBottom)
    if (
      !notFound.includes(this.top)
      && !notFound.includes(topBottom.bottom)
    ) {
      this.height = topBottom.bottom - this.top;
      return;
    }
    const percentHeight = (params as RectHeightPercentHeight)

    if (
      !notFound.includes(percentHeight.screenHeight)
      && !notFound.includes(percentHeight.percentHeight)
    ) {
      this.height = percentHeight.screenHeight * percentHeight.percentHeight / 100;
      return;
    }

    const percentTopBottom = (params as RectHeightTopPercentBottom)
    if (
      !notFound.includes(this.top)
      && !notFound.includes(percentTopBottom.percentBottom)
      && !notFound.includes(percentTopBottom.screenHeight)
    ) {
      this.height = ((percentTopBottom.screenHeight * percentTopBottom.percentBottom) / 100) - this.top;
      return;
    }

    const marginsAll = (params as Margins)
    if (
      (marginsAll.margin || marginsAll.margin === 0)
      && marginsAll.baseRectangle
    ) {
      if (typeof marginsAll.margin === "number") {
        const margin = marginsAll.margin
        this.height = marginsAll.baseRectangle.height - 2 * margin;
      } else if (marginsAll.margin.length == 2) {
        const margin = marginsAll.margin[0]
        this.height = marginsAll.baseRectangle.height - 2 * margin;
      } else if (marginsAll.margin.length >= 3) {
        this.height = marginsAll.baseRectangle.height - marginsAll.margin[0] - marginsAll.margin[2];
      }
    }
  }

  setRectWidth(params: RectWidth) {
    const width = (params as PositionWidth)
    if (!notFound.includes(width.width)) {
      this.width = width.width;
      return;
    }

    const leftRight = (params as RectWidthLeftRight)
    if (
      !notFound.includes(this.left)
      && !notFound.includes(leftRight.right)
    ) {
      this.width = leftRight.right - this.left;
      return;
    }

    const percentWidth = (params as RectWidthPercentWidth)
    if (
      !notFound.includes(percentWidth.screenWidth)
      && !notFound.includes(percentWidth.percentWidth)
    ) {
      this.width = percentWidth.screenWidth * percentWidth.percentWidth / 100;
      return;
    }

    const percentLeftRight = (params as RectWidthLeftPercentRight)
    if (
      !notFound.includes(this.left)
      && !notFound.includes(percentLeftRight.percentRight)
      && !notFound.includes(percentLeftRight.screenWidth)
    ) {
      this.width = ((percentLeftRight.screenWidth * percentLeftRight.percentRight) / 100) - this.left;
      return;
    }

    const columnLeftRight = (params as RectWidthLeftColumnEnd)
    if (
      !notFound.includes(columnLeftRight.screenWidth)
      && !notFound.includes(this.left)
      && !notFound.includes(columnLeftRight.endColumn)
    ) {
      this.width = (columnLeftRight.screenWidth * (columnLeftRight.endColumn + 1) / 12) - this.left;
      return;
    }

    const marginsAll = (params as Margins)
    if (
      (marginsAll.margin || marginsAll.margin === 0)
      && marginsAll.baseRectangle
    ) {
      if (typeof marginsAll.margin === "number") {
        const margin = marginsAll.margin
        this.width = marginsAll.baseRectangle.width - 2 * margin;
      } else if ([2,3].includes(marginsAll.margin.length)) {
        const margin = marginsAll.margin[1]
        this.width = marginsAll.baseRectangle.width - 2 * margin;
      } else if (marginsAll.margin.length > 3) {
        this.width = marginsAll.baseRectangle.width - marginsAll.margin[1] - marginsAll.margin[3];
      }
    }
  }

  getTop(): number {
    return this.top;
  }
  getLeft(): number {
    return this.left;
  }
  getHeight(): number {
    return this.height;
  }
  getWidth(): number {
    return this.width;
  }
  getBottom(): number {
    return this.top + this.height;
  }
  getRight(): number {
    return this.left + this.width;
  }
  getCenterY(): number {
    return this.top + (this.height / 2);
  }
  getCenterX(): number {
    return this.left + (this.width / 2);
  }

  private alignHorizontally(params: Alignment) {
    if (!params) {
      return;
    }

    switch(params.horizAlign) {
      case HORIZ_ALIGN_CENTER:
        this.left -= this.getWidth() / 2;
        break;
      default:
        break;
    }
  }

  private alignVertically(params: Alignment) {
    if (!params) {
      return;
    }

    switch(params.vertAlign) {
      case VERT_ALIGN_CENTER:
        this.top -= this.getHeight() / 2;
        break;
      default:
        break;
    }
  }
}
