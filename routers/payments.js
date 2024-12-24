
const express = require('express');
const { db } = require('../database/setup');
const { checkAuthenticated } = require('../middlewares');

const router = express.Router();


router.post('/', checkAuthenticated, (req, res) => {
    const { client_id, start_date, expire_date, price, bundle_id } = req.body;

    // Validate required fields
    if (!client_id || !start_date || !expire_date || !price) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Insert the payment into the database
    const query = `
        INSERT INTO payments (client_id, start_date, expire_date, price, bundle_id) 
        VALUES (?, ?, ?, ?, ?)
    `;

    db.run(query, [client_id, start_date, expire_date, price, bundle_id], function (err) {
        if (err) {
            console.error('Error adding payment:', err.message);
            return res.status(500).json({ error: 'Failed to add payment.' });
        }

        res.status(201).json({ success: true, id: this.lastID });
    });
});

// API route to get payment details as JSON
router.get("/:clientId", (req, res) => {
    const { clientId } = req.params;

    const query = `
      SELECT 
          payments.start_date, 
          payments.expire_date, 
          payments.price, 
          payments.is_frozen,
          bundles.name AS bundle_name,
          clients.full_name
      FROM payments
      INNER JOIN clients ON payments.client_id = clients.id
      LEFT JOIN bundles ON payments.bundle_id = bundles.id
      WHERE payments.client_id = ? AND payments.expire_date >= DATE('now');
    `;

    db.get(query, [clientId], (err, payment) => {
        if (err) {
            console.error("Error retrieving payment details:", err.message);
            return res.status(500).json({ error: "Error retrieving payment details." });
        }

        if (!payment) {
            return res.status(404).json({ error: "No active payment found for this client." });
        }

        res.json(payment); // Include `is_frozen` in the response
    });
});


router.post("/freeze-payment/:clientId", (req, res) => {
    const { clientId } = req.params;

    const query = `
        UPDATE payments
        SET is_frozen = 1, frozen_since = DATE('now')
        WHERE client_id = ? AND expire_date >= DATE('now') AND is_frozen = 0
    `;

    db.run(query, [clientId], function (err) {
        if (err) {
            console.error("Error freezing payment:", err.message);
            return res.status(500).json({ error: "Failed to freeze payment." });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: "No active payment found to freeze or already frozen." });
        }
        res.json({ success: true });
    });
});

router.post("/unfreeze-payment/:clientId", (req, res) => {
    const { clientId } = req.params;

    const query = `
        SELECT frozen_since, expire_date
        FROM payments
        WHERE client_id = ? AND is_frozen = 1
    `;

    db.get(query, [clientId], (err, payment) => {
        if (err) {
            console.error("Error fetching frozen payment:", err.message);
            return res.status(500).json({ error: "Failed to fetch frozen payment." });
        }

        if (!payment || !payment.frozen_since) {
            return res.status(404).json({ error: "No frozen payment found to unfreeze." });
        }

        // Calculate days frozen
        const frozenSince = new Date(payment.frozen_since);
        const now = new Date();
        const daysFrozen = Math.ceil((now - frozenSince) / (1000 * 60 * 60 * 24));

        if (daysFrozen <= 0) {
            return res.status(400).json({ error: "Invalid frozen period detected." });
        }

        const updateQuery = `
            UPDATE payments
            SET is_frozen = 0, frozen_since = NULL, 
                expire_date = DATE(expire_date, '+' || ? || ' days')
            WHERE client_id = ? AND is_frozen = 1
        `;

        db.run(updateQuery, [daysFrozen, clientId], function (updateErr) {
            if (updateErr) {
                console.error("Error unfreezing payment:", updateErr.message);
                return res.status(500).json({ error: "Failed to unfreeze payment." });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: "Failed to update payment record." });
            }
            res.json({ success: true, days_frozen: daysFrozen, updated_expire_date: payment.expire_date });
        });
    });
});


module.exports = router