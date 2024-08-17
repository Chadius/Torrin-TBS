import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    MockedP5GraphicsBuffer,
    mockResourceHandler,
} from "../../utils/test/mocks"
import {
    SummaryHUDState,
    SummaryHUDStateService,
    SummaryPopoverType,
} from "./summaryHUD"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
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
import {
    SquaddieSummaryPopoverPosition,
    SquaddieSummaryPopoverService,
} from "./playerActionPanel/squaddieSummaryPopover"
import { isValidValue } from "../../utils/validityCheck"
import {
    PlayerCommandSelection,
    PlayerCommandStateService,
} from "./playerCommandHUD"
import { MouseButton } from "../../utils/mouseConfig"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"

describe("summaryHUD", () => {
    let graphicsBuffer: MockedP5GraphicsBuffer
    let objectRepository: ObjectRepository
    let summaryHUDState: SummaryHUDState
    let resourceHandler: ResourceHandler

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        graphicsBuffer = new MockedP5GraphicsBuffer()
        resourceHandler = mockResourceHandler(graphicsBuffer)

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

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "ally",
            battleId: "ally",
            templateId: "ally",
            objectRepository: objectRepository,
            affiliation: SquaddieAffiliation.ALLY,
            actionTemplateIds: [],
        })

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "none",
            battleId: "none",
            templateId: "none",
            objectRepository: objectRepository,
            affiliation: SquaddieAffiliation.NONE,
            actionTemplateIds: [],
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
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                isValidValue(summaryHUDState.squaddieSummaryPopoversByType.MAIN)
            ).toBeTruthy()
            expect(
                isValidValue(
                    summaryHUDState.squaddieSummaryPopoversByType.TARGET
                )
            ).toBeFalsy()

            expect(panelSpy).toBeCalledWith({
                startingColumn: 0,
                battleSquaddieId,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
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
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                isValidValue(summaryHUDState.squaddieSummaryPopoversByType.MAIN)
            ).toBeFalsy()
            expect(
                isValidValue(
                    summaryHUDState.squaddieSummaryPopoversByType.TARGET
                )
            ).toBeTruthy()

            expect(panelSpy).toBeCalledWith({
                startingColumn: 9,
                battleSquaddieId,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
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
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x:
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea.left - 5,
                        y: RectAreaService.centerY(
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea
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
                                summaryHUDState.squaddieSummaryPopoversByType[
                                    SummaryPopoverType.MAIN
                                ].windowArea
                            ) + 5,
                        y: RectAreaService.centerY(
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea
                        ),
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea
                        ),
                        y:
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea.top - 5,
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea
                        ),
                        y:
                            RectAreaService.bottom(
                                summaryHUDState.squaddieSummaryPopoversByType[
                                    SummaryPopoverType.MAIN
                                ].windowArea
                            ) + 5,
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea
                        ),
                        y: RectAreaService.centerY(
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea
                        ),
                    },
                })
            ).toBeTruthy()
        })
    })

    describe("resetting expiration time", () => {
        let gameEngineState: GameEngineState
        let summaryHUDState: SummaryHUDState
        beforeEach(() => {
            gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })

            summaryHUDState = SummaryHUDStateService.new({
                mouseSelectionLocation: { x: 0, y: 0 },
            })

            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "another_player",
                battleId: "another_player",
                templateId: "another_player",
                objectRepository: objectRepository,
                affiliation: SquaddieAffiliation.PLAYER,
                actionTemplateIds: [],
            })
        })

        it("will not change the main summary popover if the current popover has no expiration time and the new one would", () => {
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "another_player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 100,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .battleSquaddieId
            ).toEqual("player")
        })

        it("will change the main summary popover if the current popover has an expiration time", () => {
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 100,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "another_player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 200,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .battleSquaddieId
            ).toEqual("another_player")
        })

        it("will not change the target summary popover if the existing one will not expire and the new one will", () => {
            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "another_player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 100,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                summaryHUDState.squaddieSummaryPopoversByType.TARGET
                    .battleSquaddieId
            ).toEqual("player")
        })

        it("will change the target summary popover if the existing will expire", () => {
            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 100,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "another_player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                summaryHUDState.squaddieSummaryPopoversByType.TARGET
                    .battleSquaddieId
            ).toEqual("another_player")
        })

        it("will change the target summary popover if the existing and new ones do not expire", () => {
            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "another_player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                summaryHUDState.squaddieSummaryPopoversByType.TARGET
                    .battleSquaddieId
            ).toEqual("another_player")
        })
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
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
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
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
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

    describe("Timed expiration", () => {
        let dateSpy: jest.SpyInstance
        let gameEngineState: GameEngineState

        beforeEach(() => {
            gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })

            dateSpy = jest.spyOn(Date, "now")
            summaryHUDState = SummaryHUDStateService.new({
                mouseSelectionLocation: {
                    x: 0,
                    y: 0,
                },
            })
        })
        afterEach(() => {
            dateSpy.mockRestore()
        })

        describe("Main Popover", () => {
            it("Does not expire if no expiration time is set", () => {
                SummaryHUDStateService.setMainSummaryPopover({
                    summaryHUDState,
                    battleSquaddieId: "player",
                    resourceHandler,
                    objectRepository,
                    gameEngineState,
                    position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                })
                dateSpy.mockReturnValue(1000)
                expect(
                    SummaryHUDStateService.hasMainSummaryPopoverExpired({
                        summaryHUDState,
                    })
                ).toBeFalsy()
                SummaryHUDStateService.removeMainSummaryPopoverIfExpired({
                    summaryHUDState,
                })
                expect(
                    summaryHUDState.squaddieSummaryPopoversByType.MAIN
                ).not.toBeUndefined()
            })
            it("Does not expire if expiration time has not been reached yet", () => {
                SummaryHUDStateService.setMainSummaryPopover({
                    summaryHUDState,
                    battleSquaddieId: "player",
                    resourceHandler,
                    objectRepository,
                    gameEngineState,
                    expirationTime: 2000,
                    position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                })
                expect(
                    summaryHUDState.squaddieSummaryPopoversByType.MAIN
                        .expirationTime
                ).toEqual(2000)
                dateSpy.mockReturnValue(1000)
                expect(
                    SummaryHUDStateService.hasMainSummaryPopoverExpired({
                        summaryHUDState,
                    })
                ).toBeFalsy()
                SummaryHUDStateService.removeMainSummaryPopoverIfExpired({
                    summaryHUDState,
                })
                expect(
                    summaryHUDState.squaddieSummaryPopoversByType.MAIN
                ).not.toBeUndefined()
            })
            it("Will expire if expiration time has been reached", () => {
                SummaryHUDStateService.setMainSummaryPopover({
                    summaryHUDState,
                    battleSquaddieId: "player",
                    resourceHandler,
                    objectRepository,
                    gameEngineState,
                    expirationTime: 999,
                    position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                })
                dateSpy.mockReturnValue(1000)
                expect(
                    SummaryHUDStateService.hasMainSummaryPopoverExpired({
                        summaryHUDState,
                    })
                ).toBeTruthy()
                SummaryHUDStateService.removeMainSummaryPopoverIfExpired({
                    summaryHUDState,
                })
                expect(
                    summaryHUDState.squaddieSummaryPopoversByType.MAIN
                ).toBeUndefined()
            })
            it("Will remove expired popovers over time", () => {
                dateSpy.mockReturnValue(0)

                SummaryHUDStateService.setMainSummaryPopover({
                    summaryHUDState,
                    battleSquaddieId: "player",
                    resourceHandler,
                    objectRepository,
                    gameEngineState,
                    expirationTime: 999,
                    position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                })
                SummaryHUDStateService.setTargetSummaryPopover({
                    summaryHUDState,
                    battleSquaddieId: "player",
                    resourceHandler,
                    objectRepository,
                    gameEngineState,
                    expirationTime: 1999,
                    position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                })
                dateSpy.mockReturnValue(1000)
                SummaryHUDStateService.draw({
                    summaryHUDState,
                    graphicsBuffer,
                    gameEngineState,
                })
                expect(
                    summaryHUDState.squaddieSummaryPopoversByType.MAIN
                ).toBeUndefined()
                expect(
                    summaryHUDState.squaddieSummaryPopoversByType.TARGET
                ).not.toBeUndefined()
                dateSpy.mockReturnValue(2000)
                SummaryHUDStateService.draw({
                    summaryHUDState,
                    graphicsBuffer,
                    gameEngineState,
                })
                expect(
                    summaryHUDState.squaddieSummaryPopoversByType.TARGET
                ).toBeUndefined()
            })
        })

        describe("Target Popover", () => {
            it("Does not expire if no expiration time is set", () => {
                SummaryHUDStateService.setTargetSummaryPopover({
                    summaryHUDState,
                    battleSquaddieId: "player",
                    resourceHandler,
                    objectRepository,
                    gameEngineState,
                    position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                })
                dateSpy.mockReturnValue(1000)
                expect(
                    SummaryHUDStateService.hasTargetSummaryPopoverExpired({
                        summaryHUDState,
                    })
                ).toBeFalsy()
                SummaryHUDStateService.removeTargetSummaryPopoverIfExpired({
                    summaryHUDState,
                })
                expect(
                    summaryHUDState.squaddieSummaryPopoversByType.TARGET
                ).not.toBeUndefined()
            })
            it("Does not expire if expiration time has not been reached yet", () => {
                SummaryHUDStateService.setTargetSummaryPopover({
                    summaryHUDState,
                    battleSquaddieId: "player",
                    resourceHandler,
                    objectRepository,
                    gameEngineState,
                    expirationTime: 2000,
                    position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                })
                expect(
                    summaryHUDState.squaddieSummaryPopoversByType.TARGET
                        .expirationTime
                ).toEqual(2000)
                dateSpy.mockReturnValue(1000)
                expect(
                    SummaryHUDStateService.hasTargetSummaryPopoverExpired({
                        summaryHUDState,
                    })
                ).toBeFalsy()
                SummaryHUDStateService.removeTargetSummaryPopoverIfExpired({
                    summaryHUDState,
                })
                expect(
                    summaryHUDState.squaddieSummaryPopoversByType.TARGET
                ).not.toBeUndefined()
            })
            it("Will expire if expiration time has been reached", () => {
                SummaryHUDStateService.setTargetSummaryPopover({
                    summaryHUDState,
                    battleSquaddieId: "player",
                    resourceHandler,
                    objectRepository,
                    gameEngineState,
                    expirationTime: 999,
                    position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                })
                dateSpy.mockReturnValue(1000)
                expect(
                    SummaryHUDStateService.hasTargetSummaryPopoverExpired({
                        summaryHUDState,
                    })
                ).toBeTruthy()
                SummaryHUDStateService.removeTargetSummaryPopoverIfExpired({
                    summaryHUDState,
                })
                expect(
                    summaryHUDState.squaddieSummaryPopoversByType.TARGET
                ).toBeUndefined()
            })
        })
    })
})
