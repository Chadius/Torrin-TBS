import {OrchestratorState} from "../orchestrator/orchestratorState";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {NullSquaddieResource} from "../../squaddie/resource";
import {NullTraitStatusStorage, Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../../squaddie/movement";
import {SquaddieTurn} from "../../squaddie/turn";
import {BattleSquaddieMapActivity} from "./battleSquaddieMapActivity";
import {ImageUI} from "../../ui/imageUI";
import p5 from "p5";

jest.mock('p5', () => () => {
    return {}
});
describe('BattleSquaddieMapActivity', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let staticSquaddieBase: BattleSquaddieStatic;
    let dynamicSquaddieBase: BattleSquaddieDynamic;
    let mockedP5: p5;

    beforeEach(() => {
        squaddieRepo = new BattleSquaddieRepository();
        staticSquaddieBase = {
            squaddieId: new SquaddieId({
                id: "static_squaddie",
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
        dynamicSquaddieBase = new BattleSquaddieDynamic({
            staticSquaddieId: "static_squaddie",
            mapLocation: {q: 0, r: 0},
            squaddieTurn: new SquaddieTurn(),
            mapIcon: new (<new (options: any) => ImageUI>ImageUI)({}) as jest.Mocked<ImageUI>,
        });

        squaddieRepo.addStaticSquaddie(
            staticSquaddieBase
        );
        squaddieRepo.addDynamicSquaddie("dynamic_squaddie", dynamicSquaddieBase);
        mockedP5 = new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>;
    });

    it('can wait half a second before ending turn', () => {
        const endTurnInstruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "static_squaddie",
            dynamicSquaddieId: "dynamic_squaddie",
        });
        endTurnInstruction.endTurn();

        const mapActivity: BattleSquaddieMapActivity = new BattleSquaddieMapActivity();

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: OrchestratorState = new OrchestratorState({
            squaddieCurrentlyActing: {
                instruction: endTurnInstruction,
            },
            squaddieRepo,
        })

        expect(mapActivity.update(state, mockedP5));
        expect(mapActivity.animationCompleteStartTime).not.toBeUndefined();
        expect(mapActivity.hasCompleted(state)).toBeFalsy();
        jest.spyOn(Date, 'now').mockImplementation(() => 500);

        expect(mapActivity.update(state, mockedP5));
        expect(mapActivity.hasCompleted(state)).toBeTruthy();

        const stateChanges = mapActivity.recommendStateChanges(state);
        expect(stateChanges.nextMode).toBeUndefined();
        expect(stateChanges.displayMap).toBeTruthy();

        mapActivity.reset(state);
        expect(mapActivity.animationCompleteStartTime).toBeUndefined();
    });
});