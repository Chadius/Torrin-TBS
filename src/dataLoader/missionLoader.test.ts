import {
    MissionFileFormat,
    MissionFileFormatService,
    NpcTeamMissionDeploymentService,
} from "./missionLoader"
import { SquaddieDeploymentService } from "../missionMap/squaddieDeployment"
import { beforeEach, describe, expect, it } from "vitest"

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
                delete validMission["player"]
                MissionFileFormatService.sanitize(validMission)
            }

            expect(throwErrorBecauseOfNoPlayer).toThrowError("cannot sanitize")
        })
        it("throws an error if the player section is missing team id", () => {
            const throwErrorBecauseOfPlayerIsMissingTeamId = () => {
                delete validMission.player.teamId
                MissionFileFormatService.sanitize(validMission)
            }

            expect(throwErrorBecauseOfPlayerIsMissingTeamId).toThrowError(
                "cannot sanitize"
            )
        })
        it("throws an error if the player section is missing team name", () => {
            const throwErrorBecauseOfPlayerIsMissingTeamName = () => {
                delete validMission.player.teamName
                MissionFileFormatService.sanitize(validMission)
            }

            expect(throwErrorBecauseOfPlayerIsMissingTeamName).toThrowError(
                "cannot sanitize"
            )
        })
        it("makes empty player deployment if it is missing", () => {
            delete validMission.player.deployment
            MissionFileFormatService.sanitize(validMission)

            expect(validMission.player.deployment).toEqual(
                SquaddieDeploymentService.default()
            )
        })
        it("makes empty enemy section if it is missing", () => {
            MissionFileFormatService.sanitize(validMission)
            expect(validMission.npcDeployments.enemy).toEqual(
                NpcTeamMissionDeploymentService.new()
            )
            expect(validMission.npcDeployments.ally).toEqual(
                NpcTeamMissionDeploymentService.new()
            )
            expect(validMission.npcDeployments.noAffiliation).toEqual(
                NpcTeamMissionDeploymentService.new()
            )
        })
        it("makes empty phase banner by affiliation section if it is missing", () => {
            MissionFileFormatService.sanitize(validMission)
            expect(validMission.phaseBannersByAffiliation).toEqual({})
        })
    })
})
