import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieMovementService } from "../../squaddie/movement"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { MoveCloserToSquaddie } from "./moveCloserToSquaddie"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { DefaultArmyAttributes } from "../../squaddie/armyAttributes"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { Damage } from "../../squaddie/squaddieService"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { InBattleAttributesService } from "../stats/inBattleAttributes"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battleState/battleState"
import { BattleActionRecorderService } from "../history/battleAction/battleActionRecorder"
import { BattleActionService } from "../history/battleAction/battleAction"
import { beforeEach, describe, expect, it } from "vitest"
import { SquaddieIdService } from "../../squaddie/id"
import { DebugModeMenuService } from "../hud/debugModeMenu/debugModeMenu"

describe("move towards closest squaddie in range", () => {
    let repository: ObjectRepository
    let missionMap: MissionMap
    let targetBattleSquaddie: BattleSquaddie
    let ignoredSquaddieDynamic: BattleSquaddie
    let searchingSquaddieTemplate: SquaddieTemplate
    let allyTeam: BattleSquaddieTeam
    let gameEngineState: GameEngineState

    beforeEach(() => {
        repository = ObjectRepositoryService.new()
        ;({ battleSquaddie: targetBattleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                templateId: "target_squaddie",
                battleId: "target_squaddie_0",
                name: "Target",
                affiliation: SquaddieAffiliation.PLAYER,
                objectRepository: repository,
                actionTemplateIds: [],
            }))
        ;({ battleSquaddie: ignoredSquaddieDynamic } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                templateId: "ignored_squaddie",
                battleId: "ignored_squaddie_0",
                name: "Ignored",
                affiliation: SquaddieAffiliation.PLAYER,
                objectRepository: repository,
                actionTemplateIds: [],
            }))
        ;({ squaddieTemplate: searchingSquaddieTemplate } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                templateId: "searching_squaddie",
                battleId: "searching_squaddie_0",
                name: "Searching",
                affiliation: SquaddieAffiliation.ALLY,
                objectRepository: repository,
                attributes: {
                    ...DefaultArmyAttributes(),
                    ...{
                        movement: SquaddieMovementService.new({
                            movementPerAction: 1,
                            traits: TraitStatusStorageService.newUsingTraitValues(),
                        }),
                    },
                },
                actionTemplateIds: [],
            }))

        allyTeam = {
            id: "allyTeamId",
            name: "team",
            affiliation: SquaddieAffiliation.ALLY,
            battleSquaddieIds: [],
            iconResourceKey: "icon_ally_team",
        }
        BattleSquaddieTeamService.addBattleSquaddieIds(allyTeam, [
            "searching_squaddie_0",
        ])

        gameEngineState = GameEngineStateService.new({
            repository: repository,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "missionId",
                    campaignId: "campaignId",
                    missionMap,
                    teams: [allyTeam],
                }),
            }),
        })
    })

    it("will move towards squaddie with given dynamic Id", () => {
        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 1 1 1 "],
            }),
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: targetBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: "target_squaddie_0",
            originMapCoordinate: { q: 0, r: 0 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: ignoredSquaddieDynamic.squaddieTemplateId,
            battleSquaddieId: "ignored_squaddie_0",
            originMapCoordinate: { q: 0, r: 3 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: searchingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "searching_squaddie_0",
            originMapCoordinate: { q: 0, r: 2 },
        })

        const movementStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: movementStep,
            battleSquaddieId: "searching_squaddie_0",
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: movementStep,
            movement: true,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: movementStep,
            targetCoordinate: { q: 0, r: 1 },
        })

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        })
        gameEngineState.battleOrchestratorState.battleState.missionMap =
            missionMap

        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            gameEngineState,
            behaviorOverrides: DebugModeMenuService.getDebugModeFlags(
                gameEngineState.battleOrchestratorState.battleHUD.debugMode
            ).behaviorOverrides,
        })

        expect(actualInstruction).toStrictEqual([movementStep])
    })

    it("will not change the currently acting squaddie", () => {
        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 1 1 1 "],
            }),
        })

        const {
            squaddieTemplate: searchingSquaddieStatic2,
            battleSquaddie: searchingBattleSquaddie2,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            templateId: "searching_squaddie_2",
            battleId: "searching_squaddie_2",
            name: "Searching",
            affiliation: SquaddieAffiliation.ALLY,
            objectRepository: repository,
            attributes: {
                ...DefaultArmyAttributes(),
                ...{
                    movement: SquaddieMovementService.new({
                        movementPerAction: 10,
                        traits: TraitStatusStorageService.newUsingTraitValues(),
                    }),
                },
            },
            actionTemplateIds: [],
        })
        BattleSquaddieTeamService.addBattleSquaddieIds(allyTeam, [
            searchingBattleSquaddie2.battleSquaddieId,
        ])

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: targetBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: "target_squaddie_0",
            originMapCoordinate: { q: 0, r: 0 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: searchingSquaddieStatic2.squaddieId.templateId,
            battleSquaddieId: searchingBattleSquaddie2.battleSquaddieId,
            originMapCoordinate: { q: 0, r: 3 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: searchingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "searching_squaddie_0",
            originMapCoordinate: { q: 0, r: 2 },
        })

        const movementStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: movementStep,
            battleSquaddieId: searchingBattleSquaddie2.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: movementStep,
            movement: true,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: movementStep,
            targetCoordinate: { q: 0, r: 1 },
        })

        BattleActionRecorderService.addReadyToAnimateBattleAction(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder,
            BattleActionService.new({
                actor: {
                    actorBattleSquaddieId:
                        searchingBattleSquaddie2.battleSquaddieId,
                },
                action: { isMovement: true },
                effect: {
                    movement: {
                        startCoordinate: { q: 0, r: 0 },
                        endCoordinate: { q: 0, r: 0 },
                    },
                },
            })
        )
        BattleActionRecorderService.addAnimatingBattleActionToAlreadyAnimatedThisTurn(
            gameEngineState.battleOrchestratorState.battleState
                .battleActionRecorder
        )

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        })
        gameEngineState.battleOrchestratorState.battleState.missionMap =
            missionMap
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            gameEngineState,
            behaviorOverrides: DebugModeMenuService.getDebugModeFlags(
                gameEngineState.battleOrchestratorState.battleHUD.debugMode
            ).behaviorOverrides,
        })

        expect(actualInstruction).toStrictEqual([movementStep])
    })

    it("will raise an error if there is no target", () => {
        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({})

        const shouldThrowError = () => {
            strategy.DetermineNextInstruction({
                team: allyTeam,
                gameEngineState,
                behaviorOverrides: DebugModeMenuService.getDebugModeFlags(
                    gameEngineState.battleOrchestratorState.battleHUD.debugMode
                ).behaviorOverrides,
            })
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
        expect(() => {
            shouldThrowError()
        }).toThrow("Move Closer to Squaddie strategy has no target")
    })

    it("will give no instruction if it is already next to the target", () => {
        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 1 1 1 ", " 1 1 1 1 1 1 1 1 1 "],
            }),
        })

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: targetBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: "target_squaddie_0",
            originMapCoordinate: { q: 0, r: 0 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: searchingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "searching_squaddie_0",
            originMapCoordinate: { q: 0, r: 1 },
        })

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        })
        gameEngineState.battleOrchestratorState.battleState.missionMap =
            missionMap
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            gameEngineState,
            behaviorOverrides: DebugModeMenuService.getDebugModeFlags(
                gameEngineState.battleOrchestratorState.battleHUD.debugMode
            ).behaviorOverrides,
        })
        expect(actualInstruction).toHaveLength(0)
    })

    it("will give no instruction if no targets are in range", () => {
        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 1 1 1 "],
            }),
        })

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: targetBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: "target_squaddie_0",
            originMapCoordinate: { q: 0, r: 0 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: searchingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "searching_squaddie_0",
            originMapCoordinate: { q: 0, r: 8 },
        })

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        })
        gameEngineState.battleOrchestratorState.battleState.missionMap =
            missionMap
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            gameEngineState,
            behaviorOverrides: DebugModeMenuService.getDebugModeFlags(
                gameEngineState.battleOrchestratorState.battleHUD.debugMode
            ).behaviorOverrides,
        })
        expect(actualInstruction).toHaveLength(0)
    })

    it("will move towards closest squaddie of a given affiliation", () => {
        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 1 1 1 "],
            }),
        })

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: targetBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: "target_squaddie_0",
            originMapCoordinate: { q: 0, r: 0 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: ignoredSquaddieDynamic.squaddieTemplateId,
            battleSquaddieId: "ignored_squaddie_0",
            originMapCoordinate: { q: 0, r: 8 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: searchingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "searching_squaddie_0",
            originMapCoordinate: { q: 0, r: 2 },
        })

        const movementStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: movementStep,
            battleSquaddieId: "searching_squaddie_0",
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: movementStep,
            movement: true,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: movementStep,
            targetCoordinate: { q: 0, r: 1 },
        })

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredAffiliation: SquaddieAffiliation.PLAYER,
        })
        gameEngineState.battleOrchestratorState.battleState.missionMap =
            missionMap
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            gameEngineState,
            behaviorOverrides: DebugModeMenuService.getDebugModeFlags(
                gameEngineState.battleOrchestratorState.battleHUD.debugMode
            ).behaviorOverrides,
        })

        expect(actualInstruction).toStrictEqual([movementStep])
    })

    it("will find an alternate destination if a squaddie is blocking its first space", () => {
        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            templateId: "player_squaddie",
            battleId: "player_squaddie_1",
            name: "Player",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: repository,
            attributes: {
                ...DefaultArmyAttributes(),
                ...{
                    movement: SquaddieMovementService.new({
                        movementPerAction: 1,
                        traits: TraitStatusStorageService.newUsingTraitValues(),
                    }),
                },
            },
            actionTemplateIds: [],
        })

        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 ", " 1 1 1 "],
            }),
        })

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: targetBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: "target_squaddie_0",
            originMapCoordinate: { q: 0, r: 2 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: ignoredSquaddieDynamic.squaddieTemplateId,
            battleSquaddieId: "player_squaddie_1",
            originMapCoordinate: { q: 0, r: 1 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: searchingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "searching_squaddie_0",
            originMapCoordinate: { q: 0, r: 0 },
        })

        const movementStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: movementStep,
            battleSquaddieId: "searching_squaddie_0",
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: movementStep,
            movement: true,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: movementStep,
            targetCoordinate: { q: 1, r: 1 },
        })

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        })
        gameEngineState.battleOrchestratorState.battleState.missionMap =
            missionMap
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            gameEngineState,
            behaviorOverrides: DebugModeMenuService.getDebugModeFlags(
                gameEngineState.battleOrchestratorState.battleHUD.debugMode
            ).behaviorOverrides,
        })
        expect(actualInstruction).toStrictEqual([movementStep])
    })

    it("will not follow dead squaddies", () => {
        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 1 1 1 "],
            }),
        })

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: targetBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: "target_squaddie_0",
            originMapCoordinate: { q: 0, r: 0 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: searchingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "searching_squaddie_0",
            originMapCoordinate: { q: 0, r: 3 },
        })

        InBattleAttributesService.takeDamage({
            inBattleAttributes: targetBattleSquaddie.inBattleAttributes,
            damageToTake: 9001,
            damageType: Damage.UNKNOWN,
        })

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredAffiliation: SquaddieAffiliation.PLAYER,
        })
        gameEngineState.battleOrchestratorState.battleState.missionMap =
            missionMap
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            gameEngineState,
            behaviorOverrides: DebugModeMenuService.getDebugModeFlags(
                gameEngineState.battleOrchestratorState.battleHUD.debugMode
            ).behaviorOverrides,
        })
        expect(actualInstruction).toHaveLength(0)
    })

    it("enemy will move towards squaddies it cannot move past", () => {
        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 1 1 1 "],
            }),
        })
        ObjectRepositoryService.addSquaddieTemplate(
            repository,
            SquaddieTemplateService.new({
                squaddieId: SquaddieIdService.new({
                    squaddieTemplateId: "enemy",
                    name: "enemy",
                    affiliation: SquaddieAffiliation.ENEMY,
                }),
            })
        )
        ObjectRepositoryService.addBattleSquaddie(
            repository,
            BattleSquaddieService.new({
                squaddieTemplateId: "enemy",
                battleSquaddieId: "enemy",
            })
        )

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: targetBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: "target_squaddie_0",
            originMapCoordinate: { q: 0, r: 0 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: searchingSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "enemy",
            originMapCoordinate: { q: 0, r: 2 },
        })
        const enemyTeam: BattleSquaddieTeam = BattleSquaddieTeamService.new({
            id: "enemyTeamId",
            name: "enemyTeam",
            affiliation: SquaddieAffiliation.ENEMY,
            battleSquaddieIds: ["enemy"],
            iconResourceKey: "icon_enemy_team",
        })

        const movementStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: movementStep,
            battleSquaddieId: "enemy",
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: movementStep,
            movement: true,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: movementStep,
            targetCoordinate: { q: 0, r: 1 },
        })

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        })
        gameEngineState.battleOrchestratorState.battleState.missionMap =
            missionMap

        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            gameEngineState,
            behaviorOverrides: DebugModeMenuService.getDebugModeFlags(
                gameEngineState.battleOrchestratorState.battleHUD.debugMode
            ).behaviorOverrides,
        })

        expect(actualInstruction).toStrictEqual([movementStep])
    })
})
