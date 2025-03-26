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
import { RectArea, RectAreaService } from "../ui/rectArea"
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
import { isValidValue } from "../utils/objectValidityCheck"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import p5 from "p5"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import {
    PlayerInputAction,
    PlayerInputState,
    PlayerInputStateService,
} from "../ui/playerInput/playerInputState"
import { OrchestratorComponentKeyEvent } from "../battle/orchestrator/battleOrchestratorComponent"
import { ButtonStatus } from "../ui/button/buttonStatus"
import { ComponentDataBlob } from "../utils/dataBlob/componentDataBlob"
import { BehaviorTreeTask } from "../utils/behaviorTree/task"
import { SequenceComposite } from "../utils/behaviorTree/composite/sequence/sequence"
import { ExecuteAllComposite } from "../utils/behaviorTree/composite/executeAll/executeAll"
import { MousePress, ScreenLocation } from "../utils/mouseConfig"
import { Button } from "../ui/button/button"
import { DataBlobService } from "../utils/dataBlob/dataBlob"
import {
    CutsceneCreateFastForwardButton,
    CutsceneShouldCreateFastForwardButton,
} from "./uiComponents/fastForwardButton"
import { ButtonStatusChangeEventByButtonId } from "../ui/button/logic/base"

const FAST_FORWARD_ACTION_WAIT_TIME_MILLISECONDS = 100

export type CutsceneDirection = Dialogue | SplashScreen
export type CutsceneDirectionPlayerState =
    | DialoguePlayerState
    | SplashScreenPlayerState

export interface CutsceneLayout {
    fastForwardButton: {
        fastForwardIsOff: {
            drawingArea: RectArea
            text: string
            fontSize: number
            fillColor: number[]
            fontColor: number[]
            strokeColor: number[]
            strokeWeight: number
            textBoxMargin: number
            horizAlign: HORIZONTAL_ALIGN
            vertAlign: VERTICAL_ALIGN
            hover: {
                strokeColor: number[]
                strokeWeight: number
                text: string
            }
        }
        fastForwardIsOn: {
            drawingArea: RectArea
            text: string
            fontSize: number
            fillColor: number[]
            fontColor: number[]
            strokeColor: number[]
            strokeWeight: number
            textBoxMargin: number
            horizAlign: HORIZONTAL_ALIGN
            vertAlign: VERTICAL_ALIGN
            hover: {
                strokeColor: number[]
                strokeWeight: number
                text: string
            }
        }
    }
}

export interface CutsceneContext {
    buttonStatusChangeEventDataBlob: ButtonStatusChangeEventByButtonId
}

export interface CutsceneUIObjects {
    fastForwardButton: Button
    graphicsContext?: GraphicsBuffer
}

export interface Cutscene {
    directions: CutsceneDirection[]
    directionIndex?: number
    currentDirection?: CutsceneDirection

    cutscenePlayerStateById?: {
        [t: string]: CutsceneDirectionPlayerState
    }

    decisionTriggers?: CutsceneDecisionTrigger[]

    fastForwardPreviousTimeTick?: number
    uiData: ComponentDataBlob<
        CutsceneLayout,
        CutsceneContext,
        CutsceneUIObjects
    >
    drawUITask: BehaviorTreeTask

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
            fastForwardPreviousTimeTick: undefined,
            allResourceKeys: [],
            allResourceLocators: [],
            currentDirection: undefined,
            uiData: new ComponentDataBlob<
                CutsceneLayout,
                CutsceneContext,
                CutsceneUIObjects
            >(),
            drawUITask: undefined,
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

        cutscene.uiData.setContext({
            buttonStatusChangeEventDataBlob: DataBlobService.new(),
        })
        cutscene.uiData.setUIObjects({
            fastForwardButton: undefined,
        })
        cutscene.fastForwardPreviousTimeTick = undefined

        collectResourceLocatorsAndKeys(cutscene)
        createLayout(cutscene)
        createDrawUITask(cutscene)
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

        const uiObjects = cutscene.uiData.getUIObjects()
        uiObjects.graphicsContext = graphicsContext
        cutscene.uiData.setUIObjects(uiObjects)

        cutscene.drawUITask.run()

        if (canFastForward(cutscene)) {
            DataBlobService.add<GraphicsBuffer>(
                uiObjects.fastForwardButton.buttonStyle.dataBlob,
                "graphicsContext",
                graphicsContext
            )
            uiObjects.fastForwardButton.draw()
        }
        getButtons(cutscene)
            .filter((button) => button != uiObjects.fastForwardButton)
            .forEach((button) => {
                DataBlobService.add<GraphicsBuffer>(
                    button.buttonStyle.dataBlob,
                    "graphicsContext",
                    graphicsContext
                )
                button.draw()
            })

        getButtons(cutscene).forEach((button) => {
            button.clearStatus()
        })
    },
    keyboardPressed({
        cutscene,
        event,
        context,
        playerInputState,
    }: {
        cutscene: Cutscene
        event: OrchestratorComponentKeyEvent
        context: TextSubstitutionContext
        playerInputState: PlayerInputState
    }): void {
        const actions: PlayerInputAction[] =
            PlayerInputStateService.getActionsForPressedKey(
                playerInputState,
                event.keyCode
            )
        if (actions.includes(PlayerInputAction.CANCEL)) {
            toggleFastForwardAndUpdateFFButton(cutscene)
            return
        }

        if (!actions.includes(PlayerInputAction.ACCEPT)) {
            return
        }

        if (cutscene.currentDirection === undefined) {
            gotoNextDirection(cutscene)
            startDirection(cutscene, context)
            return
        }

        switch (cutscene.currentDirection.type) {
            case CutsceneActionPlayerType.DIALOGUE:
                DialoguePlayerService.keyPressed({
                    dialoguePlayerState: cutscene.cutscenePlayerStateById[
                        cutscene.currentDirection.id
                    ] as DialoguePlayerState,
                    event,
                    playerInputState,
                })
                break
            case CutsceneActionPlayerType.SPLASH_SCREEN:
                SplashScreenPlayerService.keyPressed({
                    splashScreenPlayerState: cutscene.cutscenePlayerStateById[
                        cutscene.currentDirection.id
                    ] as SplashScreenPlayerState,
                    event,
                    playerInputState,
                })
                break
        }

        advanceToNextCutsceneDirectionIfFinished(cutscene, context)
    },
    mouseMoved: ({
        cutscene,
        mouseLocation,
    }: {
        cutscene: Cutscene
        mouseLocation: ScreenLocation
    }) => {
        getButtons(cutscene).forEach((button) => {
            button.mouseMoved({
                mouseLocation,
            })
        })
    },
    mousePressed: ({
        cutscene,
        mousePress,
        context,
    }: {
        cutscene: Cutscene
        mousePress: MousePress
        context: TextSubstitutionContext
    }) => {
        getButtons(cutscene).forEach((button) => {
            button.mousePressed({
                mousePress,
            })
        })
        const uiObjects = cutscene.uiData.getUIObjects()
        if (
            uiObjects.fastForwardButton?.getStatusChangeEvent()?.mousePress !=
            undefined
        ) {
            reactToFastForwardButtonStatusChangeEvent(cutscene)
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
                    mousePress
                )
                break
            case CutsceneActionPlayerType.SPLASH_SCREEN:
                SplashScreenPlayerService.mouseClicked(
                    cutscene.cutscenePlayerStateById[
                        cutscene.currentDirection.id
                    ] as SplashScreenPlayerState
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
            } else {
                deactivateFastForwardMode(cutscene)
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
    _cutscene: Cutscene,
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

const toggleFastForwardAndUpdateFFButton = (cutscene: Cutscene) => {
    toggleFastForwardMode(cutscene)
    const fastForwardButton: Button = getButtons(cutscene).find(
        (button) => button.id === "CutsceneFastForward"
    )

    if (isFastForward(cutscene)) {
        fastForwardButton.changeStatus({
            newStatus: ButtonStatus.TOGGLE_ON,
        })
    } else {
        fastForwardButton.changeStatus({
            newStatus: ButtonStatus.TOGGLE_OFF,
        })
    }
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
const getFastForwardButtonLocation = (_cutscene: Cutscene) => {
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
        return
    }
    activateFastForwardMode(cutscene)
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

const createDrawUITask = (cutscene: Cutscene) => {
    const createOKButtonTask = new SequenceComposite(cutscene.uiData, [
        new CutsceneShouldCreateFastForwardButton(cutscene.uiData),
        new CutsceneCreateFastForwardButton(cutscene.uiData),
    ])
    cutscene.drawUITask = new ExecuteAllComposite(cutscene.uiData, [
        createOKButtonTask,
    ])
}

const getButtons = (cutscene: Cutscene) => {
    const uiObjects = cutscene.uiData.getUIObjects()
    return [uiObjects.fastForwardButton].filter((x) => x)
}

const reactToFastForwardButtonStatusChangeEvent = (cutscene: Cutscene) => {
    const uiObjects = cutscene.uiData.getUIObjects()
    const fastForwardButton = uiObjects.fastForwardButton
    const statusChangeEvent = fastForwardButton.getStatusChangeEvent()
    if (!statusChangeEvent) return

    const previouslyOff =
        statusChangeEvent.previousStatus == ButtonStatus.TOGGLE_OFF_HOVER ||
        statusChangeEvent.previousStatus == ButtonStatus.TOGGLE_OFF
    const previouslyOn =
        statusChangeEvent.previousStatus == ButtonStatus.TOGGLE_ON_HOVER ||
        statusChangeEvent.previousStatus == ButtonStatus.TOGGLE_ON
    const newlyOff =
        statusChangeEvent.newStatus == ButtonStatus.TOGGLE_OFF_HOVER ||
        statusChangeEvent.newStatus == ButtonStatus.TOGGLE_OFF
    const newlyOn =
        statusChangeEvent.newStatus == ButtonStatus.TOGGLE_ON_HOVER ||
        statusChangeEvent.newStatus == ButtonStatus.TOGGLE_ON

    const activateFastForwardMode = previouslyOff && newlyOn
    const deactivateFastForwardMode = previouslyOn && newlyOff

    if (activateFastForwardMode || deactivateFastForwardMode) {
        toggleFastForwardMode(cutscene)
    }
}

const createLayout = (cutscene: Cutscene) => {
    const fastForwardButtonLocation = getFastForwardButtonLocation(cutscene)

    const buttonArea = RectAreaService.new({
        left: fastForwardButtonLocation.left,
        top: fastForwardButtonLocation.top,
        width: fastForwardButtonLocation.width,
        height: fastForwardButtonLocation.height,
    })

    cutscene.uiData.setLayout({
        fastForwardButton: {
            fastForwardIsOff: {
                text: "Fast-forward",
                fontColor: [0, 0, 0],
                fontSize: WINDOW_SPACING.SPACING4,
                fillColor: [200, 10, 50],
                strokeColor: [0, 0, 0],
                strokeWeight: 2,
                drawingArea: buttonArea,
                textBoxMargin: WINDOW_SPACING.SPACING1,
                horizAlign: HORIZONTAL_ALIGN.CENTER,
                vertAlign: VERTICAL_ALIGN.CENTER,
                hover: {
                    strokeColor: [0, 0, 0],
                    strokeWeight: 8,
                    text: "Click to FF",
                },
            },
            fastForwardIsOn: {
                drawingArea: buttonArea,
                text: "FF is ON",
                fontColor: [0, 0, 0],
                fontSize: WINDOW_SPACING.SPACING4,
                fillColor: [200, 5, 30],
                strokeColor: [0, 0, 0],
                strokeWeight: 2,
                textBoxMargin: WINDOW_SPACING.SPACING1,
                horizAlign: HORIZONTAL_ALIGN.CENTER,
                vertAlign: VERTICAL_ALIGN.CENTER,
                hover: {
                    strokeColor: [0, 0, 0],
                    strokeWeight: 8,
                    text: "Stop FF",
                },
            },
        },
    })
}
