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
import { SquaddieSummaryPanelService } from "./playerActionPanel/squaddieSummaryPanel"
import { isValidValue } from "../../utils/validityCheck"

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
        it("can draw on the left side", () => {
            const battleSquaddieId = "player"

            const panelSpy: jest.SpyInstance = jest.spyOn(
                SquaddieSummaryPanelService,
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
            SummaryHUDStateService.setLeftSummaryPanel({
                summaryHUDState,
                battleSquaddieId,
                resourceHandler,
                objectRepository,
                gameEngineState,
            })

            expect(isValidValue(summaryHUDState.summaryPanelLeft)).toBeTruthy()
            expect(isValidValue(summaryHUDState.summaryPanelRight)).toBeFalsy()

            expect(panelSpy).toBeCalledWith({
                startingColumn: 0,
                battleSquaddieId,
            })
            panelSpy.mockRestore()
        })
        it("can draw on the right side", () => {
            const battleSquaddieId = "enemy"

            const panelSpy: jest.SpyInstance = jest.spyOn(
                SquaddieSummaryPanelService,
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
            SummaryHUDStateService.setRightSummaryPanel({
                summaryHUDState,
                battleSquaddieId,
                resourceHandler,
                objectRepository,
                gameEngineState,
            })

            expect(isValidValue(summaryHUDState.summaryPanelLeft)).toBeFalsy()
            expect(isValidValue(summaryHUDState.summaryPanelRight)).toBeTruthy()

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
            SummaryHUDStateService.setLeftSummaryPanel({
                summaryHUDState,
                objectRepository,
                gameEngineState,
                resourceHandler,
                battleSquaddieId: "player",
            })

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: summaryHUDState.summaryPanelLeft.windowArea.left - 5,
                        y: RectAreaService.centerY(
                            summaryHUDState.summaryPanelLeft.windowArea
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
                                summaryHUDState.summaryPanelLeft.windowArea
                            ) + 5,
                        y: RectAreaService.centerY(
                            summaryHUDState.summaryPanelLeft.windowArea
                        ),
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.summaryPanelLeft.windowArea
                        ),
                        y: summaryHUDState.summaryPanelLeft.windowArea.top - 5,
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.summaryPanelLeft.windowArea
                        ),
                        y:
                            RectAreaService.bottom(
                                summaryHUDState.summaryPanelLeft.windowArea
                            ) + 5,
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.summaryPanelLeft.windowArea
                        ),
                        y: RectAreaService.centerY(
                            summaryHUDState.summaryPanelLeft.windowArea
                        ),
                    },
                })
            ).toBeTruthy()
        })
    })

    describe("can create a playerCommandHUD based on the left panel", () => {
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
            SummaryHUDStateService.setLeftSummaryPanel({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
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
            SummaryHUDStateService.setLeftSummaryPanel({
                summaryHUDState,
                gameEngineState,
                objectRepository,
                resourceHandler,
                battleSquaddieId: "player",
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

        it("when the mouse hovers over before clicking the button will change to HOVER state", () => {
            SummaryHUDStateService.mouseMoved({
                summaryHUDState,
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
            expect(
                summaryHUDState.playerCommandState.actionButtons[0].status
            ).toBe(ButtonStatus.HOVER)
        })

        it("when the mouse hovers over the end turn button it will change to HOVER state", () => {
            SummaryHUDStateService.mouseMoved({
                summaryHUDState,
                mouseX: RectAreaService.centerX(
                    summaryHUDState.playerCommandState.endTurnButton.buttonArea
                ),
                mouseY: RectAreaService.centerY(
                    summaryHUDState.playerCommandState.endTurnButton.buttonArea
                ),
                gameEngineState,
            })
            expect(
                summaryHUDState.playerCommandState.endTurnButton.status
            ).toBe(ButtonStatus.HOVER)
        })

        it("when the mouse hovers over the move turn button it will change to HOVER state", () => {
            SummaryHUDStateService.mouseMoved({
                summaryHUDState,
                mouseX: RectAreaService.centerX(
                    summaryHUDState.playerCommandState.moveButton.buttonArea
                ),
                mouseY: RectAreaService.centerY(
                    summaryHUDState.playerCommandState.moveButton.buttonArea
                ),
                gameEngineState,
            })
            expect(summaryHUDState.playerCommandState.moveButton.status).toBe(
                ButtonStatus.HOVER
            )
        })

        it("when the mouse hovers off of the button before clicking the button will change to ACTIVE state", () => {
            summaryHUDState.playerCommandState.actionButtons[0].status =
                ButtonStatus.HOVER
            SummaryHUDStateService.mouseMoved({
                summaryHUDState,
                mouseX:
                    RectAreaService.left(
                        summaryHUDState.playerCommandState.actionButtons[0]
                            .buttonArea
                    ) - 5,
                mouseY:
                    RectAreaService.bottom(
                        summaryHUDState.playerCommandState.actionButtons[0]
                            .buttonArea
                    ) - 5,
                gameEngineState,
            })
            expect(
                summaryHUDState.playerCommandState.actionButtons[0].status
            ).toBe(ButtonStatus.ACTIVE)
        })
    })
})
