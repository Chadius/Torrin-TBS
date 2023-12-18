import {BattleSquaddie, BattleSquaddieHelper} from "./battleSquaddie";
import {Trait, TraitStatusStorageHelper} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {CreateNewSquaddieMovementWithTraits} from "../squaddie/movement";
import {SquaddieTurn, SquaddieTurnHandler} from "../squaddie/turn";
import {ObjectRepository, ObjectRepositoryHelper} from "./objectRepository";
import {getResultOrThrowError, isError, unwrapResultOrError} from "../utils/ResultOrError";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";

describe('BattleSquaddieRepository', () => {
    let squaddieRepo: ObjectRepository;
    let squaddieTemplateBase: SquaddieTemplate;
    let battleSquaddieBase: BattleSquaddie;

    beforeEach(() => {
        squaddieRepo = ObjectRepositoryHelper.new();
        squaddieTemplateBase = {
            attributes: {
                maxHitPoints: 1,
                armorClass: 0,
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                    traits: {
                        booleanTraits: {
                            [Trait.PASS_THROUGH_WALLS]: true,
                        }
                    }
                }),
            },
            squaddieId: {
                templateId: "player_young_torrin",
                name: "Torrin",
                resources: {
                    mapIconResourceKey: "",
                    actionSpritesByEmotion: {},
                },
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
                affiliation: SquaddieAffiliation.PLAYER,
            },
            actions: [],
        };
        battleSquaddieBase = BattleSquaddieHelper.newBattleSquaddie({
            battleSquaddieId: "player_young_torrin_0",
            squaddieTemplateId: "player_young_torrin",
            squaddieTurn: {remainingActionPoints: 3}
        });

        ObjectRepositoryHelper.addSquaddieTemplate(
            squaddieRepo,
            squaddieTemplateBase
        );
    });

    it('retrieves squaddie info by battle id', () => {
        ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo,
            battleSquaddieBase
        )

        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepo, "player_young_torrin_0"))

        expect(squaddieTemplate).toStrictEqual(squaddieTemplate);
        expect(battleSquaddie).toStrictEqual(battleSquaddie);
    });

    it('should throw error if you add already existing static squaddie', () => {
        const shouldThrowError = () => {
            ObjectRepositoryHelper.addSquaddieTemplate(squaddieRepo,
                squaddieTemplateBase
            );
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("cannot addSquaddieTemplate 'player_young_torrin', is already added");
    });

    it("should throw error if you add battle squaddie for static squaddie that doesn't exist", () => {
        const shouldThrowError = () => {
            ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo,
                BattleSquaddieHelper.newBattleSquaddie({
                    battleSquaddieId: "battle_id",
                    squaddieTemplateId: "unknown_static_squaddie",
                    squaddieTurn: {remainingActionPoints: 3},
                })
            );
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("cannot addBattleSquaddie 'battle_id', no squaddie template with Id 'unknown_static_squaddie' exists");
    });

    it("should throw error if you add battle squaddie for battle squaddie that already exists", () => {
        ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo,
            battleSquaddieBase
        )

        const shouldThrowError = () => {
            ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo,
                battleSquaddieBase
            );
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("cannot addBattleSquaddie 'player_young_torrin_0', again, it already exists");
    });

    it('should throw an error if battle squaddie is invalid', () => {
        const shouldThrowError = () => {
            ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo,
                battleSquaddieBase = BattleSquaddieHelper.newBattleSquaddie({
                    battleSquaddieId: "",
                    squaddieTemplateId: "static",
                    squaddieTurn: {remainingActionPoints: 3},
                })
            );
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Battle Squaddie has no Id");
    })

    it("getBattleSquaddieByID should return error if battle squaddie doesn't exist", () => {
        const resultOrError = ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepo, "player_young_torrin_0")

        expect(isError(resultOrError)).toBeTruthy();

        const expectedError = unwrapResultOrError(resultOrError);
        expect((expectedError as Error).message).toBe("cannot getBattleSquaddieByID for 'player_young_torrin_0', does not exist");
    });

    it('should get an iterator across all static ids', () => {
        ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo,
            battleSquaddieBase
        )

        const entities: {
            squaddieTemplateId: string,
            squaddieTemplate: SquaddieTemplate
        }[] = ObjectRepositoryHelper.getSquaddieTemplateIterator(squaddieRepo,);

        expect(entities).toStrictEqual([{
            squaddieTemplateId: squaddieTemplateBase.squaddieId.templateId,
            squaddieTemplate: squaddieTemplateBase
        }]);
    });

    it('should get an iterator across all battle ids', () => {
        ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo,
            battleSquaddieBase
        )

        const entities: {
            battleSquaddieId: string,
            battleSquaddie: BattleSquaddie
        }[] = ObjectRepositoryHelper.getBattleSquaddieIterator(squaddieRepo,);
        expect(entities).toStrictEqual([{
            battleSquaddieId: "player_young_torrin_0",
            battleSquaddie: battleSquaddieBase
        }]);
    });

    it("should update existing battle squaddie", () => {
        ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo,
            battleSquaddieBase
        )
        expect(SquaddieTurnHandler.hasActionPointsRemaining(battleSquaddieBase.squaddieTurn)).toBeTruthy();

        const turnEnded: SquaddieTurn = {remainingActionPoints: 3};
        SquaddieTurnHandler.endTurn(turnEnded);
        ObjectRepositoryHelper.updateBattleSquaddie(squaddieRepo,
            BattleSquaddieHelper.newBattleSquaddie({
                battleSquaddieId: battleSquaddieBase.battleSquaddieId,
                squaddieTemplateId: battleSquaddieBase.squaddieTemplateId,
                squaddieTurn: turnEnded,
                squaddieTemplate: squaddieTemplateBase,
            })
        );

        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(ObjectRepositoryHelper.getSquaddieByBattleId(squaddieRepo, "player_young_torrin_0"))

        expect(squaddieTemplate).toStrictEqual(squaddieTemplate);
        expect(SquaddieTurnHandler.hasActionPointsRemaining(battleSquaddie.squaddieTurn)).toBeFalsy();
    });

    it("should throw error if you update a battle squaddie to a non existent template", () => {
        ObjectRepositoryHelper.addBattleSquaddie(squaddieRepo,
            battleSquaddieBase
        )

        const shouldThrowError = () => {
            const badBattleSquaddie = BattleSquaddieHelper.newBattleSquaddie({
                battleSquaddieId: battleSquaddieBase.battleSquaddieId,
                squaddieTemplateId: "does not exist",
                squaddieTurn: {remainingActionPoints: 3},
            });

            ObjectRepositoryHelper.updateBattleSquaddie(squaddieRepo,
                badBattleSquaddie
            );
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow(`cannot updateBattleSquaddie '${battleSquaddieBase.battleSquaddieId}', no squaddie template with id 'does not exist' exists`);
    });
});
