import {
    MissionFileFormat,
    MissionFileFormatService,
    NpcTeamMissionDeploymentService,
} from "./missionLoader"
import { SquaddieDeploymentService } from "../missionMap/squaddieDeployment"
import { beforeEach, describe, expect, it } from "vitest"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"

describe("missionLoader", () => {
    describe("sanitization", () => {
        let validMission: MissionFileFormat
        beforeEach(() => {
            validMission = MissionFileFormatService.new({
                id: "mission id",
                player: {
                    teamId: "player team",
                    teamName: "playaz",
                    deployment: SquaddieDeploymentService.default(),
                    iconResourceKey: "affiliate_icon_infiltrators",
                },
            })
        })
        it("throws an error if id is missing", () => {
            const throwErrorBecauseOfNoId = () => {
                //@ts-ignore Intentionally deleting a required field to throw an error
                delete validMission["id"]
                MissionFileFormatService.sanitize(validMission)
            }

            expect(throwErrorBecauseOfNoId).toThrowError("cannot sanitize")
        })
        it("creates a default terrain if it is missing", () => {
            MissionFileFormatService.sanitize(validMission)
            expect(validMission.terrain).toEqual(["1 "])
        })
        it("makes empty objectives if it is missing", () => {
            MissionFileFormatService.sanitize(validMission)
            expect(validMission.objectives).toHaveLength(0)
        })
        it("throws an error if the player section is missing", () => {
            const throwErrorBecauseOfNoPlayer = () => {
                //@ts-ignore Intentionally deleting a required field to throw an error
                delete validMission["player"]
                MissionFileFormatService.sanitize(validMission)
            }

            expect(throwErrorBecauseOfNoPlayer).toThrowError("cannot sanitize")
        })
        it("throws an error if the player section is missing team id", () => {
            const throwErrorBecauseOfPlayerIsMissingTeamId = () => {
                //@ts-ignore Intentionally deleting a required field to throw an error
                delete validMission.player.teamId
                MissionFileFormatService.sanitize(validMission)
            }

            expect(throwErrorBecauseOfPlayerIsMissingTeamId).toThrowError(
                "cannot sanitize"
            )
        })
        it("throws an error if the player section is missing team name", () => {
            const throwErrorBecauseOfPlayerIsMissingTeamName = () => {
                //@ts-ignore Intentionally deleting a required field to throw an error
                delete validMission.player.teamName
                MissionFileFormatService.sanitize(validMission)
            }

            expect(throwErrorBecauseOfPlayerIsMissingTeamName).toThrowError(
                "cannot sanitize"
            )
        })
        it("makes empty player deployment if it is missing", () => {
            //@ts-ignore Intentionally deleting a required field to throw an error
            delete validMission.player.deployment
            MissionFileFormatService.sanitize(validMission)

            expect(validMission.player.deployment).toEqual(
                SquaddieDeploymentService.default()
            )
        })
        it("makes empty enemy section if it is missing", () => {
            MissionFileFormatService.sanitize(validMission)
            expect(validMission.npcDeployments.enemy).toEqual(
                NpcTeamMissionDeploymentService.null()
            )
            expect(validMission.npcDeployments.ally).toEqual(
                NpcTeamMissionDeploymentService.null()
            )
            expect(validMission.npcDeployments.noAffiliation).toEqual(
                NpcTeamMissionDeploymentService.null()
            )
        })
        it("makes empty phase banner by affiliation section if it is missing", () => {
            MissionFileFormatService.sanitize(validMission)
            expect(validMission.phaseBannersByAffiliation).toEqual({})
        })
    })
    it("can return all resourceKeys", () => {
        const enemyDeployment = NpcTeamMissionDeploymentService.new({
            templateIds: ["enemyTemplateId"],
            mapPlacements: [
                {
                    battleSquaddieId: "enemy 0",
                    coordinate: { q: 0, r: 0 },
                    squaddieTemplateId: "enemyTemplateId",
                },
            ],
            teams: [
                {
                    id: "enemy",
                    name: "enemy",
                    battleSquaddieIds: ["enemy 0"],
                    strategies: [],
                    iconResourceKey: "enemyTeamIconResourceKey",
                },
            ],
        })

        const allyDeployment = NpcTeamMissionDeploymentService.new({
            templateIds: ["allyTemplateId"],
            mapPlacements: [
                {
                    battleSquaddieId: "ally 0",
                    coordinate: { q: 0, r: 0 },
                    squaddieTemplateId: "allyTemplateId",
                },
            ],
            teams: [
                {
                    id: "ally",
                    name: "ally",
                    battleSquaddieIds: ["ally 0"],
                    strategies: [],
                    iconResourceKey: "allyTeamIconResourceKey",
                },
            ],
        })

        const noAffiliationDeployment = NpcTeamMissionDeploymentService.new({
            templateIds: ["noAffiliationTemplateId"],
            mapPlacements: [
                {
                    battleSquaddieId: "noAffiliation 0",
                    coordinate: { q: 0, r: 0 },
                    squaddieTemplateId: "noAffiliationTemplateId",
                },
            ],
            teams: [
                {
                    id: "noAffiliation",
                    name: "noAffiliation",
                    battleSquaddieIds: ["noAffiliation 0"],
                    strategies: [],
                    iconResourceKey: "noAffiliationTeamIconResourceKey",
                },
            ],
        })

        const missionFileFormat = MissionFileFormatService.new({
            id: "missionId",
            player: {
                deployment: SquaddieDeploymentService.default(),
                teamId: "",
                teamName: "",
                iconResourceKey: "playerTeamIconResourceKey",
            },
            terrain: ["1 1 1 "],
            npcDeployments: {
                enemy: enemyDeployment,
                ally: allyDeployment,
                noAffiliation: noAffiliationDeployment,
            },
            phaseBannersByAffiliation: {
                [BattlePhase.PLAYER]: "player banner",
                [BattlePhase.ENEMY]: "enemy banner",
                [BattlePhase.ALLY]: "ally banner",
                [BattlePhase.NONE]: "no affiliation banner",
            },
        })

        let expectedResourceKeys = [
            "playerTeamIconResourceKey",
            "enemyTeamIconResourceKey",
            "allyTeamIconResourceKey",
            "noAffiliationTeamIconResourceKey",
            "player banner",
            "enemy banner",
            "ally banner",
            "no affiliation banner",
        ]
        let actualResourceKeys =
            MissionFileFormatService.getAllResourceKeys(missionFileFormat)
        expect(actualResourceKeys).toEqual(expectedResourceKeys)
    })
})
