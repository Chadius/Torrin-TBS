export interface CutsceneDecisionTrigger {
    sourceDialogId: string;
    sourceDialogAnswer: number | undefined;
    destinationDialogId: string;
}

export const CutsceneDecisionTriggerService = {
    new: ({
              sourceDialogId,
              destinationDialogId,
              sourceDialogAnswer,
          }: {
        sourceDialogId: string,
        destinationDialogId: string,
        sourceDialogAnswer?: number,
    }): CutsceneDecisionTrigger => {
        return {
            sourceDialogId,
            sourceDialogAnswer,
            destinationDialogId,
        }
    },
    doesThisRequireAMatchingAnswer: (cutsceneDialogTrigger: CutsceneDecisionTrigger): boolean => {
        return cutsceneDialogTrigger.sourceDialogAnswer !== undefined;
    }
}
