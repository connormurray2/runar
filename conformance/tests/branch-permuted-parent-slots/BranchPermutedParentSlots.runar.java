package runar.conformance.branchpermutedparentslots;

import runar.lang.StatefulSmartContract;
import runar.lang.annotations.Public;
import runar.lang.types.Bigint;

/**
 * BranchPermutedParentSlots -- the two ways a branch arm used to reorder the
 * slots it inherits from the enclosing scope while keeping the same names at
 * the same depth (issue #178). {@code deadRebind} rebinds {@code w}, dead after
 * the {@code if}, in place; {@code nestedRebind} rebinds the live {@code na} in
 * a nested {@code if} without {@code else}; {@code siblingsAbove} does the
 * same under three siblings.
 */
class BranchPermutedParentSlots extends StatefulSmartContract {

    Bigint a;
    Bigint b;
    Bigint c;

    BranchPermutedParentSlots(Bigint a, Bigint b, Bigint c) {
        super(a, b, c);
        this.a = a;
        this.b = b;
        this.c = c;
    }

    @Public
    void deadRebind(Bigint x, Bigint flag) {
        Bigint w = x.plus(Bigint.ONE);
        Bigint k = x.plus(Bigint.of(2));
        if (flag.gt(Bigint.ZERO)) {
            w = w.minus(Bigint.ONE);
        }
        this.addOutput(1000L, k, this.b, this.c);
    }

    @Public
    void nestedRebind(Bigint x, Bigint outer, Bigint inner) {
        Bigint na = this.a;
        Bigint nb = this.b;
        if (outer.gt(Bigint.ZERO)) {
            if (inner.gt(Bigint.ZERO)) {
                na = x.plus(Bigint.ONE);
            }
        }
        this.addOutput(1000L, na, nb, this.c);
    }

    @Public
    void siblingsAbove(Bigint x, Bigint outer, Bigint inner) {
        Bigint na = this.a;
        Bigint s1 = x.plus(Bigint.ONE);
        Bigint s2 = x.plus(Bigint.of(2));
        Bigint s3 = x.plus(Bigint.of(3));
        if (outer.gt(Bigint.ZERO)) {
            if (inner.gt(Bigint.ZERO)) {
                na = x;
            }
        }
        this.addOutput(1000L, na, s1.plus(s2), s3);
    }
}
