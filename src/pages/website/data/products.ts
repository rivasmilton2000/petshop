export type Product = {
  id: string;
  name: string;
  category: string;
  animals: string[];
  image: string;
  description: string;
  price: number | null;
  colors?: { name: string; image: string }[];
};

export const categories: Record<string, string> = {
  all: 'Todos los productos',
  'pet-food': 'Alimentación',
  'eco-toys': 'Juguetes',
  'care-accessories': 'Cuidado y accesorios',
  dogs: 'Perros', cats: 'Gatos', birds: 'Aves', 'small-pets': 'Pequeñas mascotas',
};

// Ejemplos heredados de la plantilla. No representan inventario ni precios confirmados.
export const products: Product[] = [
  { id: 'ruff-wheels', name: 'Aros para jugar', category: 'eco-toys', animals: ['dogs'], image: 'ruff-wheels.jpg', description: 'Una idea para acompañar sus momentos de juego. Consulta las características antes de elegir un juguete para tu mascota.', price: null },
  { id: 'adjustable-eco-collar', name: 'Collar ajustable', category: 'care-accessories', animals: ['dogs'], image: 'eco-collar-sage.jpg', description: 'Un toque de color para sus paseos. Elige el tono que más te guste y revisa la talla adecuada para tu compañero.', price: null, colors: [{ name: 'Rosa', image: 'eco-collar-pink.jpg' }, { name: 'Verde', image: 'eco-collar-sage.jpg' }] },
  { id: 'petpet-pantry', name: 'Alimento para mascotas', category: 'pet-food', animals: ['dogs', 'cats'], image: 'petpet-pantry.jpg', description: 'Explora la categoría de alimentación. La elección debe considerar la especie, la edad y las necesidades de tu mascota.', price: null },
  { id: 'plaid-fetch-ball', name: 'Pelota de cuadros', category: 'eco-toys', animals: ['dogs'], image: 'plaid-fetch-ball.jpg', description: 'Una propuesta para compartir juegos y tiempo juntos.', price: null },
  { id: 'blue-bone-chew', name: 'Juguete en forma de hueso', category: 'eco-toys', animals: ['dogs'], image: 'blue-bone-chew.jpg', description: 'Un diseño con forma de hueso para explorar la colección de juguetes.', price: null },
  { id: 'bordeaux-ball', name: 'Pelota burdeos', category: 'eco-toys', animals: ['dogs', 'small-pets'], image: 'bordeaux-ball.jpg', description: 'Una pelota de color burdeos de la selección visual de la tienda.', price: null },
  { id: 'cozy-knit-sweater', name: 'Suéter de punto', category: 'care-accessories', animals: ['dogs', 'small-pets'], image: 'knit-sweater.jpg', description: 'Una idea de abrigo para explorar. Revisa siempre la talla y las necesidades de tu mascota.', price: null },
  { id: 'salmon-crunch-treats', name: 'Premios para mascotas', category: 'pet-food', animals: ['dogs', 'cats'], image: 'crunch-treats.jpg', description: 'Descubre ideas para sus pequeños premios. Los ingredientes y las indicaciones estarán disponibles con el catálogo confirmado.', price: null },
  { id: 'feather-wand', name: 'Varita con plumas', category: 'eco-toys', animals: ['cats', 'birds'], image: 'feather-wand.jpg', description: 'Una idea de juego compartido. Supervisa su uso y elige accesorios adecuados para cada mascota.', price: null },
];

export const productImage = (file: string) => `/website/img/products/${file}`;
export const productHref = (id: string) => `/website/product-detail?id=${encodeURIComponent(id)}`;
