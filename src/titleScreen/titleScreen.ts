import { TitleScreenState, TitleScreenStateHelper } from "./titleScreenState"
import {
    GameEngineChanges,
    GameEngineComponent,
} from "../gameEngine/gameEngineComponent"
import {
    MouseDrag,
    MousePress,
    MouseRelease,
    MouseWheel,
    ScreenLocation,
} from "../utils/mouseConfig"
import { GameModeEnum } from "../utils/startupConfig"
import { WINDOW_SPACING } from "../ui/constants"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { TextBox } from "../ui/textBox/textBox"
import { Rectangle } from "../ui/rectangle/rectangle"
import { ResourceHandler } from "../resource/resourceHandler"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { ImageUI } from "../ui/imageUI/imageUI"
import {
    PlayerInputAction,
    PlayerInputStateService,
    TPlayerInputAction,
} from "../ui/playerInput/playerInputState"
import { DataBlob, DataBlobService } from "../utils/dataBlob/dataBlob"
import { BehaviorTreeTask } from "../utils/behaviorTree/task"
import { ExecuteAllComposite } from "../utils/behaviorTree/composite/executeAll/executeAll"
import { SequenceComposite } from "../utils/behaviorTree/composite/sequence/sequence"
import { MessageBoard } from "../message/messageBoard"
import { DoesObjectHaveKeyExistCondition } from "../utils/behaviorTree/condition/doesObjectHaveKeyExistCondition"
import { InverterDecorator } from "../utils/behaviorTree/decorator/inverter/inverter"
import { TitleScreenCreateBackgroundAction } from "./components/backgroundAction"
import { TitleScreenCreateTitleBannerAction } from "./components/banner"
import { TitleScreenCreateTitleTextAction } from "./components/titleText"
import { TitleScreenCreateByLineAction } from "./components/byLine"
import { TitleScreenCreateGameDescriptionAction } from "./components/gameDescription"
import { TitleScreenCreateVersionTextBoxAction } from "./components/version"
import {
    TitleScreenAreCharacterIntroductionElementsLoaded,
    TitleScreenIsCharacterIntroductionImageInitialized,
    TitleScreenIsCharacterIntroductionImageLoaded,
} from "./components/characterIntroduction/common"
import {
    TitleScreenCreateNahlaCharacterIntroductionDescriptionText,
    TitleScreenCreateNahlaCharacterIntroductionIcon,
} from "./components/characterIntroduction/nahla"
import {
    TitleScreenCreateSirCamilCharacterIntroductionDescriptionText,
    TitleScreenCreateSirCamilCharacterIntroductionIcon,
} from "./components/characterIntroduction/sirCamil"
import {
    TitleScreenCreateDemonSlitherCharacterIntroductionDescriptionText,
    TitleScreenCreateDemonSlitherCharacterIntroductionIcon,
} from "./components/characterIntroduction/demonSlither"
import {
    TitleScreenCreateDemonLocustCharacterIntroductionDescriptionText,
    TitleScreenCreateDemonLocustCharacterIntroductionIcon,
} from "./components/characterIntroduction/demonLocust"
import {
    CreateStartGameButtonAction,
    ShouldCreateStartGameButtonAction,
} from "./components/startButton"
import { ButtonStatus } from "../ui/button/buttonStatus"
import { ButtonStatusChangeEventByButtonId } from "../ui/button/logic/base"
import { Button } from "../ui/button/button"
import {
    CreateContinueGameButtonAction,
    ShouldCreateContinueGameButtonAction,
} from "./components/continueGameButton"
import {
    LoadState,
    LoadSaveStateService,
} from "../dataLoader/playerData/loadState"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { DrawRectanglesAction } from "../ui/rectangle/drawRectanglesAction"
import { DrawTextBoxesAction } from "../ui/textBox/drawTextBoxesAction"
import { DrawImagesAction } from "../ui/imageUI/drawImagesAction"
import p5 from "p5"
import {
    TitleScreenDrawExternalLinkButton,
    TitleScreenP5InstanceIsReady,
} from "./components/externalLinkButton"
import { ComponentDataBlob } from "../utils/dataBlob/componentDataBlob"
import { TitleScreenCreateDebugModeTextBoxAction } from "./components/debugMode"
import { EnumLike } from "../utils/enum"
import { GameEngineState } from "../gameEngine/gameEngineState/gameEngineState"
import { SaveSaveState } from "../dataLoader/saveSaveState"

const EXTERNAL_LINK_ITCH_IO_IMAGE_PATH =
    "assets/externalLinks/itchIo-app-icon.png"
const EXTERNAL_LINK_ITCH_IO_HTML = `<div style="display: flex; flex-direction: row; border: hotpink 2px solid; border-radius: 8px; background-color: lightpink; padding: 8px"><img src=${EXTERNAL_LINK_ITCH_IO_IMAGE_PATH} alt="Button to add game to itch.io collection" height="50"/><span style="padding-left: 8px; align-self: center">Add to Collection</span></div>`

export const TitleScreenMenuSelection = {
    NONE: "NONE",
    NEW_GAME: "NEW_GAME",
    CONTINUE_GAME: "CONTINUE_GAME",
} as const satisfies Record<string, string>

export type TTitleScreenMenuSelection = EnumLike<
    typeof TitleScreenMenuSelection
>

export interface TitleScreenLayout {
    colors: {
        background: [number, number, number]
        backgroundText: [number, number, number]
        descriptionText: [number, number, number]
        playButton: [number, number, number]
        playButtonStroke: [number, number, number]
        playButtonActive: [number, number, number]
        playButtonText: [number, number, number]
    }
    logo: {
        iconImageResourceKey: string
        screenHeight: number
    }
    title: {
        screenHeight: number
        startColumn: number
        endColumn: number
    }
    byLine: {
        screenHeight: number
        startColumn: number
        endColumn: number
    }
    gameDescription: {
        screenHeightTop: number
        screenHeightBottom: number
        startColumn: number
        endColumn: number
        text: string
    }
    startGameButton: {
        smallWindowWarning: string
        playGameMessage: string
        buttonArea: {
            left: number
            right: number
            top: number
            bottom: number
        }
        cornerRadius: number[]
    }
    continueGameButton: {
        buttonArea: {
            left: number
            right: number
            top: number
            bottom: number
        }
    }
    demonSlither: {
        iconArea: {
            startColumn: number
            width: number
        }
        descriptionText: string
        iconImageResourceKey: string
    }
    demonLocust: {
        iconArea: {
            startColumn: number
            width: number
        }
        descriptionText: string
        iconImageResourceKey: string
    }
    nahla: {
        iconArea: {
            startColumn: number
            width: number
            top: number
            height: number
        }
        descriptionText: string
        iconImageResourceKey: string
    }
    sirCamil: {
        iconArea: {
            startColumn: number
            width: number
            top: number
            height: number
        }
        descriptionText: string
        iconImageResourceKey: string
    }
    version: {
        startColumn: number
        endColumn: number
        fontSize: number
        top: number
        bottom: number
        fontColor: [number, number, number]
    }
    debugMode: {
        startColumn: number
        endColumn: number
        fontSize: number
        top: number
        height: number
        fontColor: [number, number, number]
    }
    externalLinks: {
        [key: string]: {
            screenLocation: {
                x: number
                y: number
            }
            html: string
            href: string
            target?: string
        }
        itchIo: {
            screenLocation: {
                x: number
                y: number
            }
            html: string
            href: string
            target?: string
        }
    }
    htmlGenerator: p5 | undefined
}

export interface TitleScreenContext {
    errorDuringLoadingDisplayStartTimestamp: number | undefined
    menuSelection: TTitleScreenMenuSelection
    version: string
    loadState: LoadState | undefined
    saveState: SaveSaveState | undefined
    messageBoard: MessageBoard | undefined
    buttonStatusChangeEventDataBlob: ButtonStatusChangeEventByButtonId
}

export interface TitleScreenUIObjects {
    startGameButton: Button | undefined
    continueGameButton: Button | undefined
    byLine: TextBox | undefined
    titleText: TextBox | undefined
    gameDescription: TextBox | undefined
    background: Rectangle | undefined
    titleBanner: ImageUI | undefined
    versionTextBox: TextBox | undefined
    debugModeTextBox: TextBox | undefined
    demonSlither: {
        icon: ImageUI | undefined
        descriptionText: TextBox | undefined
    }
    demonLocust: {
        icon: ImageUI | undefined
        descriptionText: TextBox | undefined
    }
    sirCamil: {
        icon: ImageUI | undefined
        descriptionText: TextBox | undefined
    }
    nahla: {
        icon: ImageUI | undefined
        descriptionText: TextBox | undefined
    }
    graphicsContext?: GraphicsBuffer
    resourceHandler?: ResourceHandler
    externalLinks: {
        [key: string]: p5.Element | undefined
    }
}

export class TitleScreen implements GameEngineComponent {
    data: ComponentDataBlob<
        TitleScreenLayout,
        TitleScreenContext,
        TitleScreenUIObjects
    >
    drawUIObjectsBehaviorTree: BehaviorTreeTask | undefined
    p5Instance?: p5

    constructor({ version, p5Instance }: { version: string; p5Instance?: p5 }) {
        this.p5Instance = p5Instance

        this.data = new ComponentDataBlob<
            TitleScreenLayout,
            TitleScreenContext,
            TitleScreenUIObjects
        >()

        const context: TitleScreenContext = this.resetContext()
        context.version = version
        this.data.setContext(context)

        const layout: TitleScreenLayout = {
            colors: {
                background:
                    process.env.DEBUG === "true" ? [330, 60, 46] : [73, 10, 46],
                backgroundText: [73, 10, 6],
                descriptionText: [73, 10, 96],
                playButton: [207, 67, 40],
                playButtonStroke: [207, 67, 80],
                playButtonActive: [207, 47, 20],
                playButtonText: [207, 17, 80],
            },
            logo: {
                iconImageResourceKey: "title screen logo",
                screenHeight: 0.5,
            },
            title: {
                screenHeight: 0.52,
                startColumn: 1,
                endColumn: 4,
            },
            byLine: {
                screenHeight: 0.55,
                startColumn: 2,
                endColumn: 5,
            },
            gameDescription: {
                screenHeightTop: 0.02,
                screenHeightBottom: 0.32,
                startColumn: 4,
                endColumn: 11,
                text: "The Battle of Fell Desert",
            },
            startGameButton: {
                smallWindowWarning: "Window is too small",
                playGameMessage: "START: click here / press enter",
                buttonArea: {
                    left: WINDOW_SPACING.SPACING4,
                    right:
                        ScreenDimensions.SCREEN_WIDTH - WINDOW_SPACING.SPACING4,
                    top: ScreenDimensions.SCREEN_HEIGHT * 0.63,
                    bottom: ScreenDimensions.SCREEN_HEIGHT * 0.85,
                },
                cornerRadius: [WINDOW_SPACING.SPACING4],
            },
            continueGameButton: {
                buttonArea: {
                    left:
                        ScreenDimensions.SCREEN_WIDTH * 0.74 -
                        WINDOW_SPACING.SPACING1,
                    right:
                        ScreenDimensions.SCREEN_WIDTH - WINDOW_SPACING.SPACING1,
                    top: ScreenDimensions.SCREEN_HEIGHT * 0.86,
                    bottom:
                        ScreenDimensions.SCREEN_HEIGHT -
                        WINDOW_SPACING.SPACING1,
                },
            },
            demonSlither: {
                iconArea: {
                    startColumn: 6,
                    width: 80,
                },
                descriptionText:
                    "Destroy all demons. These Slither demons bite!",
                iconImageResourceKey: "combat-demon-slither-neutral",
            },
            demonLocust: {
                iconArea: {
                    startColumn: 6,
                    width: 80,
                },
                descriptionText: "Locust demons attack from range.",
                iconImageResourceKey: "combat-demon-locust-neutral",
            },
            nahla: {
                iconArea: {
                    startColumn: 5,
                    width: 100,
                    top: ScreenDimensions.SCREEN_HEIGHT * 0.1,
                    height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
                },
                descriptionText:
                    "This is Nahla. She can attack at range and heal with a touch.",
                iconImageResourceKey: "young nahla cutscene portrait",
            },
            sirCamil: {
                iconArea: {
                    startColumn: 5,
                    width: 100,
                    top:
                        ScreenDimensions.SCREEN_HEIGHT * 0.13 +
                        WINDOW_SPACING.SPACING1 +
                        100,
                    height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
                },
                descriptionText:
                    "Her friend, Sir Camil has a sword and shield.",
                iconImageResourceKey: "sir camil cutscene portrait",
            },
            version: {
                startColumn: 0,
                endColumn: 1,
                fontSize: 8,
                top: ScreenDimensions.SCREEN_HEIGHT - WINDOW_SPACING.SPACING4,
                bottom:
                    ScreenDimensions.SCREEN_HEIGHT - WINDOW_SPACING.SPACING1,
                fontColor: [0, 0, 128],
            },
            debugMode: {
                startColumn: 4,
                endColumn: 9,
                fontSize: 72,
                top:
                    ScreenDimensions.SCREEN_HEIGHT -
                    WINDOW_SPACING.SPACING4 -
                    WINDOW_SPACING.SPACING4 -
                    WINDOW_SPACING.SPACING4,
                height: 200,
                fontColor: [0, 0, 160],
            },
            htmlGenerator: this.p5Instance,
            externalLinks: {
                itchIo: {
                    screenLocation: {
                        x: 200,
                        y: 700,
                    },
                    html: EXTERNAL_LINK_ITCH_IO_HTML,
                    href: "https://chadius.itch.io/fell-desert/add-to-collection?source=game",
                    target: "_blank",
                },
            },
        }
        this.data.setLayout(layout)

        this.resetContext()
        this.resetUIObjects()
        this.createDrawingTree()
    }

    get newGameSelected(): boolean {
        const context: TitleScreenContext = this.data.getContext()
        return context?.menuSelection === TitleScreenMenuSelection.NEW_GAME
    }

    async update(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ) {
        this.draw(
            gameEngineState,
            graphicsContext,
            gameEngineState.resourceHandler
        )
        const uiObjects = this.data.getUIObjects()
        uiObjects.startGameButton?.clearStatus()
        uiObjects.continueGameButton?.clearStatus()
    }

    keyPressed(gameEngineState: GameEngineState, keyCode: number): void {
        const actions: TPlayerInputAction[] =
            PlayerInputStateService.getActionsForPressedKey(
                gameEngineState.playerInputState,
                keyCode
            )

        if (actions.includes(PlayerInputAction.ACCEPT)) {
            const uiObjects = this.data.getUIObjects()
            const context = this.data.getContext()

            uiObjects.startGameButton?.changeStatus({
                newStatus: ButtonStatus.ACTIVE,
            })

            if (uiObjects.startGameButton != undefined) {
                this.reactToStartGameButtonStatusChangeEvent(
                    context,
                    uiObjects.startGameButton
                )
            }
            if (uiObjects.continueGameButton != undefined) {
                this.reactToContinueGameButtonStatusChangeEvent(
                    context,
                    uiObjects.continueGameButton
                )
            }
        }
    }

    mousePressed(
        _gameEngineState: GameEngineState,
        mouseClick: MousePress
    ): void {
        const mouseX = mouseClick.x
        const mouseY = mouseClick.y
        const mouseButton = mouseClick.button

        const buttons = this.getButtons()
        buttons.forEach((button) => {
            button.mousePressed({
                mousePress: {
                    button: mouseButton,
                    x: mouseX,
                    y: mouseY,
                },
            })
        })
        this.reactToButtonStatusChangeEvents()
    }

    mouseReleased(
        _gameEngineState: GameEngineState,
        mouseRelease: MouseRelease
    ): void {
        const buttons = this.getButtons()
        buttons.forEach((button) => {
            button.mouseReleased({
                mouseRelease: mouseRelease,
            })
        })
        this.reactToButtonStatusChangeEvents()
    }

    mouseMoved(
        _gameEngineState: GameEngineState,
        mouseLocation: ScreenLocation
    ): void {
        const buttons = this.getButtons()
        buttons.forEach((button) => {
            button.mouseMoved({
                mouseLocation,
            })
        })
        this.reactToButtonStatusChangeEvents()
    }

    mouseWheel(
        _gameEngineState: GameEngineState,
        _mouseWheel: MouseWheel
    ): void {
        // required by interface
    }

    mouseDragged(
        _gameEngineState: GameEngineState,
        _mouseDrag: MouseDrag
    ): void {
        // Required by inheritance
    }

    private getButtons() {
        const uiObjects: TitleScreenUIObjects = this.data.getUIObjects()
        return [uiObjects.startGameButton, uiObjects.continueGameButton].filter(
            (x) => x != undefined
        )
    }

    private reactToButtonStatusChangeEvents() {
        const uiObjects: TitleScreenUIObjects = this.data.getUIObjects()
        const context = this.data.getContext()

        if (uiObjects.startGameButton) {
            this.reactToStartGameButtonStatusChangeEvent(
                context,
                uiObjects.startGameButton
            )
        }
        if (uiObjects.continueGameButton) {
            this.reactToContinueGameButtonStatusChangeEvent(
                context,
                uiObjects.continueGameButton
            )
        }
    }

    hasCompleted(_: GameEngineState): boolean {
        const context: TitleScreenContext = this.data.getContext()
        const continueGameWasLoaded =
            context?.loadState &&
            context.loadState.userRequestedLoad &&
            context.loadState.applicationCompletedLoad
        const userClickedOnAButtonThatLeavesTheTitleScreen =
            context?.menuSelection !== TitleScreenMenuSelection.NONE
        return (
            this.allResourcesAreLoaded() &&
            (continueGameWasLoaded ||
                userClickedOnAButtonThatLeavesTheTitleScreen)
        )
    }

    allResourcesAreLoaded() {
        return this.getAllImages().every((image) => {
            if (!image) return false
            return image.isImageLoaded()
        })
    }

    private getAllImages() {
        const uiObjects: TitleScreenUIObjects = this.data.getUIObjects()
        return [
            uiObjects.titleBanner,
            uiObjects.nahla.icon,
            uiObjects.sirCamil.icon,
            uiObjects.demonSlither.icon,
            uiObjects.demonLocust.icon,
        ]
    }

    reset(_: GameEngineState): void {
        this.resetContext()
        this.resetUIObjects()
    }

    setup(): TitleScreenState {
        return TitleScreenStateHelper.new()
    }

    recommendStateChanges(_: GameEngineState): GameEngineChanges | undefined {
        return {
            nextMode: GameModeEnum.LOADING_BATTLE,
        }
    }

    private draw(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler | undefined
    ): void {
        const uiObjects: TitleScreenUIObjects = this.data.getUIObjects()

        uiObjects.graphicsContext = graphicsContext
        uiObjects.resourceHandler = resourceHandler
        this.data.setUIObjects(uiObjects)

        const context: TitleScreenContext = this.data.getContext()
        context.loadState = gameEngineState.loadState
        context.saveState = gameEngineState.saveSaveState
        context.messageBoard = gameEngineState.messageBoard
        this.data.setContext(context)

        const layout: TitleScreenLayout = this.data.getLayout()
        layout.htmlGenerator = this.p5Instance
        this.data.setLayout(layout)

        this.drawUIObjectsBehaviorTree?.run()
        ;[uiObjects.startGameButton, uiObjects.continueGameButton]
            .filter((x) => x != undefined)
            .forEach((button) => {
                DataBlobService.add<GraphicsBuffer>(
                    button.buttonStyle.dataBlob,
                    "graphicsContext",
                    graphicsContext
                )
                button.draw()
            })
    }

    private resetContext() {
        const existingContext: TitleScreenContext = this.data.getContext()

        const context: TitleScreenContext = {
            errorDuringLoadingDisplayStartTimestamp: undefined,
            menuSelection: TitleScreenMenuSelection.NONE,
            version: existingContext?.version,
            loadState: undefined,
            saveState: undefined,
            messageBoard: undefined,
            buttonStatusChangeEventDataBlob: DataBlobService.new(),
        }
        this.data.setContext(context)
        return context
    }

    private resetUIObjects() {
        const uiObjectsToDelete = this.data.getUIObjects()
        if (uiObjectsToDelete?.externalLinks) {
            Object.values(uiObjectsToDelete.externalLinks)
                .filter((x) => x != undefined)
                .forEach((link) => {
                    link.remove()
                })
        }

        const uiObjects: TitleScreenUIObjects = {
            titleBanner: undefined,
            demonSlither: {
                icon: undefined,
                descriptionText: undefined,
            },
            demonLocust: {
                icon: undefined,
                descriptionText: undefined,
            },
            sirCamil: {
                icon: undefined,
                descriptionText: undefined,
            },
            nahla: {
                icon: undefined,
                descriptionText: undefined,
            },
            byLine: undefined,
            titleText: undefined,
            startGameButton: undefined,
            continueGameButton: undefined,
            gameDescription: undefined,
            background: undefined,
            versionTextBox: undefined,
            debugModeTextBox: undefined,
            externalLinks: {},
        }
        this.data.setUIObjects(uiObjects)
    }

    private createDrawingTree() {
        const createOrUpdateUIObjects = new ExecuteAllComposite(this.data, [
            new TitleScreenCreateBackgroundAction(this.data),
            new TitleScreenCreateTitleBannerAction(this.data),
            new TitleScreenCreateTitleTextAction(this.data),
            new TitleScreenCreateByLineAction(this.data),
            new TitleScreenCreateGameDescriptionAction(this.data),
            new TitleScreenCreateVersionTextBoxAction(this.data),
            new TitleScreenCreateDebugModeTextBoxAction(this.data),
            new SequenceComposite(this.data, [
                new ShouldCreateStartGameButtonAction(this.data),
                new CreateStartGameButtonAction(this.data),
            ]),
            new SequenceComposite(this.data, [
                new ShouldCreateContinueGameButtonAction(this.data),
                new CreateContinueGameButtonAction(this.data),
            ]),
            new SequenceComposite(this.data, [
                new InverterDecorator(
                    this.data,
                    new TitleScreenIsCharacterIntroductionImageInitialized(
                        this.data,
                        "nahla"
                    )
                ),
                new TitleScreenCreateNahlaCharacterIntroductionIcon(this.data),
            ]),
            new SequenceComposite(this.data, [
                new TitleScreenIsCharacterIntroductionImageLoaded(
                    this.data,
                    "nahla"
                ),
                new TitleScreenCreateNahlaCharacterIntroductionDescriptionText(
                    this.data
                ),
            ]),
            new SequenceComposite(this.data, [
                new TitleScreenAreCharacterIntroductionElementsLoaded(
                    this.data,
                    ["nahla"]
                ),
                new InverterDecorator(
                    this.data,
                    new TitleScreenIsCharacterIntroductionImageInitialized(
                        this.data,
                        "sirCamil"
                    )
                ),
                new TitleScreenCreateSirCamilCharacterIntroductionIcon(
                    this.data
                ),
            ]),
            new SequenceComposite(this.data, [
                new TitleScreenIsCharacterIntroductionImageLoaded(
                    this.data,
                    "sirCamil"
                ),
                new TitleScreenCreateSirCamilCharacterIntroductionDescriptionText(
                    this.data
                ),
            ]),
            new SequenceComposite(this.data, [
                new TitleScreenAreCharacterIntroductionElementsLoaded(
                    this.data,
                    ["sirCamil"]
                ),
                new InverterDecorator(
                    this.data,
                    new TitleScreenIsCharacterIntroductionImageInitialized(
                        this.data,
                        "demonSlither"
                    )
                ),
                new TitleScreenCreateDemonSlitherCharacterIntroductionIcon(
                    this.data
                ),
            ]),
            new SequenceComposite(this.data, [
                new TitleScreenIsCharacterIntroductionImageLoaded(
                    this.data,
                    "demonSlither"
                ),
                new TitleScreenCreateDemonSlitherCharacterIntroductionDescriptionText(
                    this.data
                ),
            ]),
            new SequenceComposite(this.data, [
                new TitleScreenAreCharacterIntroductionElementsLoaded(
                    this.data,
                    ["demonSlither"]
                ),
                new InverterDecorator(
                    this.data,
                    new TitleScreenIsCharacterIntroductionImageInitialized(
                        this.data,
                        "demonLocust"
                    )
                ),
                new TitleScreenCreateDemonLocustCharacterIntroductionIcon(
                    this.data
                ),
            ]),
            new SequenceComposite(this.data, [
                new TitleScreenIsCharacterIntroductionImageLoaded(
                    this.data,
                    "demonLocust"
                ),
                new TitleScreenCreateDemonLocustCharacterIntroductionDescriptionText(
                    this.data
                ),
            ]),
            new SequenceComposite(this.data, [
                new TitleScreenP5InstanceIsReady(this.data),
                new TitleScreenDrawExternalLinkButton(this.data, "itchIo"),
            ]),
        ])

        const drawUIObjects = new SequenceComposite(this.data, [
            new DoesObjectHaveKeyExistCondition({
                data: this.data.data,
                dataObjectName: "uiObjects",
                objectKey: "graphicsContext",
            }),
            new ExecuteAllComposite(this.data, [
                new DrawRectanglesAction(
                    this.data,
                    // @ts-ignore ComponentDataBlob is a subclass of DataBlob
                    (
                        dataBlob: ComponentDataBlob<
                            TitleScreenLayout,
                            TitleScreenContext,
                            TitleScreenUIObjects
                        >
                    ) => {
                        const uiObjects: TitleScreenUIObjects =
                            dataBlob.getUIObjects()
                        return [uiObjects.background]
                    },
                    getGraphicsContext
                ),
                new DrawTextBoxesAction(
                    this.data,
                    // @ts-ignore ComponentDataBlob is a subclass of DataBlob
                    (
                        dataBlob: ComponentDataBlob<
                            TitleScreenLayout,
                            TitleScreenContext,
                            TitleScreenUIObjects
                        >
                    ) => {
                        const uiObjects: TitleScreenUIObjects =
                            dataBlob.getUIObjects()
                        return [
                            uiObjects.titleText,
                            uiObjects.byLine,
                            uiObjects.gameDescription,
                            uiObjects.versionTextBox,
                            uiObjects.debugModeTextBox,
                            uiObjects.nahla.descriptionText,
                            uiObjects.sirCamil.descriptionText,
                            uiObjects.demonSlither.descriptionText,
                            uiObjects.demonLocust.descriptionText,
                        ].filter((x) => x != undefined)
                    },
                    getGraphicsContext
                ),
                new DrawImagesAction(
                    this.data,
                    (_: DataBlob) =>
                        this.getAllImages().filter((x) => x != undefined),
                    // @ts-ignore ComponentDataBlob is a subclass of DataBlob
                    getGraphicsContext,
                    getResourceHandler
                ),
            ]),
        ])

        this.drawUIObjectsBehaviorTree = new ExecuteAllComposite(this.data, [
            createOrUpdateUIObjects,
            drawUIObjects,
        ])
    }

    reactToStartGameButtonStatusChangeEvent(
        context: TitleScreenContext,
        startButton: Button
    ) {
        const titleScreenStatusChange = startButton.getStatusChangeEvent()
        if (titleScreenStatusChange?.newStatus != ButtonStatus.ACTIVE) return
        if (context.menuSelection === TitleScreenMenuSelection.NONE) {
            context.menuSelection = TitleScreenMenuSelection.NEW_GAME
        }
    }

    reactToContinueGameButtonStatusChangeEvent(
        context: TitleScreenContext,
        continueGameButton: Button
    ) {
        const titleScreenStatusChange =
            continueGameButton.getStatusChangeEvent()
        if (titleScreenStatusChange?.newStatus != ButtonStatus.ACTIVE) return

        const messageBoard = context.messageBoard

        if (
            context.menuSelection === TitleScreenMenuSelection.NONE &&
            context.loadState != undefined &&
            messageBoard != undefined
        ) {
            context.menuSelection = TitleScreenMenuSelection.CONTINUE_GAME

            LoadSaveStateService.reset(context.loadState)
            messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
                loadState: context.loadState!,
            })
        }
    }
}

const getGraphicsContext = (
    dataBlob: ComponentDataBlob<
        TitleScreenLayout,
        TitleScreenContext,
        TitleScreenUIObjects
    >
): GraphicsBuffer => {
    const uiObjects: TitleScreenUIObjects = dataBlob.getUIObjects()
    if (uiObjects.graphicsContext == undefined) {
        throw new Error("[getGraphicsContext] GraphicsContext not found")
    }
    return uiObjects.graphicsContext
}

const getResourceHandler = (
    dataBlob: ComponentDataBlob<
        TitleScreenLayout,
        TitleScreenContext,
        TitleScreenUIObjects
    >
): ResourceHandler => {
    const uiObjects: TitleScreenUIObjects = dataBlob.getUIObjects()
    if (uiObjects.resourceHandler == undefined) {
        throw new Error("[getResourceHandler] GraphicsContext not found")
    }
    return uiObjects.resourceHandler
}
