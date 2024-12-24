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

module.exports = {
    redirectIfAuthenticated,
    checkAuthenticated
}