// @vitest-environment jsdom
import { act, createElement, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PromptOptimizer } from '@/components/prompt-optimizer';
import { optimizePrompt } from '@/lib/prompt-optimization';

let host: HTMLDivElement;
let root: Root;
let change: ReturnType<typeof vi.fn<(value: string) => void>>;
let submit: ReturnType<typeof vi.fn<() => void>>;
function Harness({
  initial = '设计观察课',
  disabled = false,
  maxLength = 4000,
}: {
  initial?: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  const [value, setValue] = useState(initial);
  return createElement(
    'form',
    {
      onSubmit: (event) => {
        event.preventDefault();
        submit();
      },
    },
    createElement('textarea', {
      value,
      onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setValue(event.target.value),
    }),
    createElement(PromptOptimizer, {
      value,
      disabled,
      maxLength,
      context: 'teacher',
      onChange: (next) => {
        change(next);
        setValue(next);
      },
    }),
  );
}
function buttons() {
  return [...host.querySelectorAll('button')];
}
function edit(value: string) {
  const input = host.querySelector('textarea')!;
  Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
beforeEach(() => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  change = vi.fn();
  submit = vi.fn();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
});
describe('shared draft-only optimizer', () => {
  it('optimizes and restores the exact original without submitting the form', () => {
    act(() => root.render(createElement(Harness)));
    expect(buttons()[1].disabled).toBe(true);
    act(() => buttons()[0].click());
    expect(host.querySelector('textarea')!.value).toBe(
      optimizePrompt('设计观察课', 'teacher', 4000),
    );
    expect(buttons()[1].disabled).toBe(false);
    act(() => buttons()[1].click());
    expect(host.querySelector('textarea')!.value).toBe('设计观察课');
    expect(submit).not.toHaveBeenCalled();
  });
  it('does not erase subsequent manual edits', () => {
    act(() => root.render(createElement(Harness)));
    act(() => buttons()[0].click());
    act(() => edit('我手动写的新内容'));
    expect(buttons()[1].disabled).toBe(true);
    act(() => buttons()[1].click());
    expect(host.querySelector('textarea')!.value).toBe('我手动写的新内容');
    expect(host.textContent).toContain('避免覆盖新内容');
  });
  it.each([{ initial: '' }, { disabled: true }])('locks empty/read-only composers: %j', (props) => {
    act(() => root.render(createElement(Harness, props)));
    expect(buttons()[0].disabled).toBe(true);
    act(() => buttons()[0].click());
    expect(change).not.toHaveBeenCalled();
  });
  it('locks rewriting during IME composition', () => {
    act(() => root.render(createElement(Harness)));
    act(() =>
      host
        .querySelector('textarea')!
        .dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })),
    );
    expect(buttons()[0].disabled).toBe(true);
    act(() =>
      host
        .querySelector('textarea')!
        .dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })),
    );
    expect(buttons()[0].disabled).toBe(false);
  });
  it('retains original text when expansion exceeds the input limit', () => {
    act(() => root.render(createElement(Harness, { maxLength: 10 })));
    act(() => buttons()[0].click());
    expect(host.querySelector('textarea')!.value).toBe('设计观察课');
    expect(change).not.toHaveBeenCalled();
    expect(host.textContent).toContain('当前内容未更改');
  });
  it('resets undo history when the conversation key changes', () => {
    act(() => root.render(createElement(Harness, { key: 'thread-a' })));
    act(() => buttons()[0].click());
    act(() => root.render(createElement(Harness, { key: 'thread-b', initial: '另一个对话' })));
    expect(buttons()[1].disabled).toBe(true);
    expect(host.querySelector('textarea')!.value).toBe('另一个对话');
  });
});
