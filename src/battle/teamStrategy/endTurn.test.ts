import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieTurnService } from "../../squaddie/turn"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { MissionMap } from "../../missionMap/missionMap"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"
import { EndTurnTeamStrategy } from "./endTurn"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { DefaultArmyAttributes } from "../../squaddie/armyAttributes"
import { DecidedActionService } from "../../action/decided/decidedAction"
import { DecidedActionEndTurnEffectService } from "../../action/decided/decidedActionEndTurnEffect"
import { ActionEffectEndTurnTemplateService } from "../../action/template/actionEffectEndTurnTemplate"

describe("end turn team strategy", () => {
    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie
    let repository: ObjectRepository
    let squaddieTeam: BattleSquaddieTeam
    let missionMap: MissionMap

    beforeEach(() => {
        repository = ObjectRepositoryService.new()
        playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: {
                templateId: "new_static_squaddie",
                name: "Torrin",
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

        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({ movementCost: ["1 "] }),
        })
    })

    it("determines it should end its turn", () => {
        missionMap.addSquaddie("new_static_squaddie", "new_dynamic_squaddie", {
            q: 0,
            r: 0,
        })

        const expectedInstruction = DecidedActionService.new({
            actionTemplateName: "End Turn",
            battleSquaddieId: "new_dynamic_squaddie",
            actionEffects: [
                DecidedActionEndTurnEffectService.new({
                    template: ActionEffectEndTurnTemplateService.new({}),
                }),
            ],
        })

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy({})
        const actualInstruction = strategy.DetermineNextInstruction({
            team: squaddieTeam,
            missionMap,
            repository,
        })

        expect(actualInstruction).toStrictEqual(expectedInstruction)
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

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy({})
        const actualInstruction = strategy.DetermineNextInstruction({
            team: noSquaddieTeam,
            missionMap,
            repository,
        })

        expect(actualInstruction).toBeUndefined()
    })

    it("is undefined when squaddies have no actions", () => {
        BattleSquaddieService.endTurn(playerBattleSquaddie)

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy({})
        const actualInstruction = strategy.DetermineNextInstruction({
            team: squaddieTeam,
            missionMap,
            repository,
        })

        expect(actualInstruction).toBeUndefined()
    })
})
