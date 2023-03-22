import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {SquaddieID} from "../squaddie/id";
import {NullSquaddieResource} from "../squaddie/resource";
import {NullTraitStatusStorage, Trait, TraitCategory, TraitStatusStorage} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../squaddie/movement";
import {SquaddieTurn} from "../squaddie/turn";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {getResultOrThrowError, isError, unwrapResultOrError} from "../utils/ResultOrError";

describe('BattleSquaddieRepository', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let staticSquaddieBase: BattleSquaddieStatic;
    let dynamicSquaddieBase: BattleSquaddieDynamic;

    beforeEach(() => {
        squaddieRepo = new BattleSquaddieRepository();
        staticSquaddieBase = {
            squaddieID: new SquaddieID({
                id: "player_young_torrin",
                name: "Torrin",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            movement: new SquaddieMovement({
                movementPerAction: 2,
                traits: new TraitStatusStorage({
                    [Trait.PASS_THROUGH_WALLS]: true,
                }).filterCategory(TraitCategory.MOVEMENT)
            }),
            activities: [],
        };
        dynamicSquaddieBase = {
            staticSquaddieId: "player_young_torrin",
            mapLocation: {q: 0, r: 0},
            squaddieTurn: new SquaddieTurn()
        };

        squaddieRepo.addStaticSquaddie(
            staticSquaddieBase
        );
    });

    it('retrieves squaddie info by dynamic id', () => {
        squaddieRepo.addDynamicSquaddie(
            "player_young_torrin_0",
            dynamicSquaddieBase
        )

        const {
            staticSquaddie,
            dynamicSquaddie,
            dynamicSquaddieId,
        } = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicID("player_young_torrin_0"))

        expect(staticSquaddie).toStrictEqual(staticSquaddie);
        expect(dynamicSquaddie).toStrictEqual(dynamicSquaddie);
        expect(dynamicSquaddieId).toStrictEqual("player_young_torrin_0");
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
                "ID does not matter",
                {
                    staticSquaddieId: "unknown_static_squaddie",
                    mapLocation: {q: 0, r: 0},
                    squaddieTurn: new SquaddieTurn()
                }
            );
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("cannot addDynamicSquaddie 'ID does not matter', no static squaddie 'unknown_static_squaddie' exists");
    });

    it("should throw error if you add dynamic squaddie for dynamic squaddie that already exists", () => {
        squaddieRepo.addDynamicSquaddie(
            "player_young_torrin_0",
            dynamicSquaddieBase
        )

        const shouldThrowError = () => {
            squaddieRepo.addDynamicSquaddie(
                "player_young_torrin_0",
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
                "dynamic squaddie id",
                dynamicSquaddieBase = {
                    staticSquaddieId: "",
                    mapLocation: {q: 0, r: 0},
                    squaddieTurn: new SquaddieTurn()
                }
            );
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("Dynamic Squaddie has no Static Squaddie Id");
    })

    it("getDynamicSquaddieByID should return error if dynamic squaddie doesn't exist", () => {
        const resultOrError = squaddieRepo.getSquaddieByDynamicID("player_young_torrin_0")

        expect(isError(resultOrError)).toBeTruthy();

        const expectedError = unwrapResultOrError(resultOrError);
        expect((expectedError as Error).message).toBe("cannot getDynamicSquaddieByID for 'player_young_torrin_0', does not exist");
    });

    it('should get an iterator across all static ids', () => {
        squaddieRepo.addDynamicSquaddie(
            "player_young_torrin_0",
            dynamicSquaddieBase
        )

        const entities: { staticSquaddieId: string, staticSquaddie: BattleSquaddieStatic }[] = squaddieRepo.getStaticSquaddieIterator();

        expect(entities).toStrictEqual([{
            staticSquaddieId: staticSquaddieBase.squaddieID.id,
            staticSquaddie: staticSquaddieBase
        }]);
    });

    it('should get an iterator across all dynamic ids', () => {
        squaddieRepo.addDynamicSquaddie(
            "player_young_torrin_0",
            dynamicSquaddieBase
        )

        const entities: { dynamicSquaddieId: string, dynamicSquaddie: BattleSquaddieDynamic }[] = squaddieRepo.getDynamicSquaddieIterator();
        expect(entities).toStrictEqual([{
            dynamicSquaddieId: "player_young_torrin_0",
            dynamicSquaddie: dynamicSquaddieBase
        }]);
    });

    it('can get dynamic and static squaddie info based on static id and location', () => {
        squaddieRepo.addDynamicSquaddie(
            "player_young_torrin_0",
            dynamicSquaddieBase
        )

        const {
            staticSquaddie,
            dynamicSquaddie,
            dynamicSquaddieId,
        } = getResultOrThrowError(squaddieRepo.getSquaddieByStaticIDAndLocation(
            staticSquaddieBase.squaddieID.id,
            {
                q: dynamicSquaddieBase.mapLocation.q,
                r: dynamicSquaddieBase.mapLocation.r,
            }
        ));

        expect(staticSquaddie).toStrictEqual(staticSquaddie);
        expect(dynamicSquaddie).toStrictEqual(dynamicSquaddie);
        expect(dynamicSquaddieId).toStrictEqual("player_young_torrin_0");
    });

    it('should return an error if there is no squaddie at the given location', () => {
        squaddieRepo.addDynamicSquaddie(
            "player_young_torrin_0",
            dynamicSquaddieBase
        )

        const resultOrError = squaddieRepo.getSquaddieByStaticIDAndLocation(
            staticSquaddieBase.squaddieID.id,
            {
                q: dynamicSquaddieBase.mapLocation.q + 1,
                r: dynamicSquaddieBase.mapLocation.r,
            }
        )

        expect(isError(resultOrError)).toBeTruthy();

        const expectedError = unwrapResultOrError(resultOrError);
        expect((expectedError as Error).message).toBe("cannot find squaddie at location (1, 0)");
    });
});