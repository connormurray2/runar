// BranchPermutedParentSlots -- the two ways a branch arm used to reorder the
// slots it inherits from the enclosing scope while keeping the same names at
// the same depth (issue #178). deadRebind rebinds `w`, dead after the `if`, in
// place; nestedRebind rebinds the live `na` in a nested `if` without `else`;
// siblingsAbove does the same under three siblings.
module BranchPermutedParentSlots {
    resource struct BranchPermutedParentSlots {
        a: &mut bigint,
        b: &mut bigint,
        c: &mut bigint,
    }

    public fun deadRebind(contract: &mut BranchPermutedParentSlots, x: bigint, flag: bigint) {
        let w = x + 1;
        let k = x + 2;
        if (flag > 0) {
            w = w - 1;
        };
        contract.addOutput(1000, k, contract.b, contract.c);
    }

    public fun nestedRebind(contract: &mut BranchPermutedParentSlots, x: bigint, outer: bigint, inner: bigint) {
        let na = contract.a;
        let nb = contract.b;
        if (outer > 0) {
            if (inner > 0) {
                na = x + 1;
            };
        };
        contract.addOutput(1000, na, nb, contract.c);
    }

    public fun siblingsAbove(contract: &mut BranchPermutedParentSlots, x: bigint, outer: bigint, inner: bigint) {
        let na = contract.a;
        let s1 = x + 1;
        let s2 = x + 2;
        let s3 = x + 3;
        if (outer > 0) {
            if (inner > 0) {
                na = x;
            };
        };
        contract.addOutput(1000, na, s1 + s2, s3);
    }
}
