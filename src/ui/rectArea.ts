import * as p5 from "p5"
import { HORIZONTAL_ALIGN, VERTICAL_ALIGN } from "./constants"
import { getValidValueOrDefault, isValidValue } from "../utils/validityCheck"

export enum HorizontalAnchor {
    NONE,
    LEFT,
    MIDDLE,
    RIGHT,
}

export enum VerticalAnchor {
    NONE,
    TOP,
    CENTER,
    BOTTOM,
}

type PositionTop = {
    top: number
}

type PositionLeft = {
    left: number
}

type PositionWidth = {
    width: number
}

type PositionHeight = {
    height: number
}

type PositionBottom = {
    bottom: number
}

type PositionRight = {
    right: number
}

type ScreenWidth = {
    screenWidth: number
}

type ScreenHeight = {
    screenHeight: number
}

type ScreenPercentTop = {
    percentTop: number
}

type ScreenPercentLeft = {
    percentLeft: number
}

type ScreenPercentBottom = {
    percentBottom: number
}

type ScreenPercentWidth = {
    percentWidth: number
}

type ScreenPercentHeight = {
    percentHeight: number
}

type ScreenPercentRight = {
    percentRight: number
}

type TwelvePointColumnStart = {
    startColumn: number
}

type TwelvePointColumnEnd = {
    endColumn: number
}

type AnchorLeft = {
    anchorLeft: HorizontalAnchor
}

type AnchorTop = {
    anchorTop: VerticalAnchor
}

type Margins = {
    margin:
        | number
        | [number, number]
        | [number, number, number]
        | [number, number, number, number]
}

type Alignment = {
    horizAlign: p5.HORIZ_ALIGN
    vertAlign: p5.VERT_ALIGN
}

type BaseRectangle = {
    baseRectangle: RectArea
}

type RectTop =
    | PositionTop
    | (ScreenHeight & ScreenPercentTop)
    | (BaseRectangle & (AnchorTop | PositionTop | ScreenPercentTop | Margins))
type RectLeft =
    | PositionLeft
    | (ScreenWidth & ScreenPercentLeft)
    | (ScreenWidth & TwelvePointColumnStart)
    | (BaseRectangle &
          (AnchorLeft | PositionLeft | ScreenPercentLeft | Margins))
type RectHeightTopBottom = RectTop & PositionBottom
type RectHeightPercentHeight = ScreenHeight & ScreenPercentHeight
type RectHeightTopPercentBottom = ScreenHeight & RectTop & ScreenPercentBottom

type RectHeight =
    | PositionHeight
    | RectHeightTopBottom
    | RectHeightPercentHeight
    | RectHeightTopPercentBottom
    | Margins
    | BaseRectangle
type RectWidthLeftRight = RectLeft & PositionRight
type RectWidthPercentWidth = ScreenWidth & ScreenPercentWidth
type RectWidthLeftPercentRight = ScreenWidth & RectLeft & ScreenPercentRight
type RectWidthLeftColumnEnd = ScreenWidth & RectLeft & TwelvePointColumnEnd

type RectWidth =
    | PositionWidth
    | RectWidthLeftRight
    | RectWidthPercentWidth
    | RectWidthLeftPercentRight
    | RectWidthLeftColumnEnd
    | Margins
    | BaseRectangle

export type RectArguments = RectTop &
    RectLeft &
    RectHeight &
    RectWidth &
    Partial<Alignment>

export interface RectArea {
    top: number
    left: number
    width: number
    height: number
}

export const RectAreaService = {
    new: (params: RectArguments): RectArea => {
        const rectArea = {
            top: 0,
            left: 0,
            width: 0,
            height: 0,
        }

        setRectTop(rectArea, params)
        setRectLeft(rectArea, params)
        setRectHeight(rectArea, params)
        setRectWidth(rectArea, params)

        alignVertically(rectArea, params as Alignment)
        alignHorizontally(rectArea, params as Alignment)

        return rectArea
    },
    bottom: (rectArea: RectArea): number => {
        return rectArea.top + rectArea.height
    },
    right: (rectArea: RectArea): number => {
        return rectArea.left + rectArea.width
    },
    height: (rectArea: RectArea): number => {
        return rectArea.height
    },
    width: (rectArea: RectArea): number => {
        return rectArea.width
    },
    top: (rectArea: RectArea): number => {
        return rectArea.top
    },
    left: (rectArea: RectArea): number => {
        return rectArea.left
    },
    centerY: (rectArea: RectArea): number => {
        return rectArea.top + rectArea.height / 2
    },
    centerX: (rectArea: RectArea): number => {
        return rectArea.left + rectArea.width / 2
    },
    isInside(
        rectArea: RectArea,
        coordinateX: number,
        coordinateY: number
    ): boolean {
        return (
            coordinateX >= rectArea.left &&
            coordinateX <= rectArea.left + rectArea.width &&
            coordinateY >= rectArea.top &&
            coordinateY <= rectArea.top + rectArea.height
        )
    },
    move: (rectArea: RectArea, params: RectLeft & RectTop) => {
        setRectLeft(rectArea, params)
        setRectTop(rectArea, params)
    },
    align: (rectArea: RectArea, params: Alignment) => {
        alignHorizontally(rectArea, params)
        alignVertically(rectArea, params)
    },
    setRight: (rectArea: RectArea, right: number) => {
        rectArea.left = right - rectArea.width
    },
    setBottom: (rectArea: RectArea, bottom: number) => {
        rectArea.top = bottom - rectArea.height
    },
    changeAspectRatio: (
        rectArea: RectArea,
        newAspectRatio: number,
        preserveSide: "WIDTH" | "HEIGHT"
    ) => {
        switch (preserveSide) {
            case "WIDTH":
                rectArea.height = rectArea.width / newAspectRatio
                return
            case "HEIGHT":
                rectArea.width = newAspectRatio * rectArea.height
                return
        }
    },
}

const getBaseRectangleFromParams = (
    params: RectTop | RectLeft | RectHeight | RectWidth
): RectArea => {
    return (params as BaseRectangle).baseRectangle
}

const getPositionParams = (
    params: RectTop | RectLeft | RectHeight | RectWidth
): {
    top: number
    left: number
    height: number
    width: number
} => {
    return {
        top:
            (params as PositionTop) !== undefined
                ? (params as PositionTop).top
                : undefined,
        left:
            (params as PositionLeft) !== undefined
                ? (params as PositionLeft).left
                : undefined,
        height:
            (params as PositionHeight) !== undefined
                ? (params as PositionHeight).height
                : undefined,
        width:
            (params as PositionWidth) !== undefined
                ? (params as PositionWidth).width
                : undefined,
    }
}

const getPercentageParams = (
    params: RectTop | RectLeft | RectHeight | RectWidth
): {
    screenHeight: number
    screenWidth: number
    percentTop: number
    percentLeft: number
} => {
    return {
        percentTop:
            (params as ScreenHeight & ScreenPercentTop) !== undefined
                ? (params as ScreenHeight & ScreenPercentTop).percentTop
                : undefined,
        screenHeight:
            (params as ScreenHeight & ScreenPercentTop) !== undefined
                ? (params as ScreenHeight & ScreenPercentTop).screenHeight
                : undefined,
        screenWidth:
            (params as ScreenWidth & ScreenPercentLeft) !== undefined
                ? (params as ScreenWidth & ScreenPercentLeft).screenWidth
                : undefined,
        percentLeft:
            (params as ScreenWidth & ScreenPercentLeft) !== undefined
                ? (params as ScreenWidth & ScreenPercentLeft).percentLeft
                : undefined,
    }
}

const setRectTop = (rectArea: RectArea, params: RectTop): void => {
    const baseRectangleTop: number = getBaseRectangleFromParams(params)?.top
    const baseRectangleHeight: number =
        getBaseRectangleFromParams(params)?.height
    const positionTop: number = getPositionParams(params)?.top
    const { screenHeight, percentTop } = getValidValueOrDefault(
        getPercentageParams(params),
        {
            screenHeight: undefined,
            screenWidth: undefined,
            percentTop: undefined,
            percentLeft: undefined,
        }
    )

    const paramIsValid = {
        anchorTop:
            isValidValue(baseRectangleTop) &&
            (params as AnchorTop) &&
            isValidValue((params as AnchorTop).anchorTop) &&
            (params as AnchorTop).anchorTop != VerticalAnchor.NONE,
    }

    const paramValue = {
        anchorTop: paramIsValid.anchorTop
            ? (params as AnchorTop).anchorTop
            : VerticalAnchor.NONE,
    }

    let top = getValidValueOrDefault(baseRectangleTop, 0)
    top += positionTop || 0

    if (isValidValue(percentTop) && isValidValue(screenHeight)) {
        top += (screenHeight * percentTop) / 100
    }

    if (paramIsValid.anchorTop) {
        if (paramValue.anchorTop == VerticalAnchor.CENTER) {
            top += baseRectangleHeight / 2
        } else if (paramValue.anchorTop == VerticalAnchor.BOTTOM) {
            top += baseRectangleHeight
        }
    }

    const marginsAll = params as Margins
    const marginsAllIsValid: boolean = marginsAreValid(marginsAll)
    if (marginsAllIsValid) {
        const marginValues1 = marginValues(marginsAll)
        top += marginValues1[0]
    }

    rectArea.top = top
}

const setRectLeft = (rectArea: RectArea, params: RectLeft): void => {
    const baseRectangleLeft: number = getBaseRectangleFromParams(params)?.left
    const baseRectangleWidth: number = getBaseRectangleFromParams(params)?.width
    const positionLeft: number = getPositionParams(params).left
    const { screenWidth, percentLeft } = getValidValueOrDefault(
        getPercentageParams(params),
        {
            screenHeight: undefined,
            screenWidth: undefined,
            percentTop: undefined,
            percentLeft: undefined,
        }
    )

    const paramIsValid = {
        columnLeft:
            (params as ScreenWidth & TwelvePointColumnStart) &&
            isValidValue(
                (params as ScreenWidth & TwelvePointColumnStart).screenWidth
            ) &&
            isValidValue(
                (params as ScreenWidth & TwelvePointColumnStart).startColumn
            ),
        anchorLeft:
            isValidValue(baseRectangleLeft) &&
            (params as AnchorLeft) &&
            isValidValue((params as AnchorLeft).anchorLeft) &&
            (params as AnchorLeft).anchorLeft != HorizontalAnchor.NONE,
    }

    const paramValue = {
        columnLeft: paramIsValid.columnLeft
            ? {
                  screenWidth: (params as ScreenWidth & TwelvePointColumnStart)
                      .screenWidth,
                  startColumn: (params as ScreenWidth & TwelvePointColumnStart)
                      .startColumn,
              }
            : {
                  screenWidth: 0,
                  startColumn: 0,
              },
        anchorLeft: paramIsValid.anchorLeft
            ? (params as AnchorLeft).anchorLeft
            : HorizontalAnchor.NONE,
    }

    let left = getValidValueOrDefault(baseRectangleLeft, 0)
    left += positionLeft || 0

    if (isValidValue(percentLeft) && isValidValue(screenWidth)) {
        left += (screenWidth * percentLeft) / 100
    }

    if (paramIsValid.columnLeft) {
        left +=
            (paramValue.columnLeft.screenWidth *
                paramValue.columnLeft.startColumn) /
            12
    }

    if (paramIsValid.anchorLeft) {
        if (paramValue.anchorLeft == HorizontalAnchor.MIDDLE) {
            left += baseRectangleWidth / 2
        } else if (paramValue.anchorLeft == HorizontalAnchor.RIGHT) {
            left += baseRectangleWidth
        }
    }

    const marginsAll = params as Margins
    const marginsAllIsValid: boolean = marginsAreValid(marginsAll)
    if (marginsAllIsValid) {
        const marginValues1 = marginValues(marginsAll)
        left += marginValues1[3]
    }

    rectArea.left = left
}

const setRectHeight = (rectArea: RectArea, params: RectHeight): void => {
    const baseRectangleHeight: number =
        getBaseRectangleFromParams(params)?.height
    const positionHeight: number = getPositionParams(params).height
    const paramIsValid = {
        topBottom:
            (params as RectHeightTopBottom) &&
            isValidValue(rectArea.top) &&
            isValidValue((params as RectHeightTopBottom).bottom),
        percentHeight:
            (params as RectHeightPercentHeight) &&
            isValidValue((params as RectHeightPercentHeight).screenHeight) &&
            isValidValue((params as RectHeightPercentHeight).percentHeight),
        percentTopBottom:
            (params as RectHeightTopPercentBottom) &&
            isValidValue(rectArea.top) &&
            isValidValue(
                (params as RectHeightTopPercentBottom).percentBottom
            ) &&
            isValidValue((params as RectHeightTopPercentBottom).screenHeight),
    }

    const paramValue = {
        topBottom: paramIsValid.topBottom
            ? (params as RectHeightTopBottom).bottom
            : 0,
        percentHeight: paramIsValid.percentHeight
            ? {
                  screenHeight: (params as RectHeightPercentHeight)
                      .screenHeight,
                  percentHeight: (params as RectHeightPercentHeight)
                      .percentHeight,
              }
            : {
                  screenHeight: 0,
                  percentHeight: 0,
              },
        percentTopBottom: paramIsValid.percentTopBottom
            ? {
                  screenHeight: (params as RectHeightTopPercentBottom)
                      .screenHeight,
                  percentBottom: (params as RectHeightTopPercentBottom)
                      .percentBottom,
              }
            : {
                  screenHeight: 0,
                  percentBottom: 0,
              },
    }

    if (isValidValue(baseRectangleHeight)) {
        rectArea.height = baseRectangleHeight
    }

    if (isValidValue(positionHeight)) {
        rectArea.height = positionHeight
    } else if (paramIsValid.topBottom) {
        rectArea.height = paramValue.topBottom - rectArea.top
    } else if (paramIsValid.percentHeight) {
        rectArea.height =
            (paramValue.percentHeight.screenHeight *
                paramValue.percentHeight.percentHeight) /
            100
    } else if (paramIsValid.percentTopBottom) {
        rectArea.height =
            (paramValue.percentTopBottom.screenHeight *
                paramValue.percentTopBottom.percentBottom) /
                100 -
            rectArea.top
    }

    const marginsAll = params as Margins
    if (marginsAreValid(marginsAll)) {
        const marginValues1 = marginValues(marginsAll)
        if (isValidValue(baseRectangleHeight)) {
            rectArea.height =
                baseRectangleHeight - marginValues1[0] - marginValues1[2]
        } else {
            rectArea.height = rectArea.height - marginValues1[2]
        }
    }
}

const setRectWidth = (rectArea: RectArea, params: RectWidth): void => {
    const baseRectangleWidth: number = getBaseRectangleFromParams(params)?.width
    const positionWidth: number = getPositionParams(params).width

    const paramIsValid = {
        leftRight:
            (params as RectWidthLeftRight) &&
            isValidValue(rectArea.left) &&
            isValidValue((params as RectWidthLeftRight).right),
        percentWidth:
            (params as RectWidthPercentWidth) &&
            isValidValue((params as RectWidthPercentWidth).screenWidth) &&
            isValidValue((params as RectWidthPercentWidth).percentWidth),
        percentLeftRight:
            (params as RectWidthLeftPercentRight) &&
            isValidValue(rectArea.top) &&
            isValidValue((params as RectWidthLeftPercentRight).percentRight) &&
            isValidValue((params as RectWidthLeftPercentRight).screenWidth),
        columnLeftRight:
            (params as RectWidthLeftColumnEnd) &&
            isValidValue((params as RectWidthLeftColumnEnd).screenWidth) &&
            isValidValue((params as RectWidthLeftColumnEnd).endColumn) &&
            isValidValue(rectArea.left),
    }

    const paramValue = {
        leftRight: paramIsValid.leftRight
            ? (params as RectWidthLeftRight).right
            : 0,
        percentWidth: paramIsValid.percentWidth
            ? {
                  screenWidth: (params as RectWidthPercentWidth).screenWidth,
                  percentWidth: (params as RectWidthPercentWidth).percentWidth,
              }
            : {
                  screenWidth: 0,
                  percentWidth: 0,
              },
        percentLeftRight: paramIsValid.percentLeftRight
            ? {
                  screenWidth: (params as RectWidthLeftPercentRight)
                      .screenWidth,
                  percentRight: (params as RectWidthLeftPercentRight)
                      .percentRight,
              }
            : {
                  screenWidth: 0,
                  percentRight: 0,
              },
        columnLeftRight: paramIsValid.columnLeftRight
            ? {
                  screenWidth: (params as RectWidthLeftColumnEnd).screenWidth,
                  endColumn: (params as RectWidthLeftColumnEnd).endColumn,
              }
            : {
                  screenWidth: 0,
                  endColumn: 0,
              },
    }

    if (isValidValue(baseRectangleWidth)) {
        rectArea.width = baseRectangleWidth
    }

    if (isValidValue(positionWidth)) {
        rectArea.width = positionWidth
    } else if (paramIsValid.leftRight) {
        rectArea.width = paramValue.leftRight - rectArea.left
    } else if (paramIsValid.percentWidth) {
        rectArea.width =
            (paramValue.percentWidth.screenWidth *
                paramValue.percentWidth.percentWidth) /
            100
    } else if (paramIsValid.percentLeftRight) {
        rectArea.width =
            (paramValue.percentLeftRight.screenWidth *
                paramValue.percentLeftRight.percentRight) /
                100 -
            rectArea.left
    } else if (paramIsValid.columnLeftRight) {
        rectArea.width =
            (paramValue.columnLeftRight.screenWidth *
                (paramValue.columnLeftRight.endColumn + 1)) /
                12 -
            rectArea.left
    }

    const marginsAll = params as Margins
    if (marginsAreValid(marginsAll)) {
        const marginValues1 = marginValues(marginsAll)
        if (isValidValue(baseRectangleWidth)) {
            rectArea.width =
                baseRectangleWidth - marginValues1[1] - marginValues1[3]
        } else {
            rectArea.width = rectArea.width - marginValues1[1]
        }
    }
}

const alignHorizontally = (rectArea: RectArea, params: Alignment): void => {
    if (!params) {
        return
    }

    if (params.horizAlign === HORIZONTAL_ALIGN.CENTER) {
        rectArea.left -= rectArea.width / 2
    }
}

const alignVertically = (rectArea: RectArea, params: Alignment): void => {
    if (!params) {
        return
    }

    if (params.vertAlign === VERTICAL_ALIGN.CENTER) {
        rectArea.top -= rectArea.height / 2
    }
}

const marginsAreValid = (marginsAll: Margins): boolean => {
    return !!marginsAll.margin || marginsAll.margin === 0
}

const marginValues = (
    marginsAll: Margins
): [number, number, number, number] => {
    if (typeof marginsAll.margin === "undefined") {
        return [0, 0, 0, 0]
    }

    if (typeof marginsAll.margin === "number") {
        return [
            marginsAll.margin,
            marginsAll.margin,
            marginsAll.margin,
            marginsAll.margin,
        ]
    } else if (marginsAll.margin.length == 2) {
        return [
            marginsAll.margin[0],
            marginsAll.margin[1],
            marginsAll.margin[0],
            marginsAll.margin[1],
        ]
    } else if (marginsAll.margin.length == 3) {
        return [
            marginsAll.margin[0],
            marginsAll.margin[1],
            marginsAll.margin[2],
            marginsAll.margin[1],
        ]
    } else if (marginsAll.margin.length > 3) {
        return [
            marginsAll.margin[0],
            marginsAll.margin[1],
            marginsAll.margin[2],
            marginsAll.margin[3],
        ]
    }

    return [0, 0, 0, 0]
}
