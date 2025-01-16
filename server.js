import fastify from "fastify";
import fastifyStatic from "@fastify/static";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

// Create Fastify instance without logger in production
const server = fastify({
    logger: process.env.NODE_ENV !== 'production'
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

// Basic CORS headers
server.addHook('preHandler', (request, reply, done) => {
    const allowedOrigins = [
        'http://localhost:3000',
        ...(process.env.ALLOWED_ORIGINS || '').split(',').filter(Boolean)
    ];

    const origin = request.headers.origin;
    if (allowedOrigins.includes(origin)) {
        reply.header('Access-Control-Allow-Origin', origin);
    }

    reply.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type');
    done();
});

// Handle OPTIONS requests
server.options('/*', (request, reply) => {
    reply.send();
});

server.register(fastifyStatic, {
    root: path.join(__dirname, "public"),
    prefix: "/public/",
    decorateReply: false
});

server.addContentTypeParser('application/json', { parseAs: 'string' }, async (req, body) => {
    try {
        return JSON.parse(body);
    } catch (err) {
        throw new Error('Invalid JSON');
    }
});

server.get("/api/pizzas", async function getPizzas(req, res) {
    const pizzasPromise = db.execute(
        "SELECT pizza_type_id, name, category, ingredients as description FROM pizza_types"
    );
    const pizzaSizesPromise = db.execute(
        `SELECT 
      pizza_type_id as id, size, price
    FROM 
      pizzas`
    );

    const [pizzasResult, pizzaSizesResult] = await Promise.all([
        pizzasPromise,
        pizzaSizesPromise,
    ]);

    const pizzas = pizzasResult.rows;
    const pizzaSizes = pizzaSizesResult.rows;

    const responsePizzas = pizzas.map((pizza) => {
        const sizes = pizzaSizes.reduce((acc, current) => {
            if (current.id === pizza.pizza_type_id) {
                acc[current.size] = +current.price;
            }
            return acc;
        }, {});
        return {
            id: pizza.pizza_type_id,
            name: pizza.name,
            category: pizza.category,
            description: pizza.description,
            image: `/public/pizzas/${pizza.pizza_type_id}.webp`,
            sizes,
        };
    });

    res.send(responsePizzas);
});

server.get("/api/pizza-of-the-day", async function getPizzaOfTheDay(req, res) {
    const pizzas = await db.execute(
        `SELECT 
      pizza_type_id as id, name, category, ingredients as description
    FROM 
      pizza_types`
    );

    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    const pizzaIndex = daysSinceEpoch % pizzas.rows.length;
    const pizza = pizzas.rows[pizzaIndex];

    const sizes = await db.execute(
        `SELECT
      size, price
    FROM
      pizzas
    WHERE
      pizza_type_id = ?`,
        [pizza.id]
    );

    const sizeObj = sizes.rows.reduce((acc, current) => {
        acc[current.size] = +current.price;
        return acc;
    }, {});

    const responsePizza = {
        id: pizza.id,
        name: pizza.name,
        category: pizza.category,
        description: pizza.description,
        image: `/public/pizzas/${pizza.id}.webp`,
        sizes: sizeObj,
    };

    res.send(responsePizza);
});

server.get("/api/orders", async function getOrders(req, res) {
    const orders = await db.execute("SELECT order_id, date, time FROM orders");

    res.send(orders.rows);
});

server.get("/api/order", async function getOrders(req, res) {
    const id = req.query.id;
    const orderPromise = db.execute(
        "SELECT order_id, date, time FROM orders WHERE order_id = ?",
        [id]
    );
    const orderItemsPromise = db.execute(
        `SELECT 
      t.pizza_type_id as pizzaTypeId, t.name, t.category, t.ingredients as description, o.quantity, p.price, o.quantity * p.price as total, p.size
    FROM 
      order_details o
    JOIN
      pizzas p
    ON
      o.pizza_id = p.pizza_id
    JOIN
      pizza_types t
    ON
      p.pizza_type_id = t.pizza_type_id
    WHERE 
      order_id = ?`,
        [id]
    );

    const [order, orderItemsRes] = await Promise.all([
        orderPromise,
        orderItemsPromise,
    ]);

    const orderItems = orderItemsRes.rows.map((item) =>
        Object.assign({}, item, {
            image: `/public/pizzas/${item.pizzaTypeId}.webp`,
            quantity: +item.quantity,
            price: +item.price,
        })
    );

    const total = orderItems.reduce((acc, item) => acc + item.total, 0);

    res.send({
        order: Object.assign({ total }, order.rows[0]),
        orderItems,
    });
});

server.post("/api/order", async function createOrder(req, res) {
    const { cart } = req.body;

    const now = new Date();
    // forgive me Date gods, for I have sinned
    const time = now.toLocaleTimeString("en-US", { hour12: false });
    const date = now.toISOString().split("T")[0];

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        res.status(400).send({ error: "Invalid order data" });
        return;
    }

    try {
        await db.execute("BEGIN TRANSACTION");

        const result = await db.execute(
            "INSERT INTO orders (date, time) VALUES (?, ?)",
            [date, time]
        );
        const orderId = result.lastID;

        const mergedCart = cart.reduce((acc, item) => {
            const id = item.pizza.id;
            const size = item.size.toLowerCase();
            if (!id || !size) {
                throw new Error("Invalid item data");
            }
            const pizzaId = `${id}_${size}`;

            if (!acc[pizzaId]) {
                acc[pizzaId] = { pizzaId, quantity: 1 };
            } else {
                acc[pizzaId].quantity += 1;
            }

            return acc;
        }, {});

        for (const item of Object.values(mergedCart)) {
            const { pizzaId, quantity } = item;
            await db.execute(
                "INSERT INTO order_details (order_id, pizza_id, quantity) VALUES (?, ?, ?)",
                [orderId, pizzaId, quantity]
            );
        }

        await db.execute("COMMIT");

        res.send({ orderId });
    } catch (error) {
        req.log.error(error);
        await db.execute("ROLLBACK");
        res.status(500).send({ error: "Failed to create order" });
    }
});

server.get("/api/past-orders", async function getPastOrders(req, res) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;
        const pastOrders = await db.execute(
            "SELECT order_id, date, time FROM orders ORDER BY order_id DESC LIMIT 10 OFFSET ?",
            [offset]
        );
        res.send(pastOrders.rows);
    } catch (error) {
        req.log.error(error);
        res.status(500).send({ error: "Failed to fetch past orders" });
    }
});

server.get("/api/past-order/:order_id", async function getPastOrder(req, res) {
    const orderId = req.params.order_id;

    try {
        const order = await db.execute(
            "SELECT order_id, date, time FROM orders WHERE order_id = ?",
            [orderId]
        );

        if (!order.rows.length) {
            res.status(404).send({ error: "Order not found" });
            return;
        }

        const orderItems = await db.execute(
            `SELECT 
        t.pizza_type_id as pizzaTypeId, t.name, t.category, t.ingredients as description, o.quantity, p.price, o.quantity * p.price as total, p.size
      FROM 
        order_details o
      JOIN
        pizzas p
      ON
        o.pizza_id = p.pizza_id
      JOIN
        pizza_types t
      ON
        p.pizza_type_id = t.pizza_type_id
      WHERE 
        order_id = ?`,
            [orderId]
        );

        const formattedOrderItems = orderItems.rows.map((item) =>
            Object.assign({}, item, {
                image: `/public/pizzas/${item.pizzaTypeId}.webp`,
                quantity: +item.quantity,
                price: +item.price,
            })
        );

        const total = formattedOrderItems.reduce(
            (acc, item) => acc + item.total,
            0
        );

        res.send({
            order: Object.assign({ total }, order.rows[0]),
            orderItems: formattedOrderItems,
        });
    } catch (error) {
        req.log.error(error);
        res.status(500).send({ error: "Failed to fetch order" });
    }
});

server.post("/api/contact", async function contactForm(req, res) {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        res.status(400).send({ error: "All fields are required" });
        return;
    }

    req.log.info(`Contact Form Submission:
    Name: ${name}
    Email: ${email}
    Message: ${message}
  `);

    res.send({ success: "Message received" });
});

// Add a root route handler
server.get('/', async (request, reply) => {
    reply.send({
        name: 'Padre Gino\'s Pizza API',
        version: '1.0.0',
        endpoints: {
            pizzas: '/api/pizzas',
            pizzaOfTheDay: '/api/pizza-of-the-day',
            orders: '/api/orders',
            order: '/api/order?id={orderId}',
            pastOrders: '/api/past-orders',
            pastOrder: '/api/past-order/{orderId}',
            contact: '/api/contact'
        }
    });
});

// Export for Vercel
export default async (req, res) => {
    await server.ready();
    server.server.emit('request', req, res);
};