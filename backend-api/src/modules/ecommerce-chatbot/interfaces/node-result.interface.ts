import { GraphState } from './graph-state.interface';

export interface NodeResult {
  updatedState: Partial<GraphState>;
  nextNode?: string;
  shouldContinue: boolean;
}
