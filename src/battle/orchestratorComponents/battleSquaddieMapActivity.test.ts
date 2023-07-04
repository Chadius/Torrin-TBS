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
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import * as mocks from "../../utils/test/mocks";

describe('BattleSquaddieMapActivity', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let staticSquaddieBase: BattleSquaddieStatic;
    let dynamicSquaddieBase: BattleSquaddieDynamic;
    let mockedP5 = mocks.mockedP5();

    beforeEach(() => {
        mockedP5 = mocks.mockedP5();
        squaddieRepository = new BattleSquaddieRepository();
        staticSquaddieBase = new BattleSquaddieStatic({
            attributes: new ArmyAttributes({
                movement: new SquaddieMovement({
                    movementPerAction: 2,
                    traits: new TraitStatusStorage({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }).filterCategory(TraitCategory.MOVEMENT)
                }),
            }),
            squaddieId: new SquaddieId({
                staticId: "static_squaddie",
                name: "Torrin",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            activities: [],
        });
        dynamicSquaddieBase = new BattleSquaddieDynamic({
            dynamicSquaddieId: "dynamic_squaddie",
            staticSquaddieId: "static_squaddie",
            squaddieTurn: new SquaddieTurn(),
            mapIcon: mocks.mockImageUI(),
        });

        squaddieRepository.addSquaddie(
            staticSquaddieBase, dynamicSquaddieBase
        );
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
            squaddieCurrentlyActing: new SquaddieInstructionInProgress({
                instruction: endTurnInstruction,
            }),
            squaddieRepo: squaddieRepository,
        })

        mapActivity.update(state, mockedP5);
        expect(mapActivity.animationCompleteStartTime).not.toBeUndefined();
        expect(mapActivity.hasCompleted(state)).toBeFalsy();
        jest.spyOn(Date, 'now').mockImplementation(() => 500);

        mapActivity.update(state, mockedP5);
        expect(mapActivity.hasCompleted(state)).toBeTruthy();

        const stateChanges = mapActivity.recommendStateChanges(state);
        expect(stateChanges.nextMode).toBeUndefined();
        expect(stateChanges.displayMap).toBeTruthy();

        mapActivity.reset(state);
        expect(mapActivity.animationCompleteStartTime).toBeUndefined();
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie()).toBeTruthy();
    });
});
