import { BattleSquaddie, BattleSquaddieService } from "./battleSquaddie"
import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import { CreateNewSquaddieMovementWithTraits } from "../squaddie/movement"
import { SquaddieTurn, SquaddieTurnService } from "../squaddie/turn"
import { ObjectRepository, ObjectRepositoryService } from "./objectRepository"
import {
    getResultOrThrowError,
    isError,
    unwrapResultOrError,
} from "../utils/ResultOrError"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../campaign/squaddieTemplate"

describe("BattleSquaddieRepository", () => {
    let squaddieRepo: ObjectRepository
    let squaddieTemplateBase: SquaddieTemplate
    let battleSquaddieBase: BattleSquaddie

    beforeEach(() => {
        squaddieRepo = ObjectRepositoryService.new()
        squaddieTemplateBase = SquaddieTemplateService.new({
            attributes: {
                maxHitPoints: 1,
                armorClass: 0,
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                    traits: {
                        booleanTraits: {
                            [Trait.PASS_THROUGH_WALLS]: true,
                        },
                    },
                }),
            },
            squaddieId: {
                templateId: "player_young_torrin",
                name: "Torrin",
                resources: {
                    mapIconResourceKey: "",
                    actionSpritesByEmotion: {},
                },
                traits: TraitStatusStorageService.newUsingTraitValues(),
                affiliation: SquaddieAffiliation.PLAYER,
            },
        })
        battleSquaddieBase = BattleSquaddieService.newBattleSquaddie({
            battleSquaddieId: "player_young_torrin_0",
            squaddieTemplateId: "player_young_torrin",
            squaddieTurn: { remainingActionPoints: 3 },
        })

        ObjectRepositoryService.addSquaddieTemplate(
            squaddieRepo,
            squaddieTemplateBase
        )
    })

    it("retrieves squaddie info by battle id", () => {
        ObjectRepositoryService.addBattleSquaddie(
            squaddieRepo,
            battleSquaddieBase
        )

        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                squaddieRepo,
                "player_young_torrin_0"
            )
        )

        expect(squaddieTemplate).toStrictEqual(squaddieTemplate)
        expect(battleSquaddie).toStrictEqual(battleSquaddie)
    })

    it("should throw error if you add already existing static squaddie", () => {
        const shouldThrowError = () => {
            ObjectRepositoryService.addSquaddieTemplate(
                squaddieRepo,
                squaddieTemplateBase
            )
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
        expect(() => {
            shouldThrowError()
        }).toThrow(
            "cannot addSquaddieTemplate 'player_young_torrin', is already added"
        )
    })

    it("should throw error if you add battle squaddie for static squaddie that doesn't exist", () => {
        const shouldThrowError = () => {
            ObjectRepositoryService.addBattleSquaddie(
                squaddieRepo,
                BattleSquaddieService.newBattleSquaddie({
                    battleSquaddieId: "battle_id",
                    squaddieTemplateId: "unknown_static_squaddie",
                    squaddieTurn: { remainingActionPoints: 3 },
                })
            )
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
        expect(() => {
            shouldThrowError()
        }).toThrow(
            "cannot addBattleSquaddie 'battle_id', no squaddie template with Id 'unknown_static_squaddie' exists"
        )
    })

    it("should throw error if you add battle squaddie for battle squaddie that already exists", () => {
        ObjectRepositoryService.addBattleSquaddie(
            squaddieRepo,
            battleSquaddieBase
        )

        const shouldThrowError = () => {
            ObjectRepositoryService.addBattleSquaddie(
                squaddieRepo,
                battleSquaddieBase
            )
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
        expect(() => {
            shouldThrowError()
        }).toThrow(
            "cannot addBattleSquaddie 'player_young_torrin_0', again, it already exists"
        )
    })

    it("should throw an error if battle squaddie is invalid", () => {
        const shouldThrowError = () => {
            ObjectRepositoryService.addBattleSquaddie(
                squaddieRepo,
                (battleSquaddieBase = BattleSquaddieService.newBattleSquaddie({
                    battleSquaddieId: "",
                    squaddieTemplateId: "static",
                    squaddieTurn: { remainingActionPoints: 3 },
                }))
            )
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
        expect(() => {
            shouldThrowError()
        }).toThrow("Battle Squaddie has no Id")
    })

    it("getBattleSquaddieByID should return error if battle squaddie doesn't exist", () => {
        const resultOrError = ObjectRepositoryService.getSquaddieByBattleId(
            squaddieRepo,
            "player_young_torrin_0"
        )

        expect(isError(resultOrError)).toBeTruthy()

        const expectedError = unwrapResultOrError(resultOrError)
        expect((expectedError as Error).message).toBe(
            "cannot getBattleSquaddieByID for 'player_young_torrin_0', does not exist"
        )
    })

    it("should get an iterator across all static ids", () => {
        ObjectRepositoryService.addBattleSquaddie(
            squaddieRepo,
            battleSquaddieBase
        )

        const entities: {
            squaddieTemplateId: string
            squaddieTemplate: SquaddieTemplate
        }[] = ObjectRepositoryService.getSquaddieTemplateIterator(squaddieRepo)

        expect(entities).toStrictEqual([
            {
                squaddieTemplateId: squaddieTemplateBase.squaddieId.templateId,
                squaddieTemplate: squaddieTemplateBase,
            },
        ])
    })

    it("should get an iterator across all battle ids", () => {
        ObjectRepositoryService.addBattleSquaddie(
            squaddieRepo,
            battleSquaddieBase
        )

        const entities: {
            battleSquaddieId: string
            battleSquaddie: BattleSquaddie
        }[] = ObjectRepositoryService.getBattleSquaddieIterator(squaddieRepo)
        expect(entities).toStrictEqual([
            {
                battleSquaddieId: "player_young_torrin_0",
                battleSquaddie: battleSquaddieBase,
            },
        ])
    })

    it("should update existing battle squaddie", () => {
        ObjectRepositoryService.addBattleSquaddie(
            squaddieRepo,
            battleSquaddieBase
        )
        expect(
            SquaddieTurnService.hasActionPointsRemaining(
                battleSquaddieBase.squaddieTurn
            )
        ).toBeTruthy()

        const turnEnded: SquaddieTurn = { remainingActionPoints: 3 }
        SquaddieTurnService.endTurn(turnEnded)
        ObjectRepositoryService.updateBattleSquaddie(
            squaddieRepo,
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: battleSquaddieBase.battleSquaddieId,
                squaddieTemplateId: battleSquaddieBase.squaddieTemplateId,
                squaddieTurn: turnEnded,
                squaddieTemplate: squaddieTemplateBase,
            })
        )

        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                squaddieRepo,
                "player_young_torrin_0"
            )
        )

        expect(squaddieTemplate).toStrictEqual(squaddieTemplate)
        expect(
            SquaddieTurnService.hasActionPointsRemaining(
                battleSquaddie.squaddieTurn
            )
        ).toBeFalsy()
    })

    it("should throw error if you update a battle squaddie to a non existent template", () => {
        ObjectRepositoryService.addBattleSquaddie(
            squaddieRepo,
            battleSquaddieBase
        )

        const shouldThrowError = () => {
            const badBattleSquaddie = BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: battleSquaddieBase.battleSquaddieId,
                squaddieTemplateId: "does not exist",
                squaddieTurn: { remainingActionPoints: 3 },
            })

            ObjectRepositoryService.updateBattleSquaddie(
                squaddieRepo,
                badBattleSquaddie
            )
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error)
        expect(() => {
            shouldThrowError()
        }).toThrow(
            `cannot updateBattleSquaddie '${battleSquaddieBase.battleSquaddieId}', no squaddie template with id 'does not exist' exists`
        )
    })
})
