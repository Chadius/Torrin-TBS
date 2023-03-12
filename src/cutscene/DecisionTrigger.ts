type Options = {
    source_dialog_answer: number;
}

type RequiredOptions = {
    source_dialog_id: string;
    destination_dialog_id: string;
}

export class DecisionTrigger {
    source_dialog_id: string;
    source_dialog_answer: number | undefined;
    destination_dialog_id: string;

    constructor(options: RequiredOptions & Partial<Options>) {
        this.destination_dialog_id = options.destination_dialog_id;
        this.source_dialog_id = options.source_dialog_id;
        this.source_dialog_answer = options.source_dialog_answer;
    }

    doesThisRequireAMatchingAnswer(): boolean {
        return this.source_dialog_answer !== undefined;
    }
}

