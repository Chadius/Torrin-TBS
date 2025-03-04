import { TitleScreenState, TitleScreenStateHelper } from "./titleScreenState"
import {
    GameEngineChanges,
    GameEngineComponent,
} from "../gameEngine/gameEngineComponent"
import { MousePress, MouseRelease, ScreenLocation } from "../utils/mouseConfig"
import { GameEngineState } from "../gameEngine/gameEngine"
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
} from "../ui/playerInput/playerInputState"
import { DataBlob, DataBlobService } from "../utils/dataBlob/dataBlob"
import { BehaviorTreeTask } from "../utils/behaviorTree/task"
import { ExecuteAllComposite } from "../utils/behaviorTree/composite/executeAll/executeAll"
import { SequenceComposite } from "../utils/behaviorTree/composite/sequence/sequence"
import { FileState } from "../gameEngine/fileState"
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
import { LoadSaveStateService } from "../dataLoader/playerData/loadSaveState"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { DrawRectangleAction } from "../ui/rectangle/drawRectangleAction"
import { DrawTextBoxesAction } from "../ui/textBox/drawTextBoxesAction"
import { DrawImagesAction } from "../ui/imageUI/drawImagesAction"

export enum TitleScreenMenuSelection {
    NONE = "NONE",
    NEW_GAME = "NEW_GAME",
    CONTINUE_GAME = "CONTINUE_GAME",
}

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
}

export interface TitleScreenContext {
    errorDuringLoadingDisplayStartTimestamp: number
    menuSelection: TitleScreenMenuSelection
    version: string
    fileState: FileState
    messageBoard: MessageBoard
    buttonStatusChangeEventDataBlob: ButtonStatusChangeEventByButtonId
}

export interface TitleScreenUIObjects {
    startGameButton: Button
    continueGameButton: Button
    byLine: TextBox
    titleText: TextBox
    gameDescription: TextBox
    background: Rectangle
    titleBanner: ImageUI
    versionTextBox: TextBox
    demonSlither: {
        icon: ImageUI
        descriptionText: TextBox
    }
    demonLocust: {
        icon: ImageUI
        descriptionText: TextBox
    }
    sirCamil: {
        icon: ImageUI
        descriptionText: TextBox
    }
    nahla: {
        icon: ImageUI
        descriptionText: TextBox
    }
    graphicsContext?: GraphicsBuffer
    resourceHandler?: ResourceHandler
}

export class TitleScreen implements GameEngineComponent {
    data: DataBlob
    drawUIObjectsBehaviorTree: BehaviorTreeTask

    constructor({ version }: { version: string }) {
        this.data = DataBlobService.new()

        const context: TitleScreenContext = this.resetContext()
        context.version = version

        DataBlobService.add<TitleScreenContext>(this.data, "context", context)

        const layout: TitleScreenLayout = {
            colors: {
                background: [73, 10, 46],
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
        }
        DataBlobService.add<TitleScreenLayout>(this.data, "layout", layout)

        this.resetContext()
        this.resetUIObjects()
        this.createDrawingTree()
    }

    get newGameSelected(): boolean {
        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.data, "context")
        return context?.menuSelection === TitleScreenMenuSelection.NEW_GAME
    }

    update(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer
    ): void {
        this.draw(
            gameEngineState,
            graphicsContext,
            gameEngineState.resourceHandler
        )
        const uiObjects = DataBlobService.get<TitleScreenUIObjects>(
            this.data,
            "uiObjects"
        )
        uiObjects.startGameButton?.clearStatus()
        uiObjects.continueGameButton?.clearStatus()
    }

    keyPressed(gameEngineState: GameEngineState, keyCode: number): void {
        const actions: PlayerInputAction[] =
            PlayerInputStateService.getActionsForPressedKey(
                gameEngineState.playerInputState,
                keyCode
            )

        if (actions.includes(PlayerInputAction.ACCEPT)) {
            const uiObjects = DataBlobService.get<TitleScreenUIObjects>(
                this.data,
                "uiObjects"
            )
            const context = DataBlobService.get<TitleScreenContext>(
                this.data,
                "context"
            )

            uiObjects.startGameButton.changeStatus({
                newStatus: ButtonStatus.ACTIVE,
            })

            this.reactToStartGameButtonStatusChangeEvent(
                context,
                uiObjects.startGameButton
            )
            this.reactToContinueGameButtonStatusChangeEvent(
                context,
                uiObjects.continueGameButton
            )
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

    private getButtons() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(this.data, "uiObjects")
        return [uiObjects.startGameButton, uiObjects.continueGameButton].filter(
            (x) => x
        )
    }

    private reactToButtonStatusChangeEvents() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(this.data, "uiObjects")

        const context = DataBlobService.get<TitleScreenContext>(
            this.data,
            "context"
        )

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
        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.data, "context")
        return (
            context?.menuSelection !== TitleScreenMenuSelection.NONE &&
            this.allResourcesAreLoaded()
        )
    }

    allResourcesAreLoaded() {
        return this.getAllImages().every((image) => {
            if (!image) return false
            return image.isImageLoaded()
        })
    }

    private getAllImages() {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(this.data, "uiObjects")
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
        resourceHandler: ResourceHandler
    ): void {
        const uiObjects: TitleScreenUIObjects =
            DataBlobService.get<TitleScreenUIObjects>(this.data, "uiObjects")

        uiObjects.graphicsContext = graphicsContext
        uiObjects.resourceHandler = resourceHandler
        DataBlobService.add<TitleScreenUIObjects>(
            this.data,
            "uiObjects",
            uiObjects
        )
        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.data, "context")

        context.fileState = gameEngineState.fileState
        context.messageBoard = gameEngineState.messageBoard
        DataBlobService.add<TitleScreenContext>(this.data, "context", context)

        this.drawUIObjectsBehaviorTree.run()
        ;[uiObjects.startGameButton, uiObjects.continueGameButton]
            .filter((x) => x)
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
        const existingContext: TitleScreenContext = DataBlobService.get(
            this.data,
            "context"
        )

        const context: TitleScreenContext = {
            errorDuringLoadingDisplayStartTimestamp: undefined,
            menuSelection: TitleScreenMenuSelection.NONE,
            version: existingContext?.version,
            fileState: undefined,
            messageBoard: undefined,
            buttonStatusChangeEventDataBlob: DataBlobService.new(),
        }
        DataBlobService.add<TitleScreenContext>(this.data, "context", context)
        return context
    }

    private resetUIObjects() {
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
        }
        DataBlobService.add<TitleScreenUIObjects>(
            this.data,
            "uiObjects",
            uiObjects
        )
    }

    private createDrawingTree() {
        const createOrUpdateUIObjects = new ExecuteAllComposite(this.data, [
            new TitleScreenCreateBackgroundAction(this.data),
            new TitleScreenCreateTitleBannerAction(this.data),
            new TitleScreenCreateTitleTextAction(this.data),
            new TitleScreenCreateByLineAction(this.data),
            new TitleScreenCreateGameDescriptionAction(this.data),
            new TitleScreenCreateVersionTextBoxAction(this.data),
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
        ])

        const drawUIObjects = new SequenceComposite(this.data, [
            new DoesObjectHaveKeyExistCondition({
                data: this.data,
                dataObjectName: "uiObjects",
                objectKey: "graphicsContext",
            }),
            new ExecuteAllComposite(this.data, [
                new DrawRectangleAction(
                    this.data,
                    (dataBlob: DataBlob) => {
                        const uiObjects: TitleScreenUIObjects =
                            DataBlobService.get<TitleScreenUIObjects>(
                                dataBlob,
                                "uiObjects"
                            )
                        return uiObjects.background
                    },
                    getGraphicsContext
                ),
                new DrawTextBoxesAction(
                    this.data,
                    (dataBlob: DataBlob) => {
                        const uiObjects: TitleScreenUIObjects =
                            DataBlobService.get<TitleScreenUIObjects>(
                                dataBlob,
                                "uiObjects"
                            )
                        return [
                            uiObjects.titleText,
                            uiObjects.byLine,
                            uiObjects.gameDescription,
                            uiObjects.versionTextBox,
                            uiObjects.nahla.descriptionText,
                            uiObjects.sirCamil.descriptionText,
                            uiObjects.demonSlither.descriptionText,
                            uiObjects.demonLocust.descriptionText,
                        ].filter((x) => x)
                    },
                    getGraphicsContext
                ),
                new DrawImagesAction(
                    this.data,
                    (_: DataBlob) => this.getAllImages().filter((x) => x),
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
        const fileState = context.fileState

        if (context.menuSelection === TitleScreenMenuSelection.NONE) {
            context.menuSelection = TitleScreenMenuSelection.CONTINUE_GAME

            LoadSaveStateService.reset(fileState.loadSaveState)
            messageBoard.sendMessage({
                type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
                loadSaveState: fileState.loadSaveState,
            })
        }
    }
}

const getGraphicsContext = (dataBlob: DataBlob): GraphicsBuffer => {
    const uiObjects: TitleScreenUIObjects =
        DataBlobService.get<TitleScreenUIObjects>(dataBlob, "uiObjects")
    return uiObjects.graphicsContext
}

const getResourceHandler = (dataBlob: DataBlob): ResourceHandler => {
    const uiObjects: TitleScreenUIObjects =
        DataBlobService.get<TitleScreenUIObjects>(dataBlob, "uiObjects")
    return uiObjects.resourceHandler
}
