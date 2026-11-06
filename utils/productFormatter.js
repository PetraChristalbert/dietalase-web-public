/**
 * Centralized utility to format product data from the database 
 * for the Flutter frontend. Handles JSONB conversion and 
 * legacy field compatibility.
 */
const formatProduct = (product) => {
  if (!product) return null;

  let imageList = [];
  try {
    // Handle both already-parsed JSON and stringified JSON
    imageList = typeof product.images === 'string' ? JSON.parse(product.images) : (product.images || []);
  } catch (e) {
    imageList = [];
  }

  // Ensure search_tags is also parsed if it's a string
  let tags = [];
  try {
    tags = typeof product.search_tags === 'string' ? JSON.parse(product.search_tags) : (product.search_tags || []);
  } catch (e) {
    tags = [];
  }

  return {
    ...product,
    images: imageList,
    search_tags: tags,
    // Legacy Support: Join with '`' so the existing Flutter Detail Sheet Carousel works
    image: (imageList && imageList.length > 0) ? imageList.join('`') : (product.image || null)
  };
};

module.exports = {
  formatProduct,
  formatProducts: (products) => (products || []).map(formatProduct)
};
