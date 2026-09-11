const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e17);
scene.fog = new THREE.FogExp2(0x0a0e17, 0.012);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xddeeff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfffaed, 1.5);
dirLight.position.set(30, 50, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

function createAssaultRifle() {
    const rifle = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x222222 });

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), metalMat);
    body.rotation.z = Math.PI / 2;
    rifle.add(body);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), metalMat);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.8, 0, 0);
    rifle.add(barrel);

    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.4, 0.08), darkMat);
    mag.position.set(0.1, -0.25, 0);
    rifle.add(mag);

    rifle.scale.set(0.7, 0.7, 0.7);
    return rifle;
}

function createHumanoidCharacter(color = 0x00ffcc) {
    const character = new THREE.Group();
    const armorMat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.4 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 1.1, 8), armorMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    character.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), armorMat);
    head.position.y = 2.1;
    head.castShadow = true;
    character.add(head);

    const rifle = createAssaultRifle();
    rifle.position.set(0.4, 1.3, 0.3);
    rifle.rotation.y = Math.PI / 2;
    character.add(rifle);

    return character;
}

const socket = io('https://your-server-url.com'); // آدرس سرور خود را بگذارید
const players = {};
const bullets = {};
let myId = null;
let playerHealth = 100;
const moveDir = { x: 0, z: 0 };

socket.on('connect', () => { myId = socket.id; });

socket.on('currentPlayers', (serverPlayers) => {
    Object.keys(serverPlayers).forEach((id) => {
        if (!players[id]) {
            const charMesh = createHumanoidCharacter(id === myId ? 0x00ffcc : 0xff0055);
            scene.add(charMesh);
            players[id] = charMesh;
        }
        players[id].position.set(serverPlayers[id].x, 0, serverPlayers[id].z);
    });
});

socket.on('playerMoved', (data) => {
    if (players[data.id]) players[data.id].position.set(data.x, 0, data.z);
});

socket.on('bulletFired', (b) => {
    const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xffff00 })
    );
    mesh.position.set(b.x, 1.3, b.z);
    scene.add(mesh);
    bullets[b.id] = { mesh, dirX: b.dirX, dirZ: b.dirZ, owner: b.owner };
});

socket.on('playerHit', (data) => {
    if (data.id === myId) {
        playerHealth = data.health;
        document.getElementById('hp-bar').style.width = playerHealth + '%';
        document.getElementById('hp-text').innerText = playerHealth + ' HP';
        if (playerHealth <= 0) socket.emit('respawn');
    }
});

socket.on('updateKills', (kills) => {
    document.getElementById('kill-count').innerText = kills;
});

socket.on('playerDisconnected', (id) => {
    if (players[id]) { scene.remove(players[id]); delete players[id]; }
});

const shootBtn = document.getElementById('shoot-btn');
if (shootBtn) shootBtn.addEventListener('click', shoot);
window.addEventListener('mousedown', (e) => { if (e.button === 0) shoot(); });

function shoot() {
    if (!myId || !players[myId]) return;
    socket.emit('shootBullet', {
        x: players[myId].position.x,
        z: players[myId].position.z,
        dirX: moveDir.x !== 0 ? moveDir.x : Math.sin(players[myId].rotation.y),
        dirZ: moveDir.z !== 0 ? moveDir.z : Math.cos(players[myId].rotation.y)
    });
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'w' || e.key === 'ArrowUp') moveDir.z = -1;
    if (e.key === 's' || e.key === 'ArrowDown') moveDir.z = 1;
    if (e.key === 'a' || e.key === 'ArrowLeft') moveDir.x = -1;
    if (e.key === 'd' || e.key === 'ArrowRight') moveDir.x = 1;
});
window.addEventListener('keyup', (e) => {
    if (['w','s','ArrowUp','ArrowDown'].includes(e.key)) moveDir.z = 0;
    if (['a','d','ArrowLeft','ArrowRight'].includes(e.key)) moveDir.x = 0;
});

function animate() {
    requestAnimationFrame(animate);

    if (myId && players[myId]) {
        const speed = 0.18;
        if (moveDir.x !== 0 || moveDir.z !== 0) {
            players[myId].position.x += moveDir.x * speed;
            players[myId].position.z += moveDir.z * speed;
            players[myId].rotation.y = Math.atan2(moveDir.x, moveDir.z);

            socket.emit('playerInput', { x: players[myId].position.x, z: players[myId].position.z });
        }
        camera.position.set(players[myId].position.x, 14, players[myId].position.z + 16);
        camera.lookAt(players[myId].position.x, 1, players[myId].position.z);
    }

    Object.keys(bullets).forEach((id) => {
        const b = bullets[id];
        b.mesh.position.x += b.dirX * 0.6;
        b.mesh.position.z += b.dirZ * 0.6;

        if (b.owner !== myId && players[myId]) {
            if (b.mesh.position.distanceTo(players[myId].position) < 1.0) {
                socket.emit('bulletHitPlayer', { bulletId: id, targetId: myId, shooterId: b.owner });
                scene.remove(b.mesh);
                delete bullets[id];
                return;
            }
        }
        if (Math.abs(b.mesh.position.x) > 100 || Math.abs(b.mesh.position.z) > 100) {
            scene.remove(b.mesh);
            delete bullets[id];
        }
    });

    renderer.render(scene, camera);
}
animate();
