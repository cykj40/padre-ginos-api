CREATE TABLE IF NOT EXISTS pizza_types (
    pizza_type_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    ingredients TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pizzas (
    pizza_id TEXT PRIMARY KEY,
    pizza_type_id TEXT NOT NULL,
    size TEXT CHECK(size IN ('S', 'M', 'L')) NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (pizza_type_id) REFERENCES pizza_types(pizza_type_id)
);

CREATE TABLE IF NOT EXISTS orders (
    order_id INTEGER PRIMARY KEY,
    date TEXT NOT NULL,
    time TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_details (
    order_id INTEGER NOT NULL,
    pizza_id TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (pizza_id) REFERENCES pizzas(pizza_id),
    PRIMARY KEY (order_id, pizza_id)
);

REPLACE INTO pizza_types (pizza_type_id, name, category, ingredients) VALUES
    ('napolitana', 'Napolitana', 'Classic', 'San Marzano tomatoes, fresh mozzarella, basil, olive oil'),
    ('sicilian', 'Sicilian', 'Classic', 'Thick crust, tomatoes, herbs, onions, anchovies, hard cheeses'),
    ('hawaiian', 'Hawaiian', 'Specialty', 'Ham, pineapple, mozzarella, tomato sauce'),
    ('big-meat', 'Big Meat', 'Specialty', 'Pepperoni, sausage, bacon, ham, mozzarella'),
    ('pepperoni', 'Pepperoni', 'Classic', 'Pepperoni, mozzarella, tomato sauce'),
    ('veggie', 'Vegetarian', 'Specialty', 'Mushrooms, bell peppers, onions, olives'),
    ('spinach', 'Spinach', 'Specialty', 'Fresh spinach, feta, garlic, olive oil'),
    ('thai', 'Thai', 'Gourmet', 'Chicken, peanut sauce, bean sprouts, carrots, cilantro'),
    ('mexican', 'Mexican', 'Gourmet', 'Ground beef, jalapeños, tomatoes, onions, Mexican spices'),
    ('greek', 'Greek', 'Gourmet', 'Feta, olives, red onions, tomatoes, oregano');

REPLACE INTO pizzas (pizza_id, pizza_type_id, size, price) VALUES
    ('napolitana_s', 'napolitana', 'S', 11.99),
    ('napolitana_m', 'napolitana', 'M', 13.99),
    ('napolitana_l', 'napolitana', 'L', 15.99),
    ('sicilian_s', 'sicilian', 'S', 12.99),
    ('sicilian_m', 'sicilian', 'M', 14.99),
    ('sicilian_l', 'sicilian', 'L', 16.99),
    ('hawaiian_s', 'hawaiian', 'S', 11.99),
    ('hawaiian_m', 'hawaiian', 'M', 13.99),
    ('hawaiian_l', 'hawaiian', 'L', 15.99),
    ('big-meat_s', 'big-meat', 'S', 13.99),
    ('big-meat_m', 'big-meat', 'M', 15.99),
    ('big-meat_l', 'big-meat', 'L', 17.99),
    ('pepperoni_s', 'pepperoni', 'S', 11.99),
    ('pepperoni_m', 'pepperoni', 'M', 13.99),
    ('pepperoni_l', 'pepperoni', 'L', 15.99),
    ('veggie_s', 'veggie', 'S', 11.99),
    ('veggie_m', 'veggie', 'M', 13.99),
    ('veggie_l', 'veggie', 'L', 15.99),
    ('spinach_s', 'spinach', 'S', 12.99),
    ('spinach_m', 'spinach', 'M', 14.99),
    ('spinach_l', 'spinach', 'L', 16.99),
    ('thai_s', 'thai', 'S', 13.99),
    ('thai_m', 'thai', 'M', 15.99),
    ('thai_l', 'thai', 'L', 17.99),
    ('mexican_s', 'mexican', 'S', 12.99),
    ('mexican_m', 'mexican', 'M', 14.99),
    ('mexican_l', 'mexican', 'L', 16.99),
    ('greek_s', 'greek', 'S', 12.99),
    ('greek_m', 'greek', 'M', 14.99),
    ('greek_l', 'greek', 'L', 16.99);