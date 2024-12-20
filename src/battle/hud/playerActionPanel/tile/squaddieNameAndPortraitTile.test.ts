import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../../objectRepository"
import { SquaddieAffiliation } from "../../../../squaddie/squaddieAffiliation"
import { SquaddieTemplateService } from "../../../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../../../squaddie/id"
import { BattleSquaddieService } from "../../../battleSquaddie"
import {
    SquaddieNameAndPortraitTile,
    SquaddieNameAndPortraitTileService,
} from "./squaddieNameAndPortraitTile"
import { SquaddieResourceService } from "../../../../squaddie/resource"
import { SquaddieEmotion } from "../../../animation/actionAnimation/actionAnimationConstants"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../../../battleSquaddieTeam"
import * as mocks from "../../../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../../../utils/test/mocks"
import { ResourceHandler } from "../../../../resource/resourceHandler"
import { RectAreaService } from "../../../../ui/rectArea"
import { ScreenDimensions } from "../../../../utils/graphics/graphicsConfig"
import { WINDOW_SPACING } from "../../../../ui/constants"
import { HUE_BY_SQUADDIE_AFFILIATION } from "../../../../graphicsConstants"
import { ActionTilePosition } from "./actionTilePosition"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"

describe("Squaddie Name and Portrait Tile", () => {
    let objectRepository: ObjectRepository

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
    })

    it("Can read a squaddie to populate all of its needed fields", () => {
        const squaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                templateId: "JoeTheSoldier",
                name: "Joe the Soldier",
                affiliation: SquaddieAffiliation.PLAYER,
                resources: SquaddieResourceService.new({
                    actionSpritesByEmotion: {
                        [SquaddieEmotion.NEUTRAL]: "portrait-joe-the-soldier",
                    },
                }),
            }),
        })

        const battleSquaddie = BattleSquaddieService.new({
            battleSquaddieId: "battleJoeTheSoldier",
            squaddieTemplateId: "JoeTheSoldier",
        })

        ObjectRepositoryService.addSquaddie(
            objectRepository,
            squaddieTemplate,
            battleSquaddie
        )

        const tile: SquaddieNameAndPortraitTile =
            SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
                objectRepository,
                battleSquaddieId: "battleJoeTheSoldier",
                team: undefined,
                horizontalPosition: ActionTilePosition.ACTOR_NAME,
            })

        expect(tile.squaddieName).toBe("Joe the Soldier")
        expect(tile.squaddiePortraitResourceKey).toBe(
            "portrait-joe-the-soldier"
        )
    })

    it("Will use the squaddie's affiliation icon if they do not have a portrait icon", () => {
        const squaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                templateId: "GenericEnemy",
                name: "Generic Enemy",
                affiliation: SquaddieAffiliation.ENEMY,
            }),
        })

        const battleSquaddie = BattleSquaddieService.new({
            battleSquaddieId: "generic_enemy_1",
            squaddieTemplateId: "GenericEnemy",
        })

        ObjectRepositoryService.addSquaddie(
            objectRepository,
            squaddieTemplate,
            battleSquaddie
        )

        const enemyTeam: BattleSquaddieTeam = BattleSquaddieTeamService.new({
            id: "the bad guys",
            affiliation: SquaddieAffiliation.ENEMY,
            name: "the bad guys",
            battleSquaddieIds: [battleSquaddie.battleSquaddieId],
            iconResourceKey: "affiliate-bad-guys-icon",
        })

        const tile: SquaddieNameAndPortraitTile =
            SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
                objectRepository,
                battleSquaddieId: "generic_enemy_1",
                team: enemyTeam,
                horizontalPosition: ActionTilePosition.ACTOR_NAME,
            })

        expect(tile.squaddieName).toBe("Generic Enemy")
        expect(tile.squaddiePortraitResourceKey).toBe("affiliate-bad-guys-icon")
    })

    describe("background color set by affiliation", () => {
        let tile: SquaddieNameAndPortraitTile
        let resourceHandler: ResourceHandler
        let mockP5GraphicsContext: MockedP5GraphicsBuffer
        let graphicsBufferSpies: { [key: string]: MockInstance }

        const tests = [
            {
                affiliation: SquaddieAffiliation.PLAYER,
            },
        ]

        beforeEach(() => {
            mockP5GraphicsContext = new MockedP5GraphicsBuffer()
            resourceHandler = mocks.mockResourceHandler(mockP5GraphicsContext)
            resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(false)
            resourceHandler.loadResource = vi.fn().mockImplementation(() => {})
            graphicsBufferSpies = {}
            graphicsBufferSpies["text"] = vi
                .spyOn(mockP5GraphicsContext, "text")
                .mockReturnValue()
            graphicsBufferSpies["image"] = vi
                .spyOn(mockP5GraphicsContext, "image")
                .mockReturnValue()
            graphicsBufferSpies["rect"] = vi
                .spyOn(mockP5GraphicsContext, "rect")
                .mockReturnValue()
            graphicsBufferSpies["fill"] = vi
                .spyOn(mockP5GraphicsContext, "fill")
                .mockReturnValue()
            graphicsBufferSpies["textWidth"] = vi
                .spyOn(mockP5GraphicsContext, "textWidth")
                .mockReturnValue(10)
        })

        afterEach(() => {
            resetSpies(graphicsBufferSpies)
        })

        it.each(tests)(`$affiliation`, ({ affiliation }) => {
            ;({ tile, objectRepository } = createSquaddieOfGivenAffiliation({
                objectRepository,
                affiliation,
                tile,
            }))

            SquaddieNameAndPortraitTileService.draw({
                tile: tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(graphicsBufferSpies["rect"]).toBeCalled()
            expect(graphicsBufferSpies["fill"]).toBeCalledWith(
                HUE_BY_SQUADDIE_AFFILIATION[affiliation],
                expect.anything(),
                expect.anything()
            )

            resetSpies(graphicsBufferSpies)
        })
    })

    describe("portrait", () => {
        let tile: SquaddieNameAndPortraitTile
        let resourceHandler: ResourceHandler
        let mockP5GraphicsContext: MockedP5GraphicsBuffer
        let graphicsBufferSpies: { [key: string]: MockInstance }

        beforeEach(() => {
            ;({ tile, objectRepository } = createSquaddieOfGivenAffiliation({
                objectRepository,
                tile,
            }))

            mockP5GraphicsContext = new MockedP5GraphicsBuffer()
            resourceHandler = mocks.mockResourceHandler(mockP5GraphicsContext)
            resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(false)
            resourceHandler.loadResource = vi.fn().mockImplementation(() => {})
            graphicsBufferSpies = {}
            graphicsBufferSpies["textWidth"] = vi
                .spyOn(mockP5GraphicsContext, "textWidth")
                .mockReturnValue(10)
        })

        afterEach(() => {
            resetSpies(graphicsBufferSpies)
        })

        describe("drawing", () => {
            beforeEach(() => {
                resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(true)
                resourceHandler.getResource = vi
                    .fn()
                    .mockReturnValue({ width: 32, height: 32 })
                graphicsBufferSpies["image"] = vi.spyOn(
                    mockP5GraphicsContext,
                    "image"
                )
                graphicsBufferSpies["textWidth"] = vi
                    .spyOn(mockP5GraphicsContext, "textWidth")
                    .mockReturnValue(10)

                SquaddieNameAndPortraitTileService.draw({
                    tile: tile,
                    graphicsContext: mockP5GraphicsContext,
                    resourceHandler,
                })
            })

            it("positions the image against the bottom of the screen", () => {
                expect(
                    RectAreaService.centerX(tile.portraitImage.drawArea)
                ).toBeCloseTo(ScreenDimensions.SCREEN_WIDTH / 24)

                expect(
                    RectAreaService.bottom(tile.portraitImage.drawArea)
                ).toBeCloseTo(ScreenDimensions.SCREEN_HEIGHT)
            })

            it("tries to draw the imageUI", () => {
                expect(graphicsBufferSpies["image"]).toBeCalled()
            })
        })
    })

    describe("squaddie name", () => {
        let tile: SquaddieNameAndPortraitTile
        let resourceHandler: ResourceHandler
        let mockP5GraphicsContext: MockedP5GraphicsBuffer
        let graphicsBufferSpies: { [key: string]: MockInstance }

        beforeEach(() => {
            ;({ tile, objectRepository } = createSquaddieOfGivenAffiliation({
                objectRepository,
                tile,
            }))

            mockP5GraphicsContext = new MockedP5GraphicsBuffer()
            resourceHandler = mocks.mockResourceHandler(mockP5GraphicsContext)
            resourceHandler.isResourceLoaded = vi.fn().mockReturnValue(false)
            resourceHandler.loadResource = vi.fn().mockImplementation(() => {})
            graphicsBufferSpies = {}
            graphicsBufferSpies["text"] = vi.spyOn(
                mockP5GraphicsContext,
                "text"
            )
            graphicsBufferSpies["textWidth"] = vi
                .spyOn(mockP5GraphicsContext, "textWidth")
                .mockReturnValue(10)
        })

        afterEach(() => {
            resetSpies(graphicsBufferSpies)
        })

        it("does not create the text until we try to draw", () => {
            graphicsBufferSpies["textWidth"] = vi
                .spyOn(mockP5GraphicsContext, "textWidth")
                .mockReturnValue(10)

            expect(tile.squaddieNameTextBox).toBeUndefined()
            SquaddieNameAndPortraitTileService.draw({
                tile: tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })
            expect(tile.squaddieNameTextBox).not.toBeUndefined()
        })

        it("positions the text on top near the left corner", () => {
            const boundingBox =
                SquaddieNameAndPortraitTileService.getBoundingBoxBasedOnActionPanelPosition(
                    ActionTilePosition.ACTOR_NAME
                )

            SquaddieNameAndPortraitTileService.draw({
                tile: tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(
                RectAreaService.top(tile.squaddieNameTextBox.area)
            ).toBeCloseTo(
                ScreenDimensions.SCREEN_HEIGHT -
                    RectAreaService.height(boundingBox) +
                    WINDOW_SPACING.SPACING1
            )

            expect(
                RectAreaService.left(tile.squaddieNameTextBox.area)
            ).toBeCloseTo(
                RectAreaService.left(boundingBox) + WINDOW_SPACING.SPACING1
            )
        })

        it("tries to draw the text", () => {
            SquaddieNameAndPortraitTileService.draw({
                tile: tile,
                graphicsContext: mockP5GraphicsContext,
                resourceHandler,
            })

            expect(graphicsBufferSpies["text"]).toBeCalled()
        })
    })
})

const resetSpies = (spies: { [key: string]: MockInstance }) => {
    Object.values(spies ?? {}).forEach((spy) => {
        spy.mockRestore()
    })
}

const createSquaddieOfGivenAffiliation = ({
    objectRepository,
    tile,
    affiliation,
}: {
    objectRepository: ObjectRepository
    tile: SquaddieNameAndPortraitTile
    affiliation?: SquaddieAffiliation
}) => {
    objectRepository = ObjectRepositoryService.new()
    const squaddieTemplate = SquaddieTemplateService.new({
        squaddieId: SquaddieIdService.new({
            templateId: "JoeTheSoldier",
            name: "Joe the Soldier",
            affiliation: affiliation ?? SquaddieAffiliation.PLAYER,
            resources: SquaddieResourceService.new({
                actionSpritesByEmotion: {
                    [SquaddieEmotion.NEUTRAL]: "portrait-joe-the-soldier",
                },
            }),
        }),
    })
    const battleSquaddie = BattleSquaddieService.new({
        battleSquaddieId: "battleJoeTheSoldier",
        squaddieTemplateId: "JoeTheSoldier",
    })

    ObjectRepositoryService.addSquaddie(
        objectRepository,
        squaddieTemplate,
        battleSquaddie
    )

    tile = SquaddieNameAndPortraitTileService.newFromBattleSquaddieId({
        objectRepository,
        battleSquaddieId: "battleJoeTheSoldier",
        team: undefined,
        horizontalPosition: ActionTilePosition.ACTOR_NAME,
    })
    return { objectRepository, tile }
}
