import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../squaddie/id"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { BattleSquaddie, BattleSquaddieService } from "../battleSquaddie"
import { TeamStrategyService } from "./teamStrategyCalculator"
import { SquaddieTurnService } from "../../squaddie/turn"
import { beforeEach, describe, expect, it } from "vitest"

describe("team strategy calculator", () => {
    describe("getCurrentlyActingSquaddieWhoCanAct", () => {
        let team: BattleSquaddieTeam
        let repository: ObjectRepository
        let battleSquaddie0: BattleSquaddie
        let battleSquaddie1: BattleSquaddie

        let battleSquaddie0Id: string
        let battleSquaddie1Id: string

        beforeEach(() => {
            repository = ObjectRepositoryService.new()
            const squaddieTemplate: SquaddieTemplate =
                SquaddieTemplateService.new({
                    squaddieId: SquaddieIdService.new({
                        squaddieTemplateId: "squaddieTemplateId",
                        name: "squaddieTemplateName",
                        affiliation: SquaddieAffiliation.PLAYER,
                    }),
                })
            battleSquaddie0Id = "battleSquaddie0Id"
            battleSquaddie1Id = "battleSquaddie1Id"

            battleSquaddie0 = BattleSquaddieService.new({
                battleSquaddieId: battleSquaddie0Id,
                squaddieTemplate,
            })
            battleSquaddie1 = BattleSquaddieService.new({
                battleSquaddieId: battleSquaddie1Id,
                squaddieTemplate,
            })

            ObjectRepositoryService.addSquaddieTemplate(
                repository,
                squaddieTemplate
            )
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                battleSquaddie0
            )
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                battleSquaddie1
            )

            team = BattleSquaddieTeamService.new({
                id: "team id",
                name: "team name",
                affiliation: SquaddieAffiliation.PLAYER,
                battleSquaddieIds: [battleSquaddie0Id, battleSquaddie1Id],
            })
        })

        it("returns undefined if there are no squaddies", () => {
            expect(
                TeamStrategyService.getCurrentlyActingSquaddieWhoCanAct({
                    team: undefined,
                    objectRepository: repository,
                })
            ).toBeUndefined()
        })
        it("returns undefined if all squaddies ended their turn", () => {
            SquaddieTurnService.endTurn(battleSquaddie0.squaddieTurn)
            SquaddieTurnService.endTurn(battleSquaddie1.squaddieTurn)
            expect(
                TeamStrategyService.getCurrentlyActingSquaddieWhoCanAct({
                    team,
                    objectRepository: repository,
                })
            ).toBeUndefined()
        })
        it("returns a squaddie who can act if no one has started their turn", () => {
            expect(
                TeamStrategyService.getCurrentlyActingSquaddieWhoCanAct({
                    team,
                    objectRepository: repository,
                })
            ).not.toBeUndefined()
        })
    })
})
