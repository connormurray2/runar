/**
 * Cross-tier reference for issue #178: a branch arm reordered the slots it
 * inherited from the enclosing scope.
 *
 * An arm could permute the parent's slots and keep the same names at the same
 * depth. `lowerIf` compared the arms by name count and depth only, the sibling
 * arm kept the parent's order, and the parent went on modelling the parent's
 * order, so after the `if` every read of a moved slot on the permuted path
 * took its neighbour's value. Silent in all seven tiers, fold on and off, and
 * `TestContract` agreed with the source throughout.
 *
 *   dead-rebind   `w` is dead after the `if`, so `w = w - 1n` consumes its
 *                 slot and pushes the new value on top of `k`. `k` then read
 *                 the rebound `w`.
 *   nested-live   a nested `if` without `else` rebinds the live `k`, leaving
 *                 the new value on top of `m`. `k` and `m` then read each
 *                 other.
 *   nested-live-deep
 *                 the same under three siblings. Rolling `k` up in the else
 *                 arm is cheaper than sinking it in the then-arm, so the arms
 *                 agree on `[m1 m2 m3 k]` and the parent adopts that order.
 *   issue-repro   the reported shape, which has both: a nested write of `k2`
 *                 and a dead `want = want - 1n`. `k2` read `want`.
 *
 * Fix (05-stack-lower, `lowerIf`): before the reconcile reads the arms by
 * position, bring their inherited slots into one order, rolling in whichever arm
 * costs fewer bytes, and let the parent adopt that order after OP_ENDIF. The
 * first three hexes gained one OP_SWAP (0x7c) at the end of the permuted
 * then-arm; nested-live-deep gained `53 7a` (roll 3) in its else arm and reads
 * `k` from the top. The pre-fix bytes are kept beside them so a reader can see
 * what moved. Layer D then refuses, at compile time, any pair of arms that still
 * disagree slot by slot on a name the parent can read.
 *
 * The spend-level proof (each shape through `@bsv/sdk` `Spend`, with the values
 * the miscompile used to accept) is
 * packages/runar-testing/src/__tests__/branch-arm-permuted-parent-slots-vm.test.ts.
 *
 * The hexes are the SEVEN-TIER agreed output. The peer tiers pin the same
 * strings (each tier's own `branch_arm_inherited_order` test).
 */

import { describe, it, expect } from 'vitest';
import { compile } from '../index.js';

const DEAD_REBIND = `import { SmartContract, assert } from 'runar-lang';

class C extends SmartContract {
  constructor() { super(); }

  public check(a: bigint, b: bigint, expected: bigint) {
    let w: bigint = a;
    let k: bigint = b;
    if (a > 0n) { w = w - 1n; }
    assert(k === expected);
  }
}`;

const NESTED_LIVE = `import { SmartContract, assert } from 'runar-lang';

class C extends SmartContract {
  constructor() { super(); }

  public check(a: bigint, b: bigint, expected: bigint) {
    let k: bigint = b;
    let m: bigint = a;
    if (a > 0n) { if (b > 0n) { k = 5n; } }
    assert(k * 100n + m === expected);
  }
}`;

const NESTED_LIVE_DEEP = `import { SmartContract, assert } from 'runar-lang';

class C extends SmartContract {
  constructor() { super(); }

  public check(a: bigint, b: bigint, expected: bigint) {
    let k: bigint = b;
    let m1: bigint = a;
    let m2: bigint = a + 1n;
    let m3: bigint = a + 2n;
    if (a > 0n) { if (b > 0n) { k = 5n; } }
    assert(k * 1000n + m1 * 100n + m2 * 10n + m3 === expected);
  }
}`;

const ISSUE_REPRO = `import { SmartContract, assert } from 'runar-lang';

class C extends SmartContract {
  constructor() { super(); }

  public check(a: bigint, e: bigint, expected: bigint) {
    let c4: bigint = 0n;
    if (e === 4n) { c4 = c4 + 1n; }
    let q: bigint = 0n;
    if (a === 7n) { q = 8n; }
    let k1: bigint = 0n;
    let k2: bigint = 0n;
    let ex1: bigint = 0n;
    let want: bigint = 0n;
    let slot: bigint = 0n;
    if (q > 0n) { k1 = q; ex1 = q; want = 1n; slot = 2n; }
    let pr: bigint = 0n;
    if (c4 > 0n) { pr = 1n; }
    if (want > 0n && pr > 0n && ex1 !== 5n) {
      if (slot === 2n) { k2 = 5n; }
      want = want - 1n;
    }
    assert(k1 * 16n + k2 === expected);
  }
}`;

const ISSUE_REPRO_HEX =
  '007b549c6351787c936776687700537a579c63586776687700000000000056797ca06355795679515253795379' +
  '53795379537a537a537a537a547a75547a75547a75547a75675479537953795379537a537a537a537a68547a75' +
  '547a75547a75557a75547a0000587a7ca06351677668770054797ca06300a0670077686355547a7c9c916700547a' +
  '756863527b7c9c635567766877517b7c947c67776860537a7c957c93537a9c7777';

/** Seven-tier agreed hex, keyed `<shape>/<fold mode>`. Folding changes nothing here. */
export const BRANCH_ARM_INHERITED_ORDER_GOLDEN = {
  'dead-rebind/fold-on': '52797b537a00a063517b7c947c687b9c77',
  'dead-rebind/fold-off': '52797b537a00a063517b7c947c687b9c77',
  'nested-live/fold-on': '785379547a00a063537a00a06355677868527a757c67537a756801647b7c957c937c9c',
  'nested-live/fold-off': '785379547a00a063537a00a06355677868527a757c67537a756801647b7c957c937c9c',
  'nested-live-deep/fold-on':
    '78537954798b55795293567a00a063557a00a0635567537968547a7567557a75537a6802e803950164547a7c95935a537a7c95937c937c9c',
  'nested-live-deep/fold-off':
    '78537954798b55795293567a00a063557a00a0635567537968547a7567557a75537a6802e803950164547a7c95935a537a7c95937c937c9c',
  'issue-repro/fold-on': ISSUE_REPRO_HEX,
  'issue-repro/fold-off': ISSUE_REPRO_HEX,
} as const;

/** What every tier emitted before the fix. */
const PRE_FIX = {
  'dead-rebind': '52797b537a00a063517b7c94687b9c77',
  'nested-live': '785379547a00a063537a00a06355677868527a7567537a756801647b7c957c937c9c',
  'nested-live-deep':
    '78537954798b55795293567a00a063557a00a0635567537968547a7567557a756802e803547a7c950164547a7c95935a537a7c95937c937c9c',
  'issue-repro': ISSUE_REPRO_HEX.replace('7b7c947c6777', '7b7c946777'),
} as const;

const SOURCES = {
  'dead-rebind': DEAD_REBIND,
  'nested-live': NESTED_LIVE,
  'nested-live-deep': NESTED_LIVE_DEEP,
  'issue-repro': ISSUE_REPRO,
} as const;

describe('issue #178: branch arms keep the parent slots they inherit in order', () => {
  for (const shape of Object.keys(SOURCES) as (keyof typeof SOURCES)[]) {
    for (const disableConstantFolding of [false, true]) {
      const key = `${shape}/fold-${disableConstantFolding ? 'off' : 'on'}` as keyof typeof BRANCH_ARM_INHERITED_ORDER_GOLDEN;
      it(`${key} compiles to the seven-tier agreed script`, () => {
        const r = compile(SOURCES[shape], { fileName: 'C.runar.ts', disableConstantFolding });
        expect(r.success, r.diagnostics.map((d) => d.message).join('; ')).toBe(true);
        expect(r.artifact?.script).toBe(BRANCH_ARM_INHERITED_ORDER_GOLDEN[key]);
        expect(r.artifact?.script).not.toBe(PRE_FIX[shape]);
      });
    }
  }

  // The issue quotes the miscompiled hex. Pin that the quote is what main
  // emitted, so the PRE_FIX derivation above is checked against the record.
  it('the pre-fix issue-repro bytes are the hex quoted in #178', () => {
    expect(PRE_FIX['issue-repro']).toBe(
      '007b549c6351787c936776687700537a579c63586776687700000000000056797ca0635579567951525379537953795379537a537a537a537a547a75547a75547a75547a75675479537953795379537a537a537a537a68547a75547a75547a75557a75547a0000587a7ca06351677668770054797ca06300a0670077686355547a7c9c916700547a756863527b7c9c635567766877517b7c9467776860537a7c957c93537a9c7777',
    );
  });
});
