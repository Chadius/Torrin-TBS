import { BattleSquaddie, BattleSquaddieService } from "./battleSquaddie"
import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
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
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../action/template/actionEffectTemplate"
import { DamageType } from "../squaddie/squaddieService"
import { SquaddieMovementService } from "../squaddie/movement"
import { TargetConstraintsService } from "../action/targetConstraints"
import { ArmyAttributesService } from "../squaddie/armyAttributes"

describe("Object Repository", () => {
    let objectRepository: ObjectRepository
    let squaddieTemplateBase: SquaddieTemplate
    let battleSquaddieBase: BattleSquaddie

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        squaddieTemplateBase = SquaddieTemplateService.new({
            attributes: ArmyAttributesService.new({
                maxHitPoints: 1,
                armorClass: 0,
                movement: SquaddieMovementService.new({
                    movementPerAction: 2,
                    traits: {
                        booleanTraits: {
                            [Trait.PASS_THROUGH_WALLS]: true,
                        },
                    },
                }),
            }),
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
            objectRepository,
            squaddieTemplateBase
        )
    })

    it("retrieves squaddie info by battle id", () => {
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            battleSquaddieBase
        )

        expect(
            ObjectRepositoryService.hasSquaddieByBattleId(
                objectRepository,
                "player_young_torrin_0"
            )
        ).toBeTruthy()
        expect(
            ObjectRepositoryService.hasSquaddieByTemplateId(
                objectRepository,
                squaddieTemplateBase.squaddieId.templateId
            )
        ).toBeTruthy()

        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
                "player_young_torrin_0"
            )
        )

        expect(squaddieTemplate).toStrictEqual(squaddieTemplate)
        expect(battleSquaddie).toStrictEqual(battleSquaddie)
    })

    it("should throw error if you add already existing squaddie template", () => {
        const shouldThrowError = () => {
            ObjectRepositoryService.addSquaddieTemplate(
                objectRepository,
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
                objectRepository,
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
            objectRepository,
            battleSquaddieBase
        )

        const shouldThrowError = () => {
            ObjectRepositoryService.addBattleSquaddie(
                objectRepository,
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
                objectRepository,
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
            objectRepository,
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
            objectRepository,
            battleSquaddieBase
        )

        const entities: {
            squaddieTemplateId: string
            squaddieTemplate: SquaddieTemplate
        }[] =
            ObjectRepositoryService.getSquaddieTemplateIterator(
                objectRepository
            )

        expect(entities).toStrictEqual([
            {
                squaddieTemplateId: squaddieTemplateBase.squaddieId.templateId,
                squaddieTemplate: squaddieTemplateBase,
            },
        ])
    })

    it("should get an iterator across all battle ids", () => {
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
            battleSquaddieBase
        )

        const entities: {
            battleSquaddieId: string
            battleSquaddie: BattleSquaddie
        }[] =
            ObjectRepositoryService.getBattleSquaddieIterator(objectRepository)
        expect(entities).toStrictEqual([
            {
                battleSquaddieId: "player_young_torrin_0",
                battleSquaddie: battleSquaddieBase,
            },
        ])
    })

    it("should update existing battle squaddie", () => {
        ObjectRepositoryService.addBattleSquaddie(
            objectRepository,
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
            objectRepository,
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: battleSquaddieBase.battleSquaddieId,
                squaddieTemplateId: battleSquaddieBase.squaddieTemplateId,
                squaddieTurn: turnEnded,
                squaddieTemplate: squaddieTemplateBase,
            })
        )

        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                objectRepository,
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
            objectRepository,
            battleSquaddieBase
        )

        const shouldThrowError = () => {
            const badBattleSquaddie = BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: battleSquaddieBase.battleSquaddieId,
                squaddieTemplateId: "does not exist",
                squaddieTurn: { remainingActionPoints: 3 },
            })

            ObjectRepositoryService.updateBattleSquaddie(
                objectRepository,
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

    describe("Action Template", () => {
        let action: ActionTemplate

        beforeEach(() => {
            action = ActionTemplateService.new({
                id: "action",
                name: "Action Template",
                actionPoints: 2,
                buttonIconResourceKey: "image key",
                targetConstraints: TargetConstraintsService.new({
                    minimumRange: 0,
                    maximumRange: 2,
                }),
                actionEffectTemplates: [
                    ActionEffectTemplateService.new({
                        damageDescriptions: {
                            [DamageType.SOUL]: 2,
                        },
                        traits: TraitStatusStorageService.newUsingTraitValues({
                            [Trait.TARGET_FOE]: true,
                            [Trait.VERSUS_ARMOR]: true,
                        }),
                    }),
                ],
            })
        })

        it("can store and retrieve action templates by id", () => {
            ObjectRepositoryService.addActionTemplate(objectRepository, action)

            const actualAction = ObjectRepositoryService.getActionTemplateById(
                objectRepository,
                action.id
            )

            expect(actualAction).toEqual(action)
        })

        it("should throw an error if the action template id does not exist", () => {
            const shouldThrowError = () => {
                ObjectRepositoryService.getActionTemplateById(
                    objectRepository,
                    "non-existent-action-template"
                )
            }

            expect(shouldThrowError).toThrowError("does not exist")
        })

        it("should throw an error if you add two action templates with the same id", () => {
            ObjectRepositoryService.addActionTemplate(objectRepository, action)

            const shouldThrowError = () => {
                ObjectRepositoryService.addActionTemplate(
                    objectRepository,
                    action
                )
            }

            expect(shouldThrowError).toThrowError("already exists")
        })
    })
})
