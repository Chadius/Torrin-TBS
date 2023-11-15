import {BattleSquaddie} from "./battleSquaddie";
import {Trait, TraitStatusStorageHelper} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {CreateNewSquaddieMovementWithTraits} from "../squaddie/movement";
import {SquaddieTurn, SquaddieTurnHandler} from "../squaddie/turn";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {getResultOrThrowError, isError, unwrapResultOrError} from "../utils/ResultOrError";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";

describe('BattleSquaddieRepository', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let squaddieTemplateBase: SquaddieTemplate;
    let battleSquaddieBase: BattleSquaddie;

    beforeEach(() => {
        squaddieRepo = new BattleSquaddieRepository();
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
        battleSquaddieBase = new BattleSquaddie({
            battleSquaddieId: "player_young_torrin_0",
            squaddieTemplateId: "player_young_torrin",
            squaddieTurn: {remainingActionPoints: 3}
        });

        squaddieRepo.addSquaddieTemplate(
            squaddieTemplateBase
        );
    });

    it('retrieves squaddie info by battle id', () => {
        squaddieRepo.addBattleSquaddie(
            battleSquaddieBase
        )

        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(squaddieRepo.getSquaddieByBattleId("player_young_torrin_0"))

        expect(squaddieTemplate).toStrictEqual(squaddieTemplate);
        expect(battleSquaddie).toStrictEqual(battleSquaddie);
    });

    it('should throw error if you add already existing static squaddie', () => {
        const shouldThrowError = () => {
            squaddieRepo.addSquaddieTemplate(
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
            squaddieRepo.addBattleSquaddie(
                new BattleSquaddie({
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
        squaddieRepo.addBattleSquaddie(
            battleSquaddieBase
        )

        const shouldThrowError = () => {
            squaddieRepo.addBattleSquaddie(
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
            squaddieRepo.addBattleSquaddie(
                battleSquaddieBase = new BattleSquaddie({
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
        const resultOrError = squaddieRepo.getSquaddieByBattleId("player_young_torrin_0")

        expect(isError(resultOrError)).toBeTruthy();

        const expectedError = unwrapResultOrError(resultOrError);
        expect((expectedError as Error).message).toBe("cannot getBattleSquaddieByID for 'player_young_torrin_0', does not exist");
    });

    it('should get an iterator across all static ids', () => {
        squaddieRepo.addBattleSquaddie(
            battleSquaddieBase
        )

        const entities: {
            squaddieTemplateId: string,
            squaddieTemplate: SquaddieTemplate
        }[] = squaddieRepo.getSquaddieTemplateIterator();

        expect(entities).toStrictEqual([{
            squaddieTemplateId: squaddieTemplateBase.squaddieId.templateId,
            squaddieTemplate: squaddieTemplateBase
        }]);
    });

    it('should get an iterator across all battle ids', () => {
        squaddieRepo.addBattleSquaddie(
            battleSquaddieBase
        )

        const entities: {
            battleSquaddieId: string,
            battleSquaddie: BattleSquaddie
        }[] = squaddieRepo.getBattleSquaddieIterator();
        expect(entities).toStrictEqual([{
            battleSquaddieId: "player_young_torrin_0",
            battleSquaddie: battleSquaddieBase
        }]);
    });

    it("should update existing battle squaddie", () => {
        squaddieRepo.addBattleSquaddie(
            battleSquaddieBase
        )
        expect(SquaddieTurnHandler.hasActionPointsRemaining(battleSquaddieBase.squaddieTurn)).toBeTruthy();

        const turnEnded: SquaddieTurn = {remainingActionPoints: 3};
        SquaddieTurnHandler.endTurn(turnEnded);
        squaddieRepo.updateBattleSquaddie(
            new BattleSquaddie({
                battleSquaddieId: battleSquaddieBase.battleSquaddieId,
                squaddieTemplateId: battleSquaddieBase.squaddieTemplateId,
                squaddieTurn: turnEnded,
                squaddieTemplate: squaddieTemplateBase,
            })
        );

        const {
            squaddieTemplate,
            battleSquaddie,
        } = getResultOrThrowError(squaddieRepo.getSquaddieByBattleId("player_young_torrin_0"))

        expect(squaddieTemplate).toStrictEqual(squaddieTemplate);
        expect(SquaddieTurnHandler.hasActionPointsRemaining(battleSquaddie.squaddieTurn)).toBeFalsy();
    });

    it("should throw error if you update a battle squaddie to a non existent template", () => {
        squaddieRepo.addBattleSquaddie(
            battleSquaddieBase
        )

        const shouldThrowError = () => {
            const badBattleSquaddie = new BattleSquaddie({
                battleSquaddieId: battleSquaddieBase.battleSquaddieId,
                squaddieTemplateId: "does not exist",
                squaddieTurn: {remainingActionPoints: 3},
            });

            squaddieRepo.updateBattleSquaddie(
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
