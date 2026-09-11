// آرایه نگهداری تیرهای محلی
const bullets = {};
let playerHealth = 100;

// ایجاد المان سه‌بعدی تیر
function createBulletMesh() {
    const geo = new THREE.SphereGeometry(0.2, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    return new THREE.Mesh(geo, mat);
}

// دکمه شلیک برای موبایل و کلیک موس برای PC
const shootBtn = document.getElementById('shoot-btn');
if (shootBtn) shootBtn.addEventListener('click', shoot);
window.addEventListener('mousedown', (e) => { if (e.button === 0) shoot(); });

function shoot() {
    if (!myId || !players[myId]) return;
    
    // شلیک در جهتی که بازیکن رو به آن است یا به سمت جلو
    const bulletData = {
        x: players[myId].position.x,
        z: players[myId].position.z,
        dirX: moveDir.x !== 0 ? moveDir.x : 0,
        dirZ: moveDir.z !== 0 ? moveDir.z : -1
    };
    
    socket.emit('shootBullet', bulletData);
}

// دریافت تیر جدید از سرور
socket.on('bulletFired', (bullet) => {
    const mesh = createBulletMesh();
    mesh.position.set(bullet.x, 1, bullet.z);
    scene.add(mesh);
    bullets[bullet.id] = { mesh, dirX: bullet.dirX, dirZ: bullet.dirZ, owner: bullet.owner };
});

// همگام‌سازی سلامت و حذف بازیکن
socket.on('playerHit', (data) => {
    if (data.id === myId) {
        playerHealth = data.health;
        console.log("سلامت شما: " + playerHealth);
        if (playerHealth <= 0) {
            alert("شما باختید! در حال اسپاون مجدد...");
            socket.emit('respawn');
        }
    }
});

// آپدیت موقعیت تیرها و تشخیص برخورد در حلقه اصلی
function updateBullets() {
    const bulletSpeed = 0.5;
    
    Object.keys(bullets).forEach((id) => {
        const b = bullets[id];
        b.mesh.position.x += b.dirX * bulletSpeed;
        b.mesh.position.z += b.dirZ * bulletSpeed;

        // بررسی برخورد با بازیکن محلی (Hit Registration)
        if (b.owner !== myId && players[myId]) {
            const dist = b.mesh.position.distanceTo(players[myId].position);
            if (dist < 1.0) { // شعاع برخورد
                socket.emit('bulletHitPlayer', { bulletId: id, targetId: myId });
                scene.remove(b.mesh);
                delete bullets[id];
                return;
            }
        }

        // حذف تیرهای دور شده برای حفظ عملکرد و سرعت GPU
        if (Math.abs(b.mesh.position.x) > 100 || Math.abs(b.mesh.position.z) > 100) {
            scene.remove(b.mesh);
            delete bullets[id];
        }
    });
}

// اضافه کردن updateBullets به تابع اصلی animate
const originalAnimate = animate;
animate = function() {
    updateBullets();
    originalAnimate();
};
