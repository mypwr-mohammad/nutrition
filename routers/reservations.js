
const express = require('express');
const { db } = require('../database/setup');
const { checkAuthenticated } = require('../middlewares');

const router = express.Router();

router.post('/', checkAuthenticated, (req, res) => {
    const { client_id, reservation_date, reservation_time } = req.body;

    db.get(
        `SELECT * FROM reservations 
         WHERE reservation_date = ? AND reservation_time = ?`,
        [reservation_date, reservation_time],
        (err, row) => {
            if (err) {
                res.status(500).send({ error: 'Error checking reservation' });
            } else if (row) {
                res.status(400).send({ error: 'Time slot already reserved' });
            } else {
                db.run(
                    `INSERT INTO reservations (client_id, reservation_date, reservation_time) 
                     VALUES (?, ?, ?)`,
                    [client_id, reservation_date, reservation_time],
                    function (err) {
                        if (err) {
                            res.status(500).send({ error: 'Error adding reservation' });
                        } else {
                            res.status(201).send({ id: this.lastID });
                        }
                    }
                );
            }
        }
    );
});

// GET route for retrieving all reservations
router.get('/', checkAuthenticated, (req, res) => {
    const query = `
        SELECT reservations.*, clients.full_name AS client_name, clients.phone_number
        FROM reservations
        JOIN clients ON reservations.client_id = clients.id
        WHERE reservation_date >= DATE('now')
        ORDER BY reservation_date ASC, reservation_time ASC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error fetching reservations:", err.message);
            return res.status(500).send({ error: 'Error fetching reservations' });
        }
        res.send(rows);
    });
});

router.delete('/:id', (req, res) => {
    const { id } = req.params;

    db.run(`DELETE FROM reservations WHERE id = ?`, [id], function (err) {
        if (err) {
            res.status(500).send({ error: 'Error deleting reservation' });
        } else if (this.changes === 0) {
            res.status(404).send({ error: 'Reservation not found' });
        } else {
            res.status(200).send({ success: true });
        }
    });
});

router.get('/get-available-slots', checkAuthenticated, (req, res) => {
    const { reservation_date } = req.query;

    db.all(
        `SELECT reservation_time, client_id 
         FROM reservations 
         WHERE reservation_date = ?`,
        [reservation_date],
        (err, rows) => {
            if (err) {
                res.status(500).send({ error: 'Error fetching time slots' });
            } else {
                res.send(rows); // Return reserved time slots
            }
        }
    );
});



module.exports = router