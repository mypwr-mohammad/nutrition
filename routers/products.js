
const express = require('express');
const { db } = require('../database/setup');
const { checkAuthenticated } = require('../middlewares');
const { DateTime } = require("luxon");

const router = express.Router();

router.post('/', (req, res) => {
    const { name, price, stock } = req.body;
    db.run(
        `INSERT INTO products (name, price, stock, sold_count) VALUES (?, ?, ?, ?)`,
        [name, price, stock, 0], // Initializing sold_count to 0
        function (err) {
            if (err) {
                console.error("Error adding product:", err.message);
                return res.status(500).send("Error adding product.");
            }
            console.log(`Product added with ID: ${this.lastID}`);
            res.send("Product added successfully.");
        }
    );
});

// GET route for retrieving all products
router.get('/', checkAuthenticated, (req, res) => {
    db.all(`SELECT * FROM products`, [], (err, rows) => {
        if (err) {
            console.error("Error retrieving products:", err.message);
            return res.status(500).send("Error retrieving products.");
        }
        res.json(rows); // Send the products as JSON
    });
});

// Delete a product
router.delete('/:id', checkAuthenticated, (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM products WHERE id = ?`, [id], function (err) {
        if (err) {
            console.error("Error deleting product:", err.message);
            res.status(500).json({ error: "Error deleting client." });
        } else if (this.changes === 0) {
            res.status(404).json({ error: "Product not found." });
        } else {
            res.status(200).json({ success: true, message: "Product deleted successfully." });
        }
    });
});

// Route to handle product purchase
router.post("/sell", (req, res) => {
    const { client_id, product_id, quantity = 1 } = req.body;

    if (!client_id || !product_id || quantity <= 0) {
        return res.status(400).json({ error: "Invalid client ID, product ID, or quantity." });
    }

    const updateStockQuery = `
      UPDATE products
      SET stock = stock - ?, sold_count = sold_count + ?
      WHERE id = ? AND stock >= ?
    `;

    db.run(updateStockQuery, [quantity, quantity, product_id, quantity], function (err) {
        if (err) {
            console.error("Error updating product:", err.message);
            return res.status(500).json({ error: "Failed to update product stock." });
        }

        if (this.changes === 0) {
            return res.status(400).json({ error: "Insufficient stock or invalid product ID." });
        }

        const insertPurchaseQuery = `
        INSERT INTO purchases (client_id, product_id, quantity)
        VALUES (?, ?, ?)
      `;

        db.run(insertPurchaseQuery, [client_id, product_id, quantity], function (err) {
            if (err) {
                console.error("Error inserting purchase record:", err.message);
                return res.status(500).json({ error: "Failed to record purchase." });
            }

            res.json({ success: true, purchase_id: this.lastID });
        });
    });
});

router.get('/purchases/:clientId', checkAuthenticated, (req, res) => {
    const { clientId } = req.params;

    const query = `
        SELECT 
            products.name AS product_name,
            products.price AS product_price,
            purchases.quantity,
            purchases.purchase_date
        FROM purchases
        JOIN products ON purchases.product_id = products.id
        WHERE purchases.client_id = ?
        ORDER BY purchases.purchase_date DESC
    `;

    db.all(query, [clientId], (err, rows) => {
        if (err) {
            console.error('Error fetching purchases:', err.message);
            return res.status(500).send('Error fetching purchases.');
        }
        res.json(rows);
    });
});

router.post('/sell-multiple', (req, res) => {
    const { client_id, products } = req.body;

    if (!client_id || !Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ error: 'Invalid request. Please provide a client ID and products.' });
    }

    // Get current time in Jerusalem timezone
    const jerusalemTime = DateTime.now().setZone("Asia/Jerusalem").toISO();

    const queries = [];
    const params = [];

    products.forEach(product => {
        if (!product.product_id || !product.quantity || product.quantity <= 0) {
            return res.status(400).json({ error: 'Invalid product data.' });
        }

        // Reduce stock and update sold_count
        queries.push(`
            UPDATE products
            SET stock = stock - ?, sold_count = sold_count + ?
            WHERE id = ? AND stock >= ?
        `);
        params.push(product.quantity, product.quantity, product.product_id, product.quantity);

        // Insert into purchases table with purchase date
        queries.push(`
            INSERT INTO purchases (client_id, product_id, quantity, purchase_date)
            VALUES (?, ?, ?, ?)
        `);
        params.push(client_id, product.product_id, product.quantity, jerusalemTime);
    });

    // Run all queries in a transaction
    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        let success = true;
        for (let i = 0; i < queries.length; i++) {
            db.run(queries[i], params.splice(0, queries[i].split('?').length - 1), function (err) {
                if (err) {
                    console.error(err);
                    success = false;
                }
            });
        }

        if (success) {
            db.run('COMMIT', () => res.json({ success: true }));
        } else {
            db.run('ROLLBACK', () => res.status(500).json({ error: 'Transaction failed. Please try again.' }));
        }
    });
});

// Fetch a specific client by ID
router.get('/:id', checkAuthenticated, (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error("Error retrieving product:", err.message);
            return res.status(500).send("Error retrieving product.");
        }

        if (!row) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(row); // Send the retrieved client data as a response
    });
});

// Update an existing product  name, price, stock, sold_count
router.put('/:id', checkAuthenticated, (req, res) => {
    const { id } = req.params;
    const { name, price, stock } = req.body;

    // Validation: Ensure required fields are provided
    if (!name || !price || !stock) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
        `UPDATE products SET name = ?, price = ?, stock = ? WHERE id = ?`,
        [name, price, stock, id],
        function (err) {
            if (err) {
                console.error("Error updating product:", err.message);
                return res.status(500).json({ error: "Error updating product." });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: "product not found." });
            }

            res.json({ id, name, price, stock });
        }
    );
});

module.exports = router