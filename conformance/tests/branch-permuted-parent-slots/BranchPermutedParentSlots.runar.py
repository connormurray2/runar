from runar import (
    StatefulSmartContract, Bigint, public,
)


class BranchPermutedParentSlots(StatefulSmartContract):
    """The two ways a branch arm used to reorder the slots it inherits from the
    enclosing scope while keeping the same names at the same depth (issue
    #178). `dead_rebind` rebinds `w`, dead after the `if`, in place;
    `nested_rebind` rebinds the live `na` in a nested `if` without `else`;
    `siblings_above` does the same under three siblings."""

    a: Bigint
    b: Bigint
    c: Bigint

    def __init__(self, a: Bigint, b: Bigint, c: Bigint):
        super().__init__(a, b, c)
        self.a = a
        self.b = b
        self.c = c

    @public
    def dead_rebind(self, x: Bigint, flag: Bigint):
        w = x + 1
        k = x + 2
        if flag > 0:
            w = w - 1
        self.add_output(1000, k, self.b, self.c)

    @public
    def nested_rebind(self, x: Bigint, outer: Bigint, inner: Bigint):
        na = self.a
        nb = self.b
        if outer > 0:
            if inner > 0:
                na = x + 1
        self.add_output(1000, na, nb, self.c)

    @public
    def siblings_above(self, x: Bigint, outer: Bigint, inner: Bigint):
        na = self.a
        s1 = x + 1
        s2 = x + 2
        s3 = x + 3
        if outer > 0:
            if inner > 0:
                na = x
        self.add_output(1000, na, s1 + s2, s3)
