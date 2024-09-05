import { RectArea, RectAreaService } from "../../ui/rectArea"
import { HEX_TILE_WIDTH } from "../../graphicsConstants"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import { SummaryHUDState, SummaryHUDStateService } from "./summaryHUD"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    MoveButtonPurpose,
    PlayerCommandSelection,
    PlayerCommandState,
    PlayerCommandStateService,
} from "./playerCommandHUD"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { MouseButton } from "../../utils/mouseConfig"
import { ResourceHandler } from "../../resource/resourceHandler"
import { getResultOrThrowError, makeResult } from "../../utils/ResultOrError"
import { CampaignService } from "../../campaign/campaign"
import { ButtonStatus } from "../../ui/button"
import { SquaddieSummaryPopoverPosition } from "./playerActionPanel/squaddieSummaryPopover"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"

describe("playerCommandHUD", () => {
    let graphicsBuffer: MockedP5GraphicsBuffer
    let objectRepository: ObjectRepository
    let summaryHUDState: SummaryHUDState
    let playerCommandState: PlayerCommandState
    let gameEngineState: GameEngineState
    let resourceHandler: ResourceHandler

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        graphicsBuffer = new MockedP5GraphicsBuffer()
        gameEngineState = GameEngineStateService.new({
            resourceHandler,
            repository: objectRepository,
            campaign: CampaignService.default(),
        })
        resourceHandler = mocks.mockResourceHandler(graphicsBuffer)
        resourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult(null))

        const actionTemplate0 = ActionTemplateService.new({
            id: "actionTemplate0",
            name: "NeedsTarget",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    minimumRange: 2,
                    maximumRange: 3,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.TARGETS_FOE]: true,
                    }),
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionTemplate0
        )

        const actionTemplate1 = ActionTemplateService.new({
            id: "actionTemplate1",
            name: "AlsoNeedsTarget",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    minimumRange: 1,
                    maximumRange: 2,
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.TARGETS_FOE]: true,
                    }),
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionTemplate1
        )

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "player",
            battleId: "player",
            templateId: "player",
            objectRepository: objectRepository,
            affiliation: SquaddieAffiliation.PLAYER,
            actionTemplateIds: [actionTemplate0.id, actionTemplate1.id],
        })

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "enemy",
            battleId: "enemy",
            templateId: "enemy",
            objectRepository: objectRepository,
            affiliation: SquaddieAffiliation.ENEMY,
            actionTemplateIds: [],
        })
    })

    describe("will position the playerCommandHUD near the mouse", () => {
        const test = [
            {
                mouseLocationDescription: "near top left",
                mouseLocation: [0, 0],
                expectation: (rect: RectArea) => {
                    expect(RectAreaService.top(rect)).toBeGreaterThanOrEqual(20)
                    expect(RectAreaService.top(rect)).toBeLessThan(
                        20 + HEX_TILE_WIDTH
                    )

                    expect(RectAreaService.left(rect)).toBeGreaterThanOrEqual(0)
                    expect(RectAreaService.left(rect)).toBeLessThanOrEqual(
                        HEX_TILE_WIDTH
                    )
                },
            },
            {
                mouseLocationDescription: "near top right",
                mouseLocation: [ScreenDimensions.SCREEN_WIDTH, 0],
                expectation: (rect: RectArea) => {
                    expect(RectAreaService.right(rect)).toBeGreaterThanOrEqual(
                        ScreenDimensions.SCREEN_WIDTH - HEX_TILE_WIDTH
                    )
                    expect(RectAreaService.right(rect)).toBeLessThanOrEqual(
                        ScreenDimensions.SCREEN_WIDTH
                    )
                },
            },
            {
                mouseLocationDescription: "near bottom left",
                mouseLocation: [0, ScreenDimensions.SCREEN_HEIGHT],
                expectation: (rect: RectArea) => {
                    expect(RectAreaService.bottom(rect)).toBeGreaterThanOrEqual(
                        ScreenDimensions.SCREEN_HEIGHT - HEX_TILE_WIDTH
                    )
                    expect(RectAreaService.bottom(rect)).toBeLessThanOrEqual(
                        ScreenDimensions.SCREEN_HEIGHT
                    )
                },
            },
            {
                mouseLocationDescription: "top horizontal center",
                mouseLocation: [ScreenDimensions.SCREEN_WIDTH / 2, 0],
                expectation: (rect: RectArea) => {
                    expect(RectAreaService.left(rect)).toBeGreaterThanOrEqual(
                        ScreenDimensions.SCREEN_WIDTH / 2 - HEX_TILE_WIDTH
                    )
                    expect(RectAreaService.left(rect)).toBeLessThanOrEqual(
                        ScreenDimensions.SCREEN_WIDTH / 2
                    )
                },
            },
            {
                mouseLocationDescription: "left vertical center",
                mouseLocation: [0, ScreenDimensions.SCREEN_HEIGHT / 2],
                expectation: (rect: RectArea) => {
                    expect(RectAreaService.top(rect)).toBeGreaterThanOrEqual(
                        ScreenDimensions.SCREEN_HEIGHT / 2
                    )
                    expect(RectAreaService.top(rect)).toBeLessThanOrEqual(
                        ScreenDimensions.SCREEN_HEIGHT / 2 + HEX_TILE_WIDTH
                    )
                },
            },
        ]
        it.each(test)(
            `$mouseLocationDescription`,
            ({ mouseLocation, expectation }) => {
                summaryHUDState = SummaryHUDStateService.new({
                    mouseSelectionLocation: {
                        x: mouseLocation[0],
                        y: mouseLocation[1],
                    },
                })
                let gameEngineState = GameEngineStateService.new({
                    resourceHandler,
                    repository: objectRepository,
                    campaign: CampaignService.default(),
                })
                SummaryHUDStateService.setMainSummaryPopover({
                    summaryHUDState,
                    battleSquaddieId: "player",
                    resourceHandler,
                    objectRepository,
                    gameEngineState,
                    position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                })
                SummaryHUDStateService.createCommandWindow({
                    summaryHUDState,
                    resourceHandler,
                    objectRepository,
                    gameEngineState,
                })

                SummaryHUDStateService.draw({
                    summaryHUDState,
                    graphicsBuffer,
                    gameEngineState,
                })

                expectation(
                    summaryHUDState.playerCommandState.playerCommandWindow.area
                )
            }
        )
    })

    const selectPlayer = () => {
        summaryHUDState = SummaryHUDStateService.new({
            mouseSelectionLocation: {
                x: 0,
                y: 0,
            },
        })
        SummaryHUDStateService.setMainSummaryPopover({
            summaryHUDState,
            battleSquaddieId: "player",
            resourceHandler,
            objectRepository,
            gameEngineState,
            position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
        })
        SummaryHUDStateService.createCommandWindow({
            summaryHUDState,
            resourceHandler,
            objectRepository,
            gameEngineState,
        })

        SummaryHUDStateService.draw({
            summaryHUDState,
            graphicsBuffer,
            gameEngineState,
        })
        playerCommandState = summaryHUDState.playerCommandState
    }

    const clickOnButton = ({ buttonArea }: { buttonArea: RectArea }) => {
        return PlayerCommandStateService.mouseClicked({
            mouseX: RectAreaService.centerX(buttonArea),
            mouseY: RectAreaService.centerY(buttonArea),
            mouseButton: MouseButton.ACCEPT,
            gameEngineState,
            playerCommandState,
        })
    }

    it("will indicate no button was clicked if clicked outside of range", () => {
        selectPlayer()
        const selectedButton = PlayerCommandStateService.mouseClicked({
            mouseX:
                RectAreaService.left(
                    playerCommandState.playerCommandWindow.area
                ) - 100,

            mouseY:
                RectAreaService.top(
                    playerCommandState.playerCommandWindow.area
                ) - 100,
            mouseButton: MouseButton.ACCEPT,
            gameEngineState,
            playerCommandState,
        })

        expect(selectedButton).toEqual(
            PlayerCommandSelection.PLAYER_COMMAND_SELECTION_NONE
        )
    })

    it("when the mouse hovers over before clicking the button will change to HOVER state", () => {
        PlayerCommandStateService.mouseMoved({
            playerCommandState,
            mouseX: RectAreaService.centerX(
                playerCommandState.actionButtons[0].buttonArea
            ),
            mouseY: RectAreaService.centerY(
                playerCommandState.actionButtons[0].buttonArea
            ),
            gameEngineState,
        })
        expect(summaryHUDState.playerCommandState.actionButtons[0].status).toBe(
            ButtonStatus.HOVER
        )
    })

    it("when the mouse hovers over the end turn button it will change to HOVER state", () => {
        PlayerCommandStateService.mouseMoved({
            playerCommandState,
            mouseX: RectAreaService.centerX(
                playerCommandState.endTurnButton.buttonArea
            ),
            mouseY: RectAreaService.centerY(
                playerCommandState.endTurnButton.buttonArea
            ),
            gameEngineState,
        })
        expect(playerCommandState.endTurnButton.status).toBe(ButtonStatus.HOVER)
    })

    it("when the mouse hovers over the move turn button it will change to HOVER state", () => {
        PlayerCommandStateService.mouseMoved({
            playerCommandState,
            mouseX: RectAreaService.centerX(
                playerCommandState.moveButton.buttonArea
            ),
            mouseY: RectAreaService.centerY(
                playerCommandState.moveButton.buttonArea
            ),
            gameEngineState,
        })
        expect(playerCommandState.moveButton.status).toBe(ButtonStatus.HOVER)
    })

    it("when the mouse hovers off of the button before clicking the button will change to ACTIVE state", () => {
        playerCommandState.actionButtons[0].status = ButtonStatus.HOVER
        PlayerCommandStateService.mouseMoved({
            playerCommandState,
            mouseX:
                RectAreaService.left(
                    playerCommandState.actionButtons[0].buttonArea
                ) - 5,
            mouseY:
                RectAreaService.bottom(
                    playerCommandState.actionButtons[0].buttonArea
                ) - 5,
            gameEngineState,
        })
        expect(playerCommandState.actionButtons[0].status).toBe(
            ButtonStatus.ACTIVE
        )
    })

    describe("First row of buttons", () => {
        beforeEach(() => {
            selectPlayer()
        })

        it("will display a move button first", () => {
            expect(playerCommandState.moveButton).not.toBeUndefined()
        })

        it("will display one button per action", () => {
            const { squaddieTemplate } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    "player"
                )
            )

            expect(playerCommandState.actionButtons).toHaveLength(
                squaddieTemplate.actionTemplateIds.length
            )

            const actualActionTemplatesUsed =
                playerCommandState.actionButtons.map(
                    (button) => button.actionTemplateId
                )
            expect(actualActionTemplatesUsed).toEqual(
                squaddieTemplate.actionTemplateIds
            )
        })
    })

    describe("Clicking the Move button", () => {
        beforeEach(() => {
            selectPlayer()
        })

        it("will indicate the move button was clicked", () => {
            const selectedButton = clickOnButton({
                buttonArea: playerCommandState.moveButton.buttonArea,
            })
            expect(selectedButton).toEqual(
                PlayerCommandSelection.PLAYER_COMMAND_SELECTION_MOVE
            )
        })

        it("will hide all buttons but show the reveal button if the player clicks move", () => {
            expect(playerCommandState.moveButton.onClickAction).toEqual(
                MoveButtonPurpose.HIDE
            )
            clickOnButton({
                buttonArea: playerCommandState.moveButton.buttonArea,
            })

            expect(playerCommandState.moveButton.onClickAction).toEqual(
                MoveButtonPurpose.SHOW
            )

            clickOnButton({
                buttonArea: playerCommandState.actionButtons[0].buttonArea,
            })

            expect(playerCommandState.playerSelectedSquaddieAction).toBeFalsy()
            expect(playerCommandState.selectedActionTemplateId).toBeUndefined()
        })

        it("will hide the reveal button and show other buttons if the player clicks reveal", () => {
            expect(playerCommandState.moveButton.onClickAction).toEqual(
                MoveButtonPurpose.HIDE
            )
            clickOnButton({
                buttonArea: playerCommandState.moveButton.buttonArea,
            })
            clickOnButton({
                buttonArea: playerCommandState.moveButton.buttonArea,
            })

            expect(playerCommandState.moveButton.onClickAction).toEqual(
                MoveButtonPurpose.HIDE
            )

            clickOnButton({
                buttonArea: playerCommandState.actionButtons[0].buttonArea,
            })
            expect(playerCommandState.playerSelectedSquaddieAction).toBeTruthy()
        })
    })

    describe("action buttons", () => {
        beforeEach(() => {
            selectPlayer()
        })

        it("will select the action if the player selects an action", () => {
            clickOnButton({
                buttonArea: playerCommandState.actionButtons[0].buttonArea,
            })

            expect(playerCommandState.playerSelectedSquaddieAction).toBeTruthy()
            expect(playerCommandState.selectedActionTemplateId).toEqual(
                "actionTemplate0"
            )

            expect(playerCommandState.playerSelectedEndTurn).toBeFalsy()
            expect(playerCommandState.playerSelectedSquaddieAction).toBeTruthy()
            expect(playerCommandState.selectedActionTemplateId).toEqual(
                "actionTemplate0"
            )
        })

        it("will indicate the action button was clicked", () => {
            const selectedButton = clickOnButton({
                buttonArea: playerCommandState.actionButtons[0].buttonArea,
            })
            expect(selectedButton).toEqual(
                PlayerCommandSelection.PLAYER_COMMAND_SELECTION_ACTION
            )
        })
    })

    describe("Second row of buttons", () => {
        beforeEach(() => {
            selectPlayer()
        })

        it("will display an end turn button", () => {
            expect(playerCommandState.endTurnButton).not.toBeUndefined()
        })

        it("will signal an end turn if the player selects it", () => {
            clickOnButton({
                buttonArea: playerCommandState.endTurnButton.buttonArea,
            })
            expect(playerCommandState.playerSelectedSquaddieAction).toBeFalsy()
            expect(playerCommandState.selectedActionTemplateId).toBeUndefined()
            expect(playerCommandState.playerSelectedEndTurn).toBeTruthy()

            expect(playerCommandState.playerSelectedEndTurn).toBeTruthy()
            expect(playerCommandState.playerSelectedSquaddieAction).toBeFalsy()
        })

        it("will indicate if the end turn button was clicked", () => {
            const selectedButton = clickOnButton({
                buttonArea: playerCommandState.endTurnButton.buttonArea,
            })
            expect(selectedButton).toEqual(
                PlayerCommandSelection.PLAYER_COMMAND_SELECTION_END_TURN
            )
        })
    })
})
