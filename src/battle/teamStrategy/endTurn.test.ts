import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { EndTurnTeamStrategy } from "./endTurn"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { DefaultArmyAttributes } from "../../squaddie/armyAttributes"
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
import { beforeEach, describe, expect, it } from "vitest"
import { DebugModeMenuService } from "../hud/debugModeMenu/debugModeMenu"

describe("end turn team strategy", () => {
    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie
    let repository: ObjectRepository
    let squaddieTeam: BattleSquaddieTeam
    let missionMap: MissionMap
    let gameEngineState: GameEngineState

    beforeEach(() => {
        repository = ObjectRepositoryService.new()
        playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: {
                templateId: "new_static_squaddie",
                name: "Nahla",
                resources: {
                    mapIconResourceKey: "",
                    actionSpritesByEmotion: {},
                },
                traits: TraitStatusStorageService.newUsingTraitValues(),
                affiliation: SquaddieAffiliation.PLAYER,
            },
            attributes: DefaultArmyAttributes(),
        })

        ObjectRepositoryService.addSquaddieTemplate(
            repository,
            playerSquaddieTemplate
        )

        playerBattleSquaddie = BattleSquaddieService.newBattleSquaddie({
            battleSquaddieId: "new_dynamic_squaddie",
            squaddieTemplateId: "new_static_squaddie",
            squaddieTurn: SquaddieTurnService.new(),
        })

        ObjectRepositoryService.addBattleSquaddie(
            repository,
            playerBattleSquaddie
        )

        squaddieTeam = BattleSquaddieTeamService.new({
            id: "playerTeamId",
            name: "team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
            iconResourceKey: "icon_player_team",
        })
        BattleSquaddieTeamService.addBattleSquaddieIds(squaddieTeam, [
            "new_dynamic_squaddie",
        ])

        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({ movementCost: ["1 "] }),
        })

        gameEngineState = GameEngineStateService.new({
            repository: repository,
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    missionId: "missionId",
                    campaignId: "campaignId",
                    missionMap,
                    teams: [squaddieTeam],
                }),
            }),
        })
    })

    it("determines it should end its turn", () => {
        MissionMapService.addSquaddie({
            missionMap,
            squaddieTemplateId: "new_static_squaddie",
            battleSquaddieId: "new_dynamic_squaddie",
            originMapCoordinate: { q: 0, r: 0 },
        })

        const endTurnStep: BattleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep: endTurnStep,
            battleSquaddieId: "new_dynamic_squaddie",
        })
        BattleActionDecisionStepService.addAction({
            actionDecisionStep: endTurnStep,
            endTurn: true,
        })

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy()
        const actualInstruction = strategy.DetermineNextInstruction({
            team: squaddieTeam,
            gameEngineState,
            behaviorOverrides: DebugModeMenuService.getDebugModeFlags(
                gameEngineState.battleOrchestratorState.battleHUD.debugMode
            ).behaviorOverrides,
        })

        expect(actualInstruction).toStrictEqual([endTurnStep])
    })

    it("is undefined when there are no squaddies", () => {
        const noSquaddieTeam: BattleSquaddieTeam =
            BattleSquaddieTeamService.new({
                id: "playerTeamId",
                name: "no squaddies team",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: [],
                iconResourceKey: "icon_player_team",
            })

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy()
        const actualInstruction = strategy.DetermineNextInstruction({
            team: noSquaddieTeam,
            gameEngineState,
            behaviorOverrides: DebugModeMenuService.getDebugModeFlags(
                gameEngineState.battleOrchestratorState.battleHUD.debugMode
            ).behaviorOverrides,
        })

        expect(actualInstruction).toBeUndefined()
    })

    it("is undefined when squaddies have no actions", () => {
        BattleSquaddieService.endTurn(playerBattleSquaddie)

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy()
        const actualInstruction = strategy.DetermineNextInstruction({
            team: squaddieTeam,
            gameEngineState,
            behaviorOverrides: DebugModeMenuService.getDebugModeFlags(
                gameEngineState.battleOrchestratorState.battleHUD.debugMode
            ).behaviorOverrides,
        })

        expect(actualInstruction).toBeUndefined()
    })
})
