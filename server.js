const express = require("express");
const app = express();
const ejs = require('ejs');
const path = require('path')
const expresslayout = require('express-ejs-layouts')
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const session = require('express-session')
const flash = require('express-flash')
const MongoDbStore = require('connect-mongo')
const passport = require('passport');
const { initialize } = require("passport");
const Emitter = require('events')

dotenv.config();

//server connection
const PORT = 3000 || process.env.PORT;

const server = app.listen(PORT, () => {
    console.log(`app is listening on Port: ${PORT}`)
})



//databse connection
const url = 'mongodb://localhost/pizza';

mongoose.connect(url);

const connection = mongoose.connection;

try {
    connection.once('open', () => { console.log('db conn'); })
} catch (err) {
    console.error(err);
}

const passportInit = require("./app/config/passport");
passportInit(passport)

//Event Emitter
const eventEmitter = new Emitter()
app.set('eventEmitter', eventEmitter)

//session
app.use(session({
    secret: process.env.COOKIE_SECRET,
    resave: false,
    store: MongoDbStore.create({
        client: connection.getClient()
    }),
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }
}))

app.use(passport.initialize())
app.use(passport.session())



app.use(flash())

app.use((req, res, next) => {
    res.locals.session = req.session
    res.locals.user = req.user
    next()
})

//assets
app.use(express.static('public'));

app.use(express.urlencoded({ extended: false }))

app.use(express.json())

app.use(expresslayout);
app.set('views', path.join(__dirname, '/resources/views'))
app.set('view engine', 'ejs')

require("./routes/web")(app);

//socket
const io = require('socket.io')(server)

io.on('connection', (socket) => {
    console.log(socket.id)
    socket.on('join', (orderId) => {
        socket.join(orderId)
    })
})

eventEmitter.on('orderUpdated', (data) => {
    io.to(`order_${data.id}`).emit('orderUpdated', data)
})

eventEmitter.on('orderPlaced', (data) => {
    io.to('adminRoom').emit('orderPlaced', data)
})
