const runar = @import("runar");

// BranchPermutedParentSlots -- the two ways a branch arm used to reorder the
// slots it inherits from the enclosing scope while keeping the same names at
// the same depth (issue #178). deadRebind rebinds `w`, dead after the `if`, in
// place; nestedRebind rebinds the live `na` in a nested `if` without `else`;
// siblingsAbove does the same under three siblings.
pub const BranchPermutedParentSlots = struct {
    pub const Contract = runar.StatefulSmartContract;

    a: i64 = 0,
    b: i64 = 0,
    c: i64 = 0,

    pub fn init(a: i64, b: i64, c: i64) BranchPermutedParentSlots {
        return .{ .a = a, .b = b, .c = c };
    }

    pub fn deadRebind(self: *BranchPermutedParentSlots, x: i64, flag: i64) void {
        var w = x + 1;
        const k = x + 2;
        if (flag > 0) {
            w = w - 1;
        }
        self.addOutput(1000, k, self.b, self.c);
    }

    pub fn nestedRebind(self: *BranchPermutedParentSlots, x: i64, outer: i64, inner: i64) void {
        var na = self.a;
        const nb = self.b;
        if (outer > 0) {
            if (inner > 0) {
                na = x + 1;
            }
        }
        self.addOutput(1000, na, nb, self.c);
    }

    pub fn siblingsAbove(self: *BranchPermutedParentSlots, x: i64, outer: i64, inner: i64) void {
        var na = self.a;
        const s1 = x + 1;
        const s2 = x + 2;
        const s3 = x + 3;
        if (outer > 0) {
            if (inner > 0) {
                na = x;
            }
        }
        self.addOutput(1000, na, s1 + s2, s3);
    }
};
