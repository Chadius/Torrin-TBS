import {BattleSquaddieDynamic, BattleSquaddieStatic} from "./battleSquaddie";
import {SquaddieID} from "../squaddie/id";
import {SquaddieResource} from "../squaddie/resource";
import {Trait, TraitCategory, TraitStatusStorage} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../squaddie/movement";
import {SquaddieActivity} from "../squaddie/activity";
import {Integer} from "../hexMap/hexGrid";
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
                resources: new SquaddieResource({
                    mapIconResourceKey: "map icon young torrin"
                }),
                traits: new TraitStatusStorage({
                    [Trait.HUMANOID]: true,
                    [Trait.MONSU]: true,
                }).filterCategory(TraitCategory.CREATURE),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            movement: new SquaddieMovement({
                movementPerAction: 2,
                traits: new TraitStatusStorage({
                    [Trait.PASS_THROUGH_WALLS]: true,
                }).filterCategory(TraitCategory.MOVEMENT)
            }),
            activities: [
                new SquaddieActivity({
                    name: "water saber",
                    id: "torrin_water_saber",
                    minimumRange: 0 as Integer,
                    maximumRange: 2 as Integer,
                    traits: new TraitStatusStorage({[Trait.ATTACK]: true}).filterCategory(TraitCategory.ACTIVITY)
                })
            ],
        };
        dynamicSquaddieBase = {
            staticSquaddieId: "player_young_torrin",
            mapLocation: {q: 0 as Integer, r: 0 as Integer},
            squaddieTurn: new SquaddieTurn()
        };

        squaddieRepo.addStaticSquaddie(
            staticSquaddieBase
        );
    });

    it('retrieves squaddie info by static id', () => {
        squaddieRepo.addDynamicSquaddie(
            "player_young_torrin_0",
            dynamicSquaddieBase
        )

        const {
            staticSquaddie,
            dynamicSquaddie
        } = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicID("player_young_torrin_0"))

        expect(staticSquaddie).toStrictEqual(staticSquaddie);
        expect(dynamicSquaddie).toStrictEqual(dynamicSquaddie);
    });

    it('should throw error if you add already existing static squaddie', () => {
        const shouldThrowError = () => {
            squaddieRepo.addStaticSquaddie(
                staticSquaddieBase
            );
        }

        expect(() => {shouldThrowError()}).toThrow(Error);
        expect(() => {shouldThrowError()}).toThrow("cannot addStaticSquaddie 'player_young_torrin', is already added");
    });

    it("return error if you add dynamic squaddie for static squaddie that doesn't exist", () => {
        const shouldThrowError = () => {
            squaddieRepo.addDynamicSquaddie(
                "ID does not matter",
                {
                    staticSquaddieId: "unknown_static_squaddie",
                    mapLocation: {q: 0 as Integer, r: 0 as Integer},
                    squaddieTurn: new SquaddieTurn()
                }
            );
        }

        expect(() => {shouldThrowError()}).toThrow(Error);
        expect(() => {shouldThrowError()}).toThrow("cannot addDynamicSquaddie 'ID does not matter', no static squaddie 'unknown_static_squaddie' exists");
    });

    it("return error if you add dynamic squaddie for dynamic squaddie that already exists", () => {
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

        expect(() => {shouldThrowError()}).toThrow(Error);
        expect(() => {shouldThrowError()}).toThrow("cannot addDynamicSquaddie 'player_young_torrin_0', again, it already exists");
    });

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

        const entities: {staticSquaddieId: string, staticSquaddie: BattleSquaddieStatic}[] = squaddieRepo.getStaticSquaddieIterator();

        expect(entities).toStrictEqual([{staticSquaddieId: staticSquaddieBase.squaddieID.id, staticSquaddie: staticSquaddieBase}]);
    });

    it('should get an iterator across all dynamic ids', () => {
        squaddieRepo.addDynamicSquaddie(
            "player_young_torrin_0",
            dynamicSquaddieBase
        )

        const entities: {dynamicSquaddieId: string, dynamicSquaddie: BattleSquaddieDynamic}[] = squaddieRepo.getDynamicSquaddieIterator();
        expect(entities).toStrictEqual([{dynamicSquaddieId: "player_young_torrin_0", dynamicSquaddie: dynamicSquaddieBase}]);
    });
});