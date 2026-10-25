/**
 * Size / colour choices on a product.
 * A choice is filled in automatically only when there is just one option;
 * otherwise the customer must pick (so nobody gets a ring size they didn't choose).
 */
export const autoPick = list => (Array.isArray(list) && list.length === 1 ? list[0] : '')

// '' when everything needed is chosen, else e.g. 'size', 'colour' or 'size and colour'
export function missingChoice(product, size, color) {
  const needSize  = (product?.sizes  || []).length > 1 && !size
  const needColor = (product?.colors || []).length > 1 && !color
  return [needSize && 'size', needColor && 'colour'].filter(Boolean).join(' and ')
}
