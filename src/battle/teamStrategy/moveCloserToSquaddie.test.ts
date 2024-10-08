import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { MissionMap } from "../../missionMap/missionMap"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { SquaddieMovementService } from "../../squaddie/movement"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { MoveCloserToSquaddie } from "./moveCloserToSquaddie"
import { BattleSquaddie } from "../battleSquaddie"
import { DefaultArmyAttributes } from "../../squaddie/armyAttributes"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { DamageType } from "../../squaddie/squaddieService"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import {
    BattleActionDecisionStep,
    BattleActionDecisionStepService,
} from "../actionDecision/battleActionDecisionStep"
import { InBattleAttributesService } from "../stats/inBattleAttributes"

describe("move towards closest squaddie in range", () => {
    let repository: ObjectRepository
    let missionMap: MissionMap
    let targetSquaddieTemplate: SquaddieTemplate
    let targetBattleSquaddie: BattleSquaddie
    let ignoredSquaddieStatic: SquaddieTemplate
    let ignoredSquaddieDynamic: BattleSquaddie
    let searchingSquaddieTemplate: SquaddieTemplate
    let target: BattleSquaddie
    let allyTeam: BattleSquaddieTeam

    beforeEach(() => {
        repository = ObjectRepositoryService.new()
        ;({
            squaddieTemplate: targetSquaddieTemplate,
            battleSquaddie: targetBattleSquaddie,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            templateId: "target_squaddie",
            battleId: "target_squaddie_0",
            name: "Target",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: repository,
            actionTemplateIds: [],
        }))
        ;({
            squaddieTemplate: ignoredSquaddieStatic,
            battleSquaddie: ignoredSquaddieDynamic,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            templateId: "ignored_squaddie",
            battleId: "ignored_squaddie_0",
            name: "Ignored",
            affiliation: SquaddieAffiliation.PLAYER,
            objectRepository: repository,
            actionTemplateIds: [],
        }))
        ;({
            squaddieTemplate: searchingSquaddieTemplate,
            battleSquaddie: target,
        } = SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
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
    })

    it("will move towards squaddie with given dynamic Id", () => {
        missionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 1 1 1 "],
            }),
        })
        missionMap.addSquaddie(
            targetSquaddieTemplate.squaddieId.templateId,
            "target_squaddie_0",
            {
                q: 0,
                r: 0,
            }
        )
        missionMap.addSquaddie(
            ignoredSquaddieStatic.squaddieId.templateId,
            "ignored_squaddie_0",
            {
                q: 0,
                r: 3,
            }
        )
        missionMap.addSquaddie(
            searchingSquaddieTemplate.squaddieId.templateId,
            "searching_squaddie_0",
            {
                q: 0,
                r: 2,
            }
        )

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
            targetLocation: { q: 0, r: 1 },
        })

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        })
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            missionMap,
            actionsThisRound: undefined,
            repository,
        })

        expect(actualInstruction).toStrictEqual([movementStep])
    })

    it("will not change the currently acting squaddie", () => {
        missionMap = new MissionMap({
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

        missionMap.addSquaddie(
            targetSquaddieTemplate.squaddieId.templateId,
            "target_squaddie_0",
            {
                q: 0,
                r: 0,
            }
        )
        missionMap.addSquaddie(
            searchingSquaddieStatic2.squaddieId.templateId,
            searchingBattleSquaddie2.battleSquaddieId,
            {
                q: 0,
                r: 3,
            }
        )
        missionMap.addSquaddie(
            searchingSquaddieTemplate.squaddieId.templateId,
            "searching_squaddie_0",
            {
                q: 0,
                r: 2,
            }
        )

        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: searchingBattleSquaddie2.battleSquaddieId,
            startingLocation: { q: 0, r: 5 },
            processedActions: [
                ProcessedActionService.new({
                    actionPointCost: 1,
                }),
            ],
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
            targetLocation: { q: 0, r: 1 },
        })

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        })
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            missionMap,
            actionsThisRound,
            repository,
        })

        expect(actualInstruction).toStrictEqual([movementStep])
    })

    it("will raise an error if there is no target", () => {
        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({})

        const shouldThrowError = () => {
            strategy.DetermineNextInstruction({
                team: allyTeam,
                missionMap,
                actionsThisRound: undefined,
                repository,
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
        missionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 1 1 1 ", " 1 1 1 1 1 1 1 1 1 "],
            }),
        })

        missionMap.addSquaddie(
            targetSquaddieTemplate.squaddieId.templateId,
            "target_squaddie_0",
            {
                q: 0,
                r: 0,
            }
        )
        missionMap.addSquaddie(
            searchingSquaddieTemplate.squaddieId.templateId,
            "searching_squaddie_0",
            {
                q: 0,
                r: 1,
            }
        )

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        })
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            missionMap,
            repository,
        })
        expect(actualInstruction).toBeUndefined()
    })

    it("will give no instruction if no targets are in range", () => {
        missionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 1 1 1 "],
            }),
        })

        missionMap.addSquaddie(
            targetSquaddieTemplate.squaddieId.templateId,
            "target_squaddie_0",
            {
                q: 0,
                r: 0,
            }
        )
        missionMap.addSquaddie(
            searchingSquaddieTemplate.squaddieId.templateId,
            "searching_squaddie_0",
            {
                q: 0,
                r: 8,
            }
        )

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        })
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            missionMap,
            repository,
        })
        expect(actualInstruction).toBeUndefined()
    })

    it("will move towards closest squaddie of a given affiliation", () => {
        missionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 1 1 1 "],
            }),
        })

        missionMap.addSquaddie(
            targetSquaddieTemplate.squaddieId.templateId,
            "target_squaddie_0",
            {
                q: 0,
                r: 0,
            }
        )
        missionMap.addSquaddie(
            ignoredSquaddieStatic.squaddieId.templateId,
            "ignored_squaddie_0",
            {
                q: 0,
                r: 8,
            }
        )
        missionMap.addSquaddie(
            searchingSquaddieTemplate.squaddieId.templateId,
            "searching_squaddie_0",
            {
                q: 0,
                r: 2,
            }
        )

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
            targetLocation: { q: 0, r: 1 },
        })

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredAffiliation: SquaddieAffiliation.PLAYER,
        })
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            missionMap,
            repository,
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

        missionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 ", " 1 1 1 "],
            }),
        })

        missionMap.addSquaddie(
            targetSquaddieTemplate.squaddieId.templateId,
            "target_squaddie_0",
            {
                q: 0,
                r: 2,
            }
        )
        missionMap.addSquaddie(
            ignoredSquaddieStatic.squaddieId.templateId,
            "player_squaddie_1",
            {
                q: 0,
                r: 1,
            }
        )
        missionMap.addSquaddie(
            searchingSquaddieTemplate.squaddieId.templateId,
            "searching_squaddie_0",
            {
                q: 0,
                r: 0,
            }
        )

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
            targetLocation: { q: 1, r: 1 },
        })

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredBattleSquaddieId: "target_squaddie_0",
        })
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            missionMap,
            repository,
        })
        expect(actualInstruction).toStrictEqual([movementStep])
    })

    it("will not follow dead squaddies", () => {
        missionMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 1 1 1 1 1 1 "],
            }),
        })

        missionMap.addSquaddie(
            targetSquaddieTemplate.squaddieId.templateId,
            "target_squaddie_0",
            {
                q: 0,
                r: 0,
            }
        )
        missionMap.addSquaddie(
            searchingSquaddieTemplate.squaddieId.templateId,
            "searching_squaddie_0",
            {
                q: 0,
                r: 3,
            }
        )

        InBattleAttributesService.takeDamage({
            inBattleAttributes: targetBattleSquaddie.inBattleAttributes,
            damageToTake: 9001,
            damageType: DamageType.UNKNOWN,
        })

        const strategy: MoveCloserToSquaddie = new MoveCloserToSquaddie({
            desiredAffiliation: SquaddieAffiliation.PLAYER,
        })
        const actualInstruction = strategy.DetermineNextInstruction({
            team: allyTeam,
            missionMap,
            repository,
        })
        expect(actualInstruction).toBeUndefined()
    })
})
