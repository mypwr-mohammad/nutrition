const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

const db = new sqlite3.Database('./database.db');

function setupDatabase() {

    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )
    `);

    // Clients table
    db.run(`
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            date_of_birth TEXT,
            phone_number TEXT,
            notes TEXT
        )
    `);

    // Products table
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL,
            sold_count INTEGER DEFAULT 0,
            stock INTEGER,
            image TEXT,
            used_by_client_id INTEGER,
            FOREIGN KEY (used_by_client_id) REFERENCES clients (id)
        )
    `);

    // Products table
    db.run(`
        CREATE TABLE IF NOT EXISTS purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            purchase_date TEXT DEFAULT (DATETIME('now')),
            quantity INTEGER DEFAULT 1,
            FOREIGN KEY (client_id) REFERENCES clients (id),
            FOREIGN KEY (product_id) REFERENCES products (id)
        )
    `);

    // Bundles table
    db.run(`
        CREATE TABLE IF NOT EXISTS bundles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            duration INTEGER NOT NULL,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            description TEXT
        )
    `);



    // Payments table
    db.run(`
        CREATE TABLE IF NOT EXISTS payments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            start_date TEXT,
            expire_date TEXT,
            price REAL,
            is_frozen INTEGER DEFAULT 0,
            frozen_since TEXT DEFAULT NULL,
            bundle_id INTEGER,
            FOREIGN KEY (client_id) REFERENCES clients (id),
            FOREIGN KEY (bundle_id) REFERENCES bundles (id)
        )
    `);

    const query = `PRAGMA table_info(payments);`;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error checking table info:", err.message);
            return;
        }

        // Check if the 'paid_amount' column exists
        const columnExists = rows.some((row) => row.name === "paid_amount");

        if (!columnExists) {
            // Add the column if it doesn't exist
            const addColumnQuery = `
            ALTER TABLE payments ADD COLUMN paid_amount REAL DEFAULT 0.0;
          `;
            db.run(`
            UPDATE payments SET paid_amount = price WHERE paid_amount = 0.0;
            `);

            db.run(addColumnQuery, (err) => {
                if (err) {
                    console.error("Error adding column 'paid_amount':", err.message);
                } else {
                    console.log("Column 'paid_amount' added successfully.");
                }
            });
        } else {
            console.log("Column 'paid_amount' already exists.");
        }
    });



    // Reservations table
    db.run(`
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            client_id INTEGER,
            reservation_date DATE,
            reservation_time TIME,
            FOREIGN KEY (client_id) REFERENCES clients (id)
        )
    `);

    // Function to add admin user
    function addAdminUser() {
        const adminUsername = 'admin';
        const adminPassword = 'password123'; // Replace with a secure password
        const saltRounds = 10;

        bcrypt.hash(adminPassword, saltRounds, (err, hash) => {
            if (err) {
                return console.error("Error hashing password:", err);
            }

            db.run("INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)", [adminUsername, hash], (err) => {
                if (err) {
                    console.error("Error adding admin user:", err);
                } else {
                    console.log("Admin user added or already exists.");
                }
            });
        });
    }

    // Add the admin user when the server starts
    addAdminUser();

    console.log('Database setup complete.');
};

module.exports = {
    setupDatabase,
    db,
}