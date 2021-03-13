require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = process.env.PORT || 3000;

// initialize Mongo client and create connection uri
const MongoClient = require('mongodb').MongoClient;
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER_NAME}.exvpx.mongodb.net/${process.env.DB_DATABASE}?retryWrites=true&w=majority`;


MongoClient.connect(uri, (err, db) => {
    if (err) throw err;
    let dbo = db.db(process.env.DB_DATABASE);
    console.log("Connected to database");

    app.use(express.static(__dirname + '/public'));

    function onConnection(socket) {
        console.log("new client :" + socket.id);
        socket.on('disconnect', () => {
            console.log("client disconnected");
        })
        socket.on('join-session', joinSession);
        socket.on('end-session', endSession);
        socket.on('move-sticky-note', (message) => {
            console.log("Received sticky note moved message on server");
            console.log(message);
            //TODO process message, add it to history, etc.
            socket.broadcast.emit("broadcast", {
                type: 'move-sticky-note',
                id: message.id,
                position: message.position
            });
        });

        socket.on('freehand-drawing', (message) => {

            socket.broadcast.emit("broadcast", {
                type: 'freehand-drawing',
                moveToX: message.moveToX,
                moveToY: message.moveToY,
                lineToX: message.lineToX,
                lineToY: message.lineToY
            });
        });

        socket.on('erase', (message) => {

                    socket.broadcast.emit("broadcast", {
                        type: 'erase',
                        arcX: message.arcX,
                        arcY: message.arcY
                    });
                });
    }

    /**
     * Handle a new incoming request for joining a session
     * If no session exists, a new session is created and and the requesting user becomes the host
     * If a session exists, a message will be sent to the host user to accept/reject the incoming request
     */
    function joinSession(data) {
        console.log("new join-session request received");
        dbo.collection('sessions').countDocuments((err, count) => {

            console.log("existing sessions: " + count);

            if (count) {
                // TODO: implement joining an existing session functionality
            } else {
                let newSession = {
                    startDate: Date(),
                    hostUser: data.connectionId
                }
                dbo.collection('sessions').insertOne(newSession, (err, succ) => {
                    if (err) throw err;
                    console.log("new session inserted");
                });
            }

        });
    }

    function endSession() {
        dbo.collection('sessions').deleteOne((err, res) => {
            if (err) throw err;
            console.log("session ended");
        })
    }

    io.on('connection', onConnection);

    http.listen(port, () => console.log('server listening on port ' + port));
})