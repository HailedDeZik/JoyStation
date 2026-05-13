const BASE_URL = 'http://localhost:3000/api';

async function fetchProducts() {
  try {
    const response = await fetch(`${BASE_URL}/products`);
    if (!response.ok) {
      throw new Error('Ошибка загрузки продуктов');
    }
    return await response.json();
  } catch (error) {
    console.error('Ошибка загрузки продуктов:', error);
    // Fallback на дефолтные продукты, если API недоступен
    return [
      {
        id: 1,
        title: "Cyberpunk 2077",
        price: 1999,
        image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=400&q=80"
      },
      {
        id: 2,
        title: "GTA V",
        price: 999,
        image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=400&q=80"
      }
    ];
  }
}

let products = [];
fetchProducts().then(data => {
  products = data;
  console.log('Продукты загружены:', products.length);
});

// Экспортируем функцию для получения продуктов
window.getProducts = async () => {
  if (products.length === 0) {
    products = await fetchProducts();
  }
  return products;
};
