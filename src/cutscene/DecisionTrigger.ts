type Options = {
    sourceDialogAnswer: number;
}

type RequiredOptions = {
    sourceDialogId: string;
    destinationDialogId: string;
}

export class DecisionTrigger {
    sourceDialogId: string;
    sourceDialogAnswer: number | undefined;
    destinationDialogId: string;

    constructor(options: RequiredOptions & Partial<Options>) {
        this.destinationDialogId = options.destinationDialogId;
        this.sourceDialogId = options.sourceDialogId;
        this.sourceDialogAnswer = options.sourceDialogAnswer;
    }

    doesThisRequireAMatchingAnswer(): boolean {
        return this.sourceDialogAnswer !== undefined;
    }
}

