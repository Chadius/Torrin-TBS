import { TitleScreenState, TitleScreenStateHelper } from "./titleScreenState"
import {
    GameEngineChanges,
    GameEngineComponent,
} from "../gameEngine/gameEngineComponent"
import { MouseButton } from "../utils/mouseConfig"
import { GameEngineState } from "../gameEngine/gameEngine"
import { GameModeEnum } from "../utils/startupConfig"
import { LabelService } from "../ui/label"
import { Button, ButtonStatus } from "../ui/button"
import {
    HORIZONTAL_ALIGN,
    VERTICAL_ALIGN,
    WINDOW_SPACING,
} from "../ui/constants"
import { RectArea, RectAreaService } from "../ui/rectArea"
import { ScreenDimensions } from "../utils/graphics/graphicsConfig"
import { TextBox, TextBoxService } from "../ui/textBox/textBox"
import { Rectangle, RectangleService } from "../ui/rectangle"
import { ResourceHandler } from "../resource/resourceHandler"
import { LoadSaveStateService } from "../dataLoader/playerData/loadSaveState"
import { isValidValue } from "../utils/validityCheck"
import p5 from "p5"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import {
    ImageUI,
    ImageUILoadingBehavior,
    ImageUIService,
} from "../ui/imageUI/imageUI"
import {
    PlayerInputAction,
    PlayerInputStateService,
} from "../ui/playerInput/playerInputState"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { DataBlob, DataBlobService } from "../utils/dataBlob/dataBlob"
import { BehaviorTreeTask } from "../utils/behaviorTree/task"
import { ExecuteAllComposite } from "../utils/behaviorTree/composite/executeAll/executeAll"
import { SequenceComposite } from "../utils/behaviorTree/composite/sequence/sequence"
import { FileState } from "../gameEngine/fileState"
import { MessageBoard } from "../message/messageBoard"

export const FILE_MESSAGE_DISPLAY_DURATION = 2000

enum TitleScreenMenuSelection {
    NONE = "NONE",
    NEW_GAME = "NEW_GAME",
    CONTINUE_GAME = "CONTINUE_GAME",
}

interface TitleScreenLayout {
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

interface TitleScreenContext {
    startLoadingResources: boolean
    continueGameButtonLabel: string
    errorDuringLoadingDisplayStartTimestamp: number
    menuSelection: TitleScreenMenuSelection
    version: string
    fileState: FileState
    messageBoard: MessageBoard
}

interface TitleScreenUIElements {
    continueGameButton: Button
    startNewGameButton: Button
    byLine: TextBox
    titleText: TextBox
    gameDescription: TextBox
    background: Rectangle
    titleBanner: ImageUI
    versionTextBox: TextBox
    demonSlitherUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }
    demonLocustUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }
    sirCamilUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }
    nahlaUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }
    graphicsContext?: GraphicsBuffer
}

const colors = {
    descriptionText: [73, 10, 96],
    playButton: [207, 67, 40],
    playButtonStroke: [207, 67, 80],
    playButtonActive: [207, 47, 20],
    playButtonText: [207, 17, 80],
}

const TitleScreenDesign = {
    title: {
        screenHeight: 0.52,
        startColumn: 1,
        endColumn: 4,
    },
    startGameButton: {
        smallWindowWarning: "Window is too small",
        playGameMessage: "START: click here / press enter",
        buttonArea: {
            left: WINDOW_SPACING.SPACING4,
            right: ScreenDimensions.SCREEN_WIDTH - WINDOW_SPACING.SPACING4,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.63,
            bottom: ScreenDimensions.SCREEN_HEIGHT * 0.85,
        },
    },
    continueGameButton: {
        buttonArea: {
            left:
                ScreenDimensions.SCREEN_WIDTH * 0.74 - WINDOW_SPACING.SPACING1,
            right: ScreenDimensions.SCREEN_WIDTH - WINDOW_SPACING.SPACING1,
            top: ScreenDimensions.SCREEN_HEIGHT * 0.86,
            bottom: ScreenDimensions.SCREEN_HEIGHT - WINDOW_SPACING.SPACING1,
        },
    },
    demonSlither: {
        iconArea: {
            startColumn: 6,
            width: 80,
        },
        descriptionText: "Destroy all demons. These Slither demons bite!",
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
        descriptionText: "Her friend, Sir Camil has a sword and shield.",
        iconImageResourceKey: "sir camil cutscene portrait",
    },
}

const resourceKeys: string[] = [
    "title screen logo",
    TitleScreenDesign.sirCamil.iconImageResourceKey,
    TitleScreenDesign.demonSlither.iconImageResourceKey,
    TitleScreenDesign.demonLocust.iconImageResourceKey,
    TitleScreenDesign.nahla.iconImageResourceKey,
]

export class TitleScreen implements GameEngineComponent {
    startLoadingResources: boolean
    errorDuringLoadingDisplayStartTimestamp: number
    private demonSlitherUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }

    private demonLocustUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }

    private sirCamilUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }

    private nahlaUIElements: {
        icon: ImageUI
        iconArea: RectArea
        descriptionText: TextBox
    }

    data: DataBlob
    createUIObjectsBehaviorTree: BehaviorTreeTask

    private readonly _resourceHandler: ResourceHandler

    constructor({
        resourceHandler,
        version,
    }: {
        resourceHandler: ResourceHandler
        version: string
    }) {
        this._resourceHandler = resourceHandler

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

        // TODO this should only reset the context
        this.resetContext()
        this.lazyInitializeUIObjects()
        this.createDrawingTree()
    }

    get resourceHandler(): ResourceHandler {
        return this._resourceHandler
    }

    get newGameSelected(): boolean {
        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.data, "context")
        return context?.menuSelection === TitleScreenMenuSelection.NEW_GAME
    }

    update(state: GameEngineState, graphicsContext: GraphicsBuffer): void {
        if (this.startLoadingResources === false) {
            this.loadResourcesFromHandler()
        }
        this.draw(state, graphicsContext, state.resourceHandler)
    }

    keyPressed(gameEngineState: GameEngineState, keyCode: number): void {
        const actions: PlayerInputAction[] =
            PlayerInputStateService.getActionsForPressedKey(
                gameEngineState.playerInputState,
                keyCode
            )

        const uiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(this.data, "uiObjects")
        if (actions.includes(PlayerInputAction.ACCEPT)) {
            uiObjects.startNewGameButton.onClickHandler(
                0,
                0,
                uiObjects.startNewGameButton,
                this
            )
        }
    }

    mouseClicked(
        _gameEngineState: GameEngineState,
        _mouseButton: MouseButton,
        mouseX: number,
        mouseY: number
    ): void {
        const uiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(this.data, "uiObjects")
        uiObjects.startNewGameButton.mouseClicked(mouseX, mouseY, this)
        uiObjects.continueGameButton.mouseClicked(mouseX, mouseY, this)
    }

    mouseMoved(
        _gameEngineState: GameEngineState,
        _mouseX: number,
        _mouseY: number
    ): void {
        // Required by inheritance
    }

    hasCompleted(_: GameEngineState): boolean {
        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.data, "context")
        return context?.menuSelection !== TitleScreenMenuSelection.NONE
    }

    reset(_: GameEngineState): void {
        this.resetContext()
    }

    setup(): TitleScreenState {
        return TitleScreenStateHelper.new()
    }

    recommendStateChanges(
        state: GameEngineState
    ): GameEngineChanges | undefined {
        return {
            nextMode: GameModeEnum.LOADING_BATTLE,
        }
    }

    private draw(
        gameEngineState: GameEngineState,
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ): void {
        const uiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(this.data, "uiObjects")

        uiObjects.graphicsContext = graphicsContext
        DataBlobService.add<TitleScreenUIElements>(
            this.data,
            "uiObjects",
            uiObjects
        )
        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.data, "context")

        context.fileState = gameEngineState.fileState
        context.messageBoard = gameEngineState.messageBoard
        DataBlobService.add<TitleScreenContext>(this.data, "context", context)

        this.createUIObjectsBehaviorTree.run()

        RectangleService.draw(uiObjects.background, graphicsContext)
        uiObjects.titleBanner.draw({ graphicsContext, resourceHandler })
        ;[
            uiObjects.titleText,
            uiObjects.byLine,
            uiObjects.gameDescription,
            uiObjects.versionTextBox,
        ]
            .filter((x) => x)
            .forEach((text) => {
                TextBoxService.draw(text, graphicsContext)
            })
        uiObjects.startNewGameButton.draw(graphicsContext)
        uiObjects.continueGameButton.draw(graphicsContext)

        this.drawCharacterIntroductions(graphicsContext, resourceHandler)
    }

    private resetContext() {
        const existingContext: TitleScreenContext = DataBlobService.get(
            this.data,
            "context"
        )

        const context: TitleScreenContext = {
            startLoadingResources: false,
            errorDuringLoadingDisplayStartTimestamp: undefined,
            continueGameButtonLabel: undefined,
            menuSelection: TitleScreenMenuSelection.NONE,
            version: existingContext?.version,
            fileState: undefined,
            messageBoard: undefined,
        }
        DataBlobService.add<TitleScreenContext>(this.data, "context", context)

        // TODO chopping block
        this.startLoadingResources = false
        return context
    }

    private lazyInitializeUIObjects() {
        const existingUiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(this.data, "uiObjects")

        const uiObjects: TitleScreenUIElements = {
            titleBanner: undefined,
            demonSlitherUIElements: isValidValue(
                existingUiObjects?.demonSlitherUIElements
            )
                ? existingUiObjects.demonSlitherUIElements
                : {
                      icon: undefined,
                      iconArea: isValidValue(this.demonSlitherUIElements?.icon)
                          ? this.demonSlitherUIElements.iconArea
                          : RectAreaService.new({
                                left: 0,
                                top: 0,
                                width: 0,
                                height: 0,
                            }),
                      descriptionText: undefined,
                  },
            demonLocustUIElements: isValidValue(
                existingUiObjects?.demonLocustUIElements
            )
                ? existingUiObjects.demonLocustUIElements
                : {
                      icon: undefined,
                      iconArea: isValidValue(this.demonLocustUIElements?.icon)
                          ? this.demonLocustUIElements.iconArea
                          : RectAreaService.new({
                                left: 0,
                                top: 0,
                                width: 0,
                                height: 0,
                            }),
                      descriptionText: undefined,
                  },
            sirCamilUIElements: isValidValue(
                existingUiObjects?.sirCamilUIElements
            )
                ? existingUiObjects.sirCamilUIElements
                : {
                      icon: undefined,
                      iconArea: isValidValue(this.sirCamilUIElements?.icon)
                          ? this.sirCamilUIElements.iconArea
                          : RectAreaService.new({
                                left: 0,
                                top: 0,
                                width: 0,
                                height: 0,
                            }),
                      descriptionText: undefined,
                  },
            nahlaUIElements: isValidValue(existingUiObjects?.nahlaUIElements)
                ? existingUiObjects.nahlaUIElements
                : {
                      icon: undefined,
                      iconArea: isValidValue(this.nahlaUIElements?.icon)
                          ? this.nahlaUIElements.iconArea
                          : RectAreaService.new({
                                left: 0,
                                top: 0,
                                width: 0,
                                height: 0,
                            }),
                      descriptionText: undefined,
                  },
            byLine: undefined,
            titleText: undefined,
            startNewGameButton: undefined,
            continueGameButton: undefined,
            gameDescription: undefined,
            background: undefined,
            versionTextBox: undefined,
        }
        DataBlobService.add<TitleScreenUIElements>(
            this.data,
            "uiObjects",
            uiObjects
        )

        if (!isValidValue(this.demonSlitherUIElements)) {
            this.demonSlitherUIElements = {
                icon: undefined,
                iconArea: RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                }),
                descriptionText: undefined,
            }
        }
        if (!isValidValue(this.demonSlitherUIElements.icon)) {
            this.demonSlitherUIElements.iconArea = RectAreaService.new({
                left: 0,
                top: 0,
                width: 0,
                height: 0,
            })
        }
        if (!isValidValue(this.demonLocustUIElements)) {
            this.demonLocustUIElements = {
                icon: undefined,
                iconArea: RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                }),
                descriptionText: undefined,
            }
        }
        if (!isValidValue(this.demonLocustUIElements.icon)) {
            this.demonLocustUIElements.iconArea = RectAreaService.new({
                left: 0,
                top: 0,
                width: 0,
                height: 0,
            })
        }

        if (!isValidValue(this.nahlaUIElements)) {
            this.nahlaUIElements = {
                icon: undefined,
                iconArea: RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                }),
                descriptionText: undefined,
            }
        }
        if (!isValidValue(this.nahlaUIElements.icon)) {
            this.nahlaUIElements.iconArea = RectAreaService.new({
                left: 0,
                top: 0,
                width: 0,
                height: 0,
            })
        }

        if (!isValidValue(this.sirCamilUIElements)) {
            this.sirCamilUIElements = {
                icon: undefined,
                iconArea: RectAreaService.new({
                    left: 0,
                    top: 0,
                    width: 0,
                    height: 0,
                }),
                descriptionText: undefined,
            }
        }
        if (!isValidValue(this.sirCamilUIElements.icon)) {
            this.sirCamilUIElements.iconArea = RectAreaService.new({
                left: 0,
                top: 0,
                width: 0,
                height: 0,
            })
        }

        this.errorDuringLoadingDisplayStartTimestamp = undefined
    }

    private loadResourcesFromHandler() {
        this.startLoadingResources = true
        resourceKeys.forEach((key) => {
            if (!this.resourceHandler.isResourceLoaded(key)) {
                this.resourceHandler.loadResource(key)
            }
        })
    }

    private areResourcesLoaded(): boolean {
        return this.resourceHandler.areAllResourcesLoaded(resourceKeys)
    }

    private drawCharacterIntroductions(
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) {
        this.drawNahlaCharacterIntroduction(graphicsContext, resourceHandler)
        this.drawSirCamilCharacterIntroduction(graphicsContext, resourceHandler)
        this.drawDemonSlitherCharacterIntroduction(
            graphicsContext,
            resourceHandler
        )
        this.drawDemonLocustCharacterIntroduction(
            graphicsContext,
            resourceHandler
        )
    }

    private drawSirCamilCharacterIntroduction(
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) {
        if (this.sirCamilUIElements.icon === undefined) {
            this.createSirCamilPlaceholderIconAreaUnderNahla()
        }

        if (this.sirCamilUIElements.descriptionText === undefined) {
            this.setSirCamilDescriptionText()
        }

        TextBoxService.draw(
            this.sirCamilUIElements.descriptionText,
            graphicsContext
        )

        if (this.areResourcesLoaded() === false) {
            return
        }

        if (this.sirCamilUIElements.icon === undefined) {
            let image: p5.Image = this.resourceHandler.getResource(
                "sir camil cutscene portrait"
            )
            this.setSirCamilIconBasedOnImageAndNahlaImage(image)
            this.setSirCamilDescriptionText()
        }
        this.sirCamilUIElements.icon.draw({ graphicsContext, resourceHandler })
    }

    private setSirCamilIconBasedOnImageAndNahlaImage(image: p5.Image) {
        ;({
            iconArea: this.sirCamilUIElements.iconArea,
            icon: this.sirCamilUIElements.icon,
        } = updateIconBasedOnImage({
            iconArea: this.sirCamilUIElements.iconArea,
            image,
            desiredWidth: TitleScreenDesign.sirCamil.iconArea.width,
            overrides: {
                top:
                    RectAreaService.bottom(this.nahlaUIElements.iconArea) +
                    WINDOW_SPACING.SPACING1,
            },
        }))
    }

    private createSirCamilPlaceholderIconAreaUnderNahla() {
        this.sirCamilUIElements.iconArea = RectAreaService.new({
            startColumn: TitleScreenDesign.sirCamil.iconArea.startColumn,
            endColumn: TitleScreenDesign.sirCamil.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top: TitleScreenDesign.sirCamil.iconArea.top,
            height: TitleScreenDesign.sirCamil.iconArea.height,
        })
    }

    private setSirCamilDescriptionText() {
        this.sirCamilUIElements.descriptionText = TextBoxService.new({
            area: RectAreaService.new({
                left:
                    RectAreaService.right(this.sirCamilUIElements.iconArea) +
                    WINDOW_SPACING.SPACING1,
                top: this.sirCamilUIElements.iconArea.top,
                height: this.sirCamilUIElements.iconArea.height,
                width:
                    ScreenDimensions.SCREEN_WIDTH -
                    RectAreaService.right(this.sirCamilUIElements.iconArea),
                margin: [0, 0, 0, WINDOW_SPACING.SPACING1],
            }),
            text: TitleScreenDesign.sirCamil.descriptionText,
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }

    private drawNahlaCharacterIntroduction(
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) {
        if (this.nahlaUIElements.icon === undefined) {
            this.createPlaceholderNahlaIconArea()
        }

        if (this.nahlaUIElements.descriptionText === undefined) {
            this.setNahlaDescriptionText()
        }
        TextBoxService.draw(
            this.nahlaUIElements.descriptionText,
            graphicsContext
        )

        if (this.areResourcesLoaded() === false) {
            return
        }

        if (this.nahlaUIElements.icon === undefined) {
            let image: p5.Image = this.resourceHandler.getResource(
                "young nahla cutscene portrait"
            )
            this.setNahlaIconBasedOnImage(image)
            this.setNahlaDescriptionText()
        }
        this.nahlaUIElements.icon.draw({ graphicsContext, resourceHandler })
    }

    private setNahlaIconBasedOnImage(image: p5.Image) {
        ;({
            iconArea: this.nahlaUIElements.iconArea,
            icon: this.nahlaUIElements.icon,
        } = updateIconBasedOnImage({
            iconArea: this.nahlaUIElements.iconArea,
            image,
            desiredWidth: TitleScreenDesign.nahla.iconArea.width,
        }))
    }

    private setNahlaDescriptionText() {
        this.nahlaUIElements.descriptionText = TextBoxService.new({
            area: RectAreaService.new({
                left:
                    RectAreaService.right(this.nahlaUIElements.iconArea) +
                    WINDOW_SPACING.SPACING1,
                top: this.nahlaUIElements.iconArea.top,
                height: this.nahlaUIElements.iconArea.height,
                width:
                    ScreenDimensions.SCREEN_WIDTH -
                    RectAreaService.right(this.nahlaUIElements.iconArea) -
                    WINDOW_SPACING.SPACING2,
            }),
            text: TitleScreenDesign.nahla.descriptionText,
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }

    private createPlaceholderNahlaIconArea() {
        this.nahlaUIElements.iconArea = RectAreaService.new({
            startColumn: TitleScreenDesign.nahla.iconArea.startColumn,
            endColumn: TitleScreenDesign.nahla.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top: TitleScreenDesign.nahla.iconArea.top,
            height: TitleScreenDesign.nahla.iconArea.top,
        })
    }

    private drawDemonSlitherCharacterIntroduction(
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) {
        if (!isValidValue(this.demonSlitherUIElements.icon)) {
            this.createDemonSlitherPlaceholderIconAreaUnderSirCamil()
        }

        if (this.demonSlitherUIElements.descriptionText === undefined) {
            this.setDemonSlitherDescriptionText()
        }
        TextBoxService.draw(
            this.demonSlitherUIElements.descriptionText,
            graphicsContext
        )

        if (this.areResourcesLoaded() === false) {
            return
        }

        if (!isValidValue(this.demonSlitherUIElements.icon)) {
            let image: p5.Image = this.resourceHandler.getResource(
                TitleScreenDesign.demonSlither.iconImageResourceKey
            )
            this.setDemonSlitherIconBasedOnImage(image)
            this.setDemonSlitherDescriptionText()
        }

        this.demonSlitherUIElements.icon.draw({
            graphicsContext,
            resourceHandler,
        })
    }

    private setDemonSlitherDescriptionText() {
        this.demonSlitherUIElements.descriptionText = TextBoxService.new({
            area: RectAreaService.new({
                left:
                    RectAreaService.right(
                        this.demonSlitherUIElements.iconArea
                    ) + WINDOW_SPACING.SPACING1,
                top: this.demonSlitherUIElements.iconArea.top,
                height: this.demonSlitherUIElements.iconArea.height,
                width:
                    ScreenDimensions.SCREEN_WIDTH -
                    RectAreaService.right(this.demonSlitherUIElements.iconArea),
                margin: [0, 0, 0, WINDOW_SPACING.SPACING1],
            }),
            text: TitleScreenDesign.demonSlither.descriptionText,
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }

    private createDemonSlitherPlaceholderIconAreaUnderSirCamil() {
        this.demonSlitherUIElements.iconArea = RectAreaService.new({
            startColumn: TitleScreenDesign.demonSlither.iconArea.startColumn,
            endColumn: TitleScreenDesign.demonSlither.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top:
                RectAreaService.bottom(this.sirCamilUIElements.iconArea) +
                WINDOW_SPACING.SPACING1,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        })
    }

    private setDemonSlitherIconBasedOnImage(image: p5.Image) {
        ;({
            iconArea: this.demonSlitherUIElements.iconArea,
            icon: this.demonSlitherUIElements.icon,
        } = updateIconBasedOnImage({
            iconArea: this.demonSlitherUIElements.iconArea,
            image,
            desiredWidth: TitleScreenDesign.nahla.iconArea.width,
        }))
    }

    private drawDemonLocustCharacterIntroduction(
        graphicsContext: GraphicsBuffer,
        resourceHandler: ResourceHandler
    ) {
        if (!isValidValue(this.demonLocustUIElements.icon)) {
            this.createDemonLocustPlaceholderIconAreaUnderDemonSlither()
        }

        if (this.demonLocustUIElements.descriptionText === undefined) {
            this.setDemonLocustDescriptionText()
        }
        TextBoxService.draw(
            this.demonLocustUIElements.descriptionText,
            graphicsContext
        )

        if (this.areResourcesLoaded() === false) {
            return
        }

        if (!isValidValue(this.demonLocustUIElements.icon)) {
            let image: p5.Image = this.resourceHandler.getResource(
                TitleScreenDesign.demonLocust.iconImageResourceKey
            )
            this.updateDemonLocustIconBasedOnImage(image)
            this.setDemonLocustDescriptionText()
        }

        this.demonLocustUIElements.icon.draw({
            graphicsContext,
            resourceHandler,
        })
    }

    private setDemonLocustDescriptionText() {
        this.demonLocustUIElements.descriptionText = TextBoxService.new({
            area: RectAreaService.new({
                left:
                    RectAreaService.right(this.demonLocustUIElements.iconArea) +
                    WINDOW_SPACING.SPACING1,
                top: this.demonLocustUIElements.iconArea.top,
                height: this.demonLocustUIElements.iconArea.height,
                width:
                    ScreenDimensions.SCREEN_WIDTH -
                    RectAreaService.right(this.demonLocustUIElements.iconArea),
                margin: [0, 0, 0, WINDOW_SPACING.SPACING1],
            }),
            text: TitleScreenDesign.demonLocust.descriptionText,
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: colors.descriptionText,
            vertAlign: VERTICAL_ALIGN.CENTER,
        })
    }

    private createDemonLocustPlaceholderIconAreaUnderDemonSlither() {
        this.demonLocustUIElements.iconArea = RectAreaService.new({
            startColumn: TitleScreenDesign.demonLocust.iconArea.startColumn,
            endColumn: TitleScreenDesign.demonLocust.iconArea.startColumn + 1,
            screenWidth: ScreenDimensions.SCREEN_WIDTH,
            screenHeight: ScreenDimensions.SCREEN_HEIGHT,
            top:
                RectAreaService.bottom(this.demonSlitherUIElements.iconArea) +
                WINDOW_SPACING.SPACING1,
            height: ScreenDimensions.SCREEN_HEIGHT * 0.1,
        })
    }

    private updateDemonLocustIconBasedOnImage(image: p5.Image) {
        ;({
            iconArea: this.demonLocustUIElements.iconArea,
            icon: this.demonLocustUIElements.icon,
        } = updateIconBasedOnImage({
            iconArea: this.demonLocustUIElements.iconArea,
            image,
            desiredWidth: TitleScreenDesign.demonLocust.iconArea.width,
        }))
    }

    private createDrawingTree() {
        this.createUIObjectsBehaviorTree = new ExecuteAllComposite(this.data, [
            new CreateBackgroundAction(this.data),
            new CreateTitleBannerAction(this.data),
            new CreateTitleTextAction(this.data),
            new CreateByLineAction(this.data),
            new CreateGameDescriptionAction(this.data),
            new CreateVersionTextBoxAction(this.data),
            new SequenceComposite(this.data, [
                new DoesUIObjectExistCondition(this.data, "graphicsContext"),
                new ShouldCreateStartGameButtonAction(this.data),
                new CreateStartGameButtonAction(this.data),
            ]),
            new SequenceComposite(this.data, [
                new DoesContextExistCondition(this.data, "fileState"),
                new DoesContextExistCondition(this.data, "messageBoard"),
                new ShouldCreateUpdateGameButtonAction(this.data),
                new CreateUpdateGameButtonAction(this.data),
            ]),
        ])
        // TODO Add draw text box actions here
    }
}

const updateIconBasedOnImage = ({
    iconArea,
    image,
    desiredWidth,
    overrides,
}: {
    iconArea: RectArea
    image: p5.Image
    desiredWidth: number
    overrides?: {
        top?: number
    }
}) => {
    iconArea = RectAreaService.new({
        left: RectAreaService.left(iconArea),
        top: overrides?.top ?? RectAreaService.top(iconArea),
        height: ImageUIService.scaleImageHeight({
            imageWidth: image.width,
            imageHeight: image.height,
            desiredWidth,
        }),
        width: desiredWidth,
    })

    return {
        iconArea,
        icon: new ImageUI({
            imageLoadingBehavior: {
                resourceKey: undefined,
                loadingBehavior: ImageUILoadingBehavior.KEEP_AREA_RESIZE_IMAGE,
            },
            graphic: image,
            area: iconArea,
        }),
    }
}

class CreateBackgroundAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): CreateBackgroundAction {
        return new CreateBackgroundAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(
                this.dataBlob,
                "uiObjects"
            )

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        uiObjects.background = RectangleService.new({
            area: RectAreaService.new({
                left: 0,
                top: 0,
                width: ScreenDimensions.SCREEN_WIDTH,
                height: ScreenDimensions.SCREEN_HEIGHT,
            }),
            fillColor: layout.colors.background,
        })

        DataBlobService.add<TitleScreenUIElements>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }
}

class CreateTitleBannerAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): CreateTitleBannerAction {
        return new CreateTitleBannerAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(
                this.dataBlob,
                "uiObjects"
            )

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        uiObjects.titleBanner = new ImageUI({
            imageLoadingBehavior: {
                resourceKey: layout.logo.iconImageResourceKey,
                loadingBehavior:
                    ImageUILoadingBehavior.KEEP_AREA_HEIGHT_USE_ASPECT_RATIO,
            },
            area: RectAreaService.new({
                left: WINDOW_SPACING.SPACING1,
                top: WINDOW_SPACING.SPACING1,
                height:
                    ScreenDimensions.SCREEN_HEIGHT * layout.logo.screenHeight,
                width: 0,
            }),
        })

        DataBlobService.add<TitleScreenUIElements>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }
}

class CreateTitleTextAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): CreateTitleTextAction {
        return new CreateTitleTextAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(
                this.dataBlob,
                "uiObjects"
            )

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        uiObjects.titleText = TextBoxService.new({
            area: RectAreaService.new({
                startColumn: layout.title.startColumn,
                endColumn: layout.title.endColumn,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                top: ScreenDimensions.SCREEN_HEIGHT * layout.title.screenHeight,
                height: WINDOW_SPACING.SPACING4,
            }),
            text: "Lady of Arid Tranquility",
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: layout.colors.backgroundText,
        })

        DataBlobService.add<TitleScreenUIElements>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }
}

class CreateByLineAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): CreateByLineAction {
        return new CreateByLineAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(
                this.dataBlob,
                "uiObjects"
            )

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        uiObjects.byLine = TextBoxService.new({
            area: RectAreaService.new({
                startColumn: layout.byLine.startColumn,
                endColumn: layout.byLine.endColumn,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                top:
                    ScreenDimensions.SCREEN_HEIGHT * layout.byLine.screenHeight,
                bottom:
                    ScreenDimensions.SCREEN_HEIGHT *
                        layout.byLine.screenHeight +
                    WINDOW_SPACING.SPACING4,
            }),
            text: "by Chad Serrant",
            fontSize: WINDOW_SPACING.SPACING2,
            fontColor: layout.colors.backgroundText,
        })

        DataBlobService.add<TitleScreenUIElements>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }
}

class CreateGameDescriptionAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): CreateGameDescriptionAction {
        return new CreateGameDescriptionAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(
                this.dataBlob,
                "uiObjects"
            )

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        uiObjects.gameDescription = TextBoxService.new({
            area: RectAreaService.new({
                startColumn: layout.gameDescription.startColumn,
                endColumn: layout.gameDescription.endColumn,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                top:
                    ScreenDimensions.SCREEN_HEIGHT *
                    layout.gameDescription.screenHeightTop,
                bottom:
                    ScreenDimensions.SCREEN_HEIGHT *
                    layout.gameDescription.screenHeightBottom,
                margin: WINDOW_SPACING.SPACING1,
            }),
            text: layout.gameDescription.text,
            fontSize: WINDOW_SPACING.SPACING4,
            fontColor: layout.colors.descriptionText,
        })

        DataBlobService.add<TitleScreenUIElements>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }
}

class CreateVersionTextBoxAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): CreateVersionTextBoxAction {
        return new CreateVersionTextBoxAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(
                this.dataBlob,
                "uiObjects"
            )

        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.dataBlob, "context")

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        uiObjects.versionTextBox = TextBoxService.new({
            area: RectAreaService.new({
                startColumn: layout.version.startColumn,
                endColumn: layout.version.endColumn,
                screenWidth: ScreenDimensions.SCREEN_WIDTH,
                screenHeight: ScreenDimensions.SCREEN_HEIGHT,
                top: layout.version.top,
                bottom: layout.version.bottom,
                margin: WINDOW_SPACING.SPACING1,
            }),
            text: `Version ${context.version}`,
            fontSize: layout.version.fontSize,
            fontColor: layout.version.fontColor,
        })

        DataBlobService.add<TitleScreenUIElements>(
            this.dataBlob,
            "uiObjects",
            uiObjects
        )
        return true
    }
}

class ShouldCreateStartGameButtonAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): ShouldCreateStartGameButtonAction {
        return new ShouldCreateStartGameButtonAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(
                this.dataBlob,
                "uiObjects"
            )
        const graphicsContext: GraphicsBuffer = uiObjects.graphicsContext
        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        const windowIsTooSmall: boolean =
            graphicsContext.width < ScreenDimensions.SCREEN_WIDTH ||
            graphicsContext.height < ScreenDimensions.SCREEN_HEIGHT

        const playButtonHasBeenClicked: boolean =
            uiObjects.startNewGameButton &&
            uiObjects.startNewGameButton.getStatus() === ButtonStatus.ACTIVE

        switch (true) {
            case uiObjects.startNewGameButton == undefined:
                return true
            case windowIsTooSmall:
                return true
            case !playButtonHasBeenClicked &&
                uiObjects.startNewGameButton.readyLabel.textBox.text !==
                    layout.startGameButton.playGameMessage:
                return true
            default:
                return false
        }
    }
}

class CreateStartGameButtonAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): CreateStartGameButtonAction {
        return new CreateStartGameButtonAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(
                this.dataBlob,
                "uiObjects"
            )

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        const {
            buttonFontSize,
            readyLabelText,
            playButtonHorizontalAlignment,
        } = this.calculateReadyLabelText()

        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.dataBlob, "context")

        uiObjects.startNewGameButton = new Button({
            activeLabel: LabelService.new({
                text: "Now loading...",
                fillColor: layout.colors.playButtonActive,
                area: RectAreaService.new(layout.startGameButton.buttonArea),
                fontSize: buttonFontSize,
                fontColor: layout.colors.playButtonText,
                textBoxMargin: WINDOW_SPACING.SPACING1,
                horizAlign: HORIZONTAL_ALIGN.CENTER,
                vertAlign: VERTICAL_ALIGN.CENTER,
                strokeColor: layout.colors.playButtonStroke,
            }),
            readyLabel: LabelService.new({
                text: readyLabelText,
                fillColor: layout.colors.playButton,
                area: RectAreaService.new(layout.startGameButton.buttonArea),
                fontSize: buttonFontSize,
                fontColor: layout.colors.playButtonText,
                textBoxMargin: WINDOW_SPACING.SPACING1,
                horizAlign: playButtonHorizontalAlignment,
                vertAlign: VERTICAL_ALIGN.CENTER,
                strokeColor: layout.colors.playButtonStroke,
            }),
            initialStatus: ButtonStatus.READY,
            onClickHandler(
                _mouseX: number,
                _mouseY: number,
                button: Button,
                _caller: TitleScreen
            ): {} {
                if (context.menuSelection === TitleScreenMenuSelection.NONE) {
                    context.menuSelection = TitleScreenMenuSelection.NEW_GAME
                    button.setStatus(ButtonStatus.ACTIVE)
                }
                return {}
            },
        })

        return true
    }

    private calculateReadyLabelText() {
        const uiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(
                this.dataBlob,
                "uiObjects"
            )
        const graphicsContext: GraphicsBuffer = uiObjects.graphicsContext
        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        const buttonWidth =
            graphicsContext.width > ScreenDimensions.SCREEN_WIDTH
                ? ScreenDimensions.SCREEN_WIDTH
                : graphicsContext.width

        const windowIsTooSmall: boolean =
            graphicsContext.width < ScreenDimensions.SCREEN_WIDTH ||
            graphicsContext.height < ScreenDimensions.SCREEN_HEIGHT

        if (!windowIsTooSmall) {
            return {
                readyLabelText: layout.startGameButton.playGameMessage,
                buttonFontSize: WINDOW_SPACING.SPACING4,
                playButtonHorizontalAlignment: HORIZONTAL_ALIGN.CENTER,
            }
        }

        let buttonFontSize = buttonWidth / 35
        let readyLabelText = `Set browser window size to ${ScreenDimensions.SCREEN_WIDTH}x${ScreenDimensions.SCREEN_HEIGHT}\n currently ${graphicsContext.width}x${graphicsContext.height}`

        const buttonTextMinimumSize = 18
        if (buttonFontSize < buttonTextMinimumSize) {
            buttonFontSize = buttonTextMinimumSize
            readyLabelText =
                TitleScreenDesign.startGameButton.smallWindowWarning
        }

        return {
            readyLabelText,
            buttonFontSize,
            playButtonHorizontalAlignment: HORIZONTAL_ALIGN.LEFT,
        }
    }
}

// TODO Load message bug is still present, you get caught in infinite loading when you cancel

// TODO you can make this generic
class DoesUIObjectExistCondition implements BehaviorTreeTask {
    dataBlob: DataBlob
    uiObjectKey: string

    constructor(dataBlob: DataBlob, uiObjectKey: string) {
        this.dataBlob = dataBlob
        this.uiObjectKey = uiObjectKey
    }

    run(): boolean {
        // TODO Genericize the TitleScreenUIElements here
        const uiObjects = DataBlobService.get<TitleScreenUIElements>(
            this.dataBlob,
            "uiObjects"
        )
        return (
            uiObjects[this.uiObjectKey as keyof typeof uiObjects] !== undefined
        )
    }

    clone(): DoesUIObjectExistCondition {
        return new DoesUIObjectExistCondition(this.dataBlob, this.uiObjectKey)
    }
}

// TODO you can make this generic
class DoesContextExistCondition implements BehaviorTreeTask {
    dataBlob: DataBlob
    contextKey: string

    constructor(dataBlob: DataBlob, contextKey: string) {
        this.dataBlob = dataBlob
        this.contextKey = contextKey
    }

    run(): boolean {
        // TODO Genericize the TitleScreenUIElements here
        const context = DataBlobService.get<TitleScreenContext>(
            this.dataBlob,
            "context"
        )
        return context[this.contextKey as keyof typeof context] !== undefined
    }

    clone(): DoesContextExistCondition {
        return new DoesContextExistCondition(this.dataBlob, this.contextKey)
    }
}

class ShouldCreateUpdateGameButtonAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): ShouldCreateUpdateGameButtonAction {
        return new ShouldCreateUpdateGameButtonAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(
                this.dataBlob,
                "uiObjects"
            )
        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.dataBlob, "context")
        if (uiObjects.continueGameButton == undefined) {
            return true
        }

        const { buttonText, isError } = getContinueGameButtonText(context)
        if (
            isError &&
            context.errorDuringLoadingDisplayStartTimestamp == undefined
        ) {
            context.errorDuringLoadingDisplayStartTimestamp = Date.now()
        }

        let errorMessageTimeoutReached = isErrorMessageTimeoutReached(context)
        if (errorMessageTimeoutReached) {
            LoadSaveStateService.reset(context.fileState.loadSaveState)
            context.errorDuringLoadingDisplayStartTimestamp = undefined
        }

        return (
            errorMessageTimeoutReached ||
            uiObjects.continueGameButton.readyLabel.textBox.text !== buttonText
        )
    }
}

class CreateUpdateGameButtonAction implements BehaviorTreeTask {
    dataBlob: DataBlob

    constructor(data: DataBlob) {
        this.dataBlob = data
    }

    clone(): CreateUpdateGameButtonAction {
        return new CreateUpdateGameButtonAction(this.dataBlob)
    }

    run() {
        const uiObjects: TitleScreenUIElements =
            DataBlobService.get<TitleScreenUIElements>(
                this.dataBlob,
                "uiObjects"
            )

        const layout: TitleScreenLayout =
            DataBlobService.get<TitleScreenLayout>(this.dataBlob, "layout")

        const context: TitleScreenContext =
            DataBlobService.get<TitleScreenContext>(this.dataBlob, "context")
        const messageBoard = context.messageBoard
        const fileState = context.fileState

        const { buttonText } = getContinueGameButtonText(context)
        const buttonFontSize = WINDOW_SPACING.SPACING2
        const playButtonHorizontalAlignment = HORIZONTAL_ALIGN.CENTER

        uiObjects.continueGameButton = new Button({
            activeLabel: LabelService.new({
                text: "Now loading...",
                fillColor: layout.colors.playButtonActive,
                area: RectAreaService.new(layout.continueGameButton.buttonArea),
                fontSize: buttonFontSize,
                fontColor: layout.colors.playButtonText,
                textBoxMargin: WINDOW_SPACING.SPACING1,
                horizAlign: HORIZONTAL_ALIGN.CENTER,
                vertAlign: VERTICAL_ALIGN.CENTER,
                strokeColor: layout.colors.playButtonStroke,
            }),
            readyLabel: LabelService.new({
                text: buttonText,
                fillColor: layout.colors.playButton,
                area: RectAreaService.new(layout.continueGameButton.buttonArea),
                fontSize: buttonFontSize,
                fontColor: layout.colors.playButtonText,
                textBoxMargin: WINDOW_SPACING.SPACING1,
                horizAlign: playButtonHorizontalAlignment,
                vertAlign: VERTICAL_ALIGN.CENTER,
                strokeColor: layout.colors.playButtonStroke,
            }),
            initialStatus: ButtonStatus.READY,
            onClickHandler(
                _mouseX: number,
                _mouseY: number,
                button: Button,
                _caller: TitleScreen
            ): {} {
                if (context.menuSelection === TitleScreenMenuSelection.NONE) {
                    context.menuSelection =
                        TitleScreenMenuSelection.CONTINUE_GAME

                    LoadSaveStateService.reset(fileState.loadSaveState)
                    messageBoard.sendMessage({
                        type: MessageBoardMessageType.PLAYER_DATA_LOAD_USER_REQUEST,
                        loadSaveState: fileState.loadSaveState,
                    })

                    button.setStatus(ButtonStatus.ACTIVE)
                }
                return {}
            },
        })
        DataBlobService.add<TitleScreenContext>(
            this.dataBlob,
            "context",
            context
        )

        return true
    }
}

const getContinueGameButtonText = (
    context: TitleScreenContext
): { buttonText: string; isError: boolean } => {
    const didLoadingFail = (fileState: FileState): boolean => {
        const loadingFailedDueToError: boolean =
            fileState.loadSaveState.applicationErroredWhileLoading
        const userCanceledLoad: boolean =
            fileState.loadSaveState.userCanceledLoad
        return loadingFailedDueToError || userCanceledLoad
    }

    const wasLoadingEngaged = (fileState: FileState): boolean => {
        const userRequestedLoad: boolean =
            fileState.loadSaveState.userRequestedLoad === true

        return userRequestedLoad || didLoadingFail(fileState)
    }

    const userIsWaitingForLoadToFinish = (fileState: FileState): boolean => {
        const userRequestedLoad: boolean =
            fileState.loadSaveState.userRequestedLoad === true

        return userRequestedLoad && !didLoadingFail(fileState)
    }

    switch (true) {
        case !wasLoadingEngaged(context.fileState):
            return {
                buttonText: "Load file and continue",
                isError: false,
            }
        case userIsWaitingForLoadToFinish(context.fileState):
            return {
                buttonText: "Now loading...",
                isError: false,
            }
        case isErrorMessageTimeoutReached(context):
            return {
                buttonText: "Load file and continue",
                isError: false,
            }
        case context.fileState.loadSaveState.applicationErroredWhileLoading:
            return {
                buttonText: "Loading failed. Check logs.",
                isError: true,
            }
        case context.fileState.loadSaveState.userCanceledLoad:
            return {
                buttonText: `Canceled loading.`,
                isError: true,
            }
        default:
            return {
                buttonText: "unknown loading state",
                isError: true,
            }
    }
}

const isErrorMessageTimeoutReached = (context: TitleScreenContext): boolean => {
    return (
        context.errorDuringLoadingDisplayStartTimestamp !== undefined &&
        Date.now() - context.errorDuringLoadingDisplayStartTimestamp >=
            FILE_MESSAGE_DISPLAY_DURATION
    )
}
