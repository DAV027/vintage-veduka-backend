const PRODUCT_CATALOG = Object.freeze({
  make_your_own_diya: { name: 'Make Your Own Diya', description: 'Hands-on clay crafting workshop', price: 500 },
  paint_your_diya: { name: 'Paint Your Diya', description: 'Decorate your own diya with colours', price: 500 },
  block_print_tote: { name: 'Block Print on Tote Bag', description: 'Traditional block-print on a tote bag', price: 700 },
  storytelling: { name: 'Storytelling', description: 'Immersive folk storytelling session', price: 600 },
  kuchipudi: { name: 'Kuchipudi Dance', description: 'Traditional Kuchipudi performance', price: 600 },
  art_combo: { name: 'Art Combo', description: 'Includes three creative experiences', price: 1400 },
  all_5_combo: { name: 'All 5 Activities Combo', description: 'Includes all five paid activities', price: 2000 },
});

const MAX_QUANTITY = 20;

function priceBookingItems(inputItems) {
  if (!Array.isArray(inputItems) || inputItems.length === 0) {
    return { errors: ['Select at least one activity or package.'], items: [], amount: 0 };
  }

  const errors = [];
  const seenIds = new Set();
  const items = [];

  for (const inputItem of inputItems) {
    if (!inputItem || typeof inputItem !== 'object' || Array.isArray(inputItem)) {
      errors.push('Invalid activity selection.');
      continue;
    }

    const { id, quantity } = inputItem;
    const product = typeof id === 'string' && Object.prototype.hasOwnProperty.call(PRODUCT_CATALOG, id)
      ? PRODUCT_CATALOG[id]
      : null;
    if (!product) {
      errors.push('One or more selected activities are not available.');
      continue;
    }

    if (seenIds.has(id)) {
      errors.push('Each activity can only be selected once.');
      continue;
    }
    seenIds.add(id);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      errors.push(`Invalid quantity for ${product.name}.`);
      continue;
    }

    items.push({
      id,
      name: product.name,
      description: product.description,
      quantity,
      unitPrice: product.price,
      subtotal: quantity * product.price,
    });
  }

  if (errors.length) return { errors, items: [], amount: 0 };

  return {
    errors,
    items,
    amount: items.reduce((total, item) => total + item.subtotal, 0),
  };
}

module.exports = { PRODUCT_CATALOG, MAX_QUANTITY, priceBookingItems };
