import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../graphicsConstants"
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
import { getResultOrThrowError, makeResult } from "../../utils/ResultOrError"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { CampaignService } from "../../campaign/campaign"
import { ResourceHandler } from "../../resource/resourceHandler"
import { ButtonStatus } from "../../ui/button"

describe("summaryHUD", () => {
    let graphicsBuffer: MockedP5GraphicsBuffer
    let objectRepository: ObjectRepository
    let summaryHUDState: SummaryHUDState
    let resourceHandler: ResourceHandler

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        graphicsBuffer = new MockedP5GraphicsBuffer()
        resourceHandler = mockResourceHandler(graphicsBuffer)
        resourceHandler.areAllResourcesLoaded = jest
            .fn()
            .mockReturnValueOnce(true)
        resourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult({ width: 1, height: 1 }))

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
        describe("will draw a rectangle of the squaddie affiliation's color", () => {
            const tests = [
                {
                    battleSquaddieId: "player",
                    affiliation: SquaddieAffiliation.PLAYER,
                },
                {
                    battleSquaddieId: "enemy",
                    affiliation: SquaddieAffiliation.ENEMY,
                },
                {
                    battleSquaddieId: "ally",
                    affiliation: SquaddieAffiliation.ALLY,
                },
                {
                    battleSquaddieId: "none",
                    affiliation: SquaddieAffiliation.NONE,
                },
            ]

            it.each(tests)(
                `$affiliation generates a background color`,
                ({ affiliation, battleSquaddieId }) => {
                    let fillSpy: jest.SpyInstance = jest.spyOn(
                        graphicsBuffer,
                        "fill"
                    )
                    let rectSpy: jest.SpyInstance = jest.spyOn(
                        graphicsBuffer,
                        "rect"
                    )

                    let gameEngineState = GameEngineStateService.new({
                        resourceHandler,
                        repository: objectRepository,
                        campaign: CampaignService.default({}),
                    })
                    summaryHUDState = SummaryHUDStateService.new({
                        battleSquaddieId,
                        mouseSelectionLocation: { x: 0, y: 0 },
                    })
                    SummaryHUDStateService.update({
                        summaryHUDState,
                        objectRepository,
                        gameEngineState,
                        resourceHandler,
                    })
                    expect(summaryHUDState.showSummaryHUD).toBeTruthy()
                    SummaryHUDStateService.draw({
                        summaryHUDState,
                        graphicsBuffer,
                        gameEngineState,
                    })

                    expect(fillSpy).toBeCalledWith(
                        HUE_BY_SQUADDIE_AFFILIATION[affiliation],
                        expect.anything(),
                        expect.anything()
                    )
                    expect(rectSpy).toBeCalled()
                    fillSpy.mockRestore()
                    rectSpy.mockRestore()
                }
            )
        })

        it("knows when the mouse is hovering over the summary window", () => {
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })
            summaryHUDState = SummaryHUDStateService.new({
                battleSquaddieId: "player",
                mouseSelectionLocation: { x: 0, y: 0 },
            })
            SummaryHUDStateService.update({
                summaryHUDState,
                objectRepository,
                gameEngineState,
                resourceHandler,
            })

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: summaryHUDState.summaryWindow.area.left - 5,
                        y: RectAreaService.centerY(
                            summaryHUDState.summaryWindow.area
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
                                summaryHUDState.summaryWindow.area
                            ) + 5,
                        y: RectAreaService.centerY(
                            summaryHUDState.summaryWindow.area
                        ),
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.summaryWindow.area
                        ),
                        y: summaryHUDState.summaryWindow.area.top - 5,
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.summaryWindow.area
                        ),
                        y:
                            RectAreaService.bottom(
                                summaryHUDState.summaryWindow.area
                            ) + 5,
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.summaryWindow.area
                        ),
                        y: RectAreaService.centerY(
                            summaryHUDState.summaryWindow.area
                        ),
                    },
                })
            ).toBeTruthy()
        })
    })

    describe("will create a playerCommandHUD when the squaddie is player controllable", () => {
        let summaryHUDState: SummaryHUDState
        beforeEach(() => {
            summaryHUDState = SummaryHUDStateService.new({
                battleSquaddieId: "player",
                mouseSelectionLocation: { x: 0, y: 0 },
            })
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })
            SummaryHUDStateService.update({
                objectRepository,
                summaryHUDState,
                gameEngineState,
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
                battleSquaddieId: "player",
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
            SummaryHUDStateService.update({
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

    describe("will not draw command window when the squaddie is not expected to be controllable", () => {
        it("squaddie is from an enemy affiliation", () => {
            const { battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    "enemy"
                )
            )
            SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)

            summaryHUDState = SummaryHUDStateService.new({
                battleSquaddieId: "enemy",
                mouseSelectionLocation: { x: 0, y: 0 },
            })
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })
            SummaryHUDStateService.update({
                objectRepository,
                summaryHUDState,
                gameEngineState,
                resourceHandler,
            })
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })
            expect(summaryHUDState.showSummaryHUD).toBeTruthy()
            expect(summaryHUDState.showPlayerCommand).toBeFalsy()
        })
        it("squaddie has no actions", () => {
            const { battleSquaddie } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    objectRepository,
                    "player"
                )
            )
            SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)

            summaryHUDState = SummaryHUDStateService.new({
                battleSquaddieId: "player",
                mouseSelectionLocation: { x: 0, y: 0 },
            })
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })
            SummaryHUDStateService.update({
                objectRepository,
                summaryHUDState,
                gameEngineState,
                resourceHandler,
            })
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })
            expect(summaryHUDState.showSummaryHUD).toBeTruthy()
            expect(summaryHUDState.showPlayerCommand).toBeFalsy()
        })
    })
})
