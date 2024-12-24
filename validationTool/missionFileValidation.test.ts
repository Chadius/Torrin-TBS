import { MissionFileValidationService } from "./missionFileValidation"
import {
    MissionFileFormatService,
    NpcTeamMissionDeploymentService,
} from "../src/dataLoader/missionLoader"
import { SquaddieDeploymentService } from "../src/missionMap/squaddieDeployment"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"

describe("Mission File validation", () => {
    let consoleErrorSpy: MockInstance

    beforeEach(() => {
        consoleErrorSpy = vi.spyOn(console, "error").mockReturnValue()
    })
    afterEach(() => {
        consoleErrorSpy.mockRestore()
    })

    it("knows when the json is invalid", () => {
        const badJSON = "Bad JSON"
        expect(() => {
            MissionFileValidationService.validateJSON(badJSON)
        }).toThrow("is not valid JSON")
        expect(consoleErrorSpy).toBeCalled()
    })

    it("knows when the map fails sanitization", () => {
        const mission = MissionFileFormatService.new({
            id: "missionId",
            player: {
                deployment: SquaddieDeploymentService.default(),
                teamId: "",
                teamName: "",
                iconResourceKey: "",
            },
        })

        mission.id = undefined
        expect(() => {
            MissionFileValidationService.validateMissionFileFormat(mission)
        }).toThrow("missing id")
        expect(consoleErrorSpy).toBeCalled()
    })
    it("fails validation because the squaddie is placed in an invalid coordinate", () => {
        const enemyDeployment = NpcTeamMissionDeploymentService.new()
        enemyDeployment.templateIds = ["enemyTemplateId"]
        enemyDeployment.mapPlacements = [
            {
                battleSquaddieId: "enemy 0",
                coordinate: { q: -1, r: 9001 },
                squaddieTemplateId: "enemyTemplateId",
            },
            {
                battleSquaddieId: "do not throw errors",
                coordinate: undefined,
                squaddieTemplateId: "enemyTemplateId",
            },
        ]

        const mission = MissionFileFormatService.new({
            id: "missionId",
            player: {
                deployment: SquaddieDeploymentService.default(),
                teamId: "",
                teamName: "",
                iconResourceKey: "",
            },
            terrain: ["1 1 1 "],
            npcDeployments: {
                enemy: enemyDeployment,
                ally: NpcTeamMissionDeploymentService.new(),
                noAffiliation: NpcTeamMissionDeploymentService.new(),
            },
        })

        expect(() => {
            MissionFileValidationService.validateMissionFileFormat(mission)
        }).toThrow("found squaddies that were placed with invalid coordinates.")
        expect(consoleErrorSpy).toBeCalledWith(
            `[MapValidationService] "enemy 0" is at coordinate (q: -1, r: 9001) which is not on the map`
        )
    })
    it("fails validation because two squaddies are deployed to the same coordinate", () => {
        const noAffiliationDeployment = NpcTeamMissionDeploymentService.new()
        noAffiliationDeployment.templateIds = ["noneTemplateId"]
        noAffiliationDeployment.mapPlacements = [
            {
                battleSquaddieId: "none 0",
                coordinate: { q: 0, r: 1 },
                squaddieTemplateId: "noneTemplateId",
            },
        ]

        const allyDeployment = NpcTeamMissionDeploymentService.new()
        allyDeployment.templateIds = ["allyTemplateId"]
        allyDeployment.mapPlacements = [
            {
                battleSquaddieId: "ally 0",
                coordinate: { q: 0, r: 1 },
                squaddieTemplateId: "allyTemplateId",
            },
        ]

        const mission = MissionFileFormatService.new({
            id: "missionId",
            player: {
                deployment: SquaddieDeploymentService.default(),
                teamId: "",
                teamName: "",
                iconResourceKey: "",
            },
            terrain: ["1 1 1 "],
            npcDeployments: {
                enemy: NpcTeamMissionDeploymentService.new(),
                ally: allyDeployment,
                noAffiliation: noAffiliationDeployment,
            },
        })

        expect(() => {
            MissionFileValidationService.validateMissionFileFormat(mission)
        }).toThrow("multiple squaddies at the same coordinate.")
        expect(consoleErrorSpy).toBeCalledWith(
            expect.stringContaining(
                `[MapValidationService] coordinate (q: 0, r: 1) has multiple squaddies`
            )
        )
    })
    it("fails validation because the team uses a squaddie that does not exist", () => {
        const enemyDeployment = NpcTeamMissionDeploymentService.new()
        enemyDeployment.teams = [
            {
                id: "team 0",
                name: "team 0",
                battleSquaddieIds: ["enemy 0", "enemy 1"],
                strategies: [],
                iconResourceKey: "",
            },
        ]

        const mission = MissionFileFormatService.new({
            id: "missionId",
            player: {
                deployment: SquaddieDeploymentService.default(),
                teamId: "",
                teamName: "",
                iconResourceKey: "",
            },
            terrain: ["1 1 1 "],
            npcDeployments: {
                enemy: enemyDeployment,
                ally: NpcTeamMissionDeploymentService.new(),
                noAffiliation: NpcTeamMissionDeploymentService.new(),
            },
        })

        expect(() => {
            MissionFileValidationService.validateMissionFileFormat(mission)
        }).toThrow("team has a squaddie id that does not exist.")
        expect(consoleErrorSpy).toBeCalledWith(
            expect.stringContaining(
                `[MapValidationService] team "team 0" uses non existent squaddies: "enemy 0", "enemy 1"`
            )
        )
    })
    it("fails validation because two teams have the same name", () => {
        const enemyDeployment = NpcTeamMissionDeploymentService.new()
        enemyDeployment.teams = [
            {
                id: "team 0",
                name: "team 0",
                battleSquaddieIds: [],
                strategies: [],
                iconResourceKey: "",
            },
        ]

        const allyDeployment = NpcTeamMissionDeploymentService.new()
        allyDeployment.teams = [
            {
                id: "team 0",
                name: "I have the same id as team 0",
                battleSquaddieIds: [],
                strategies: [],
                iconResourceKey: "",
            },
        ]

        const mission = MissionFileFormatService.new({
            id: "missionId",
            player: {
                deployment: SquaddieDeploymentService.default(),
                teamId: "",
                teamName: "",
                iconResourceKey: "",
            },
            terrain: ["1 1 1 "],
            npcDeployments: {
                enemy: enemyDeployment,
                ally: allyDeployment,
                noAffiliation: NpcTeamMissionDeploymentService.new(),
            },
        })

        expect(() => {
            MissionFileValidationService.validateMissionFileFormat(mission)
        }).toThrow("multiple teams with the same id")
        expect(consoleErrorSpy).toBeCalledWith(
            expect.stringContaining(
                `[MapValidationService] multiple teams have the same id "team 0": "team 0", "I have the same id as team 0"`
            )
        )
    })
    it("fails validation because the same squaddie is on two teams", () => {
        const enemyDeployment = NpcTeamMissionDeploymentService.new()
        enemyDeployment.mapPlacements = [
            {
                battleSquaddieId: "squaddie",
                coordinate: { q: 0, r: 1 },
                squaddieTemplateId: "squaddieTemplateId",
            },
        ]
        enemyDeployment.teams = [
            {
                id: "team 0",
                name: "team 0",
                battleSquaddieIds: ["squaddie"],
                strategies: [],
                iconResourceKey: "",
            },
        ]

        const allyDeployment = NpcTeamMissionDeploymentService.new()
        allyDeployment.teams = [
            {
                id: "team 1",
                name: "team 1",
                battleSquaddieIds: ["squaddie"],
                strategies: [],
                iconResourceKey: "",
            },
        ]
        allyDeployment.mapPlacements = [
            {
                battleSquaddieId: "squaddie",
                coordinate: { q: 0, r: 0 },
                squaddieTemplateId: "squaddieTemplateId",
            },
        ]

        const mission = MissionFileFormatService.new({
            id: "missionId",
            player: {
                deployment: SquaddieDeploymentService.default(),
                teamId: "",
                teamName: "",
                iconResourceKey: "",
            },
            terrain: ["1 1 1 "],
            npcDeployments: {
                enemy: enemyDeployment,
                ally: allyDeployment,
                noAffiliation: NpcTeamMissionDeploymentService.new(),
            },
        })

        expect(() => {
            MissionFileValidationService.validateMissionFileFormat(mission)
        }).toThrow("squaddie is on multiple teams")
        expect(consoleErrorSpy).toBeCalledWith(
            expect.stringContaining(
                `[MapValidationService] "squaddie" is on multiple teams: "team 0", "team 1"`
            )
        )
    })
})
