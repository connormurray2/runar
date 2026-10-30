/**
 * User identifiers of the form t<digits> are reserved.
 *
 * ANF lowering names its temporaries `t0`, `t1`, … (`freshTemp` in
 * 04-anf-lower) in the same binding namespace as user variables, so a user
 * variable spelled like a temporary aliased one. In
 *
 *     assert(a >= 0n);            // the `0n` lowers to temporary t1
 *     let t1: bigint = 0n;
 *     if (a === 9n) { t1 = 10n; }
 *     if (b === 5n && t1 === 0n) { t1 = 6n; }
 *
 * constant folding used the temporary's `t1 = 0n` for the second comparison,
 * folded it to `true`, and the locking script overwrote 10 with 6. The source
 * and the interpreter compute 10. Go, and by conformance every tier, emitted the
 * same bytes. Whether a name collided depended on how many temporaries preceded
 * it, so an unrelated edit could make the miscompile appear or disappear.
 *
 * The fix reserves the namespace in every tier's validator; the cross-tier
 * half of this gate is conformance/negatives/N46 and N47.
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../index.js';

function contract(body: string, params = 'a: bigint, b: bigint, expected: bigint', props = ''): string {
  return `import { SmartContract, assert } from 'runar-lang';
export class C extends SmartContract {
${props}
  constructor() { super(); }
  public check(${params}) {
${body}
  }
}`;
}

function errors(source: string): string[] {
  const r = compile(source, { fileName: 'C.runar.ts' });
  return (r.diagnostics ?? []).filter((d) => d.severity === 'error').map((d) => d.message);
}

const RESERVED = /uses a reserved name: identifiers of the form t<digits> are the compiler's temporaries/;

describe('reserved temporary names', () => {
  it('rejects the local that miscompiled', () => {
    const errs = errors(contract(`
    assert(a >= 0n);
    let t1: bigint = 0n;
    if (a === 9n) { t1 = 10n; }
    if (b === 5n && t1 === 0n) { t1 = 6n; }
    assert(t1 === expected);`));
    expect(errs).toHaveLength(1);
    expect(errs[0]).toMatch(/^Local variable 't1' /);
    expect(errs[0]).toMatch(RESERVED);
  });

  it('rejects a reserved name in every declaration position', () => {
    expect(errors(contract('    assert(t0 > 0n);', 't0: bigint'))[0]).toMatch(/^Parameter 't0' /);
    expect(errors(contract(`
    let s: bigint = 0n;
    for (let t7: bigint = 0n; t7 < 3n; t7++) { s = s + t7; }
    assert(s === expected);`))[0]).toMatch(/^Loop variable 't7' /);
    expect(errors(contract(`
    if (a > 0n) {
      const t42: bigint = a + b;
      assert(t42 === expected);
    } else {
      assert(b === expected);
    }`))[0]).toMatch(/^Local variable 't42' /);
  });

  it('rejects a reserved property name', () => {
    const src = `import { SmartContract, assert } from 'runar-lang';
export class C extends SmartContract {
  readonly t3: bigint;
  constructor(t3: bigint) { super(t3); this.t3 = t3; }
  public check(x: bigint) { assert(x === this.t3); }
}`;
    const errs = errors(src);
    expect(errs.some((e) => /^Property 't3' /.test(e))).toBe(true);
    expect(errs.some((e) => /^Constructor parameter 't3' /.test(e))).toBe(true);
  });

  it('accepts names that only resemble a temporary', () => {
    for (const name of ['t', 'tx', 't1a', 'T1', '_t1', 'tt1', 'total1']) {
      expect(errors(contract(`
    let ${name}: bigint = a;
    assert(${name} === expected);`)), name).toEqual([]);
    }
  });

  it('the renamed contract keeps the comparison it used to fold away', () => {
    // Same program with the local renamed. The comparison against the local
    // must survive folding: fold-on and fold-off scripts agree.
    const src = contract(`
    assert(a >= 0n);
    let best: bigint = 0n;
    if (a === 9n) { best = 10n; }
    if (b === 5n && best === 0n) { best = 6n; }
    assert(best === expected);`);
    const on = compile(src, { fileName: 'C.runar.ts' });
    const off = compile(src, { fileName: 'C.runar.ts', disableConstantFolding: true });
    expect(on.success && off.success).toBe(true);
    expect(on.artifact!.script).toBe(off.artifact!.script);
  });
});
