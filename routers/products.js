
const express = require('express');
const { db } = require('../database/setup');
const { checkAuthenticated } = require('../middlewares');

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



module.exports = router