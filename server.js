const io = require('socket.io')(3000, { cors: { origin: "*" } });

const players = {};
let bulletIdCounter = 0;

io.on('connection', (socket) => {
    players[socket.id] = {
        x: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 20,
        health: 100,
        kills: 0
    };

    socket.emit('currentPlayers', players);
    socket.broadcast.emit('currentPlayers', players);

    socket.on('playerInput', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].z = data.z;
            socket.broadcast.emit('playerMoved', { id: socket.id, x: data.x, z: data.z });
        }
    });

    socket.on('shootBullet', (data) => {
        io.emit('bulletFired', {
            id: 'b_' + (bulletIdCounter++),
            owner: socket.id,
            x: data.x,
            z: data.z,
            dirX: data.dirX,
            dirZ: data.dirZ
        });
    });

    socket.on('bulletHitPlayer', (data) => {
        const target = players[data.targetId];
        const shooter = players[data.shooterId];

        if (target) {
            target.health -= 25;
            if (target.health <= 0 && shooter) {
                shooter.kills += 1;
                io.to(data.shooterId).emit('updateKills', shooter.kills);
            }
            io.emit('playerHit', { id: data.targetId, health: Math.max(0, target.health) });
        }
    });

    socket.on('respawn', () => {
        if (players[socket.id]) {
            players[socket.id].health = 100;
            players[socket.id].x = (Math.random() - 0.5) * 20;
            players[socket.id].z = (Math.random() - 0.5) * 20;
            io.emit('playerHit', { id: socket.id, health: 100 });
            io.emit('playerMoved', { id: socket.id, x: players[socket.id].x, z: players[socket.id].z });
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});
