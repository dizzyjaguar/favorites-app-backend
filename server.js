//Load Env Vars from .env file
require('dotenv').config();

//App dependecies
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const client = require('./lib/client');
const request = require('superagent');
//Init the database connection
client.connect();

//App setup
const app = express();
const port = process.env.PORT || 3000;
app.use(morgan('dev'));
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded
app.use(express.json());
// everything that starts with "/api" below here requires an auth token!


//--------------------------------------
// Auth Routes
// this is grabbing from our create auth scripts
const createAuthRoutes = require('./lib/auth/create-auth-routes');
// creating our own routes with the create-auth-routes, for selectUser and insertUser
const authRoutes = createAuthRoutes({
    selectUser(email) {
        return client.query(`
        SELECT id, email, hash 
        FROM users
        WHERE email = $1;
        `,
        [email]
        ).then(result => result.rows[0]);
    },
    insertUser(user, hash) {
        return client.query(`
        INSERT into users (email, hash)
        VALUES ($1, $2)
        RETURNING id, email;
        `,
        [user.email, hash]
        ).then(result => result.rows[0]);
    }
});

// before ensure auth, but after other middleware:
// use our auth routes
app.use('/api/auth', authRoutes);
// this adds auth enure, which im assuming checkts the tokens on requests to all of our routes, off anythings coming from the /api route... so all of them
const ensureAuth = require('./lib/auth/ensure-auth');

app.use('/api/me', ensureAuth);
//--------------------------------------



//API ROUTES
app.get('/api/me/favorites', async(req, res) => {
    try {
        const myQuery = `
            SELECT * FROM favorites
            WHERE user_id=$1
        `;

        const favorites = await client.query(myQuery, [req.userId]);

        res.json(favorites.rows);
    } catch (e) {
        console.error(e);
    }
});

app.post('/api/me/favorites', async(req, res) => {
    try {
        const {
            name,
            eye_color,
            hair_color,
        } = req.body;

        const newFavorites = await client.query(`
            INSERT INTO favorites (name, eye_color, hair_color, user_id)
            values ($1, $2, $3, $4)
            returning *
        `, [
            name,
            eye_color,
            hair_color,
            req.userId,
        ]);

        res.json(newFavorites.rows[0]);
    } catch (e) {
        console.error(e);
    }
});










app.get('/api/starwars', async(req, res) => {
    try {
        console.log(req.query);
        const data = await request.get(`https://swapi.co/api/people/?search=${req.query.search}`);
        console.log(data);
        res.json(data.body);
    } catch (e) {
        console.error(e);
    }
});





app.listen(process.env.PORT, () => {
    console.log('listening at ', process.env.PORT);
});