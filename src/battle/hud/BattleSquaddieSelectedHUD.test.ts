import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { MissionMap } from "../../missionMap/missionMap"
import { ResourceHandler } from "../../resource/resourceHandler"
import { BattleSquaddieSelectedHUD } from "./BattleSquaddieSelectedHUD"
import { BattleSquaddie } from "../battleSquaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"
import { TargetingShape } from "../targeting/targetingShapeGenerator"
import { makeResult } from "../../utils/ResultOrError"
import { CreateNewSquaddieAndAddToRepository } from "../../utils/test/squaddie"
import { BattleCamera } from "../battleCamera"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { KeyButtonName } from "../../utils/keyboardConfig"
import { config } from "../../configuration/config"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleSquaddieTeamService } from "../battleSquaddieTeam"
import { BattlePhaseStateService } from "../orchestratorComponents/battlePhaseController"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import { ActionsThisRound } from "../history/actionsThisRound"
import { CampaignService } from "../../campaign/campaign"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"

describe("BattleSquaddieSelectedHUD", () => {
    let hud: BattleSquaddieSelectedHUD
    let squaddieRepository: ObjectRepository
    let missionMap: MissionMap
    let resourceHandler: ResourceHandler
    let playerBattleSquaddieId: string = "player_squaddie_0"
    let playerSquaddieStatic: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie
    let enemySquaddieDynamicID: string = "enemy_squaddie_0"
    let enemySquaddieStatic: SquaddieTemplate
    let enemySquaddieDynamic: BattleSquaddie
    let player2BattleSquaddieId: string = "player_squaddie_2"
    let player2SquaddieStatic: SquaddieTemplate
    let player2SquaddieDynamic: BattleSquaddie
    let longswordAction: ActionTemplate
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "],
            }),
        })

        squaddieRepository = ObjectRepositoryService.new()

        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()

        resourceHandler = mocks.mockResourceHandler(mockedP5GraphicsContext)
        resourceHandler.areAllResourcesLoaded = jest
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
        resourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult({ width: 1, height: 1 }))

        longswordAction = ActionTemplateService.new({
            name: "longsword",
            id: "longsword",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues(),
                    minimumRange: 0,
                    maximumRange: 1,
                    targetingShape: TargetingShape.SNAKE,
                }),
            ],
        })
        ;({
            squaddieTemplate: playerSquaddieStatic,
            battleSquaddie: playerBattleSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "player_soldier",
            name: "Player Soldier",
            affiliation: SquaddieAffiliation.PLAYER,
            battleId: playerBattleSquaddieId,
            squaddieRepository,
            actionTemplates: [longswordAction],
        }))
        ;({
            squaddieTemplate: player2SquaddieStatic,
            battleSquaddie: player2SquaddieDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "player_soldier2",
            name: "Player Soldier 2",
            affiliation: SquaddieAffiliation.PLAYER,
            battleId: player2BattleSquaddieId,
            squaddieRepository,
            actionTemplates: [longswordAction],
        }))
        ;({
            squaddieTemplate: enemySquaddieStatic,
            battleSquaddie: enemySquaddieDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "enemy_soldier",
            name: "Enemy Soldier",
            affiliation: SquaddieAffiliation.ENEMY,
            battleId: enemySquaddieDynamicID,
            squaddieRepository,
            actionTemplates: [longswordAction],
        }))

        hud = new BattleSquaddieSelectedHUD()
    })

    describe("Player selects squaddie they can control", () => {
        let gameEngineState: GameEngineState

        it("sends a signal when you click on an available squaddie", () => {
            const team = BattleSquaddieTeamService.new({
                id: "player team",
                name: "player team",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
            })

            const missionMap: MissionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 "],
                }),
            })

            gameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap,
                        camera: new BattleCamera(0, 0),
                        teams: [team],
                        battlePhaseState: BattlePhaseStateService.new({
                            currentAffiliation: BattlePhase.PLAYER,
                        }),
                    }),
                }),
                campaign: CampaignService.default({}),
                repository: squaddieRepository,
            })

            let messageSpy: jest.SpyInstance = jest.spyOn(
                gameEngineState.messageBoard,
                "sendMessage"
            )

            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddieId,
                repositionWindow: { mouseX: 0, mouseY: 0 },
                gameEngineState: gameEngineState,
            })

            expect(messageSpy).toBeCalledWith({
                type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                gameEngineState,
                battleSquaddieSelectedId: playerBattleSquaddieId,
                selectionMethod: {
                    mouse: {
                        x: 0,
                        y: 0,
                    },
                },
            })
            messageSpy.mockRestore()
        })
    })

    describe("Next Squaddie button", () => {
        const getGameEngineState = (
            battleCamera: BattleCamera,
            actionsThisRound?: ActionsThisRound
        ) => {
            return GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        missionId: "test mission",
                        campaignId: "test campaign",
                        missionMap,
                        camera: battleCamera,
                        actionsThisRound,
                    }),
                }),
                campaign: CampaignService.default({}),
                repository: squaddieRepository,
            })
        }

        it("should respond to keyboard presses for the next squaddie, even if the HUD is not open", () => {
            const battleCamera = new BattleCamera(0, 0)
            hud = new BattleSquaddieSelectedHUD()

            missionMap.addSquaddie(
                playerSquaddieStatic.squaddieId.templateId,
                playerBattleSquaddie.battleSquaddieId,
                {
                    q: 0,
                    r: 0,
                }
            )
            missionMap.addSquaddie(
                player2SquaddieStatic.squaddieId.templateId,
                player2SquaddieDynamic.battleSquaddieId,
                {
                    q: 0,
                    r: 1,
                }
            )
            const gameEngineState = getGameEngineState(battleCamera)

            let messageSpy: jest.SpyInstance = jest.spyOn(
                gameEngineState.messageBoard,
                "sendMessage"
            )

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ).toBeUndefined()
            hud.keyPressed(
                config.KEYBOARD_SHORTCUTS[KeyButtonName.NEXT_SQUADDIE][0],
                gameEngineState
            )

            expect(messageSpy).toBeCalled()
            expect(messageSpy).toBeCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
                    gameEngineState,
                })
            )
            expect([playerBattleSquaddieId, player2BattleSquaddieId]).toContain(
                messageSpy.mock.calls[0][0].battleSquaddieSelectedId
            )

            expect(battleCamera.isPanning()).toBeTruthy()
            messageSpy.mockRestore()
        })
    })
})
