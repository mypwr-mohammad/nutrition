
const express = require('express');
const { db } = require('../database/setup');
const { checkAuthenticated } = require('../middlewares');

const router = express.Router();

// Fetch all clients with their last payment
router.get("/", checkAuthenticated, (req, res) => {
    const query = `
        SELECT 
            clients.*,
            payments.expire_date AS latest_expire_date,
            payments.price AS last_payment_price,
            payments.paid_amount AS last_paid_amount,
            CASE 
                WHEN DATE(payments.expire_date) > DATE() THEN 1 
                ELSE 0 
            END AS has_active_payment
        FROM clients
        LEFT JOIN payments ON payments.id = (
            SELECT id
            FROM payments
            WHERE payments.client_id = clients.id
            ORDER BY payments.expire_date DESC
            LIMIT 1
        )
        ORDER BY 
            CASE
                WHEN clients.full_name GLOB '[آ-ي]*' THEN 1 -- Arabic names first
                ELSE 2 -- English or other names second
            END,
            clients.full_name COLLATE NOCASE;
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error retrieving clients:", err.message);
            return res.status(500).send("Error retrieving clients.");
        }
        res.json(rows);
    });
});

// Fetch a specific client by ID
router.get('/:id', checkAuthenticated, (req, res) => {
    const { id } = req.params;

    db.get("SELECT * FROM clients WHERE id = ?", [id], (err, row) => {
        if (err) {
            console.error("Error retrieving client:", err.message);
            return res.status(500).send("Error retrieving client.");
        }

        if (!row) {
            return res.status(404).json({ error: 'Client not found' });
        }

        res.json(row); // Send the retrieved client data as a response
    });
});

// Fetch clients by search term
router.get("/search", (req, res) => {
    const searchTerm = req.query.term || "";
    const query = `
      SELECT id, full_name, phone_number
      FROM clients
      WHERE full_name LIKE ?
      ORDER BY full_name ASC
    `;
    const searchPattern = `%${searchTerm}%`;

    db.all(query, [searchPattern, searchPattern], (err, rows) => {
        if (err) {
            console.error("Error searching clients:", err.message);
            return res.status(500).json({ error: "Error searching clients." });
        }
        res.json(rows);
    });
});

// Add a new client
router.post('/', checkAuthenticated, (req, res) => {
    const { full_name, date_of_birth, phone_number, notes } = req.body;

    if (!full_name) {
        return res.status(400).json({ error: 'Missing full name' });
    } else if (!date_of_birth) {
        return res.status(400).json({ error: 'Missing date of birth' });
    } else if (!phone_number) {
        return res.status(400).json({ error: 'Missing phone number' });
    }

    db.run(
        `INSERT INTO clients (full_name, date_of_birth, phone_number, notes) VALUES (?, ?, ?, ?)`,
        [full_name, date_of_birth, phone_number, notes],
        function (err) {
            if (err) {
                console.error("Error adding client:", err.message);
                return res.status(500).json({ error: 'Failed to add client' });
            }
            res.status(201).json({ id: this.lastID });
        }
    );
});



// Update an existing client
router.put('/:id', checkAuthenticated, (req, res) => {
    const { id } = req.params;
    const { full_name, date_of_birth, phone_number, notes } = req.body;

    // Validation: Ensure required fields are provided
    if (!full_name || !date_of_birth || !phone_number) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
        `UPDATE clients SET full_name = ?, date_of_birth = ?, phone_number = ?, notes = ? WHERE id = ?`,
        [full_name, date_of_birth, phone_number, notes || '', id],
        function (err) {
            if (err) {
                console.error("Error updating client:", err.message);
                return res.status(500).json({ error: "Error updating client." });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: "Client not found." });
            }

            res.json({ id, full_name, date_of_birth, phone_number, notes });
        }
    );
});


// Delete a client
router.delete('/:id', checkAuthenticated, (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM clients WHERE id = ?`, [id], function (err) {
        if (err) {
            console.error("Error deleting client:", err.message);
            res.status(500).json({ error: "Error deleting client." });
        } else if (this.changes === 0) {
            res.status(404).json({ error: "Client not found." });
        } else {
            res.status(200).json({ success: true, message: "Client deleted successfully." });
        }
    });
});

module.exports = router