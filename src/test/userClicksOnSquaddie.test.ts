import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../campaign/squaddieTemplate"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import { BattleSquaddie, BattleSquaddieService } from "../battle/battleSquaddie"
import { SquaddieIdService } from "../squaddie/id"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../action/template/actionEffectSquaddieTemplate"
import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import {
    GameEngineState,
    GameEngineStateService,
} from "../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battle/orchestrator/battleState"
import { BattleCamera } from "../battle/battleCamera"
import { MakeDecisionButton } from "../squaddie/makeDecisionButton"
import * as mocks from "../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import { makeResult } from "../utils/ResultOrError"
import { ResourceHandler } from "../resource/resourceHandler"
import { MissionMap, MissionMapService } from "../missionMap/missionMap"
import { TerrainTileMapService } from "../hexMap/terrainTileMap"
import {
    ConvertCoordinateService,
    convertMapCoordinatesToScreenCoordinates,
} from "../hexMap/convertCoordinates"
import { OrchestratorComponentMouseEventType } from "../battle/orchestrator/battleOrchestratorComponent"
import { BattlePlayerSquaddieSelector } from "../battle/orchestratorComponents/battlePlayerSquaddieSelector"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battle/battleSquaddieTeam"
import {
    BattlePhaseState,
    BattlePhaseStateService,
} from "../battle/orchestratorComponents/battlePhaseController"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { CampaignService } from "../campaign/campaign"
import { ActionsThisRound } from "../battle/history/actionsThisRound"
import { MouseButton } from "../utils/mouseConfig"
import { BattleHUDListener } from "../battle/hud/battleHUD"
import { MessageBoardMessageType } from "../message/messageBoardMessage"

describe("User clicks on a squaddie", () => {
    let repository: ObjectRepository

    let playerTeam: BattleSquaddieTeam
    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie

    let attackAction: ActionTemplate

    let resourceHandler: ResourceHandler
    let missionMap: MissionMap

    beforeEach(() => {
        repository = ObjectRepositoryService.new()
        attackAction = ActionTemplateService.new({
            id: "action",
            name: "action",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(repository, attackAction)

        playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "player",
                affiliation: SquaddieAffiliation.PLAYER,
                templateId: "player",
            }),
            actionTemplateIds: [attackAction.id],
        })
        ObjectRepositoryService.addSquaddieTemplate(
            repository,
            playerSquaddieTemplate
        )

        playerBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "player 0",
        })
        ObjectRepositoryService.addBattleSquaddie(
            repository,
            playerBattleSquaddie
        )

        playerTeam = BattleSquaddieTeamService.new({
            name: "player team",
            id: "player",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
        })

        resourceHandler = mocks.mockResourceHandler(
            new MockedP5GraphicsBuffer()
        )
        resourceHandler.areAllResourcesLoaded = jest
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
        resourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult({ width: 1, height: 1 }))

        missionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 "],
            }),
        })
    })

    it("HUD produces a button for each ActionTemplate", () => {
        const attackAction2 = ActionTemplateService.new({
            id: "action2",
            name: "action2",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                }),
            ],
        })
        repository.squaddieTemplates[
            playerSquaddieTemplate.squaddieId.templateId
        ].actionTemplateIds.push(attackAction2.id)
        const gameEngineState = getGameEngineState({
            resourceHandler,
            missionMap,
            repository,
            teams: [],
            battlePhaseState: undefined,
        })
        ObjectRepositoryService.addActionTemplate(repository, attackAction2)

        const battleHUDListener = new BattleHUDListener("battleHUDListener")
        gameEngineState.messageBoard.addListener(
            battleHUDListener,
            MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
        )

        selectSquaddieForTheHUD({
            battleSquaddie: playerBattleSquaddie,
            gameEngineState: gameEngineState,
        })

        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                .battleSquaddieId
        ).toEqual(playerBattleSquaddie.battleSquaddieId)

        const actionButtons: MakeDecisionButton[] =
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.playerCommandState.actionButtons
        expect(actionButtons).toHaveLength(2)

        expect(
            actionButtons.find((button) => {
                return button.actionTemplateId === attackAction.id
            })
        ).toBeTruthy()

        expect(
            actionButtons.find((button) => {
                return button.actionTemplateId === attackAction2.id
            })
        ).toBeTruthy()
    })

    describe("BattlePlayerSquaddieSelector clicks on a squaddie to start their turn", () => {
        let gameEngineState: GameEngineState
        beforeEach(() => {
            gameEngineState = getGameEngineState({
                resourceHandler,
                missionMap,
                repository,
                teams: [playerTeam],
                battlePhaseState: BattlePhaseStateService.new({
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 0,
                }),
            })
            MissionMapService.addSquaddie(
                missionMap,
                playerSquaddieTemplate.squaddieId.templateId,
                playerBattleSquaddie.battleSquaddieId,
                {
                    q: 0,
                    r: 0,
                }
            )
        })
        const selectorClicksOnSquaddie = (gameEngineState: GameEngineState) => {
            const selector = new BattlePlayerSquaddieSelector()
            let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
                0,
                0,
                ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
            )
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY,
                mouseButton: MouseButton.ACCEPT,
            })
        }

        it("BattlePlayerSquaddieSelector does not create an ActionsThsRound object when the player clicks on a squaddie to start their turn", () => {
            selectorClicksOnSquaddie(gameEngineState)

            const battleState =
                gameEngineState.battleOrchestratorState.battleState
            expect(battleState.actionsThisRound).toBeUndefined()
        })

        it("Map should highlight all the tiles it can reach when BattlePlayerSquaddieSelector selects a squaddie", () => {
            const addGraphicsLayerSpy = jest.spyOn(
                TerrainTileMapService,
                "addGraphicsLayer"
            )
            selectorClicksOnSquaddie(gameEngineState)
            expect(addGraphicsLayerSpy).toBeCalled()
        })
    })

    it("BattlePlayerSquaddieSelector does not create an ActionsThsRound when the player clicks on a different squaddie to start their turn", () => {
        const player2 = BattleSquaddieService.new({
            battleSquaddieId: "player 2",
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
        })
        ObjectRepositoryService.addBattleSquaddie(repository, player2)
        BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [
            player2.battleSquaddieId,
        ])

        const gameEngineState = getGameEngineState({
            resourceHandler,
            missionMap,
            repository,
            teams: [playerTeam],
            battlePhaseState: BattlePhaseStateService.new({
                currentAffiliation: BattlePhase.PLAYER,
                turnCount: 0,
            }),
        })

        MissionMapService.addSquaddie(
            missionMap,
            playerSquaddieTemplate.squaddieId.templateId,
            playerBattleSquaddie.battleSquaddieId,
            {
                q: 0,
                r: 0,
            }
        )
        MissionMapService.addSquaddie(
            missionMap,
            player2.squaddieTemplateId,
            player2.battleSquaddieId,
            { q: 0, r: 1 }
        )

        const selector = new BattlePlayerSquaddieSelector()
        let [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            0,
            0,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
        )
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.ACCEPT,
        })
        ;[mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(
            0,
            1,
            ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates()
        )
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.ACCEPT,
        })

        const battleState = gameEngineState.battleOrchestratorState.battleState
        expect(battleState.actionsThisRound).toBeUndefined()
    })

    describe("player hovers over squaddie", () => {
        let gameEngineState: GameEngineState

        const selectorHoversOnSquaddie = (gameEngineState: GameEngineState) => {
            const selector = new BattlePlayerSquaddieSelector()
            let { x, y } =
                ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                    {
                        q: 0,
                        r: 0,
                        ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinatesAsObject(),
                    }
                )
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.MOVED,
                mouseX: x,
                mouseY: y,
            })
        }

        beforeEach(() => {
            const playerTeam = BattleSquaddieTeamService.new({
                id: "playerTeam",
                affiliation: SquaddieAffiliation.PLAYER,
                name: "player team",
                battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
            })

            gameEngineState = getGameEngineState({
                resourceHandler,
                missionMap,
                repository,
                teams: [playerTeam],
                battlePhaseState: BattlePhaseStateService.new({
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 0,
                }),
            })

            MissionMapService.addSquaddie(
                missionMap,
                playerSquaddieTemplate.squaddieId.templateId,
                playerBattleSquaddie.battleSquaddieId,
                {
                    q: 0,
                    r: 0,
                }
            )

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE
            )
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )
        })

        it("shows the main popover with the squaddie for a limited amount of time", () => {
            selectorHoversOnSquaddie(gameEngineState)

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .battleSquaddieId
            ).toEqual(playerBattleSquaddie.battleSquaddieId)
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .expirationTime
            ).not.toBeUndefined()
        })

        it("will override the MAIN squaddie if it is clicked on", () => {
            ObjectRepositoryService.addBattleSquaddie(
                gameEngineState.repository,
                BattleSquaddieService.new({
                    squaddieTemplateId:
                        playerSquaddieTemplate.squaddieId.templateId,
                    battleSquaddieId: "player 1",
                })
            )

            MissionMapService.addSquaddie(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                playerSquaddieTemplate.squaddieId.templateId,
                "player 1",
                { q: 0, r: 1 }
            )

            BattleSquaddieTeamService.addBattleSquaddieIds(
                gameEngineState.battleOrchestratorState.battleState.teams[0],
                ["player 1"]
            )

            const selector = new BattlePlayerSquaddieSelector()
            let { x, y } =
                ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                    {
                        q: 0,
                        r: 0,
                        ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinatesAsObject(),
                    }
                )
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: x,
                mouseY: y,
                mouseButton: MouseButton.ACCEPT,
            })
            ;({ x, y } =
                ConvertCoordinateService.convertMapCoordinatesToScreenCoordinates(
                    {
                        q: 0,
                        r: 1,
                        ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinatesAsObject(),
                    }
                ))
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.MOVED,
                mouseX: x,
                mouseY: y,
            })

            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: x,
                mouseY: y,
                mouseButton: MouseButton.ACCEPT,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .battleSquaddieId
            ).toEqual("player 1")
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .expirationTime
            ).toBeUndefined()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieSummaryPopoversByType.TARGET
            ).toBeUndefined()
        })
    })
})

const getGameEngineState = ({
    resourceHandler,
    missionMap,
    repository,
    teams,
    battlePhaseState,
    actionsThisRound,
}: {
    resourceHandler: ResourceHandler
    missionMap: MissionMap
    repository: ObjectRepository
    teams: BattleSquaddieTeam[]
    battlePhaseState: BattlePhaseState
    actionsThisRound?: ActionsThisRound
}): GameEngineState => {
    return GameEngineStateService.new({
        resourceHandler: resourceHandler,
        battleOrchestratorState: BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap,
                camera: new BattleCamera(0, 0),
                teams,
                battlePhaseState,
                actionsThisRound,
            }),
        }),
        repository,
        campaign: CampaignService.default({}),
    })
}

const selectSquaddieForTheHUD = ({
    battleSquaddie,
    gameEngineState,
}: {
    battleSquaddie: BattleSquaddie
    gameEngineState: GameEngineState
}) => {
    gameEngineState.messageBoard.sendMessage({
        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
        gameEngineState,
        battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
        selectionMethod: {
            mouse: { x: 0, y: 0 },
        },
    })
}
