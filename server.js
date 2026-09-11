const io = require('socket.io')(3000, {
    cors: { origin: "*" }
});

const players = {};

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    players[socket.id] = { x: (Math.random() - 0.5) * 20, z: (Math.random() - 0.5) * 20 };
    
    socket.emit('currentPlayers', players);
    socket.broadcast.emit('currentPlayers', players);

    socket.on('playerInput', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].z = data.z;
            socket.broadcast.emit('playerMoved', { id: socket.id, x: data.x, z: data.z });
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});
