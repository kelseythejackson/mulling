import type { LoaderType } from './types';

/** What the AI is doing. `done` and `error` are endings: they play once and then hold still. */
export type LoaderState = 'thinking' | 'searching' | 'writing' | 'done' | 'error';
export type WorkingState = Exclude<LoaderState, 'done' | 'error'>;
export type EndState = Extract<LoaderState, 'done' | 'error'>;

export const loaderStates: readonly LoaderState[] = ['thinking', 'searching', 'writing', 'done', 'error'];

/** Which loader each working state shows unless the `states` option says otherwise. */
export const defaultStateLoaders: Record<WorkingState, LoaderType> = {
  thinking: 'breath',
  searching: 'murmur',
  writing: 'tide',
};

/** What screen readers hear for each state unless the `labels` option says otherwise. */
export const defaultStateLabels: Record<LoaderState, string> = {
  thinking: 'Thinking',
  searching: 'Searching',
  writing: 'Writing',
  done: 'Done',
  error: 'Something went wrong',
};

export function isEndState(state: LoaderState): state is EndState {
  return state === 'done' || state === 'error';
}

/** Markup for the two endings. Strokes use pathLength="1" so the CSS can draw them on at any size. */
export const endMarks: Record<EndState, string> = {
  done:
    '<svg class="mulling-mark mulling-done" viewBox="0 0 24 24" aria-hidden="true">' +
    '<circle class="mulling-ring mulling-animate" cx="12" cy="12" r="10"/>' +
    '<path class="mulling-stroke mulling-animate" pathLength="1" d="M7.5 12.4l3.1 3.1 5.9-6.4"/></svg>',
  error:
    '<svg class="mulling-mark mulling-error" viewBox="0 0 24 24" aria-hidden="true">' +
    '<circle class="mulling-ring mulling-animate" cx="12" cy="12" r="10"/>' +
    '<path class="mulling-stroke mulling-animate" pathLength="1" d="M12 7.2v6"/>' +
    '<path class="mulling-dot mulling-animate" d="M12 16.8v.01"/></svg>',
};
