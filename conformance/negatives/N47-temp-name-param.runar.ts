// The reserved t<digits> namespace (see N46) covers method parameters too: a
// parameter is a binding in the same namespace as the compiler's temporaries.
import { SmartContract, assert } from 'runar-lang';
export class N47 extends SmartContract {
  constructor() { super(); }
  public check(t0: bigint) {
    assert(t0 > 0n);
  }
}
