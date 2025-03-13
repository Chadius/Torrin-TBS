import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleSquaddie } from "../battleSquaddie"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { TargetSquaddieInRange } from "./targetSquaddieInRange"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    TargetBySquaddieAffiliationRelation,
    VersusSquaddieResistance,
} from "../../action/template/actionEffectTemplate"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battleState/battleState"
import { TargetConstraintsService } from "../../action/targetConstraints"
import { ActionResourceCostService } from "../../action/actionResourceCost"
import { beforeEach, describe, expect, it } from "vitest"

describe("target a squaddie within reach of actions", () => {
    let objectRepository: ObjectRepository
    let missionMap: MissionMap
    let enemyBanditStatic: SquaddieTemplate
    let enemyBattleSquaddie: BattleSquaddie
    let playerKnightStatic: SquaddieTemplate
    let playerKnightDynamic: BattleSquaddie
    let allyClericStatic: SquaddieTemplate
    let allyClericDynamic: BattleSquaddie
    let shortBowAction: ActionTemplate
    let enemyTeam: BattleSquaddieTeam
    let gameEngineState: GameEngineState

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()

        shortBowAction = ActionTemplateService.new({
            name: "short bow",
            id: "short_bow",
            resourceCost: ActionResourceCostService.new({
                actionPoints: 2,
            }),
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 2,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.CROSS_OVER_PITS]: true,
                    }),
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            shortBowAction
        )
        ;({
            squaddieTemplate: enemyBanditStatic,
            battleSquaddie: enemyBattleSquaddie,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            templateId: "enemy_bandit",
            battleId: "enemy_bandit_0",
            name: "Bandit",
            affiliation: SquaddieAffiliation.ENEMY,
            objectRepository: objectRepository,
            actionTemplateIds: [shortBowAction.id],
        }))
        ;({
            squaddieTemplate: playerKnightStatic,
            battleSquaddie: playerKnightDynamic,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            templateId: "player_knight",
            battleId: "player_knight_0",
            name: "Knight",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: objectRepository,
            actionTemplateIds: [],
        }))
        ;({
            squaddieTemplate: allyClericStatic,
            battleSquaddie: allyClericDynamic,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            templateId: "ally_cleric",
            battleId: "ally_cleric_0",
            name: "Cleric",
            affiliation: SquaddieAffiliation.ALLY,
            objectRepository: objectRepository,
            actionTemplateIds: [],
        }))

        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 "],
            }),
        })

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: enemyBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
            coordinate: { q: 0, r: 0 },
        })

        enemyTeam = BattleSquaddieTeamService.new({
            id: "teamId",
            name: "team",
            affiliation: SquaddieAffiliation.ENEMY,
            battleSquaddieIds: [],
            iconResourceKey: "icon_enemy_team",
        })
        BattleSquaddieTeamService.addBattleSquaddieIds(enemyTeam, [
            enemyBattleSquaddie.battleSquaddieId,
        ])

        gameEngineState = GameEngineStateService.new({
            repository: objectRepository,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "missionId",
                    campaignId: "campaignId",
                    missionMap,
                    teams: [enemyTeam],
                }),
            }),
        })
    })

    it("will return undefined if desired squaddies are out of range", () => {
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: playerKnightDynamic.squaddieTemplateId,
            battleSquaddieId: playerKnightDynamic.battleSquaddieId,
            coordinate: { q: 0, r: 3 },
        })

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.PLAYER,
        })
        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            gameEngineState,
        })
        expect(actualInstruction).toBeUndefined()
    })

    it("will raise an error if there is no target squaddie or affiliation with a given id", () => {
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: playerKnightDynamic.squaddieTemplateId,
            battleSquaddieId: playerKnightDynamic.battleSquaddieId,
            coordinate: { q: 0, r: 1 },
        })

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({})
        const shouldThrowError = () => {
            strategy.DetermineNextInstruction({
                team: enemyTeam,
                gameEngineState,
            })
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
        expect(() => {
            shouldThrowError()
        }).toThrow("Target Squaddie In Range strategy has no target")
    })

    it("will target squaddie by dynamic id", () => {
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: playerKnightDynamic.squaddieTemplateId,
            battleSquaddieId: playerKnightDynamic.battleSquaddieId,
            coordinate: { q: 0, r: 1 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: allyClericDynamic.squaddieTemplateId,
            battleSquaddieId: allyClericDynamic.battleSquaddieId,
            coordinate: { q: 0, r: 2 },
        })
        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        })

        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            gameEngineState,
        })
        const actionStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: actionStep,
            battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: actionStep,
            actionTemplateId: shortBowAction.id,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: actionStep,
            targetCoordinate: { q: 0, r: 1 },
        })
        expect(actualInstruction).toStrictEqual([actionStep])
    })

    it("will target squaddie by affiliation", () => {
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: playerKnightDynamic.squaddieTemplateId,
            battleSquaddieId: playerKnightDynamic.battleSquaddieId,
            coordinate: { q: 0, r: 1 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: allyClericDynamic.squaddieTemplateId,
            battleSquaddieId: allyClericDynamic.battleSquaddieId,
            coordinate: { q: 0, r: 2 },
        })

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.ALLY,
        })

        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            gameEngineState,
        })
        const actionStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: actionStep,
            battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: actionStep,
            actionTemplateId: shortBowAction.id,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: actionStep,
            targetCoordinate: { q: 0, r: 2 },
        })
        expect(actualInstruction).toStrictEqual([actionStep])
    })

    it("will pass if there are no squaddies of the desired affiliation", () => {
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: playerKnightDynamic.squaddieTemplateId,
            battleSquaddieId: playerKnightDynamic.battleSquaddieId,
            coordinate: { q: 0, r: 1 },
        })

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredAffiliation: SquaddieAffiliation.ALLY,
        })

        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            gameEngineState,
        })

        expect(actualInstruction).toBeUndefined()
    })

    it("will not use an action if there are not enough action points remaining", () => {
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: allyClericDynamic.squaddieTemplateId,
            battleSquaddieId: allyClericDynamic.battleSquaddieId,
            coordinate: { q: 0, r: 2 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: playerKnightDynamic.squaddieTemplateId,
            battleSquaddieId: playerKnightDynamic.battleSquaddieId,
            coordinate: { q: 0, r: 1 },
        })

        SquaddieTurnService.spendActionPoints(
            enemyBattleSquaddie.squaddieTurn,
            4 - shortBowAction.resourceCost.actionPoints
        )

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        })

        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            gameEngineState,
        })

        expect(actualInstruction).toBeUndefined()
    })

    it("will add to existing instruction", () => {
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: playerKnightDynamic.squaddieTemplateId,
            battleSquaddieId: playerKnightDynamic.battleSquaddieId,
            coordinate: { q: 0, r: 1 },
        })

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        })

        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            gameEngineState,
        })
        const actionStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: actionStep,
            battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: actionStep,
            actionTemplateId: shortBowAction.id,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: actionStep,
            targetCoordinate: { q: 0, r: 1 },
        })
        expect(actualInstruction).toStrictEqual([actionStep])
    })

    it("will not change the currently acting squaddie", () => {
        const longBowAction = ActionTemplateService.new({
            name: "long bow",
            id: "long_bow",
            resourceCost: ActionResourceCostService.new({
                actionPoints: 2,
            }),
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 2,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
                }),
            ],
        })

        const {
            squaddieTemplate: enemyBanditStatic2,
            battleSquaddie: enemyBanditDynamic2,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            templateId: "enemy_bandit_2",
            battleId: "enemy_bandit_2",
            name: "Bandit",
            affiliation: SquaddieAffiliation.ENEMY,
            objectRepository: objectRepository,
            actionTemplateIds: [longBowAction.id],
        })
        BattleSquaddieTeamService.addBattleSquaddieIds(enemyTeam, [
            enemyBanditDynamic2.battleSquaddieId,
        ])

        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: enemyBanditDynamic2.squaddieTemplateId,
            battleSquaddieId: enemyBanditDynamic2.battleSquaddieId,
            coordinate: { q: 0, r: 1 },
        })
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: playerKnightDynamic.squaddieTemplateId,
            battleSquaddieId: playerKnightDynamic.battleSquaddieId,
            coordinate: { q: 0, r: 2 },
        })

        const movementStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: movementStep,
            battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: movementStep,
            movement: true,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: movementStep,
            targetCoordinate: { q: 0, r: 0 },
        })

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        })
        const actualInstruction = strategy.DetermineNextInstruction({
            team: enemyTeam,
            gameEngineState,
        })
        const actionStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: actionStep,
            battleSquaddieId: enemyBattleSquaddie.battleSquaddieId,
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: actionStep,
            actionTemplateId: shortBowAction.id,
        })
        BattleActionDecisionStepService.setConfirmedTarget({
            actionDecisionStep: actionStep,
            targetCoordinate: { q: 0, r: 2 },
        })
        expect(actualInstruction).toStrictEqual([actionStep])
    })

    it("should pass if there are no squaddies to act", () => {
        const allyTeam: BattleSquaddieTeam = BattleSquaddieTeamService.new({
            id: "allyTeamId",
            affiliation: SquaddieAffiliation.ALLY,
            battleSquaddieIds: [],
            name: "Da team",
            iconResourceKey: "icon_ally_team",
        })

        const strategy: TargetSquaddieInRange = new TargetSquaddieInRange({
            desiredBattleSquaddieId: playerKnightDynamic.battleSquaddieId,
        })
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            gameEngineState,
        })
        expect(actualInstruction).toBeUndefined()
    })
})
