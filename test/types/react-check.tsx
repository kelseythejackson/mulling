// Type-only test for the React wrapper.
import { useRef } from 'react';
import { Mulling, type MullingRef } from 'mulling/react';
import { Mulling as CoreLoader } from 'mulling/react/core';

export function Ok() {
  const ref = useRef<MullingRef>(null);
  ref.current?.update({ state: 'done' });
  return (
    <>
      <Mulling ref={ref} state="searching" states={{ writing: 'scribble' }} announce="polite" size={24} className="x" />
      <CoreLoader type="my-custom-loader" label={null} maxFps={Number.POSITIVE_INFINITY} />
    </>
  );
}

// @ts-expect-error unknown states are rejected
export const badState = <Mulling state="pondering" />;
// @ts-expect-error announce only takes 'off' or 'polite'
export const badAnnounce = <Mulling announce="loud" />;
