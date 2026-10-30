//go:build ignore

package x

import runar "github.com/icellan/runar/packages/runar-go"

// BranchPermutedParentSlots -- the two ways a branch arm used to reorder the
// slots it inherits from the enclosing scope while keeping the same names at
// the same depth (issue #178). DeadRebind rebinds `w`, dead after the `if`, in
// place; NestedRebind rebinds the live `na` in a nested `if` without `else`;
// SiblingsAbove does the same under three siblings.
type BranchPermutedParentSlots struct {
	runar.StatefulSmartContract

	A runar.Bigint
	B runar.Bigint
	C runar.Bigint
}

func (c *BranchPermutedParentSlots) DeadRebind(x runar.Bigint, flag runar.Bigint) {
	w := x + 1
	k := x + 2
	if flag > 0 {
		w = w - 1
	}
	c.AddOutput(1000, k, c.B, c.C)
}

func (c *BranchPermutedParentSlots) NestedRebind(x runar.Bigint, outer runar.Bigint, inner runar.Bigint) {
	na := c.A
	nb := c.B
	if outer > 0 {
		if inner > 0 {
			na = x + 1
		}
	}
	c.AddOutput(1000, na, nb, c.C)
}

func (c *BranchPermutedParentSlots) SiblingsAbove(x runar.Bigint, outer runar.Bigint, inner runar.Bigint) {
	na := c.A
	s1 := x + 1
	s2 := x + 2
	s3 := x + 3
	if outer > 0 {
		if inner > 0 {
			na = x
		}
	}
	c.AddOutput(1000, na, s1+s2, s3)
}
