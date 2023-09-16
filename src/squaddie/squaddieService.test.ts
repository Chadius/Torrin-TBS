import {CreateNewSquaddieAndAddToRepository} from "../utils/test/squaddie";
import {SquaddieAffiliation} from "./squaddieAffiliation";
import {BattleSquaddieRepository} from "../battle/battleSquaddieRepository";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battle/battleSquaddie";
import {
    CanPlayerControlSquaddieRightNow,
    CanSquaddieActRightNow,
    DamageType,
    DealDamageToTheSquaddie,
    GetArmorClass,
    GetHitPoints,
    GetNumberOfActions,
    GiveHealingToTheSquaddie,
    HealingType,
    IsSquaddieAlive
} from "./squaddieService";
import {ArmyAttributes} from "./armyAttributes";

describe('Squaddie Service', () => {
    let playerStatic: BattleSquaddieStatic;
    let playerDynamic: BattleSquaddieDynamic;
    let enemyStatic: BattleSquaddieStatic;
    let enemyDynamic: BattleSquaddieDynamic;
    let squaddieRepository: BattleSquaddieRepository;

    beforeEach(() => {
        squaddieRepository = new BattleSquaddieRepository();
        ({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            } =
                CreateNewSquaddieAndAddToRepository({
                    name: "Player",
                    staticId: "player",
                    dynamicId: "player",
                    affiliation: SquaddieAffiliation.PLAYER,
                    squaddieRepository,
                    attributes: new ArmyAttributes({
                        armorClass: 3,
                        maxHitPoints: 5,
                    })
                })
        );

        ({
                staticSquaddie: enemyStatic,
                dynamicSquaddie: enemyDynamic,
            } =
                CreateNewSquaddieAndAddToRepository({
                    name: "Enemy",
                    staticId: "enemy",
                    dynamicId: "enemy",
                    affiliation: SquaddieAffiliation.ENEMY,
                    squaddieRepository,
                })
        );
    });

    describe('Turns Remaining', () => {
        it('returns the number of actions', () => {
            let {
                normalActionsRemaining
            } = GetNumberOfActions({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });
            expect(normalActionsRemaining).toBe(3);

            playerDynamic.squaddieTurn.spendNumberActions(1);
            ({
                normalActionsRemaining
            } = GetNumberOfActions({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            }));
            expect(normalActionsRemaining).toBe(2);
        });
    });

    describe('Current Armor Class', () => {
        it('Returns the normal armor class', () => {
            let {
                normalArmorClass,
            } = GetArmorClass({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(normalArmorClass).toBe(3);
        });
    });

    describe('Current Hit Points', () => {
        it('Returns the maximum HP', () => {
            let {
                maxHitPoints,
                currentHitPoints
            } = GetHitPoints({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(maxHitPoints).toBe(maxHitPoints);
            expect(currentHitPoints).toBe(maxHitPoints);
        });
        it('can deal damage to the squaddie', () => {
            let {damageTaken} = DealDamageToTheSquaddie({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
                damage: 1,
                damageType: DamageType.Body,
            });
            expect(damageTaken).toBe(1);

            let {
                maxHitPoints,
                currentHitPoints,
            } = GetHitPoints({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(maxHitPoints).toBe(maxHitPoints);
            expect(currentHitPoints).toBe(maxHitPoints - damageTaken);
        });
        it('can give healing to the squaddie', () => {
            DealDamageToTheSquaddie({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
                damage: 2,
                damageType: DamageType.Body,
            });

            let {healingReceived} = GiveHealingToTheSquaddie({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
                healingAmount: 1,
                healingType: HealingType.LostHitPoints,
            });
            expect(healingReceived).toBe(1);

            let {
                maxHitPoints,
                currentHitPoints,
            } = GetHitPoints({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(maxHitPoints).toBe(maxHitPoints);
            expect(currentHitPoints).toBe(maxHitPoints - 2 + 1);

            ({healingReceived} = GiveHealingToTheSquaddie({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
                healingAmount: 9001,
                healingType: HealingType.LostHitPoints,
            }));
            expect(healingReceived).toBe(1);

            ({
                currentHitPoints,
            } = GetHitPoints({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            }));

            expect(currentHitPoints).toBe(maxHitPoints);
        });
    });

    describe('Squaddie is Dead', () => {
        it('knows squaddies are alive by default', () => {
            const squaddieIsAlive = IsSquaddieAlive({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(squaddieIsAlive).toBeTruthy();
        });
        it('knows the squaddie is dead due to zero Hit Points', () => {
            DealDamageToTheSquaddie({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
                damage: playerDynamic.inBattleAttributes.currentHitPoints * 2,
                damageType: DamageType.Body,
            });

            const squaddieIsAlive = IsSquaddieAlive({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(squaddieIsAlive).toBeFalsy();
        });
    });

    describe('Squaddie can still act', () => {
        it('can act by default', () => {
            let {
                canAct,
                hasActionsRemaining,
                isDead,
            } = CanSquaddieActRightNow({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(canAct).toBeTruthy();
            expect(hasActionsRemaining).toBeTruthy();
            expect(isDead).toBeFalsy();
        });
        it('cannot act because it is out of actions', () => {
            playerDynamic.squaddieTurn.spendNumberActions(3);
            let {
                canAct,
                hasActionsRemaining,
            } = CanSquaddieActRightNow({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(canAct).toBeFalsy();
            expect(hasActionsRemaining).toBeFalsy();
        });
        it('knows a squaddie without hit points cannot act', () => {
            DealDamageToTheSquaddie({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
                damage: playerDynamic.inBattleAttributes.currentHitPoints * 2,
                damageType: DamageType.Body,
            });

            let {
                canAct,
                hasActionsRemaining,
                isDead,
            } = CanSquaddieActRightNow({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(canAct).toBeFalsy();
            expect(hasActionsRemaining).toBeFalsy();
            expect(isDead).toBeTruthy();
        });
    });

    describe('Player can control', () => {
        it('checks when the player controlled squaddie has actions', () => {
            let {
                squaddieHasThePlayerControlledAffiliation,
                squaddieCanCurrentlyAct,
                playerCanControlThisSquaddieRightNow,
            } = CanPlayerControlSquaddieRightNow({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(squaddieHasThePlayerControlledAffiliation).toBeTruthy();
            expect(squaddieCanCurrentlyAct).toBeTruthy();
            expect(playerCanControlThisSquaddieRightNow).toBeTruthy();
        });
        it('checks when the player controlled squaddie has no actions', () => {
            playerDynamic.squaddieTurn.spendNumberActions(3);
            let {
                squaddieHasThePlayerControlledAffiliation,
                squaddieCanCurrentlyAct,
                playerCanControlThisSquaddieRightNow,
            } = CanPlayerControlSquaddieRightNow({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });
            expect(squaddieHasThePlayerControlledAffiliation).toBeTruthy();
            expect(squaddieCanCurrentlyAct).toBeFalsy();
            expect(playerCanControlThisSquaddieRightNow).toBeFalsy();
        });
        it('checks when the enemy controlled squaddie has actions', () => {
            let {
                squaddieHasThePlayerControlledAffiliation,
                squaddieCanCurrentlyAct,
                playerCanControlThisSquaddieRightNow,
            } = CanPlayerControlSquaddieRightNow({
                staticSquaddie: enemyStatic,
                dynamicSquaddie: enemyDynamic,
            });
            expect(squaddieHasThePlayerControlledAffiliation).toBeFalsy();
            expect(squaddieCanCurrentlyAct).toBeTruthy();
            expect(playerCanControlThisSquaddieRightNow).toBeFalsy();
        });
        it('knows a squaddie without hit points cannot be controlled', () => {
            DealDamageToTheSquaddie({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
                damage: playerDynamic.inBattleAttributes.currentHitPoints * 2,
                damageType: DamageType.Body,
            });

            let {
                squaddieHasThePlayerControlledAffiliation,
                squaddieCanCurrentlyAct,
                playerCanControlThisSquaddieRightNow,
            } = CanPlayerControlSquaddieRightNow({
                staticSquaddie: playerStatic,
                dynamicSquaddie: playerDynamic,
            });

            expect(squaddieHasThePlayerControlledAffiliation).toBeTruthy();
            expect(squaddieCanCurrentlyAct).toBeFalsy();
            expect(playerCanControlThisSquaddieRightNow).toBeFalsy();
        });
    });
});
