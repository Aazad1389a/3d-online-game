let bulletIdCounter = 0;

io.on('connection', (socket) => {
    // مقداردهی اولیه سلامت بازیکن
    if (players[socket.id]) {
        players[socket.id].health = 100;
    }

    // مدیریت شلیک
    socket.on('shootBullet', (data) => {
        const bulletId = 'b_' + (bulletIdCounter++);
        const bulletData = {
            id: bulletId,
            owner: socket.id,
            x: data.x,
            z: data.z,
            dirX: data.dirX,
            dirZ: data.dirZ
        };
        
        // پخش شلیک به تمام بازیکنان آنلاین
        io.emit('bulletFired', bulletData);
    });

    // مدیریت برخورد تیر به بازیکن
    socket.on('bulletHitPlayer', (data) => {
        const target = players[data.targetId];
        if (target) {
            target.health -= 20; // میزان آسیب هر تیر
            
            io.emit('playerHit', {
                id: data.targetId,
                health: target.health
            });
        }
    });

    // اسپاون مجدد پس از مرگ
    socket.on('respawn', () => {
        if (players[socket.id]) {
            players[socket.id].health = 100;
            players[socket.id].x = (Math.random() - 0.5) * 20;
            players[socket.id].z = (Math.random() - 0.5) * 20;
            
            io.emit('playerHit', { id: socket.id, health: 100 });
            io.emit('playerMoved', { id: socket.id, x: players[socket.id].x, z: players[socket.id].z });
        }
    });
});
