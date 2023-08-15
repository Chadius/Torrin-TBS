import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {SquaddieId} from "../squaddie/id";
import {Trait, TraitCategory, TraitStatusStorage} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../squaddie/movement";
import {SquaddieTurn} from "../squaddie/turn";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {getResultOrThrowError, isError, unwrapResultOrError} from "../utils/ResultOrError";
import {ArmyAttributes} from "../squaddie/armyAttributes";
import {SquaddieResource} from "../squaddie/resource";

describe('BattleSquaddieRepository', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let staticSquaddieBase: BattleSquaddieStatic;
    let dynamicSquaddieBase: BattleSquaddieDynamic;

    beforeEach(() => {
        squaddieRepo = new BattleSquaddieRepository();
        staticSquaddieBase = new BattleSquaddieStatic({
            attributes: new ArmyAttributes({
                maxHitPoints: 1,
                armorClass: 0,
                movement: new SquaddieMovement({
                    movementPerAction: 2,
                    traits: new TraitStatusStorage({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }).filterCategory(TraitCategory.MOVEMENT)
                }),
            }),
            squaddieId: new SquaddieId({
                staticId: "player_young_torrin",
                name: "Torrin",
                resources: new SquaddieResource({}),
                traits: new TraitStatusStorage(),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            activities: [],
        });
        dynamicSquaddieBase = new BattleSquaddieDynamic({
            dynamicSquaddieId: "player_young_torrin_0",
            staticSquaddieId: "player_young_torrin",
            squaddieTurn: new SquaddieTurn()
        });

        squaddieRepo.addStaticSquaddie(
            staticSquaddieBase
        );
    });

    it('retrieves squaddie info by dynamic id', () => {
        squaddieRepo.addDynamicSquaddie(
            dynamicSquaddieBase
        )

        const {
            staticSquaddie,
            dynamicSquaddie,
        } = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicId("player_young_torrin_0"))

        expect(staticSquaddie).toStrictEqual(staticSquaddie);
        expect(dynamicSquaddie).toStrictEqual(dynamicSquaddie);
    });

    it('should throw error if you add already existing static squaddie', () => {
        const shouldThrowError = () => {
            squaddieRepo.addStaticSquaddie(
                staticSquaddieBase
            );
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("cannot addStaticSquaddie 'player_young_torrin', is already added");
    });

    it("should throw error if you add dynamic squaddie for static squaddie that doesn't exist", () => {
        const shouldThrowError = () => {
            squaddieRepo.addDynamicSquaddie(
                new BattleSquaddieDynamic({
                    dynamicSquaddieId: "dynamic_id",
                    staticSquaddieId: "unknown_static_squaddie",
                    squaddieTurn: new SquaddieTurn()
                })
            );
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("cannot addDynamicSquaddie 'dynamic_id', no static squaddie 'unknown_static_squaddie' exists");
    });

    it("should throw error if you add dynamic squaddie for dynamic squaddie that already exists", () => {
        squaddieRepo.addDynamicSquaddie(
            dynamicSquaddieBase
        )

        const shouldThrowError = () => {
            squaddieRepo.addDynamicSquaddie(
                dynamicSquaddieBase
            );
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("cannot addDynamicSquaddie 'player_young_torrin_0', again, it already exists");
    });

    it('should throw an error if dynamic squaddie is invalid', () => {
        const shouldThrowError = () => {
            squaddieRepo.addDynamicSquaddie(
                dynamicSquaddieBase = new BattleSquaddieDynamic({
                    dynamicSquaddieId: "",
                    staticSquaddieId: "static",
                    squaddieTurn: new SquaddieTurn()
                })
            );
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Dynamic Squaddie has no Dynamic Squaddie Id");
    })

    it("getDynamicSquaddieByID should return error if dynamic squaddie doesn't exist", () => {
        const resultOrError = squaddieRepo.getSquaddieByDynamicId("player_young_torrin_0")

        expect(isError(resultOrError)).toBeTruthy();

        const expectedError = unwrapResultOrError(resultOrError);
        expect((expectedError as Error).message).toBe("cannot getDynamicSquaddieByID for 'player_young_torrin_0', does not exist");
    });

    it('should get an iterator across all static ids', () => {
        squaddieRepo.addDynamicSquaddie(
            dynamicSquaddieBase
        )

        const entities: {
            staticSquaddieId: string,
            staticSquaddie: BattleSquaddieStatic
        }[] = squaddieRepo.getStaticSquaddieIterator();

        expect(entities).toStrictEqual([{
            staticSquaddieId: staticSquaddieBase.squaddieId.staticId,
            staticSquaddie: staticSquaddieBase
        }]);
    });

    it('should get an iterator across all dynamic ids', () => {
        squaddieRepo.addDynamicSquaddie(
            dynamicSquaddieBase
        )

        const entities: {
            dynamicSquaddieId: string,
            dynamicSquaddie: BattleSquaddieDynamic
        }[] = squaddieRepo.getDynamicSquaddieIterator();
        expect(entities).toStrictEqual([{
            dynamicSquaddieId: "player_young_torrin_0",
            dynamicSquaddie: dynamicSquaddieBase
        }]);
    });
});
