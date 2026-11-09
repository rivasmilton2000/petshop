<?php
/**
 * Petshop – Catálogo de productos (datos de ejemplo).
 * Lo comparten shop.php y product-detail.php. No usa la carpeta conexion/.
 *
 * Cada producto: id (slug), nombre, precio, badge ('' | 'Sale' | 'Best Seller'),
 * categoria (slug), animales (etiquetas), img, descripcion y, opcionalmente,
 * colores (muestras con su propia foto).
 */

/** Categorías de "Browse by": slug => nombre visible. */
$categoriasShop = [
    'all'              => 'All Products',
    'pet-food'         => 'Pet Food',
    'eco-toys'         => 'Eco Toys',
    'care-accessories' => 'Care Accessories',
    'cats'             => 'cats',
    'dogs'             => 'Dogs',
    'birds'            => 'Birds',
    'small-pets'       => 'Small Pets',
];

/** Nombre visible de las categorías "reales" de producto. */
$categoriaNombres = [
    'pet-food'         => 'Pet Food',
    'eco-toys'         => 'Eco Toys',
    'care-accessories' => 'Care Accessories',
];

$productos = [
    [
        'id' => 'ruff-wheels', 'nombre' => 'Ruff Wheels', 'precio' => 8.00, 'badge' => 'Sale',
        'categoria' => 'eco-toys', 'animales' => ['dogs'],
        'img' => 'ruff-wheels.jpg',
        'descripcion' => 'A chunky set of natural-rubber chew rings built for happy, heavy chewers. Textured nubs help clean teeth while they play.',
    ],
    [
        'id' => 'adjustable-eco-collar', 'nombre' => 'Adjustable Eco Collar', 'precio' => 5.00, 'badge' => '',
        'categoria' => 'care-accessories', 'animales' => ['dogs'],
        'img' => 'eco-collar-sage.jpg',
        'descripcion' => 'A comfortable and stylish collar made from recycled materials, featuring a secure buckle and adjustable strap for a perfect fit for your dog.',
        'colores' => [
            ['nombre' => 'Pastel Pink', 'hex' => '#E9B8C4', 'img' => 'eco-collar-pink.jpg'],
            ['nombre' => 'Sage Green',  'hex' => '#7D9479', 'img' => 'eco-collar-sage.jpg'],
        ],
    ],
    [
        'id' => 'petpet-pantry', 'nombre' => 'PetPet Pantry', 'precio' => 24.90, 'badge' => '',
        'categoria' => 'pet-food', 'animales' => ['dogs', 'cats'],
        'img' => 'petpet-pantry.jpg',
        'descripcion' => 'Everyday premium kibble in a reusable, kraft-lined pantry bag. Balanced nutrition with sustainably sourced ingredients.',
    ],
    [
        'id' => 'plaid-fetch-ball', 'nombre' => 'Plaid Fetch Ball', 'precio' => 6.00, 'badge' => '',
        'categoria' => 'eco-toys', 'animales' => ['dogs'],
        'img' => 'plaid-fetch-ball.jpg',
        'descripcion' => 'A soft, squeaky fetch ball wrapped in recycled plaid fabric. Gentle on teeth, tough on game day.',
    ],
    [
        'id' => 'blue-bone-chew', 'nombre' => 'Blue Bone Chew', 'precio' => 9.00, 'badge' => 'Best Seller',
        'categoria' => 'eco-toys', 'animales' => ['dogs'],
        'img' => 'blue-bone-chew.jpg',
        'descripcion' => 'A durable, non-toxic rubber bone with a matte finish that is easy to clean and fun to chew.',
    ],
    [
        'id' => 'bordeaux-ball', 'nombre' => 'Bordeaux Bounce Ball', 'precio' => 7.00, 'badge' => '',
        'categoria' => 'eco-toys', 'animales' => ['dogs', 'small-pets'],
        'img' => 'bordeaux-ball.jpg',
        'descripcion' => 'A bouncy natural-rubber ball in a rich bordeaux tone. Floats, bounces and survives backyard adventures.',
    ],
    [
        'id' => 'cozy-knit-sweater', 'nombre' => 'Cozy Knit Sweater', 'precio' => 22.00, 'badge' => '',
        'categoria' => 'care-accessories', 'animales' => ['dogs', 'small-pets'],
        'img' => 'knit-sweater.jpg',
        'descripcion' => 'A chunky oatmeal knit made from recycled yarn to keep your best friend warm on the coldest walks.',
    ],
    [
        'id' => 'salmon-crunch-treats', 'nombre' => 'Salmon Crunch Treats', 'precio' => 12.00, 'badge' => 'Best Seller',
        'categoria' => 'pet-food', 'animales' => ['dogs', 'cats'],
        'img' => 'crunch-treats.jpg',
        'descripcion' => 'Small-batch baked crunchy treats made with wild-caught salmon and zero fillers. Perfect for training.',
    ],
    [
        'id' => 'feather-wand', 'nombre' => 'Feather Wand Teaser', 'precio' => 6.50, 'badge' => 'Sale',
        'categoria' => 'eco-toys', 'animales' => ['cats', 'birds'],
        'img' => 'feather-wand.jpg',
        'descripcion' => 'A hand-assembled teaser wand with natural feathers and a sustainable wooden handle for endless pounce sessions.',
    ],
];

/** Busca un producto por su id; devuelve null si no existe. */
function buscarProducto(array $productos, string $id): ?array
{
    foreach ($productos as $p) {
        if ($p['id'] === $id) {
            return $p;
        }
    }
    return null;
}
