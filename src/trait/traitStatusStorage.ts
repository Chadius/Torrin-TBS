export enum Trait {
    UNKNOWN = "UNKNOWN",
    ATTACK = "ATTACK",
    MOVEMENT = "MOVEMENT",
    HUMANOID = "HUMANOID",
    MONSU = "MONSU",
    DEMON = "DEMON",
    CROSS_OVER_PITS = "CROSS_OVER_PITS",
    PASS_THROUGH_WALLS = "PASS_THROUGH_WALLS",
}

export enum TraitCategory {
    UNKNOWN,
    ACTIVITY,
    CREATURE,
    MOVEMENT
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
        categories: [TraitCategory.ACTIVITY],
    },
    [Trait.MOVEMENT]: {
        description: "Moves the target across the map.",
        categories: [TraitCategory.ACTIVITY],
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

export const NullTraitStatusStorage: () => TraitStatusStorage = () => {
    return new TraitStatusStorage({});
}