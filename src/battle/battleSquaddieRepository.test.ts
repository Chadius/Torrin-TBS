import {BattleSquaddie} from "./battleSquaddie";
import {SquaddieId} from "../squaddie/id";
import {Trait, TraitCategory, TraitStatusStorage} from "../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../squaddie/movement";
import {SquaddieTurn} from "../squaddie/turn";
import {BattleSquaddieRepository} from "./battleSquaddieRepository";
import {getResultOrThrowError, isError, unwrapResultOrError} from "../utils/ResultOrError";
import {ArmyAttributes} from "../squaddie/armyAttributes";
import {SquaddieResource} from "../squaddie/resource";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";

describe('BattleSquaddieRepository', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let squaddietemplateBase: SquaddieTemplate;
    let dynamicSquaddieBase: BattleSquaddie;

    beforeEach(() => {
        squaddieRepo = new BattleSquaddieRepository();
        squaddietemplateBase = new SquaddieTemplate({
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
            actions: [],
        });
        dynamicSquaddieBase = new BattleSquaddie({
            dynamicSquaddieId: "player_young_torrin_0",
            squaddieTemplateId: "player_young_torrin",
            squaddieTurn: new SquaddieTurn()
        });

        squaddieRepo.addSquaddietemplate(
            squaddietemplateBase
        );
    });

    it('retrieves squaddie info by dynamic id', () => {
        squaddieRepo.addDynamicSquaddie(
            dynamicSquaddieBase
        )

        const {
            squaddietemplate,
            dynamicSquaddie,
        } = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicId("player_young_torrin_0"))

        expect(squaddietemplate).toStrictEqual(squaddietemplate);
        expect(dynamicSquaddie).toStrictEqual(dynamicSquaddie);
    });

    it('should throw error if you add already existing static squaddie', () => {
        const shouldThrowError = () => {
            squaddieRepo.addSquaddietemplate(
                squaddietemplateBase
            );
        }

        expect(() => {
            shouldThrowError()
        }).toThrow(Error);
        expect(() => {
            shouldThrowError()
        }).toThrow("cannot addSquaddietemplate 'player_young_torrin', is already added");
    });

    it("should throw error if you add dynamic squaddie for static squaddie that doesn't exist", () => {
        const shouldThrowError = () => {
            squaddieRepo.addDynamicSquaddie(
                new BattleSquaddie({
                    dynamicSquaddieId: "dynamic_id",
                    squaddieTemplateId: "unknown_static_squaddie",
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
                dynamicSquaddieBase = new BattleSquaddie({
                    dynamicSquaddieId: "",
                    squaddieTemplateId: "static",
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
            squaddietemplateId: string,
            squaddietemplate: SquaddieTemplate
        }[] = squaddieRepo.getSquaddietemplateIterator();

        expect(entities).toStrictEqual([{
            squaddietemplateId: squaddietemplateBase.squaddieId.staticId,
            squaddietemplate: squaddietemplateBase
        }]);
    });

    it('should get an iterator across all dynamic ids', () => {
        squaddieRepo.addDynamicSquaddie(
            dynamicSquaddieBase
        )

        const entities: {
            dynamicSquaddieId: string,
            dynamicSquaddie: BattleSquaddie
        }[] = squaddieRepo.getDynamicSquaddieIterator();
        expect(entities).toStrictEqual([{
            dynamicSquaddieId: "player_young_torrin_0",
            dynamicSquaddie: dynamicSquaddieBase
        }]);
    });
});
