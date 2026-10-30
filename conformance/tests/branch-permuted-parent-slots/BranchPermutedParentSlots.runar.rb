require 'runar'

# BranchPermutedParentSlots -- the two ways a branch arm used to reorder the
# slots it inherits from the enclosing scope while keeping the same names at
# the same depth (issue #178). dead_rebind rebinds `w`, dead after the `if`, in
# place; nested_rebind rebinds the live `na` in a nested `if` without `else`;
# siblings_above does the same under three siblings.
class BranchPermutedParentSlots < Runar::StatefulSmartContract
  prop :a, Bigint
  prop :b, Bigint
  prop :c, Bigint

  def initialize(a, b, c)
    super(a, b, c)
    @a = a
    @b = b
    @c = c
  end

  runar_public x: Bigint, flag: Bigint
  def dead_rebind(x, flag)
    w = x + 1
    k = x + 2
    if flag > 0
      w = w - 1
    end
    add_output(1000, k, @b, @c)
  end

  runar_public x: Bigint, outer: Bigint, inner: Bigint
  def nested_rebind(x, outer, inner)
    na = @a
    nb = @b
    if outer > 0
      if inner > 0
        na = x + 1
      end
    end
    add_output(1000, na, nb, @c)
  end

  runar_public x: Bigint, outer: Bigint, inner: Bigint
  def siblings_above(x, outer, inner)
    na = @a
    s1 = x + 1
    s2 = x + 2
    s3 = x + 3
    if outer > 0
      if inner > 0
        na = x
      end
    end
    add_output(1000, na, s1 + s2, s3)
  end
end
