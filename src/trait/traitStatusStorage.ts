export enum Trait {
    UNKNOWN = "UNKNOWN",
    ATTACK = "ATTACK",
    HEALING = "HEALING",
    MOVEMENT = "MOVEMENT",
    HUMANOID = "HUMANOID",
    MONSU = "MONSU",
    DEMON = "DEMON",
    CROSS_OVER_PITS = "CROSS_OVER_PITS",
    PASS_THROUGH_WALLS = "PASS_THROUGH_WALLS",
    TARGET_ARMOR = "TARGET_ARMOR",
    SKIP_ANIMATION = "SKIP_ANIMATION",
    TARGETS_SELF = "TARGETS_SELF",
    TARGETS_FOE = "TARGETS_FOE",
    TARGETS_ALLIES = "TARGETS_ALLIES",
    ALWAYS_HITS = "ALWAYS_HITS",
}

export enum TraitCategory {
    UNKNOWN = "UNKNOWN",
    ACTION = "ACTION",
    CREATURE = "CREATURE",
    MOVEMENT = "MOVEMENT",
    ANIMATION = "ANIMATION",
}

const traitInformation: {
    [key in Trait]: {
        description: string,
        categories: TraitCategory[],
    }
} = {
    [Trait.UNKNOWN]: {
        description: "Should never be used.",
        categories: [TraitCategory.UNKNOWN],
    },
    [Trait.ATTACK]: {
        description: "Damage and negatively affect the target. Subject to a multiple attack penalty over repeated use.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.HEALING]: {
        description: "Positively affect the target by restoring hit points.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.MOVEMENT]: {
        description: "Moves the target across the map.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.HUMANOID]: {
        description: "Creatures have two legs, two arms to manipulate tools and have bilateral symmetry.",
        categories: [TraitCategory.CREATURE],
    },
    [Trait.MONSU]: {
        description: "Water djinn, able to manipulate primal forces and thirst.",
        categories: [TraitCategory.CREATURE],
    },
    [Trait.DEMON]: {
        description: "Demons are an almost extinct race who feast on the sins of mortals.",
        categories: [TraitCategory.CREATURE],
    },
    [Trait.CROSS_OVER_PITS]: {
        description: "Can cross over but not stop on pits.",
        categories: [TraitCategory.MOVEMENT],
    },
    [Trait.PASS_THROUGH_WALLS]: {
        description: "Can cross over but not stop on walls.",
        categories: [TraitCategory.MOVEMENT],
    },
    [Trait.TARGET_ARMOR]: {
        description: "These actions succeed based on the target's armor.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.SKIP_ANIMATION]: {
        description: "Action does not require animation",
        categories: [TraitCategory.ACTION, TraitCategory.ANIMATION]
    },
    [Trait.TARGETS_SELF]: {
        description: "The acting Squaddie can target themself.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.TARGETS_FOE]: {
        description: "The acting Squaddie can target foes with this action.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.TARGETS_ALLIES]: {
        description: "The acting Squaddie can target allies with this action.",
        categories: [TraitCategory.ACTION],
    },
    [Trait.ALWAYS_HITS]: {
        description: "This ability always hits the target.",
        categories: [TraitCategory.ACTION],
    }
}

export class TraitStatusStorage {
    booleanTraits: { [key in Trait]?: boolean }

    constructor(initialTraitValues?: { [key in Trait]?: boolean }) {
        this.booleanTraits = {};

        if (initialTraitValues) {
            Object.entries(initialTraitValues).forEach(([traitName, value]) => {
                const trait: Trait = Trait[traitName as keyof typeof Trait];
                if (trait && trait !== Trait.UNKNOWN) {
                    this.setStatus(trait, value);
                }
            })
        }
    }

    setStatus(trait: Trait, value: boolean): void {
        this.booleanTraits[trait] = value;
    }

    getStatus(trait: Trait): any {
        return this.booleanTraits[trait];
    }

    filterCategory(category: TraitCategory): TraitStatusStorage {
        this.booleanTraits = Object.fromEntries(
            Object.keys(this.booleanTraits)
                .filter((traitName: Trait) =>
                    traitInformation[traitName].categories.includes(category)
                )
                .map((traitName: Trait) => [traitName, this.booleanTraits[traitName]])
        )

        return this;
    }
}
