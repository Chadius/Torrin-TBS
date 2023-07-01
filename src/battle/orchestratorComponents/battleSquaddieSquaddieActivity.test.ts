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
import {ImageUI} from "../../ui/imageUI";
import p5 from "p5";
import {ArmyAttributes} from "../../squaddie/armyAttributes";
import {CurrentSquaddieInstruction} from "../history/currentSquaddieInstruction";
import {ACTIVITY_COMPLETED_WAIT_TIME_MS, BattleSquaddieSquaddieActivity} from "./battleSquaddieSquaddieActivity";
import {SquaddieActivity} from "../../squaddie/activity";
import {SquaddieSquaddieActivity} from "../history/squaddieSquaddieActivity";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType
} from "../orchestrator/orchestratorComponent";
import {Rectangle} from "../../ui/rectangle";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {ResourceHandler} from "../../resource/resourceHandler";
import {stubImmediateLoader} from "../../resource/resourceHandlerTestUtils";
import {makeResult} from "../../utils/ResultOrError";
import * as orchestratorUtils from "./orchestratorUtils";

jest.mock('p5', () => () => {
    return {}
});
describe('BattleSquaddieSquaddieActivity', () => {
    let squaddieRepository: BattleSquaddieRepository;
    let staticSquaddieBase: BattleSquaddieStatic;
    let dynamicSquaddieBase: BattleSquaddieDynamic;
    let mockedP5: p5;
    let longswordActivity: SquaddieActivity;
    let powerAttackLongswordActivity: SquaddieActivity;
    let squaddieSquaddieActivity: BattleSquaddieSquaddieActivity;
    let oneActionInstruction: SquaddieInstruction;
    let mockResourceHandler: jest.Mocked<ResourceHandler>;

    beforeEach(() => {
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
            mapIcon: new (<new (options: any) => ImageUI>ImageUI)({}) as jest.Mocked<ImageUI>,
        });

        longswordActivity = new SquaddieActivity({
            name: "longsword",
            id: "longsword",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 1,
            actionsToSpend: 1,
        });

        powerAttackLongswordActivity = new SquaddieActivity({
            name: "power attack longsword",
            id: "powerAttackLongsword",
            traits: new TraitStatusStorage({
                [Trait.ATTACK]: true,
                [Trait.TARGET_ARMOR]: true,
            }).filterCategory(TraitCategory.ACTIVITY),
            minimumRange: 1,
            maximumRange: 1,
            actionsToSpend: 3,
        });

        squaddieRepository.addSquaddie(
            staticSquaddieBase, dynamicSquaddieBase
        );
        mockedP5 = new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>;
        mockedP5.push = jest.fn();
        mockedP5.pop = jest.fn();
        mockedP5.textSize = jest.fn();
        mockedP5.fill = jest.fn();
        mockedP5.text = jest.fn();
        jest.spyOn(Rectangle.prototype, "draw").mockReturnValue(null);
        jest.spyOn(orchestratorUtils, "DrawSquaddieReachBasedOnSquaddieTurnAndAffiliation").mockImplementation(() => {
        });

        squaddieSquaddieActivity = new BattleSquaddieSquaddieActivity();

        oneActionInstruction = new SquaddieInstruction({
            staticSquaddieId: "static_squaddie",
            dynamicSquaddieId: "dynamic_squaddie",
        });
        oneActionInstruction.addActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({q: 0, r: 0}),
            squaddieActivity: longswordActivity,
        }));

        mockResourceHandler = new (
            <new (options: any) => ResourceHandler>ResourceHandler
        )({
            imageLoader: new stubImmediateLoader(),
        }) as jest.Mocked<ResourceHandler>;
        mockResourceHandler.getResource = jest.fn().mockReturnValue(makeResult(null));
    });

    it('can wait half a second before ending turn', () => {
        const wholeTurnInstruction: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "static_squaddie",
            dynamicSquaddieId: "dynamic_squaddie",
        });
        wholeTurnInstruction.addActivity(new SquaddieSquaddieActivity({
            targetLocation: new HexCoordinate({q: 0, r: 0}),
            squaddieActivity: powerAttackLongswordActivity,
        }));

        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: OrchestratorState = new OrchestratorState({
            squaddieCurrentlyActing: new CurrentSquaddieInstruction({
                instruction: wholeTurnInstruction,
            }),
            squaddieRepo: squaddieRepository,
            resourceHandler: mockResourceHandler,
            hexMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
        })

        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            dynamicID: dynamicSquaddieBase.dynamicSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
        });

        squaddieSquaddieActivity.update(state, mockedP5);
        expect(squaddieSquaddieActivity.animationCompleteStartTime).not.toBeUndefined();
        expect(squaddieSquaddieActivity.hasCompleted(state)).toBeFalsy();
        jest.spyOn(Date, 'now').mockImplementation(() => ACTIVITY_COMPLETED_WAIT_TIME_MS);

        squaddieSquaddieActivity.update(state, mockedP5);
        expect(squaddieSquaddieActivity.hasCompleted(state)).toBeTruthy();

        const stateChanges = squaddieSquaddieActivity.recommendStateChanges(state);
        expect(stateChanges.nextMode).toBeUndefined();
        expect(stateChanges.displayMap).toBeTruthy();

        squaddieSquaddieActivity.reset(state);
        expect(squaddieSquaddieActivity.animationCompleteStartTime).toBeUndefined();
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie()).toBeTruthy();
    });

    it('can wait half a second after activity completes', () => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: OrchestratorState = new OrchestratorState({
            squaddieCurrentlyActing: new CurrentSquaddieInstruction({
                instruction: oneActionInstruction,
            }),
            squaddieRepo: squaddieRepository,
            resourceHandler: mockResourceHandler,
            hexMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
        })

        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            dynamicID: dynamicSquaddieBase.dynamicSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
        });

        squaddieSquaddieActivity.update(state, mockedP5);
        jest.spyOn(Date, 'now').mockImplementation(() => ACTIVITY_COMPLETED_WAIT_TIME_MS);

        squaddieSquaddieActivity.update(state, mockedP5);

        const stateChanges = squaddieSquaddieActivity.recommendStateChanges(state);
        expect(stateChanges.nextMode).toBeUndefined();
        expect(stateChanges.displayMap).toBeTruthy();

        squaddieSquaddieActivity.reset(state);
        expect(squaddieSquaddieActivity.animationCompleteStartTime).toBeUndefined();
        expect(state.squaddieCurrentlyActing.isReadyForNewSquaddie()).toBeFalsy();
        expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeTruthy();
    });

    it('will skip displaying the results if the user clicks', () => {
        jest.spyOn(Date, 'now').mockImplementation(() => 0);
        const state: OrchestratorState = new OrchestratorState({
            squaddieCurrentlyActing: new CurrentSquaddieInstruction({
                instruction: oneActionInstruction,
            }),
            squaddieRepo: squaddieRepository,
            resourceHandler: mockResourceHandler,
            hexMap: new TerrainTileMap({movementCost: ["1 1 1 "]}),
        })

        state.battleSquaddieSelectedHUD.selectSquaddieAndDrawWindow({
            dynamicID: dynamicSquaddieBase.dynamicSquaddieId,
            repositionWindow: {mouseX: 0, mouseY: 0},
        });

        squaddieSquaddieActivity.update(state, mockedP5);
        jest.spyOn(Date, 'now').mockImplementation(() => ACTIVITY_COMPLETED_WAIT_TIME_MS / 2);

        squaddieSquaddieActivity.update(state, mockedP5);
        expect(squaddieSquaddieActivity.hasCompleted(state)).toBeFalsy();

        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0,
        };

        squaddieSquaddieActivity.mouseEventHappened(state, mouseEvent);
        squaddieSquaddieActivity.update(state, mockedP5);
        expect(squaddieSquaddieActivity.hasCompleted(state)).toBeTruthy();
        expect(state.battleSquaddieSelectedHUD.shouldDrawTheHUD()).toBeTruthy();
    });
});
