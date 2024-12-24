
const express = require('express');
const { db } = require('../database/setup');
const { checkAuthenticated } = require('../middlewares');

const router = express.Router();



router.post('/', checkAuthenticated, (req, res) => {
    const { name, duration, price, description } = req.body;
    db.run(
        `INSERT INTO bundles (name, duration, price, description) VALUES (?, ?, ?, ?)`,
        [name, duration, price, description,],
        function (err) {
            if (err) {
                console.error("Error adding bundle:", err.message);
                return res.status(500).send("Error adding bundle.");
            }
            console.log(`Bundle added with ID: ${this.lastID}`);
            res.send("Bundle added successfully.");
        }
    );
});

// GET route for retrieving all bundles
router.get('/', checkAuthenticated, (req, res) => {
    db.all(`SELECT * FROM bundles`, [], (err, rows) => {
        if (err) {
            console.error("Error retrieving bundles:", err.message);
            return res.status(500).send("Error retrieving bundles.");
        }
        res.json(rows); // Send the bundles as JSON
    });
});

module.exports = router