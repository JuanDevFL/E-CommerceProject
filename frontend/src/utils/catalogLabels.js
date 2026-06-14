const PRODUCT_CATEGORY_LABELS = {
  Shoulder: 'Bolso al hombro',
  Crossbody: 'Bolso cruzado',
  Bucket: 'Bolso tipo saco',
  Clutch: 'Cartera de mano',
  Tote: 'Bolso tote',
  'Mini bag': 'Bolso mini',
  Satchel: 'Bolso estructurado',
  Hobo: 'Bolso hobo',
};

const PRODUCT_TAG_LABELS = {
  Restock: 'Reposición',
  'Best seller': 'Más vendido',
};

export function translateCategoryLabel(category) {
  return PRODUCT_CATEGORY_LABELS[category] || category;
}

export function translateProductTagLabel(tag) {
  return PRODUCT_TAG_LABELS[tag] || tag;
}