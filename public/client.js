window.onload = function() {
    var encrypted = CryptoJS.AES.encrypt("Message", "Secret Passphrase");
    console.log(encrypted.toString());
    var decrypted = CryptoJS.AES.decrypt(encrypted, "Secret Passphrase");
    console.log(decrypted.toString(CryptoJS.enc.Utf8))

    // Definitions
    var canvas = document.getElementById("canvas");
    var context = canvas.getContext("2d");
    var canvasBackground = document.getElementById("background-canvas");
    var contextBackground = canvasBackground.getContext("2d");
    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;

    // Specifications
    context.strokeStyle = 'black'; // initial brush color
    context.lineWidth = 1; // initial brush width
    var isMousePressed = false;
    var mode = "brush";
    var lastEvent;

    let newSessionButton = document.getElementById('new_session');
    let endSessionButton = document.getElementById('end_session');
    let moveStickyNoteButton = document.getElementById('move_sticky_note');
    let socket = io();

    socket.on('connect', () => {
        console.log("connection id: " + socket.id);
    })

    newSessionButton.addEventListener('click', () => {
        socket.emit('join-session', {
            connectionId: socket.id
        });
        console.log("sending join-session request");

        //now listen for other stuff

        moveStickyNoteButton.addEventListener('click', () => {
            socket.emit('move-sticky-note', {
                connectionId: socket.id,
                id: "test_id",
                position: 22.35

            });
            console.log("sending move sticky note request");
        })

        socket.on('broadcast', (message) => {
            switch (message.type) {
                case 'move-sticky-note':
                    console.log("Sticky note moved");
                    break;
                case 'freehand-drawing':
                    context.beginPath();
                    // Set brush size and color
                    context.strokeStyle = 'black';
                    context.lineWidth = 1;
                    // Set composite operation to drawing over
                    context.globalCompositeOperation="source-over";
                    // Draw line segment
                    context.moveTo(message.moveToX, message.moveToY);
                    context.lineTo(message.lineToX, message.lineToY);
                    context.stroke();
                    break;
                case 'erase':
                    context.beginPath();
                    context.globalCompositeOperation = 'destination-out';
                    context.arc(message.arcX, message.arcY, 20, 0, Math.PI*2, false);
                    context.fill();
                    break;
                default:
                    console.log("Unknown broadcast message type");
                    break;
            }
        })
    })

    endSessionButton.addEventListener('click', () => {
        socket.emit('end-session', {
            connectionId: socket.id
        });
        console.log("sending end-session request");
    })

    // Mouse Down Event
    canvas.addEventListener('mousedown', function(event) {
        lastEvent = event;
        isMousePressed = true;
    });

    // Mouse Move Event
    canvas.addEventListener('mousemove', function(event) {
        if (isMousePressed) {
            context.beginPath();
            if (mode === "brush") {
                // Set brush size and color
                context.strokeStyle = 'black';
                context.lineWidth = 1;
                // Set composite operation to drawing over
                context.globalCompositeOperation="source-over";
                // Draw line segment
                context.moveTo(lastEvent.offsetX, lastEvent.offsetY);
                context.lineTo(event.offsetX, event.offsetY);
                context.stroke();
                // Emit drawing event
                socket.emit('freehand-drawing', {
                    moveToX: lastEvent.offsetX,
                    moveToY: lastEvent.offsetY,
                    lineToX: event.offsetX,
                    lineToY: event.offsetY
                });
            } else if (mode === "eraser") {
                context.globalCompositeOperation = 'destination-out';
                context.arc(lastEvent.offsetX, lastEvent.offsetY, 20, 0, Math.PI*2, false);
                context.fill();
                // Emit erase event
                socket.emit('erase', {
                    arcX: lastEvent.offsetX,
                    arcY: lastEvent.offsetY
                });
            }
            lastEvent = event;
        }
    });

    // Mouse Up Event
    canvas.addEventListener('mouseup', function(event) {
        isMousePressed = false;
    });

    document.getElementById('brush').addEventListener('click', function(event) {
        mode = "brush";
    });

    document.getElementById('eraser').addEventListener('click', function(event) {
        mode = "eraser";
    });


}