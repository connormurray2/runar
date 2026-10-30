// A user identifier of the form t<digits> is refused, in all seven tiers.
//
// ANF lowering names its temporaries t0, t1, ..., and user variables keep
// their source names in the same binding namespace. Here `assert(a >= 0n)`
// lowers its `0n` to the temporary `t1`, and the local below is also `t1`.
// With constant folding on (the default) the second `t1 === 0n` folded to true
// using the temporary's value, so for a = 9, b = 5 the script computed 6 where
// the source and the interpreter compute 10: a silent miscompile, byte-identical
// in every tier. Whether a given name collides depends on how many temporaries
// precede it, so the namespace is reserved outright.
import { SmartContract, assert } from 'runar-lang';
export class N46 extends SmartContract {
  constructor() { super(); }
  public check(a: bigint, b: bigint, expected: bigint) {
    assert(a >= 0n);
    let t1: bigint = 0n;
    if (a === 9n) { t1 = 10n; }
    if (b === 5n && t1 === 0n) { t1 = 6n; }
    assert(t1 === expected);
  }
}
