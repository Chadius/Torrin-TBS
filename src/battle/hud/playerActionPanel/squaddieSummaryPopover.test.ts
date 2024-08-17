import {
    MockedP5GraphicsBuffer,
    mockResourceHandler,
} from "../../../utils/test/mocks"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { ResourceHandler } from "../../../resource/resourceHandler"
import { getResultOrThrowError, makeResult } from "../../../utils/ResultOrError"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { ActionTemplateService } from "../../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../../../action/template/actionEffectSquaddieTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngine"
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
import {
    AttributeModifierService,
    AttributeSource,
    AttributeType,
} from "../../../squaddie/attributeModifier"
import { InBattleAttributesService } from "../../stats/inBattleAttributes"
import { BattleSquaddie } from "../../battleSquaddie"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"

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

        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            ActionTemplateService.new({
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
        )

        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            ActionTemplateService.new({
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
        )

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "player",
            battleId: "player",
            templateId: "player",
            objectRepository: objectRepository,
            affiliation: SquaddieAffiliation.PLAYER,
            actionTemplateIds: ["actionTemplate0", "actionTemplate1"],
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

    describe("will draw icons for buffs", () => {
        let resourceSpy: jest.SpyInstance
        let drawSpy: jest.SpyInstance
        let textSpy: jest.SpyInstance
        const armorAttributeIcon = "attribute-icon-armor"

        beforeEach(() => {
            drawSpy = jest.spyOn(graphicsBuffer, "image")
            textSpy = jest.spyOn(graphicsBuffer, "text")
        })

        afterEach(() => {
            resourceSpy.mockRestore()
            drawSpy.mockRestore()
            textSpy.mockRestore()
        })

        describe("will draw an icon if the squaddie has buffs", () => {
            const drawAttributeTests = [
                {
                    name: "Armor",
                    attributeType: AttributeType.ARMOR,
                    expectedIconKey: armorAttributeIcon,
                },
            ]

            it.each(drawAttributeTests)(
                `$name`,
                ({ attributeType, expectedIconKey }) => {
                    let fakeImage = { width: 1, height: 1 }
                    resourceHandler.getResource = jest
                        .fn()
                        .mockReturnValue(makeResult(fakeImage))
                    resourceSpy = jest.spyOn(resourceHandler, "getResource")

                    let gameEngineState = GameEngineStateService.new({
                        resourceHandler,
                        repository: objectRepository,
                        campaign: CampaignService.default({}),
                    })
                    const { battleSquaddie } = getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            objectRepository,
                            "player"
                        )
                    )

                    InBattleAttributesService.addActiveAttributeModifier(
                        battleSquaddie.inBattleAttributes,
                        AttributeModifierService.new({
                            type: attributeType,
                            source: AttributeSource.CIRCUMSTANCE,
                            amount: 1,
                        })
                    )

                    panel = SquaddieSummaryPopoverService.new({
                        startingColumn: 0,
                        battleSquaddieId: battleSquaddie.battleSquaddieId,
                        position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                    })
                    SquaddieSummaryPopoverService.update({
                        squaddieSummaryPopover: panel,
                        objectRepository,
                        gameEngineState,
                        resourceHandler,
                    })

                    expect(resourceSpy).toBeCalledWith(expectedIconKey)

                    SquaddieSummaryPopoverService.draw({
                        squaddieSummaryPopover: panel,
                        graphicsBuffer,
                        gameEngineState,
                    })

                    expect(drawSpy).toBeCalled()
                    const drawSpyCalls = drawSpy.mock.calls
                    expect(
                        drawSpyCalls.some(
                            (call) =>
                                getResultOrThrowError(call[0]) === fakeImage
                        )
                    ).toBeTruthy()
                }
            )
        })

        describe("will draw comparison icons to show the amount of an attribute modifier", () => {
            const drawAmountTests: {
                name: string
                amount: number
                expectedNumberOfComparisonIcons: number
                expectedComparisonIconResourceKey: string
                expectedText?: string
            }[] = [
                {
                    name: "+1",
                    amount: 1,
                    expectedNumberOfComparisonIcons: 1,
                    expectedComparisonIconResourceKey: "attribute-up",
                    expectedText: undefined,
                },
                {
                    name: "+2",
                    amount: 2,
                    expectedNumberOfComparisonIcons: 2,
                    expectedComparisonIconResourceKey: "attribute-up",
                    expectedText: undefined,
                },
                {
                    name: "-1",
                    amount: -1,
                    expectedNumberOfComparisonIcons: 1,
                    expectedComparisonIconResourceKey: "attribute-down",
                    expectedText: undefined,
                },
                {
                    name: "-4",
                    amount: -4,
                    expectedNumberOfComparisonIcons: 4,
                    expectedComparisonIconResourceKey: "attribute-down",
                    expectedText: undefined,
                },
                {
                    name: "-5",
                    amount: -5,
                    expectedNumberOfComparisonIcons: 1,
                    expectedComparisonIconResourceKey: "attribute-down",
                    expectedText: "-5",
                },
                {
                    name: "+5",
                    amount: 5,
                    expectedNumberOfComparisonIcons: 1,
                    expectedComparisonIconResourceKey: "attribute-up",
                    expectedText: "+5",
                },
            ]

            it.each(drawAmountTests)(
                `$name`,
                ({
                    amount,
                    expectedNumberOfComparisonIcons,
                    expectedText,
                    expectedComparisonIconResourceKey,
                }) => {
                    expect(amount).not.toEqual(0)

                    let fakeAttributeImage = { width: 1, height: 1 }
                    let fakeComparisonImage = { width: 2, height: 2 }
                    resourceHandler.getResource = jest
                        .fn()
                        .mockImplementation((key) => {
                            if (key === armorAttributeIcon) {
                                return makeResult(fakeAttributeImage)
                            }
                            return makeResult(fakeComparisonImage)
                        })
                    resourceSpy = jest.spyOn(resourceHandler, "getResource")

                    let gameEngineState = GameEngineStateService.new({
                        resourceHandler,
                        repository: objectRepository,
                        campaign: CampaignService.default({}),
                    })
                    const { battleSquaddie } = getResultOrThrowError(
                        ObjectRepositoryService.getSquaddieByBattleId(
                            objectRepository,
                            "player"
                        )
                    )

                    InBattleAttributesService.addActiveAttributeModifier(
                        battleSquaddie.inBattleAttributes,
                        AttributeModifierService.new({
                            type: AttributeType.ARMOR,
                            source: AttributeSource.CIRCUMSTANCE,
                            amount,
                        })
                    )

                    panel = SquaddieSummaryPopoverService.new({
                        startingColumn: 0,
                        battleSquaddieId: battleSquaddie.battleSquaddieId,
                        position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                    })
                    SquaddieSummaryPopoverService.update({
                        squaddieSummaryPopover: panel,
                        objectRepository,
                        gameEngineState,
                        resourceHandler,
                    })

                    expect(resourceSpy).toBeCalledWith(
                        expectedComparisonIconResourceKey
                    )

                    SquaddieSummaryPopoverService.draw({
                        squaddieSummaryPopover: panel,
                        graphicsBuffer,
                        gameEngineState,
                    })

                    expect(drawSpy).toBeCalled()
                    const drawSpyCalls = drawSpy.mock.calls
                    expect(
                        drawSpyCalls.filter(
                            (call) =>
                                (
                                    getResultOrThrowError(call[0]) as {
                                        width: number
                                        height: number
                                    }
                                ).width === fakeComparisonImage.width
                        )
                    ).toHaveLength(expectedNumberOfComparisonIcons)

                    if (expectedText === undefined) {
                        return
                    }
                    expect(textSpy).toBeCalled()
                    const textSpyCalls = textSpy.mock.calls
                    expect(
                        textSpyCalls.some((call) => call[0] === expectedText)
                    ).toBeTruthy()
                }
            )
        })

        describe("maintain icons since previous update", () => {
            let gameEngineState: GameEngineState
            let battleSquaddie: BattleSquaddie
            let fakeAttributeImage = {
                width: 1,
                height: 1,
            }
            let fakeComparisonImage = {
                width: 2,
                height: 2,
            }

            beforeEach(() => {
                gameEngineState = GameEngineStateService.new({
                    resourceHandler,
                    repository: objectRepository,
                    campaign: CampaignService.default({}),
                })
                ;({ battleSquaddie } = getResultOrThrowError(
                    ObjectRepositoryService.getSquaddieByBattleId(
                        objectRepository,
                        "player"
                    )
                ))

                InBattleAttributesService.addActiveAttributeModifier(
                    battleSquaddie.inBattleAttributes,
                    AttributeModifierService.new({
                        type: AttributeType.ARMOR,
                        source: AttributeSource.CIRCUMSTANCE,
                        amount: 1,
                        duration: 1,
                    })
                )

                panel = SquaddieSummaryPopoverService.new({
                    startingColumn: 0,
                    battleSquaddieId: battleSquaddie.battleSquaddieId,
                    position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
                })
                SquaddieSummaryPopoverService.update({
                    squaddieSummaryPopover: panel,
                    objectRepository,
                    gameEngineState,
                    resourceHandler,
                })
                resourceHandler.getResource = jest
                    .fn()
                    .mockImplementation((key) => {
                        if (key.includes("attribute-icon")) {
                            return makeResult(fakeAttributeImage)
                        }
                        return makeResult(fakeComparisonImage)
                    })
                resourceSpy = jest.spyOn(resourceHandler, "getResource")
            })
            it("will not recreate icons if the attribute modifier totals have not changed", () => {
                InBattleAttributesService.addActiveAttributeModifier(
                    battleSquaddie.inBattleAttributes,
                    AttributeModifierService.new({
                        type: AttributeType.ARMOR,
                        source: AttributeSource.CIRCUMSTANCE,
                        amount: 1,
                    })
                )

                SquaddieSummaryPopoverService.update({
                    squaddieSummaryPopover: panel,
                    objectRepository,
                    gameEngineState,
                    resourceHandler,
                })

                expect(resourceSpy).not.toHaveBeenCalled()
                SquaddieSummaryPopoverService.draw({
                    squaddieSummaryPopover: panel,
                    graphicsBuffer,
                    gameEngineState,
                })

                expect(drawSpy).toBeCalled()
                const drawSpyCalls = drawSpy.mock.calls
                expect(
                    drawSpyCalls.some(
                        (call) =>
                            (
                                getResultOrThrowError(call[0]) as {
                                    width: number
                                    height: number
                                }
                            ).width === fakeAttributeImage.width
                    )
                ).toBeTruthy()
            })
            it("will recreate icons if the duration has changed", () => {
                InBattleAttributesService.addActiveAttributeModifier(
                    battleSquaddie.inBattleAttributes,
                    AttributeModifierService.new({
                        type: AttributeType.ARMOR,
                        source: AttributeSource.STATUS,
                        amount: 1,
                    })
                )

                SquaddieSummaryPopoverService.update({
                    squaddieSummaryPopover: panel,
                    objectRepository,
                    gameEngineState,
                    resourceHandler,
                })

                expect(resourceSpy).toHaveBeenCalled()

                SquaddieSummaryPopoverService.draw({
                    squaddieSummaryPopover: panel,
                    graphicsBuffer,
                    gameEngineState,
                })

                expect(drawSpy).toBeCalled()
                const drawSpyCalls = drawSpy.mock.calls
                expect(
                    drawSpyCalls.some(
                        (call) =>
                            (
                                getResultOrThrowError(call[0]) as {
                                    width: number
                                    height: number
                                }
                            ).width === fakeAttributeImage.width
                    )
                ).toBeTruthy()
            })
            it("will remove icons if the duration expires", () => {
                InBattleAttributesService.decreaseModifiersBy1Round(
                    battleSquaddie.inBattleAttributes
                )

                SquaddieSummaryPopoverService.update({
                    squaddieSummaryPopover: panel,
                    objectRepository,
                    gameEngineState,
                    resourceHandler,
                })

                expect(resourceSpy).not.toHaveBeenCalled()
                SquaddieSummaryPopoverService.draw({
                    squaddieSummaryPopover: panel,
                    graphicsBuffer,
                    gameEngineState,
                })

                expect(drawSpy).not.toBeCalled()
            })
        })
    })
})
