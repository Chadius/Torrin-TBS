import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {SquaddieActionsForThisRound, SquaddieActionsForThisRoundHandler} from "../history/squaddieActionsForThisRound";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {Trait, TraitCategory, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {BattleSquaddieUsesActionOnMap} from "./battleSquaddieUsesActionOnMap";
import {SquaddieInstructionInProgressHandler} from "../history/squaddieInstructionInProgress";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";

describe('BattleSquaddieUsesActionOnMap', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let squaddieTemplateBase: SquaddieTemplate;
    let battleSquaddieBase: BattleSquaddie;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        squaddieRepository = new BattleSquaddieRepository();
        ({
            squaddieTemplate: squaddieTemplateBase,
            battleSquaddie: battleSquaddieBase,
        } = CreateNewSquaddieAndAddToRepository({
            name: "Torrin",
            templateId: "static_squaddie",
            battleId: "dynamic_squaddie",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepository: squaddieRepository,
            attributes: {
                movement: CreateNewSquaddieMovementWithTraits({
                    movementPerAction: 2,
                    traits: new TraitStatusStorage({
                        initialTraitValues: {
                            [Trait.PASS_THROUGH_WALLS]: true,
                        }
                    }).filterCategory(TraitCategory.MOVEMENT)
                }),
                armorClass: 0,
                maxHitPoints: 0,
            },
        }));
    });

    it('can wait half a second before ending turn', () => {
        const endTurnInstruction: SquaddieActionsForThisRound = {
            squaddieTemplateId: "static_squaddie",
            battleSquaddieId: "dynamic_squaddie",
            startingLocation: {q: 0, r: 0},
            actions: [],
        };
        SquaddieActionsForThisRoundHandler.endTurn(endTurnInstruction);

        const mapAction: BattleSquaddieUsesActionOnMap = new BattleSquaddieUsesActionOnMap();

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieCurrentlyActing: {
                squaddieActionsForThisRound: endTurnInstruction,
                movingBattleSquaddieIds: [],
                currentlySelectedAction: undefined,
            },
            squaddieRepository: squaddieRepository,
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
        expect(SquaddieInstructionInProgressHandler.isReadyForNewSquaddie(state.squaddieCurrentlyActing)).toBeTruthy();
    });
});
