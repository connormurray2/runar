use runar::prelude::*;

/// BranchPermutedParentSlots -- the two ways a branch arm used to reorder the
/// slots it inherits from the enclosing scope while keeping the same names at
/// the same depth (issue #178). `dead_rebind` rebinds `w`, dead after the `if`,
/// in place; `nested_rebind` rebinds the live `na` in a nested `if` without
/// `else`; `siblings_above` does the same under three siblings.
#[runar::contract]
pub struct BranchPermutedParentSlots {
    pub a: Bigint,
    pub b: Bigint,
    pub c: Bigint,
}

impl BranchPermutedParentSlots {
    pub fn dead_rebind(&mut self, x: Bigint, flag: Bigint) {
        let mut w = x + 1;
        let k = x + 2;
        if flag > 0 {
            w = w - 1;
        }
        self.add_output(1000, k, self.b, self.c);
    }

    pub fn nested_rebind(&mut self, x: Bigint, outer: Bigint, inner: Bigint) {
        let mut na = self.a;
        let nb = self.b;
        if outer > 0 {
            if inner > 0 {
                na = x + 1;
            }
        }
        self.add_output(1000, na, nb, self.c);
    }

    pub fn siblings_above(&mut self, x: Bigint, outer: Bigint, inner: Bigint) {
        let mut na = self.a;
        let s1 = x + 1;
        let s2 = x + 2;
        let s3 = x + 3;
        if outer > 0 {
            if inner > 0 {
                na = x;
            }
        }
        self.add_output(1000, na, s1 + s2, s3);
    }
}
