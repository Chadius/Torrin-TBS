import {
    MockedP5GraphicsBuffer,
    mockResourceHandler,
} from "../../../utils/test/mocks"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { makeResult } from "../../../utils/ResultOrError"
import { CreateNewSquaddieAndAddToRepository } from "../../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { ActionTemplateService } from "../../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../../../action/template/actionEffectSquaddieTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { GameEngineStateService } from "../../../gameEngine/gameEngine"
import { CampaignService } from "../../../campaign/campaign"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../graphicsConstants"
import { RectAreaService } from "../../../ui/rectArea"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import {
    SquaddieSummaryPopover,
    SquaddieSummaryPopoverPosition,
    SquaddieSummaryPopoverService,
} from "./squaddieSummaryPopover"
import { WINDOW_SPACING } from "../../../ui/constants"
import { TARGET_CANCEL_BUTTON_TOP } from "../../orchestratorComponents/battlePlayerSquaddieTarget"
import { ACTOR_TEXT_WINDOW } from "../../animation/actionAnimation/actorTextWindow"

describe("squaddieSummaryPopover", () => {
    let graphicsBuffer: MockedP5GraphicsBuffer
    let objectRepository: ObjectRepository
    let panel: SquaddieSummaryPopover
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
                    panel = SquaddieSummaryPopoverService.new({
                        startingColumn: 0,
                        battleSquaddieId,
                        position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                    })
                    SquaddieSummaryPopoverService.update({
                        squaddieSummaryPopover: panel,
                        objectRepository,
                        gameEngineState,
                        resourceHandler,
                    })
                    SquaddieSummaryPopoverService.draw({
                        squaddieSummaryPopover: panel,
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

        describe("will draw at the given column", () => {
            const drawAtStartColumnColumns = [0, 1, 2, 3, 4, 5, 6, 7, 8]
            const drawAtRightSideColumns = [9, 10, 11, 12]

            it.each(drawAtStartColumnColumns)(
                `draw at given column when there is enough room`,
                (column) => {
                    let gameEngineState = GameEngineStateService.new({
                        resourceHandler,
                        repository: objectRepository,
                        campaign: CampaignService.default({}),
                    })
                    panel = SquaddieSummaryPopoverService.new({
                        battleSquaddieId: "player",
                        startingColumn: column,
                        position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                    })
                    SquaddieSummaryPopoverService.update({
                        squaddieSummaryPopover: panel,
                        objectRepository,
                        gameEngineState,
                        resourceHandler,
                    })

                    expect(panel.windowArea.left).toBeCloseTo(
                        (ScreenDimensions.SCREEN_WIDTH / 12) * column
                    )
                }
            )

            it.each(drawAtRightSideColumns)(
                `draw right aligned because there is not enough room`,
                (column) => {
                    let gameEngineState = GameEngineStateService.new({
                        resourceHandler,
                        repository: objectRepository,
                        campaign: CampaignService.default({}),
                    })
                    panel = SquaddieSummaryPopoverService.new({
                        battleSquaddieId: "player",
                        startingColumn: column,
                        position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                    })
                    SquaddieSummaryPopoverService.update({
                        squaddieSummaryPopover: panel,
                        objectRepository,
                        gameEngineState,
                        resourceHandler,
                    })

                    expect(RectAreaService.right(panel.windowArea)).toBeCloseTo(
                        ScreenDimensions.SCREEN_WIDTH
                    )
                }
            )
        })

        describe("will reposition based on the purpose", () => {
            it("defaults to selecting main position", () => {
                const popover: SquaddieSummaryPopover =
                    SquaddieSummaryPopoverService.new({
                        battleSquaddieId: "player",
                        startingColumn: 0,
                        position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                    })

                expect(popover.position).toEqual(
                    SquaddieSummaryPopoverPosition.SELECT_MAIN
                )
                expect(
                    RectAreaService.bottom(popover.windowArea)
                ).toBeGreaterThanOrEqual(
                    ScreenDimensions.SCREEN_HEIGHT - WINDOW_SPACING.SPACING1
                )
            })
            it("will change to target position when requested", () => {
                const popover: SquaddieSummaryPopover =
                    SquaddieSummaryPopoverService.new({
                        battleSquaddieId: "player",
                        startingColumn: 0,
                        position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                    })
                SquaddieSummaryPopoverService.changePopoverPosition({
                    popover,
                    position: SquaddieSummaryPopoverPosition.SELECT_TARGET,
                })

                expect(popover.position).toEqual(
                    SquaddieSummaryPopoverPosition.SELECT_TARGET
                )
                expect(
                    RectAreaService.bottom(popover.windowArea)
                ).toBeLessThanOrEqual(TARGET_CANCEL_BUTTON_TOP)
            })
            it("will change to main position when requested", () => {
                const popover: SquaddieSummaryPopover =
                    SquaddieSummaryPopoverService.new({
                        battleSquaddieId: "player",
                        startingColumn: 0,
                        position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                    })
                SquaddieSummaryPopoverService.changePopoverPosition({
                    popover,
                    position: SquaddieSummaryPopoverPosition.SELECT_TARGET,
                })
                SquaddieSummaryPopoverService.changePopoverPosition({
                    popover,
                    position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                })

                expect(popover.position).toEqual(
                    SquaddieSummaryPopoverPosition.SELECT_MAIN
                )
                expect(
                    RectAreaService.bottom(popover.windowArea)
                ).toBeGreaterThanOrEqual(
                    ScreenDimensions.SCREEN_HEIGHT - WINDOW_SPACING.SPACING1
                )
            })
            it("will can start in animate position when requested", () => {
                const popover: SquaddieSummaryPopover =
                    SquaddieSummaryPopoverService.new({
                        battleSquaddieId: "player",
                        startingColumn: 0,
                        position:
                            SquaddieSummaryPopoverPosition.ANIMATE_SQUADDIE_ACTION,
                    })
                expect(popover.position).toEqual(
                    SquaddieSummaryPopoverPosition.ANIMATE_SQUADDIE_ACTION
                )
                expect(
                    RectAreaService.bottom(popover.windowArea)
                ).toBeGreaterThanOrEqual(
                    ACTOR_TEXT_WINDOW.top + WINDOW_SPACING.SPACING1
                )
            })
        })

        it("knows when the mouse is hovering over the window", () => {
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default({}),
            })
            panel = SquaddieSummaryPopoverService.new({
                battleSquaddieId: "player",
                startingColumn: 0,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            SquaddieSummaryPopoverService.update({
                squaddieSummaryPopover: panel,
                objectRepository,
                gameEngineState,
                resourceHandler,
            })

            expect(
                SquaddieSummaryPopoverService.isMouseHoveringOver({
                    squaddieSummaryPopover: panel,
                    mouseLocation: {
                        x: panel.windowArea.left - 5,
                        y: RectAreaService.centerY(panel.windowArea),
                    },
                })
            ).toBeFalsy()

            expect(
                SquaddieSummaryPopoverService.isMouseHoveringOver({
                    squaddieSummaryPopover: panel,
                    mouseLocation: {
                        x: RectAreaService.right(panel.windowArea) + 5,
                        y: RectAreaService.centerY(panel.windowArea),
                    },
                })
            ).toBeFalsy()

            expect(
                SquaddieSummaryPopoverService.isMouseHoveringOver({
                    squaddieSummaryPopover: panel,
                    mouseLocation: {
                        x: RectAreaService.centerX(panel.windowArea),
                        y: panel.windowArea.top - 5,
                    },
                })
            ).toBeFalsy()

            expect(
                SquaddieSummaryPopoverService.isMouseHoveringOver({
                    squaddieSummaryPopover: panel,
                    mouseLocation: {
                        x: RectAreaService.centerX(panel.windowArea),
                        y: RectAreaService.bottom(panel.windowArea) + 5,
                    },
                })
            ).toBeFalsy()

            expect(
                SquaddieSummaryPopoverService.isMouseHoveringOver({
                    squaddieSummaryPopover: panel,
                    mouseLocation: {
                        x: RectAreaService.centerX(panel.windowArea),
                        y: RectAreaService.centerY(panel.windowArea),
                    },
                })
            ).toBeTruthy()
        })

        it("knows if it will expire over time", () => {
            const willExpireOverTime = SquaddieSummaryPopoverService.new({
                startingColumn: 0,
                battleSquaddieId: "squaddie",
                expirationTime: 1000,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            expect(
                SquaddieSummaryPopoverService.willExpireOverTime({
                    squaddieSummaryPopover: willExpireOverTime,
                })
            ).toBe(true)

            const willNeverExpire = SquaddieSummaryPopoverService.new({
                startingColumn: 0,
                battleSquaddieId: "squaddie",
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            expect(
                SquaddieSummaryPopoverService.willExpireOverTime({
                    squaddieSummaryPopover: willNeverExpire,
                })
            ).toBe(false)
        })
    })
})
