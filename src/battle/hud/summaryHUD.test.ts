import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    MockedP5GraphicsBuffer,
    mockResourceHandler,
} from "../../utils/test/mocks"
import { SummaryHUDState, SummaryHUDStateService } from "./summaryHUD"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { CreateNewSquaddieAndAddToRepository } from "../../utils/test/squaddie"
import { RectAreaService } from "../../ui/rectArea"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { CampaignService } from "../../campaign/campaign"
import { ResourceHandler } from "../../resource/resourceHandler"
import { ButtonStatus } from "../../ui/button"
import { SquaddieSummaryPopoverService } from "./playerActionPanel/squaddieSummaryPopover"
import { isValidValue } from "../../utils/validityCheck"
import {
    PlayerCommandSelection,
    PlayerCommandStateService,
} from "./playerCommandHUD"
import { MouseButton } from "../../utils/mouseConfig"

describe("summaryHUD", () => {
    let graphicsBuffer: MockedP5GraphicsBuffer
    let objectRepository: ObjectRepository
    let summaryHUDState: SummaryHUDState
    let resourceHandler: ResourceHandler

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        graphicsBuffer = new MockedP5GraphicsBuffer()
        resourceHandler = mockResourceHandler(graphicsBuffer)

        CreateNewSquaddieAndAddToRepository({
            name: "player",
            battleId: "player",
            templateId: "player",
            squaddieRepository: objectRepository,
            affiliation: SquaddieAffiliation.PLAYER,
            actionTemplates: [
                ActionTemplateService.new({
                    id: "actionTemplate0",
                    name: "NeedsTarget",
                    actionEffectTemplates: [
                        ActionEffectSquaddieTemplateService.new({
                            minimumRange: 2,
                            maximumRange: 3,
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    [Trait.TARGETS_FOE]: true,
                                }
                            ),
                        }),
                    ],
                }),
                ActionTemplateService.new({
                    id: "actionTemplate1",
                    name: "AlsoNeedsTarget",
                    actionEffectTemplates: [
                        ActionEffectSquaddieTemplateService.new({
                            minimumRange: 1,
                            maximumRange: 2,
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                {
                                    [Trait.TARGETS_FOE]: true,
                                }
                            ),
                        }),
                    ],
                }),
            ],
        })

        CreateNewSquaddieAndAddToRepository({
            name: "enemy",
            battleId: "enemy",
            templateId: "enemy",
            squaddieRepository: objectRepository,
            affiliation: SquaddieAffiliation.ENEMY,
        })

        CreateNewSquaddieAndAddToRepository({
            name: "ally",
            battleId: "ally",
            templateId: "ally",
            squaddieRepository: objectRepository,
            affiliation: SquaddieAffiliation.ALLY,
        })

        CreateNewSquaddieAndAddToRepository({
            name: "none",
            battleId: "none",
            templateId: "none",
            squaddieRepository: objectRepository,
            affiliation: SquaddieAffiliation.NONE,
        })
    })

    describe("will draw a window for a squaddie", () => {
        it("can draw the main summary window on the left side", () => {
            const battleSquaddieId = "player"

            const panelSpy: jest.SpyInstance = jest.spyOn(
                SquaddieSummaryPopoverService,
                "new"
            )

            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })

            summaryHUDState = SummaryHUDStateService.new({
                mouseSelectionLocation: { x: 0, y: 0 },
            })
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId,
                resourceHandler,
                objectRepository,
                gameEngineState,
                lockPopover: true,
            })

            expect(
                isValidValue(summaryHUDState.summaryPopoverMain)
            ).toBeTruthy()
            expect(
                isValidValue(summaryHUDState.summaryPopoverTarget)
            ).toBeFalsy()

            expect(panelSpy).toBeCalledWith({
                startingColumn: 0,
                battleSquaddieId,
            })
            panelSpy.mockRestore()
        })
        it("can draw the target summary window on the right side", () => {
            const battleSquaddieId = "enemy"

            const panelSpy: jest.SpyInstance = jest.spyOn(
                SquaddieSummaryPopoverService,
                "new"
            )

            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })

            summaryHUDState = SummaryHUDStateService.new({
                mouseSelectionLocation: { x: 0, y: 0 },
            })
            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId,
                resourceHandler,
                objectRepository,
                gameEngineState,
                lockPopover: true,
            })

            expect(isValidValue(summaryHUDState.summaryPopoverMain)).toBeFalsy()
            expect(
                isValidValue(summaryHUDState.summaryPopoverTarget)
            ).toBeTruthy()

            expect(panelSpy).toBeCalledWith({
                startingColumn: 9,
                battleSquaddieId,
            })
            panelSpy.mockRestore()
        })

        it("knows when the mouse is hovering over the summary window", () => {
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })
            summaryHUDState = SummaryHUDStateService.new({
                mouseSelectionLocation: { x: 0, y: 0 },
            })
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                objectRepository,
                gameEngineState,
                resourceHandler,
                battleSquaddieId: "player",
                lockPopover: true,
            })

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x:
                            summaryHUDState.summaryPopoverMain.windowArea.left -
                            5,
                        y: RectAreaService.centerY(
                            summaryHUDState.summaryPopoverMain.windowArea
                        ),
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x:
                            RectAreaService.right(
                                summaryHUDState.summaryPopoverMain.windowArea
                            ) + 5,
                        y: RectAreaService.centerY(
                            summaryHUDState.summaryPopoverMain.windowArea
                        ),
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.summaryPopoverMain.windowArea
                        ),
                        y:
                            summaryHUDState.summaryPopoverMain.windowArea.top -
                            5,
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.summaryPopoverMain.windowArea
                        ),
                        y:
                            RectAreaService.bottom(
                                summaryHUDState.summaryPopoverMain.windowArea
                            ) + 5,
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.summaryPopoverMain.windowArea
                        ),
                        y: RectAreaService.centerY(
                            summaryHUDState.summaryPopoverMain.windowArea
                        ),
                    },
                })
            ).toBeTruthy()
        })
    })

    describe("lock main summary window", () => {
        let gameEngineState: GameEngineState
        beforeEach(() => {
            gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })
        })

        it("will not change the main summary window if it is locked and the selection is not", () => {
            summaryHUDState = SummaryHUDStateService.new({
                mouseSelectionLocation: { x: 0, y: 0 },
            })
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                lockPopover: true,
            })
        })

        it("will change the main summary window if it is not locked and the selection is not", () => {})
    })

    describe("can create a playerCommandHUD based on the main panel", () => {
        let summaryHUDState: SummaryHUDState
        beforeEach(() => {
            summaryHUDState = SummaryHUDStateService.new({
                mouseSelectionLocation: { x: 0, y: 0 },
            })
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                lockPopover: true,
            })
            SummaryHUDStateService.createCommandWindow({
                summaryHUDState,
                gameEngineState,
                objectRepository,
                resourceHandler,
            })
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })
        })
        it("will create a playerCommandHUD when the squaddie is player controllable", () => {
            expect(summaryHUDState.showPlayerCommand).toBeTruthy()
            expect(summaryHUDState.playerCommandState).not.toBeUndefined()
        })
    })

    describe("playerCommandHUD selects a squaddie action", () => {
        let gameEngineState: GameEngineState
        beforeEach(() => {
            summaryHUDState = SummaryHUDStateService.new({
                mouseSelectionLocation: {
                    x: 0,
                    y: 0,
                },
            })

            gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                gameEngineState,
                objectRepository,
                resourceHandler,
                battleSquaddieId: "player",
                lockPopover: true,
            })
            SummaryHUDStateService.createCommandWindow({
                summaryHUDState,
                gameEngineState,
                objectRepository,
                resourceHandler,
            })
            SummaryHUDStateService.draw({
                summaryHUDState,
                gameEngineState,
                graphicsBuffer,
            })
        })

        it("will delegate mouseMoved events to playerCommandHUD when it is active", () => {
            const playerCommandSpy = jest.spyOn(
                PlayerCommandStateService,
                "mouseMoved"
            )
            const mouseX = RectAreaService.centerX(
                summaryHUDState.playerCommandState.actionButtons[0].buttonArea
            )
            const mouseY = RectAreaService.centerY(
                summaryHUDState.playerCommandState.actionButtons[0].buttonArea
            )

            SummaryHUDStateService.mouseMoved({
                summaryHUDState,
                mouseX,
                mouseY,
                gameEngineState,
            })
            expect(playerCommandSpy).toBeCalledWith({
                mouseX,
                mouseY,
                gameEngineState,
                playerCommandState: summaryHUDState.playerCommandState,
            })
        })

        it("will return which button was clicked on the PlayerCommandHUD", () => {
            const playerCommandSpy: jest.SpyInstance = jest.spyOn(
                PlayerCommandStateService,
                "mouseClicked"
            )

            const selection = SummaryHUDStateService.mouseClicked({
                summaryHUDState,
                mouseButton: MouseButton.ACCEPT,
                mouseX: RectAreaService.centerX(
                    summaryHUDState.playerCommandState.actionButtons[0]
                        .buttonArea
                ),
                mouseY: RectAreaService.centerY(
                    summaryHUDState.playerCommandState.actionButtons[0]
                        .buttonArea
                ),
                gameEngineState,
            })
            expect(playerCommandSpy).toBeCalled()
            expect(selection).toEqual(
                PlayerCommandSelection.PLAYER_COMMAND_SELECTION_ACTION
            )
            playerCommandSpy.mockRestore()
        })
    })
})
