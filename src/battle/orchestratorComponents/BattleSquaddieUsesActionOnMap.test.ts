import {BattleOrchestratorStateService} from "../orchestrator/battleOrchestratorState";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {Trait, TraitStatusStorageService} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {CreateNewSquaddieMovementWithTraits} from "../../squaddie/movement";
import {BattleSquaddieUsesActionOnMap} from "./battleSquaddieUsesActionOnMap";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {CreateNewSquaddieAndAddToRepository} from "../../utils/test/squaddie";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {BattleStateService} from "../orchestrator/battleState";
import {GameEngineState, GameEngineStateService} from "../../gameEngine/gameEngine";
import {OrchestratorUtilities} from "./orchestratorUtils";
import {ActionsThisRoundService} from "../history/actionsThisRound";
import {ProcessedActionService} from "../../action/processed/processedAction";
import {DecidedActionEndTurnEffectService} from "../../action/decided/decidedActionEndTurnEffect";
import {ActionEffectEndTurnTemplateService} from "../../action/template/actionEffectEndTurnTemplate";
import {ProcessedActionEndTurnEffectService} from "../../action/processed/processedActionEndTurnEffect";

describe('BattleSquaddieUsesActionOnMap', () => {
    let squaddieRepository: ObjectRepository;
    let squaddieTemplateBase: SquaddieTemplate;
    let battleSquaddieBase: BattleSquaddie;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        squaddieRepository = ObjectRepositoryService.new();
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
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.PASS_THROUGH_WALLS]: true,
                    }),
                }),
                armorClass: 0,
                maxHitPoints: 0,
            },
        }));
    });

    it('can wait half a second before ending turn', () => {
        const mapAction: BattleSquaddieUsesActionOnMap = new BattleSquaddieUsesActionOnMap();

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: GameEngineState = GameEngineStateService.new({
            repository: squaddieRepository,
            resourceHandler: undefined,
            battleOrchestratorState: BattleOrchestratorStateService.newOrchestratorState({
                battleSquaddieSelectedHUD: undefined,
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    actionsThisRound: ActionsThisRoundService.new({
                        battleSquaddieId: "dynamic_squaddie",
                        startingLocation: {q: 0, r: 0},
                        processedActions: [
                            ProcessedActionService.new({
                                decidedAction: undefined,
                                processedActionEffects: [
                                    ProcessedActionEndTurnEffectService.new({
                                        decidedActionEffect: DecidedActionEndTurnEffectService.new({
                                            template: ActionEffectEndTurnTemplateService.new({})
                                        })
                                    })
                                ]
                            })
                        ]
                    })
                }),
            })
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
        expect(OrchestratorUtilities.isSquaddieCurrentlyTakingATurn(state)).toBeFalsy();
    });
});
