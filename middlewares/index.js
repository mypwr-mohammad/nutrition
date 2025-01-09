function redirectIfAuthenticated(req, res, next) {
    if (req.session && req.session.loggedIn) {
        return res.redirect('/dashboard');
    }
    next();
}

function checkAuthenticated(req, res, next) {
    if (!req.session || !req.session.loggedIn) {
        return res.redirect('/'); // Redirect to login if not authenticated
    }
    next();
}

function destroySession(req, res, next) {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return next(err); // Pass error to the next middleware
        }
        next();
    });
}

module.exports = {
    redirectIfAuthenticated,
    checkAuthenticated,
    destroySession
}