const { setupDatabase, db } = require('./database/setup');

// Import the database setup function Call the function to initialize the database
setupDatabase();

const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const clientsRouter = require('./routers/clients');
const bundlesRouter = require('./routers/bundles');
const paymentsRouter = require('./routers/payments');
const productsRouter = require('./routers/products');
const reservationsRouter = require('./routers/reservations');
const { checkAuthenticated, redirectIfAuthenticated, destroySession } = require('./middlewares');

const app = express();


// Middleware setup
app.use(express.json());
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // For serving static files
app.use( // Add session middleware
    session({
        store: new SQLiteStore({
            db: 'sessions.db',
        }),
        secret: 'potatoTomato', // Replace with a secure key
        resave: false,
        saveUninitialized: true,
        cookie: {
            httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
            secure: false,  // Set to `true` in production if using HTTPS
        },
    })
);

app.use('/clients', clientsRouter);
app.use('/bundles', bundlesRouter);
app.use('/payments', paymentsRouter);
app.use('/products', productsRouter);
app.use('/reservations', reservationsRouter);

// Serve login page as default route
app.get('/', redirectIfAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// Handle login and Redirect to the client addition page after successful login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
        if (err) {
            console.error("Error querying database:", err);
            return res.status(500).json({ error: "Server error" });
        }

        if (!user) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                console.error("Error comparing passwords:", err);
                return res.status(500).json({ error: "Server error" });
            }

            if (result) {
                req.session.loggedIn = true; // Mark user as logged in
                req.session.username = username; // Optionally store the username
                return res.json({ success: true, redirect: "/dashboard" }); // Success response
            } else {
                return res.status(401).json({ error: "Invalid username or password" });
            }
        });
    });
});

// Serve the dashboard page after login
app.get('/dashboard', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Serve the dashboard page for clients
app.get('/clients-dashboard', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'clients-dashboard.html'));
});

// Serve Edit Client Page
app.get('/clients-table', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'clients-table.html'));
});

// Serve Edit Client Page
app.get('/clients-edit/:id', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'clients-edit.html'));
});

// Serve Add Client Page
app.get('/clients-add', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'clients-add.html'));
});

// Serve Client-Payment Page
app.get('/clients-payments', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'clients-payments.html'));
});

// Serve Client-Product Page
app.get('/clients-products', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'clients-products.html'));
});

// Serve Products Management Page
app.get('/products-dashboard', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'products-dashboard.html'));
});

// Serve Products Management Page
app.get('/products-add', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'products-add.html'));
});

// Serve Products Management Page
app.get('/products-table', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'products-table.html'));
});

// Serve Products Edit Page
app.get('/products-edit/:id', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'products-edit.html'));
});

// Serve Products Edit Page
app.get('/products-clients', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'products-clients.html'));
});

// Serve Bundles Management Page
app.get('/bundles-dashboard', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'bundles-dashboard.html'));
});

app.get('/bundles-add', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'bundles-add.html'));
});

app.get('/bundles-table', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'bundles-table.html'));
});

app.get('/reservations-dashboard', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'reservations-dashboard.html'));
});

app.get('/add-reservation-page', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'reservations-add.html'));
});

app.get('/view-reservations', checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'reservations-table.html'));
});

// Serve Payment Details Page
app.get("/payment-details/:clientId", checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "payment-details.html"));
});

// Serve Payment Page
app.get("/payment/:clientId", checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "payment.html"));
});

// Serve Payment Page
app.get("/payment-edit/:clientId", checkAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "payment-edit.html"));
});

//logout
app.get("/logout", destroySession, (req, res) => {
    res.sendFile(path.join(__dirname, "login.html"));
});

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});
