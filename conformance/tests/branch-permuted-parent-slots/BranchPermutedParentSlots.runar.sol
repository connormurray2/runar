pragma runar ^0.1.0;

/// @title BranchPermutedParentSlots
/// @notice The two ways a branch arm used to reorder the slots it inherits
/// from the enclosing scope while keeping the same names at the same depth
/// (issue #178). deadRebind rebinds `w`, dead after the `if`, in place;
/// nestedRebind rebinds the live `na` in a nested `if` without `else`;
/// siblingsAbove does the same under three siblings.
contract BranchPermutedParentSlots is StatefulSmartContract {
    bigint a;
    bigint b;
    bigint c;

    constructor(bigint _a, bigint _b, bigint _c) {
        a = _a;
        b = _b;
        c = _c;
    }

    function deadRebind(bigint x, bigint flag) public {
        bigint w = x + 1;
        bigint k = x + 2;
        if (flag > 0) {
            w = w - 1;
        }
        this.addOutput(1000, k, this.b, this.c);
    }

    function nestedRebind(bigint x, bigint outer, bigint inner) public {
        bigint na = this.a;
        bigint nb = this.b;
        if (outer > 0) {
            if (inner > 0) {
                na = x + 1;
            }
        }
        this.addOutput(1000, na, nb, this.c);
    }

    function siblingsAbove(bigint x, bigint outer, bigint inner) public {
        bigint na = this.a;
        bigint s1 = x + 1;
        bigint s2 = x + 2;
        bigint s3 = x + 3;
        if (outer > 0) {
            if (inner > 0) {
                na = x;
            }
        }
        this.addOutput(1000, na, s1 + s2, s3);
    }
}
