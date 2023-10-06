import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieMovement} from "../../squaddie/movement";
import {BattleSquaddieUsesActionOnMap} from "./battleSquaddieUsesActionOnMap";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {SquaddieInstructionInProgress} from "../history/squaddieInstructionInProgress";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";

describe('BattleSquaddieUsesActionOnMap', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let staticSquaddieBase: BattleSquaddieStatic;
    let dynamicSquaddieBase: BattleSquaddieDynamic;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
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
        const endTurnInstruction: SquaddieActionsForThisRound = new SquaddieActionsForThisRound({
            staticSquaddieId: "static_squaddie",
            dynamicSquaddieId: "dynamic_squaddie",
        });
        endTurnInstruction.endTurn();

        const mapAction: BattleSquaddieUsesActionOnMap = new BattleSquaddieUsesActionOnMap();

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieCurrentlyActing: new SquaddieInstructionInProgress({
                actionsForThisRound: endTurnInstruction,
            }),
            squaddieRepo: squaddieRepository,
        })

        mapAction.update(state, mockedP5GraphicsContext);
        expect(mapAction.animationCompleteStartTime).not.toBeUndefined();
        expect(mapAction.hasCompleted(state)).toBeFalsy();
        jest.spyOn(Date, 'now').mockImplementation(() => 500);

        mapAction.update(state, mockedP5GraphicsContext);
        expect(mapAction.hasCompleted(state)).toBeTruthy();

        const stateChanges = mapAction.recommendStateChanges(state);
        expect(stateChanges.nextMode).toBeUndefined();
        expect(stateChanges.displayMap).toBeTruthy();

        mapAction.reset(state);
        expect(mapAction.animationCompleteStartTime).toBeUndefined();
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie).toBeTruthy();
    });
});
