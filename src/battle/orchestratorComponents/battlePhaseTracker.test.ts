import { BattleSquaddieTeam } from "../battleSquaddieTeam"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddieService } from "../battleSquaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieTurnService } from "../../squaddie/turn"
import { BattlePhase, BattlePhaseService } from "./battlePhaseTracker"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import { BattlePhaseState } from "./battlePhaseController"
import { DefaultArmyAttributes } from "../../squaddie/armyAttributes"
import { SquaddieTemplateService } from "../../campaign/squaddieTemplate"
import { beforeEach, describe, expect, it } from "vitest"

describe("battlePhaseTracker", () => {
    let playerSquaddieTeam: BattleSquaddieTeam
    let enemySquaddieTeam: BattleSquaddieTeam
    let allySquaddieTeam: BattleSquaddieTeam
    let noneSquaddieTeam: BattleSquaddieTeam
    let squaddieRepo: ObjectRepository

    beforeEach(() => {
        squaddieRepo = ObjectRepositoryService.new()

        ObjectRepositoryService.addSquaddieTemplate(
            squaddieRepo,
            SquaddieTemplateService.new({
                squaddieId: {
                    templateId: "player_squaddie",
                    name: "Player",
                    resources: {
                        mapIconResourceKey: "",
                        actionSpritesByEmotion: {},
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues(),
                    affiliation: SquaddieAffiliation.PLAYER,
                },
                attributes: DefaultArmyAttributes(),
            })
        )
        ObjectRepositoryService.addBattleSquaddie(
            squaddieRepo,
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "player_squaddie_0",
                squaddieTemplateId: "player_squaddie",
                squaddieTurn: SquaddieTurnService.new(),
            })
        )
        ObjectRepositoryService.addBattleSquaddie(
            squaddieRepo,
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "player_squaddie_1",
                squaddieTemplateId: "player_squaddie",
                squaddieTurn: SquaddieTurnService.new(),
            })
        )

        ObjectRepositoryService.addSquaddieTemplate(
            squaddieRepo,
            SquaddieTemplateService.new({
                squaddieId: {
                    templateId: "enemy_squaddie",
                    name: "Enemy",
                    resources: {
                        mapIconResourceKey: "",
                        actionSpritesByEmotion: {},
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues(),
                    affiliation: SquaddieAffiliation.ENEMY,
                },
                attributes: DefaultArmyAttributes(),
            })
        )
        ObjectRepositoryService.addBattleSquaddie(
            squaddieRepo,
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "enemy_squaddie_0",
                squaddieTemplateId: "enemy_squaddie",
                squaddieTurn: SquaddieTurnService.new(),
            })
        )

        ObjectRepositoryService.addSquaddieTemplate(
            squaddieRepo,
            SquaddieTemplateService.new({
                squaddieId: {
                    templateId: "ally_squaddie",
                    name: "Ally",
                    resources: {
                        mapIconResourceKey: "",
                        actionSpritesByEmotion: {},
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues(),
                    affiliation: SquaddieAffiliation.ALLY,
                },
                attributes: DefaultArmyAttributes(),
            })
        )
        ObjectRepositoryService.addBattleSquaddie(
            squaddieRepo,
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "ally_squaddie_0",
                squaddieTemplateId: "ally_squaddie",
                squaddieTurn: SquaddieTurnService.new(),
            })
        )

        ObjectRepositoryService.addSquaddieTemplate(
            squaddieRepo,
            SquaddieTemplateService.new({
                squaddieId: {
                    templateId: "none_squaddie",
                    name: "None",
                    resources: {
                        mapIconResourceKey: "",
                        actionSpritesByEmotion: {},
                    },
                    traits: TraitStatusStorageService.newUsingTraitValues(),
                    affiliation: SquaddieAffiliation.NONE,
                },
                attributes: DefaultArmyAttributes(),
            })
        )
        ObjectRepositoryService.addBattleSquaddie(
            squaddieRepo,
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "none_squaddie_0",
                squaddieTemplateId: "none_squaddie",
                squaddieTurn: SquaddieTurnService.new(),
            })
        )

        playerSquaddieTeam = {
            id: "playerTeamId",
            name: "Player Team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: ["player_squaddie_0"],
            iconResourceKey: "icon_player_team",
        }
        enemySquaddieTeam = {
            id: "enemyTeamId",
            name: "Enemy Team",
            affiliation: SquaddieAffiliation.ENEMY,
            battleSquaddieIds: ["enemy_squaddie_0"],
            iconResourceKey: "icon_enemy_team",
        }
        allySquaddieTeam = {
            id: "allyTeamId",
            name: "Ally Team",
            affiliation: SquaddieAffiliation.ALLY,
            battleSquaddieIds: ["ally_squaddie_0"],
            iconResourceKey: "icon_ally_team",
        }
        noneSquaddieTeam = {
            id: "noAffiliationTeamId",
            name: "None Team",
            affiliation: SquaddieAffiliation.NONE,
            battleSquaddieIds: ["none_squaddie_0"],
            iconResourceKey: "icon_none_team",
        }
    })

    it("defaults to the first added team", () => {
        const teams = [playerSquaddieTeam]

        const battlePhaseState: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }

        BattlePhaseService.AdvanceToNextPhase(battlePhaseState, teams)
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER)
    })

    it("defaults to the first player team when multiple teams are added", () => {
        const teams = [playerSquaddieTeam, enemySquaddieTeam]

        const battlePhaseState: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }
        BattlePhaseService.AdvanceToNextPhase(battlePhaseState, teams)
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER)
    })

    it("will rotate between phases when advance is called", () => {
        const teams: BattleSquaddieTeam[] = [
            playerSquaddieTeam,
            enemySquaddieTeam,
            allySquaddieTeam,
            noneSquaddieTeam,
        ]

        const battlePhaseState: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }

        BattlePhaseService.AdvanceToNextPhase(battlePhaseState, teams)
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER)
        expect(battlePhaseState.turnCount).toBe(1)

        BattlePhaseService.AdvanceToNextPhase(battlePhaseState, teams)
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.ENEMY)
        expect(battlePhaseState.turnCount).toBe(1)

        BattlePhaseService.AdvanceToNextPhase(battlePhaseState, teams)
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.ALLY)
        expect(battlePhaseState.turnCount).toBe(1)

        BattlePhaseService.AdvanceToNextPhase(battlePhaseState, teams)
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.NONE)
        expect(battlePhaseState.turnCount).toBe(1)

        BattlePhaseService.AdvanceToNextPhase(battlePhaseState, teams)
        expect(battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER)
        expect(battlePhaseState.turnCount).toBe(2)
    })

    it("throws an error if no teams are added", () => {
        const battlePhaseState: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        }

        const shouldThrowError = () => {
            BattlePhaseService.AdvanceToNextPhase(battlePhaseState, [])
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
        expect(() => {
            shouldThrowError()
        }).toThrow("No teams are available")
    })
})
