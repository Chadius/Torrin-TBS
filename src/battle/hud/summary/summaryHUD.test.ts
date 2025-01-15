import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import {
    mockConsoleWarn,
    MockedP5GraphicsBuffer,
    mockResourceHandler,
} from "../../../utils/test/mocks"
import {
    SUMMARY_HUD_PEEK_EXPIRATION_MS,
    SummaryHUDState,
    SummaryHUDStateService,
} from "./summaryHUD"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ActionTemplateService } from "../../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
} from "../../../action/template/actionEffectTemplate"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngine"
import { CampaignService } from "../../../campaign/campaign"
import { ResourceHandler } from "../../../resource/resourceHandler"
import {
    PlayerCommandSelection,
    PlayerCommandStateService,
} from "../playerCommand/playerCommandHUD"
import { MouseButton } from "../../../utils/mouseConfig"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { TargetConstraintsService } from "../../../action/targetConstraints"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { SquaddieNameAndPortraitTileService } from "../playerActionPanel/tile/squaddieNameAndPortraitTile"
import { MissionMapService } from "../../../missionMap/missionMap"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import { ActionTilePosition } from "../playerActionPanel/tile/actionTilePosition"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"

describe("summaryHUD", () => {
    let graphicsBuffer: MockedP5GraphicsBuffer
    let objectRepository: ObjectRepository
    let summaryHUDState: SummaryHUDState
    let resourceHandler: ResourceHandler
    let consoleWarnSpy: MockInstance

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        graphicsBuffer = new MockedP5GraphicsBuffer()
        graphicsBuffer.textWidth = vi.fn().mockReturnValue(1)
        resourceHandler = mockResourceHandler(graphicsBuffer)
        consoleWarnSpy = mockConsoleWarn()

        const actionTemplate0 = ActionTemplateService.new({
            id: "actionTemplate0",
            name: "NeedsTarget",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 2,
                maximumRange: 3,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
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
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 2,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
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

    afterEach(() => {
        consoleWarnSpy.mockRestore()
    })

    describe("will draw tiles for the acting squaddie", () => {
        it("can draw the acting window on the left side", () => {
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })

            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            const battleSquaddieId = "player"
            BattleActionDecisionStepService.setActor({
                battleSquaddieId,
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })

            expect(
                summaryHUDState.squaddieNameTiles[ActionTilePosition.ACTOR_NAME]
            ).not.toBeUndefined()
            expect(
                summaryHUDState.squaddieStatusTiles[
                    ActionTilePosition.ACTOR_STATUS
                ]
            ).not.toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[ActionTilePosition.ACTOR_NAME]
                    .squaddieName
            ).toEqual("player")
        })
        describe("knows when it is hovering", () => {
            const tests = [
                {
                    name: "actor selected",
                    positions: [
                        ActionTilePosition.ACTOR_NAME,
                        ActionTilePosition.ACTOR_STATUS,
                    ],
                },
            ]

            it.each(tests)(`$name`, ({ positions }) => {
                let gameEngineState = GameEngineStateService.new({
                    resourceHandler,
                    repository: objectRepository,
                    campaign: CampaignService.default(),
                })
                summaryHUDState = SummaryHUDStateService.new({
                    screenSelectionCoordinates: { x: 0, y: 0 },
                })

                const { left, right, top, bottom } = positions.reduce(
                    (currentSides, position) => {
                        const rectArea =
                            SquaddieNameAndPortraitTileService.getBoundingBoxBasedOnActionPanelPosition(
                                position
                            )

                        if (currentSides.left === undefined) {
                            currentSides.left = RectAreaService.left(rectArea)
                            currentSides.right = RectAreaService.right(rectArea)
                            currentSides.top = RectAreaService.top(rectArea)
                            currentSides.bottom =
                                RectAreaService.bottom(rectArea)
                        }

                        return {
                            left: Math.min(
                                RectAreaService.left(rectArea),
                                currentSides.left
                            ),
                            right: Math.max(
                                RectAreaService.right(rectArea),
                                currentSides.right
                            ),
                            top: RectAreaService.top(rectArea),
                            bottom: RectAreaService.bottom(rectArea),
                        }
                    },
                    {
                        left: undefined,
                        right: undefined,
                        top: undefined,
                        bottom: undefined,
                    }
                )

                const panelWindowRectArea = RectAreaService.new({
                    left,
                    right,
                    top,
                    bottom,
                })

                expect(
                    SummaryHUDStateService.isMouseHoveringOver({
                        summaryHUDState,
                        mouseSelectionLocation: {
                            x: RectAreaService.centerX(panelWindowRectArea),
                            y: RectAreaService.centerY(panelWindowRectArea),
                        },
                    })
                ).toBeFalsy()

                gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                    BattleActionDecisionStepService.new()

                BattleActionDecisionStepService.setActor({
                    battleSquaddieId: "player",
                    actionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                })
                SummaryHUDStateService.draw({
                    summaryHUDState,
                    graphicsBuffer,
                    gameEngineState,
                    resourceHandler,
                })

                expectIsMouseHoveringOverTheExpectedPanelWindowRectArea(
                    summaryHUDState,
                    panelWindowRectArea
                )
            })
        })
    })

    describe("will draw tiles for the peeked squaddie", () => {
        it("can draw the playable squaddie tiles", () => {
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })

            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "player",
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })

            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_PLAYABLE_NAME
                ]
            ).not.toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_PLAYABLE_NAME
                ].squaddieName
            ).toEqual("player")
            expect(
                summaryHUDState.squaddieStatusTiles[
                    ActionTilePosition.PEEK_PLAYABLE_STATUS
                ]
            ).not.toBeUndefined()
            expect(summaryHUDState.squaddieToPeekAt).toEqual(
                expect.objectContaining({
                    battleSquaddieId: "player",
                    actionPanelPositions: {
                        nameAndPortrait: ActionTilePosition.PEEK_PLAYABLE_NAME,
                        status: ActionTilePosition.PEEK_PLAYABLE_STATUS,
                    },
                    expirationTime: expect.any(Number),
                })
            )
        })
        it("can draw the unplayable squaddie window", () => {
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })

            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "enemy",
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })

            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).not.toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ].squaddieName
            ).toEqual("enemy")
            expect(
                summaryHUDState.squaddieStatusTiles[
                    ActionTilePosition.PEEK_RIGHT_STATUS
                ]
            ).not.toBeUndefined()
            expect(summaryHUDState.squaddieToPeekAt).toEqual(
                expect.objectContaining({
                    battleSquaddieId: "enemy",
                    actionPanelPositions: {
                        nameAndPortrait: ActionTilePosition.PEEK_RIGHT_NAME,
                        status: ActionTilePosition.PEEK_RIGHT_STATUS,
                    },
                    expirationTime: expect.any(Number),
                })
            )
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).not.toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ].squaddieName
            ).toEqual("enemy")
        })
        it("will expire over time", () => {
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })

            const dateNowSpy = vi.spyOn(Date, "now").mockImplementation(() => 0)

            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "enemy",
            })
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).not.toBeUndefined()
            dateNowSpy.mockImplementation(() => 1000)
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).not.toBeUndefined()
            dateNowSpy.mockImplementation(() => 2001)
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).toBeUndefined()
        })
        it("will override the peeked squaddie if a different one is peeked", () => {
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "player2",
                battleId: "player2",
                templateId: "player",
                objectRepository: objectRepository,
                affiliation: SquaddieAffiliation.PLAYER,
                actionTemplateIds: [],
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })

            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "player",
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })

            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "player2",
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })

            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_PLAYABLE_NAME
                ]
            ).not.toBeUndefined()
            expect(summaryHUDState.squaddieToPeekAt).toEqual(
                expect.objectContaining({
                    battleSquaddieId: "player2",
                    actionPanelPositions: {
                        nameAndPortrait: ActionTilePosition.PEEK_PLAYABLE_NAME,
                        status: ActionTilePosition.PEEK_PLAYABLE_STATUS,
                    },
                    expirationTime: expect.any(Number),
                })
            )
        })
    })

    describe("will use the right panel to peek if the actor panel is already selected", () => {
        let gameEngineState: GameEngineState

        beforeEach(() => {
            gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })

            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "player",
                battleId: "player2",
                templateId: "player",
                objectRepository: objectRepository,
                affiliation: SquaddieAffiliation.PLAYER,
                actionTemplateIds: [],
            })

            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            const battleSquaddieId = "player"
            BattleActionDecisionStepService.setActor({
                battleSquaddieId,
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })
        })

        it("will use the right panel to peek if the actor panel is different from the peeked squaddie", () => {
            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "player2",
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })

            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_PLAYABLE_NAME
                ]
            ).toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).not.toBeUndefined()
            expect(summaryHUDState.squaddieToPeekAt).toEqual(
                expect.objectContaining({
                    battleSquaddieId: "player2",
                    actionPanelPositions: {
                        nameAndPortrait: ActionTilePosition.PEEK_RIGHT_NAME,
                        status: ActionTilePosition.PEEK_RIGHT_STATUS,
                    },
                    expirationTime: expect.any(Number),
                })
            )
        })

        it("will not create peekable tiles if the peeked squaddie is the same as the actor tile", () => {
            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "player",
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })

            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_PLAYABLE_NAME
                ]
            ).toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).toBeUndefined()
            expect(summaryHUDState.squaddieToPeekAt).toBeUndefined()
        })
    })

    describe("will draw a squaddie name and portrait tile for the target squaddie", () => {
        let gameEngineState: GameEngineState
        const considerTarget = () => {
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                battleSquaddieId: "player",
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
            })
            BattleActionDecisionStepService.addAction({
                actionTemplateId: "attack",
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
            })

            gameEngineState.battleOrchestratorState.battleState.missionMap =
                MissionMapService.new({
                    terrainTileMap: TerrainTileMapService.new({
                        movementCost: ["1 1 "],
                    }),
                })

            MissionMapService.addSquaddie({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                squaddieTemplateId: "enemy",
                battleSquaddieId: "enemy",
                coordinate: { q: 0, r: 1 },
            })

            BattleActionDecisionStepService.setConsideredTarget({
                targetCoordinate: { q: 0, r: 1 },
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
            })
        }

        beforeEach(() => {
            gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })
            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })
        })

        it("will draw the target window on the right side", () => {
            considerTarget()

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })

            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.TARGET_NAME
                ]
            ).not.toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.TARGET_NAME
                ].squaddieName
            ).toEqual("enemy")
            expect(
                summaryHUDState.squaddieStatusTiles[
                    ActionTilePosition.TARGET_STATUS
                ]
            ).not.toBeUndefined()
        })
        describe("knows when the mouse is hovering over the tiles", () => {
            const tests = [
                {
                    name: "target selected",
                    positions: [
                        ActionTilePosition.TARGET_NAME,
                        ActionTilePosition.TARGET_STATUS,
                    ],
                },
            ]

            it.each(tests)(`$name`, ({ positions }) => {
                gameEngineState = GameEngineStateService.new({
                    resourceHandler,
                    repository: objectRepository,
                    campaign: CampaignService.default(),
                })
                summaryHUDState = SummaryHUDStateService.new({
                    screenSelectionCoordinates: { x: 0, y: 0 },
                })

                const panelWindowRectArea =
                    RectAreaService.newRectangleBasedOnMultipleRectAreas(
                        positions.map((position) =>
                            SquaddieNameAndPortraitTileService.getBoundingBoxBasedOnActionPanelPosition(
                                position
                            )
                        )
                    )

                expect(
                    SummaryHUDStateService.isMouseHoveringOver({
                        summaryHUDState,
                        mouseSelectionLocation: {
                            x: RectAreaService.centerX(panelWindowRectArea),
                            y: RectAreaService.centerY(panelWindowRectArea),
                        },
                    })
                ).toBeFalsy()

                considerTarget()

                SummaryHUDStateService.draw({
                    summaryHUDState,
                    graphicsBuffer,
                    gameEngineState,
                    resourceHandler,
                })

                expectIsMouseHoveringOverTheExpectedPanelWindowRectArea(
                    summaryHUDState,
                    panelWindowRectArea
                )
            })
        })

        it("will not create peekable tiles if the peeked squaddie is the same as the target tile", () => {
            considerTarget()

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })

            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "enemy",
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })

            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_STATUS
                ]
            ).toBeUndefined()
            expect(summaryHUDState.squaddieToPeekAt).toBeUndefined()
        })
    })

    describe("peekable windows expire over time", () => {
        let summaryHUDState: SummaryHUDState
        let dateSpy: MockInstance
        let gameEngineState: GameEngineState

        beforeEach(() => {
            dateSpy = vi.spyOn(Date, "now").mockReturnValue(0)
            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })
            gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })
        })

        afterEach(() => {
            dateSpy.mockRestore()
        })

        const drawAndExpectTileToExist = (
            expectedBattleSquaddieId: string,
            actionTilePosition: ActionTilePosition
        ) => {
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })

            expect(summaryHUDState.squaddieToPeekAt.battleSquaddieId).toEqual(
                expectedBattleSquaddieId
            )
            expect(
                summaryHUDState.squaddieNameTiles[actionTilePosition]
                    .battleSquaddieId
            ).toEqual(expectedBattleSquaddieId)
        }

        const drawAndExpectTileNotToExist = (
            actionTilePosition: ActionTilePosition
        ) => {
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })

            expect(summaryHUDState.squaddieToPeekAt).toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[actionTilePosition]
            ).toBeUndefined()
        }

        it("will expire the playable tile over time", () => {
            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "player",
            })

            drawAndExpectTileToExist(
                "player",
                ActionTilePosition.PEEK_PLAYABLE_NAME
            )

            dateSpy.mockReturnValue(SUMMARY_HUD_PEEK_EXPIRATION_MS - 1)
            drawAndExpectTileToExist(
                "player",
                ActionTilePosition.PEEK_PLAYABLE_NAME
            )

            dateSpy.mockReturnValue(SUMMARY_HUD_PEEK_EXPIRATION_MS + 1)
            drawAndExpectTileNotToExist(ActionTilePosition.PEEK_PLAYABLE_NAME)
            expect(summaryHUDState.squaddieToPeekAt).toBeUndefined()
        })
        it("will expire the right side tile over time", () => {
            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "enemy",
            })

            drawAndExpectTileToExist(
                "enemy",
                ActionTilePosition.PEEK_RIGHT_NAME
            )

            dateSpy.mockReturnValue(SUMMARY_HUD_PEEK_EXPIRATION_MS - 1)
            drawAndExpectTileToExist(
                "enemy",
                ActionTilePosition.PEEK_RIGHT_NAME
            )

            dateSpy.mockReturnValue(SUMMARY_HUD_PEEK_EXPIRATION_MS + 1)
            drawAndExpectTileNotToExist(ActionTilePosition.PEEK_RIGHT_NAME)
            expect(summaryHUDState.squaddieToPeekAt).toBeUndefined()
        })
        it("will never expire the right tile if no date was set", () => {
            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "enemy",
                removeExpirationTime: true,
            })

            drawAndExpectTileToExist(
                "enemy",
                ActionTilePosition.PEEK_RIGHT_NAME
            )

            dateSpy.mockReturnValue(SUMMARY_HUD_PEEK_EXPIRATION_MS - 1)
            drawAndExpectTileToExist(
                "enemy",
                ActionTilePosition.PEEK_RIGHT_NAME
            )

            dateSpy.mockReturnValue(SUMMARY_HUD_PEEK_EXPIRATION_MS + 1)
            drawAndExpectTileToExist(
                "enemy",
                ActionTilePosition.PEEK_RIGHT_NAME
            )
            expect(summaryHUDState.squaddieToPeekAt.battleSquaddieId).toEqual(
                "enemy"
            )
        })
    })

    describe("can create a playerCommandHUD based on the main panel", () => {
        let summaryHUDState: SummaryHUDState
        beforeEach(() => {
            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                battleSquaddieId: "player",
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
            })

            SummaryHUDStateService.createActorTiles({
                summaryHUDState,
                gameEngineState,
                objectRepository,
            })
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
                resourceHandler,
            })
        })
        it("will create a playerCommandHUD when the squaddie is player controllable", () => {
            expect(summaryHUDState.showPlayerCommand).toBeTruthy()
            expect(summaryHUDState.playerCommandState).not.toBeUndefined()
        })
    })

    describe("player selects an action to see action tile", () => {
        let gameEngineState: GameEngineState
        beforeEach(() => {
            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: {
                    x: 0,
                    y: 0,
                },
            })

            gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                battleSquaddieId: "player",
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
            })

            SummaryHUDStateService.createActorTiles({
                summaryHUDState,
                gameEngineState,
                objectRepository,
            })
        })

        it("will delegate mouseMoved events to playerCommandHUD when it is active", () => {
            SummaryHUDStateService.draw({
                summaryHUDState,
                gameEngineState,
                graphicsBuffer,
                resourceHandler,
            })

            const playerCommandSpy = vi.spyOn(
                PlayerCommandStateService,
                "mouseMoved"
            )
            const mouseX = RectAreaService.centerX(
                summaryHUDState.playerCommandState.actionButtons[0].buttonIcon
                    .drawArea
            )
            const mouseY = RectAreaService.centerY(
                summaryHUDState.playerCommandState.actionButtons[0].buttonIcon
                    .drawArea
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
            SummaryHUDStateService.draw({
                summaryHUDState,
                gameEngineState,
                graphicsBuffer,
                resourceHandler,
            })

            const playerCommandSpy: MockInstance = vi.spyOn(
                PlayerCommandStateService,
                "mouseClicked"
            )

            const selection = SummaryHUDStateService.mouseClicked({
                summaryHUDState,
                mouseButton: MouseButton.ACCEPT,
                mouseX: RectAreaService.centerX(
                    summaryHUDState.playerCommandState.actionButtons[0]
                        .buttonIcon.drawArea
                ),
                mouseY: RectAreaService.centerY(
                    summaryHUDState.playerCommandState.actionButtons[0]
                        .buttonIcon.drawArea
                ),
            })
            expect(playerCommandSpy).toBeCalled()
            expect(selection).toEqual(
                PlayerCommandSelection.PLAYER_COMMAND_SELECTION_ACTION
            )
            playerCommandSpy.mockRestore()
        })

        it("will create an action tile when an action is selected", () => {
            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                actionTemplateId: "actionTemplate0",
            })

            SummaryHUDStateService.createActorTiles({
                summaryHUDState,
                gameEngineState,
                objectRepository,
            })

            SummaryHUDStateService.createActionTiles({
                summaryHUDState,
                gameEngineState,
                objectRepository,
            })

            expect(summaryHUDState.actionSelectedTile).not.toBeUndefined()
            expect(summaryHUDState.actionSelectedTile.actionName).toEqual(
                "NeedsTarget"
            )
        })
    })
})

const expectIsMouseHoveringOverTheExpectedPanelWindowRectArea = (
    summaryHUDState: SummaryHUDState,
    panelWindowRectArea: RectArea
) => {
    expect(
        SummaryHUDStateService.isMouseHoveringOver({
            summaryHUDState,
            mouseSelectionLocation: {
                x: RectAreaService.centerX(panelWindowRectArea),
                y: RectAreaService.centerY(panelWindowRectArea),
            },
        })
    ).toBeTruthy()

    expect(
        SummaryHUDStateService.isMouseHoveringOver({
            summaryHUDState,
            mouseSelectionLocation: {
                x: RectAreaService.left(panelWindowRectArea) - 5,
                y: RectAreaService.centerY(panelWindowRectArea),
            },
        })
    ).toBeFalsy()

    expect(
        SummaryHUDStateService.isMouseHoveringOver({
            summaryHUDState,
            mouseSelectionLocation: {
                x: RectAreaService.right(panelWindowRectArea) + 5,
                y: RectAreaService.centerY(panelWindowRectArea),
            },
        })
    ).toBeFalsy()

    expect(
        SummaryHUDStateService.isMouseHoveringOver({
            summaryHUDState,
            mouseSelectionLocation: {
                x: RectAreaService.centerX(panelWindowRectArea),
                y: RectAreaService.top(panelWindowRectArea) - 5,
            },
        })
    ).toBeFalsy()

    expect(
        SummaryHUDStateService.isMouseHoveringOver({
            summaryHUDState,
            mouseSelectionLocation: {
                x: RectAreaService.centerX(panelWindowRectArea),
                y: RectAreaService.bottom(panelWindowRectArea) + 5,
            },
        })
    ).toBeFalsy()
}
