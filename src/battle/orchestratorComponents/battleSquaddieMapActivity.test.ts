import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {SquaddieActivitiesForThisRound} from "../history/squaddieActivitiesForThisRound";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../../squaddie/movement";
import {BattleSquaddieMapActivity} from "./battleSquaddieMapActivity";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import * as mocks from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";

describe('BattleSquaddieMapActivity', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let staticSquaddieBase: BattleSquaddieStatic;
    let dynamicSquaddieBase: BattleSquaddieDynamic;
    let mockedP5 = mocks.mockedP5();

    beforeEach(() => {
        mockedP5 = mocks.mockedP5();
        squaddieRepository = new BattleSquaddieRepository();
        ({
            staticSquaddie: staticSquaddieBase,
            dynamicSquaddie: dynamicSquaddieBase,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Torrin",
            staticId: "static_squaddie",
            dynamicId: "dynamic_squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepository,
            attributes: new ArmyAttributes({
                movement: new SquaddieMovement({
                    movementPerAction: 2,
                    traits: new TraitStatusStorage({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }).filterCategory(TraitCategory.MOVEMENT)
                }),
            }),
        }));
    });

    it('can wait half a second before ending turn', () => {
        const endTurnInstruction: SquaddieActivitiesForThisRound = new SquaddieActivitiesForThisRound({
            staticSquaddieId: "static_squaddie",
            dynamicSquaddieId: "dynamic_squaddie",
        });
        endTurnInstruction.endTurn();

        const mapActivity: BattleSquaddieMapActivity = new BattleSquaddieMapActivity();

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieCurrentlyActing: new SquaddieInstructionInProgress({
                activitiesForThisRound: endTurnInstruction,
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
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeTruthy();
    });
});
