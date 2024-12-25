import {
    DialoguePlayerService,
    DialoguePlayerState,
} from "./dialogue/dialogueBoxPlayer"
import {
    CutsceneDecisionTrigger,
    CutsceneDecisionTriggerService,
} from "./DecisionTrigger"
import { CutsceneActionPlayerType } from "./cutsceneAction"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../ui/constants"
import { Button, ButtonStatus } from "../ui/button"
import { LabelService } from "../ui/label"
import { RectAreaService } from "../ui/rectArea"
import {
    ResourceHandler,
    ResourceLocator,
    ResourceType,
} from "../resource/resourceHandler"
import { TextSubstitutionContext } from "../textSubstitution/textSubstitution"
import { Dialogue, DialogueService } from "./dialogue/dialogue"
import { SplashScreen, SplashScreenService } from "./splashScreen"
import {
    SplashScreenPlayerService,
    SplashScreenPlayerState,
} from "./splashScreenPlayer"
import { isValidValue } from "../utils/validityCheck"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { KeyButtonName, KeyWasPressed } from "../utils/keyboardConfig"
import p5 from "p5"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"

const FAST_FORWARD_ACTION_WAIT_TIME_MILLISECONDS = 100

export type CutsceneDirection = Dialogue | SplashScreen
export type CutsceneDirectionPlayerState =
    | DialoguePlayerState
    | SplashScreenPlayerState

export interface Cutscene {
    directions: CutsceneDirection[]
    directionIndex?: number
    currentDirection?: CutsceneDirection

    cutscenePlayerStateById?: {
        [t: string]: CutsceneDirectionPlayerState
    }

    decisionTriggers?: CutsceneDecisionTrigger[]

    fastForwardButton?: Button
    fastForwardPreviousTimeTick?: number

    allResourceLocators?: ResourceLocator[]
    allResourceKeys?: string[]
}

export const CutsceneService = {
    new: ({
        decisionTriggers,
        directions,
    }: {
        decisionTriggers?: CutsceneDecisionTrigger[]
        directions?: CutsceneDirection[]
    }): Cutscene => {
        const cutscene: Cutscene = {
            directions: isValidValue(directions) ? [...directions] : [],
            directionIndex: undefined,
            decisionTriggers: isValidValue(decisionTriggers)
                ? [...decisionTriggers]
                : [],
            cutscenePlayerStateById: {},
            fastForwardButton: undefined,
            fastForwardPreviousTimeTick: undefined,
            allResourceKeys: [],
            allResourceLocators: [],
            currentDirection: undefined,
        }

        cutscene.directions = cutscene.directions.map((rawDirection) => {
            switch (rawDirection.type) {
                case CutsceneActionPlayerType.DIALOGUE:
                    return DialogueService.new({ ...rawDirection })
                case CutsceneActionPlayerType.SPLASH_SCREEN:
                    return SplashScreenService.new({ ...rawDirection })
                default:
                    throw new Error(
                        `CutsceneService.new: unknown direction type: ${rawDirection}`
                    )
            }
        })

        cutscene.directions.forEach((direction) => {
            switch (direction.type) {
                case CutsceneActionPlayerType.DIALOGUE:
                    cutscene.cutscenePlayerStateById[direction.id] =
                        DialoguePlayerService.new({
                            dialogue: direction,
                        })
                    break
                case CutsceneActionPlayerType.SPLASH_SCREEN:
                    cutscene.cutscenePlayerStateById[direction.id] =
                        SplashScreenPlayerService.new({
                            splashScreen: direction,
                        })
                    break
                default:
                    throw new Error(
                        `CutsceneService.new: unknown direction type: ${direction}`
                    )
            }
        })

        collectResourceLocatorsAndKeys(cutscene)
        setUpFastForwardButton(cutscene)
        return cutscene
    },
    hasLoaded: (
        cutscene: Cutscene,
        resourceHandler: ResourceHandler
    ): boolean => {
        return hasLoaded(cutscene, resourceHandler)
    },
    isInProgress: (cutscene: Cutscene): boolean => {
        return (
            cutscene.directionIndex !== undefined &&
            cutscene.currentDirection !== undefined
        )
    },
    isFinished: (cutscene: Cutscene): boolean => {
        return (
            cutscene.directionIndex !== undefined &&
            cutscene.currentDirection === undefined
        )
    },
    draw: (
        cutscene: Cutscene,
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) => {
        if (cutscene.currentDirection !== undefined) {
            switch (cutscene.currentDirection.type) {
                case CutsceneActionPlayerType.DIALOGUE:
                    DialoguePlayerService.draw(
                        cutscene.cutscenePlayerStateById[
                            cutscene.currentDirection.id
                        ] as DialoguePlayerState,
                        graphicsContext,
                        resourceHandler
                    )
                    break
                case CutsceneActionPlayerType.SPLASH_SCREEN:
                    SplashScreenPlayerService.draw(
                        cutscene.cutscenePlayerStateById[
                            cutscene.currentDirection.id
                        ] as SplashScreenPlayerState,
                        graphicsContext,
                        resourceHandler
                    )
                    break
            }
        }

        if (canFastForward(cutscene)) {
            cutscene.fastForwardButton.draw(graphicsContext)
        }
    },
    keyboardPressed(
        cutscene: Cutscene,
        keyCode: number,
        context: TextSubstitutionContext
    ): void {
        if (KeyWasPressed(KeyButtonName.CANCEL, keyCode)) {
            toggleFastForwardAndUpdateFFButton(
                cutscene,
                cutscene.fastForwardButton
            )
            return
        }

        if (!KeyWasPressed(KeyButtonName.ACCEPT, keyCode)) {
            return
        }

        if (cutscene.currentDirection === undefined) {
            gotoNextDirection(cutscene)
            startDirection(cutscene, context)
            return
        }

        switch (cutscene.currentDirection.type) {
            case CutsceneActionPlayerType.DIALOGUE:
                DialoguePlayerService.keyPressed(
                    cutscene.cutscenePlayerStateById[
                        cutscene.currentDirection.id
                    ] as DialoguePlayerState,
                    keyCode
                )
                break
            case CutsceneActionPlayerType.SPLASH_SCREEN:
                SplashScreenPlayerService.keyPressed(
                    cutscene.cutscenePlayerStateById[
                        cutscene.currentDirection.id
                    ] as SplashScreenPlayerState,
                    keyCode
                )
                break
        }

        advanceToNextCutsceneDirectionIfFinished(cutscene, context)
    },
    mouseMoved: (cutscene: Cutscene, mouseX: number, mouseY: number) => {
        if (
            cutscene.fastForwardButton.mouseMoved(mouseX, mouseY, this) === true
        ) {
            return
        }
    },
    mouseClicked: (
        cutscene: Cutscene,
        mouseX: number,
        mouseY: number,
        context: TextSubstitutionContext
    ) => {
        if (
            cutscene.fastForwardButton.mouseClicked(mouseX, mouseY, this) ===
            true
        ) {
            return
        }

        if (cutscene.currentDirection === undefined) {
            gotoNextDirection(cutscene)
            startDirection(cutscene, context)
            return
        }

        switch (cutscene.currentDirection.type) {
            case CutsceneActionPlayerType.DIALOGUE:
                DialoguePlayerService.mouseClicked(
                    cutscene.cutscenePlayerStateById[
                        cutscene.currentDirection.id
                    ] as DialoguePlayerState,
                    mouseX,
                    mouseY
                )
                break
            case CutsceneActionPlayerType.SPLASH_SCREEN:
                SplashScreenPlayerService.mouseClicked(
                    cutscene.cutscenePlayerStateById[
                        cutscene.currentDirection.id
                    ] as SplashScreenPlayerState,
                    mouseX,
                    mouseY
                )
                break
        }

        advanceToNextCutsceneDirectionIfFinished(cutscene, context)
    },
    loadResources: (cutscene: Cutscene, resourceHandler: ResourceHandler) => {
        if (!isValidValue(resourceHandler)) {
            return
        }

        return resourceHandler.loadResources(cutscene.allResourceKeys)
    },
    setResources: (cutscene: Cutscene, resourceHandler: ResourceHandler) => {
        if (!isValidValue(resourceHandler)) {
            return
        }

        if (!resourceHandler.areAllResourcesLoaded(cutscene.allResourceKeys)) {
            return
        }

        cutscene.directions.forEach((direction) => {
            let resourceLocators: ResourceLocator[] = getResourceLocators(
                cutscene,
                direction
            )

            switch (direction.type) {
                case CutsceneActionPlayerType.DIALOGUE:
                    cutscene.cutscenePlayerStateById[direction.id] =
                        DialoguePlayerService.new({
                            dialogue: direction,
                        })
                    break
                case CutsceneActionPlayerType.SPLASH_SCREEN:
                    cutscene.cutscenePlayerStateById[direction.id] =
                        SplashScreenPlayerService.new({
                            splashScreen: direction,
                        })
                    break
            }

            resourceLocators.forEach((locator) => {
                if (!locator.key) {
                    return
                }

                if (locator.type === ResourceType.IMAGE) {
                    let foundImage: p5.Image = resourceHandler.getResource(
                        locator.key
                    )
                    switch (
                        cutscene.cutscenePlayerStateById[direction.id].type
                    ) {
                        case CutsceneActionPlayerType.DIALOGUE:
                            DialoguePlayerService.setImageResource(
                                cutscene.cutscenePlayerStateById[
                                    direction.id
                                ] as DialoguePlayerState,
                                foundImage
                            )
                            break
                        case CutsceneActionPlayerType.SPLASH_SCREEN:
                            SplashScreenPlayerService.setImageResource(
                                cutscene.cutscenePlayerStateById[
                                    direction.id
                                ] as SplashScreenPlayerState,
                                foundImage
                            )
                            break
                    }
                }
            })
        })
    },
    start: (
        cutscene: Cutscene,
        resourceHandler: ResourceHandler,
        context: TextSubstitutionContext
    ) => {
        if (!hasLoaded(cutscene, resourceHandler)) {
            return new Error("cutscene has not finished loading")
        }

        gotoNextDirection(cutscene)
        startDirection(cutscene, context)
        return undefined
    },
    stop: (cutscene: Cutscene) => {
        cutscene.currentDirection = undefined
        cutscene.directionIndex = undefined
    },
    update: (cutscene: Cutscene, context: TextSubstitutionContext) => {
        if (!canFastForward(cutscene)) {
            deactivateFastForwardMode(cutscene)
            cutscene.fastForwardButton.setStatus(ButtonStatus.READY)
            return
        }

        if (!isFastForward(cutscene)) {
            return
        }

        if (
            Date.now() >
            cutscene.fastForwardPreviousTimeTick +
                FAST_FORWARD_ACTION_WAIT_TIME_MILLISECONDS
        ) {
            if (
                getNextCutsceneDirection(cutscene).nextDirection !== undefined
            ) {
                gotoNextDirection(cutscene)
                startDirection(cutscene, context)
                activateFastForwardMode(cutscene)
                cutscene.fastForwardButton.setStatus(ButtonStatus.ACTIVE)
            } else {
                deactivateFastForwardMode(cutscene)
                cutscene.fastForwardButton.setStatus(ButtonStatus.READY)
            }
        }
    },
    isFastForward: (cutscene: Cutscene): boolean => {
        return isFastForward(cutscene)
    },
    canFastForward: (cutscene: Cutscene): boolean => {
        if (getNextCutsceneDirection(cutscene).nextDirection === undefined) {
            return false
        }

        if (
            cutscene.currentDirection.type !== CutsceneActionPlayerType.DIALOGUE
        ) {
            return true
        }

        return !DialogueService.asksUserForAnAnswer(cutscene.currentDirection)
    },
}

const hasLoaded = (
    cutscene: Cutscene,
    resourceHandler: ResourceHandler
): boolean => {
    if (!isValidValue(resourceHandler)) {
        return true
    }
    return resourceHandler.areAllResourcesLoaded(cutscene.allResourceKeys)
}

const startDirection = (
    cutscene: Cutscene,
    context: TextSubstitutionContext
): void => {
    if (cutscene.currentDirection !== undefined) {
        switch (cutscene.currentDirection.type) {
            case CutsceneActionPlayerType.DIALOGUE:
                return DialoguePlayerService.start(
                    cutscene.cutscenePlayerStateById[
                        cutscene.currentDirection.id
                    ] as DialoguePlayerState,
                    context
                )
            case CutsceneActionPlayerType.SPLASH_SCREEN:
                return SplashScreenPlayerService.start(
                    cutscene.cutscenePlayerStateById[
                        cutscene.currentDirection.id
                    ] as SplashScreenPlayerState
                )
        }
    }
}
const gotoNextDirection = (cutscene: Cutscene): void => {
    ;({
        nextDirection: cutscene.currentDirection,
        directionIndex: cutscene.directionIndex,
    } = getNextCutsceneDirection(cutscene))
}

const canFastForward = (cutscene: Cutscene): boolean => {
    if (getNextCutsceneDirection(cutscene).nextDirection === undefined) {
        return false
    }

    if (cutscene.currentDirection.type !== CutsceneActionPlayerType.DIALOGUE) {
        return true
    }

    return !DialogueService.asksUserForAnAnswer(cutscene.currentDirection)
}

const getNextCutsceneDirection = (
    cutscene: Cutscene
): {
    nextDirection: CutsceneDirection
    directionIndex: number
} => {
    const trigger: CutsceneDecisionTrigger = getTriggeredAction(cutscene)
    let nextDirection: CutsceneDirection
    let currentDirectionIndex: number = cutscene.directionIndex

    if (trigger !== undefined) {
        return {
            nextDirection: findDirectionByID(
                cutscene,
                trigger.destinationDialogId
            ),
            directionIndex: findDirectionIndexByID(
                cutscene,
                trigger.destinationDialogId
            ),
        }
    }

    currentDirectionIndex =
        currentDirectionIndex === undefined ? 0 : currentDirectionIndex + 1

    nextDirection = cutscene.directions[currentDirectionIndex]
    return {
        nextDirection: nextDirection,
        directionIndex: currentDirectionIndex,
    }
}

const isFastForward = (cutscene: Cutscene): boolean => {
    return cutscene.fastForwardPreviousTimeTick !== undefined
}

const collectResourceLocatorsAndKeys = (cutscene: Cutscene) => {
    const onlyUnique = (
        value: ResourceLocator,
        index: number,
        self: ResourceLocator[]
    ) => {
        return (
            self.findIndex(
                (res) => res.type == value.type && res.key == value.key
            ) === index
        )
    }

    cutscene.allResourceLocators = cutscene.directions
        .map((action) => getResourceLocators(cutscene, action))
        .flat()
        .filter((x) => x?.key)
        .filter(onlyUnique)

    cutscene.allResourceKeys = cutscene.allResourceLocators.map(
        (res) => res.key
    )
}

const getResourceLocators = (
    cutscene: Cutscene,
    direction: CutsceneDirection
): ResourceLocator[] => {
    switch (direction.type) {
        case CutsceneActionPlayerType.DIALOGUE:
            return DialogueService.getResourceLocators(direction)
        case CutsceneActionPlayerType.SPLASH_SCREEN:
            return SplashScreenService.getResourceLocators(direction)
        default:
            throw new Error(`Unknown cutscene direction type ${direction}`)
    }
}

const toggleFastForwardAndUpdateFFButton = (
    cutscene: Cutscene,
    button: Button
) => {
    toggleFastForwardMode(cutscene)
    if (isFastForward(cutscene)) {
        button.setStatus(ButtonStatus.ACTIVE)
    } else {
        button.setStatus(ButtonStatus.READY)
    }
}

const setUpFastForwardButton = (cutscene: Cutscene) => {
    cutscene.fastForwardPreviousTimeTick = undefined

    const fastForwardButtonLocation = getFastForwardButtonLocation(cutscene)
    const buttonActivateBackgroundColor: [number, number, number] = [
        200, 10, 50,
    ]
    const buttonDeactivateBackgroundColor: [number, number, number] = [
        200, 5, 30,
    ]
    const buttonTextColor: [number, number, number] = [0, 0, 0]

    const buttonArea = RectAreaService.new({
        left: fastForwardButtonLocation.left,
        top: fastForwardButtonLocation.top,
        width: fastForwardButtonLocation.width,
        height: fastForwardButtonLocation.height,
    })

    const handler = (mouseX: number, mouseY: number, button: Button): {} => {
        toggleFastForwardAndUpdateFFButton(cutscene, button)
        return {}
    }

    cutscene.fastForwardButton = new Button({
        activeLabel: LabelService.new({
            text: "Stop FF",
            fillColor: buttonDeactivateBackgroundColor,
            area: buttonArea,
            fontSize: WINDOW_SPACING.SPACING4,
            fontColor: buttonTextColor,
            textBoxMargin: WINDOW_SPACING.SPACING1,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
        }),
        readyLabel: LabelService.new({
            text: "Fast-forward",
            fillColor: buttonActivateBackgroundColor,
            area: buttonArea,
            fontSize: WINDOW_SPACING.SPACING4,
            fontColor: buttonTextColor,
            textBoxMargin: WINDOW_SPACING.SPACING1,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
        }),
        hoverLabel: LabelService.new({
            text: "Click to FF",
            fillColor: buttonActivateBackgroundColor,
            area: buttonArea,
            fontSize: WINDOW_SPACING.SPACING4,
            fontColor: buttonTextColor,
            textBoxMargin: WINDOW_SPACING.SPACING1,
            horizAlign: HORIZONTAL_ALIGN.CENTER,
            vertAlign: VERTICAL_ALIGN.CENTER,
        }),
        initialStatus: ButtonStatus.READY,
        onClickHandler(
            mouseX: number,
            mouseY: number,
            button: Button,
            caller: Cutscene
        ): {} {
            return handler(mouseX, mouseY, this)
        },
    })
}
const getTriggeredAction = (cutscene: Cutscene): CutsceneDecisionTrigger => {
    if (cutscene.currentDirection === undefined) {
        return undefined
    }

    let selectedAnswer: number = undefined

    if (
        cutscene.cutscenePlayerStateById[cutscene.currentDirection.id].type ===
        CutsceneActionPlayerType.DIALOGUE
    ) {
        selectedAnswer = (
            cutscene.cutscenePlayerStateById[
                cutscene.currentDirection.id
            ] as DialoguePlayerState
        ).answerSelected
    }

    return cutscene.decisionTriggers.find(
        (action) =>
            action.sourceDialogId === cutscene.currentDirection.id &&
            (!CutsceneDecisionTriggerService.doesThisRequireAMatchingAnswer(
                action
            ) ||
                action.sourceDialogAnswer === selectedAnswer)
    )
}
const findDirectionByID = (
    cutscene: Cutscene,
    targetId: string
): CutsceneDirection | undefined => {
    return cutscene.directions.find((dialog) => dialog.id === targetId)
}
const findDirectionIndexByID = (
    cutscene: Cutscene,
    targetId: string
): number => {
    return cutscene.directions.findIndex((dialog) => dialog.id === targetId)
}
const getFastForwardButtonLocation = (cutscene: Cutscene) => {
    return {
        left: ScreenDimensions.SCREEN_WIDTH * 0.8,
        top: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        width: ScreenDimensions.SCREEN_WIDTH * 0.15,
        height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
    }
}
const toggleFastForwardMode = (cutscene: Cutscene): void => {
    if (isFastForward(cutscene)) {
        deactivateFastForwardMode(cutscene)
        cutscene.fastForwardButton.setStatus(ButtonStatus.READY)
        return
    }
    activateFastForwardMode(cutscene)
    cutscene.fastForwardButton.setStatus(ButtonStatus.ACTIVE)
}

const activateFastForwardMode = (cutscene: Cutscene): void => {
    cutscene.fastForwardPreviousTimeTick = Date.now()
}

const deactivateFastForwardMode = (cutscene: Cutscene): void => {
    cutscene.fastForwardPreviousTimeTick = undefined
}

const advanceToNextCutsceneDirectionIfFinished = (
    cutscene: Cutscene,
    context: TextSubstitutionContext
) => {
    let directionIsFinished: boolean = false
    switch (cutscene.currentDirection.type) {
        case CutsceneActionPlayerType.DIALOGUE:
            directionIsFinished = DialoguePlayerService.isFinished(
                cutscene.cutscenePlayerStateById[
                    cutscene.currentDirection.id
                ] as DialoguePlayerState
            )
            break
        case CutsceneActionPlayerType.SPLASH_SCREEN:
            directionIsFinished = SplashScreenPlayerService.isFinished(
                cutscene.cutscenePlayerStateById[
                    cutscene.currentDirection.id
                ] as SplashScreenPlayerState
            )
            break
    }

    if (directionIsFinished) {
        gotoNextDirection(cutscene)
        startDirection(cutscene, context)
    }
}
