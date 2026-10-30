import { StatefulSmartContract } from 'runar-lang';

/**
 * BranchPermutedParentSlots -- the two ways a branch arm used to reorder the
 * slots it inherits from the enclosing scope while keeping the same names at
 * the same depth (issue #178). The sibling arm kept the old order, so after
 * the `if` one path read a neighbouring slot.
 *
 * deadRebind:   `w` is dead after the `if`; rebinding it in place consumed
 *               its slot and pushed the new value on top, over `k`.
 * nestedRebind: a nested `if` without `else` rebinds the live `na`, leaving
 *               the new value on top of `nb`.
 * siblingsAbove: the same under three siblings. Rolling `na` up in the else
 *               arm is cheaper than sinking it in the then-arm, so the arms
 *               agree on that order and the parent adopts it.
 */
class BranchPermutedParentSlots extends StatefulSmartContract {
  a: bigint;
  b: bigint;
  c: bigint;

  constructor(a: bigint, b: bigint, c: bigint) {
    super(a, b, c);
    this.a = a;
    this.b = b;
    this.c = c;
  }

  public deadRebind(x: bigint, flag: bigint) {
    let w: bigint = x + 1n;
    let k: bigint = x + 2n;
    if (flag > 0n) {
      w = w - 1n;
    }
    this.addOutput(1000n, k, this.b, this.c);
  }

  public nestedRebind(x: bigint, outer: bigint, inner: bigint) {
    let na: bigint = this.a;
    let nb: bigint = this.b;
    if (outer > 0n) {
      if (inner > 0n) {
        na = x + 1n;
      }
    }
    this.addOutput(1000n, na, nb, this.c);
  }

  public siblingsAbove(x: bigint, outer: bigint, inner: bigint) {
    let na: bigint = this.a;
    let s1: bigint = x + 1n;
    let s2: bigint = x + 2n;
    let s3: bigint = x + 3n;
    if (outer > 0n) {
      if (inner > 0n) {
        na = x;
      }
    }
    this.addOutput(1000n, na, s1 + s2, s3);
  }
}
