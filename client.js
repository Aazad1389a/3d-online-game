// ایجاد صحنه ۳ بعدی، دوربین و نورپردازی بهینه
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // بهینه‌سازی گرافیک ۱ گیگ
document.body.appendChild(renderer.domElement);

// نورپردازی جذاب
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(20, 40, 20);
scene.add(dirLight);

// زمین بازی
const floorGrid = new THREE.GridHelper(100, 50, 0x00ff88, 0x444444);
scene.add(floorGrid);

// سیستم مدیریت بازیکنان آنلاین
const socket = io('https://your-server-url.com'); // آدرس سرور
const players = {};
let myId = null;
const moveDir = { x: 0, z: 0 };

// ساخت کاراکتر ۳ بعدی (طراحی سبک Low-Poly)
function createPlayerMesh(color = 0x00a8ff) {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(1, 2, 1);
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3 });
    const mesh = new THREE.Mesh(bodyGeo, bodyMat);
    mesh.position.y = 1;
    group.add(mesh);
    return group;
}

// ارتباطات شبکه (Socket.io)
socket.on('connect', () => { myId = socket.id; });

socket.on('currentPlayers', (serverPlayers) => {
    Object.keys(serverPlayers).forEach((id) => {
        if (!players[id]) {
            const pMesh = createPlayerMesh(id === myId ? 0x00ff88 : 0xff4757);
            scene.add(pMesh);
            players[id] = pMesh;
        }
        players[id].position.set(serverPlayers[id].x, 0, serverPlayers[id].z);
    });
});

socket.on('playerMoved', (data) => {
    if (players[data.id]) {
        players[data.id].position.set(data.x, 0, data.z);
    }
});

socket.on('playerDisconnected', (id) => {
    if (players[id]) {
        scene.remove(players[id]);
        delete players[id];
    }
});

// ورودی کیبورد PC
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

// حلقه اصلی رندر و آپدیت پوزیشن
function animate() {
    requestAnimationFrame(animate);

    if (myId && players[myId]) {
        const speed = 0.15;
        if (moveDir.x !== 0 || moveDir.z !== 0) {
            players[myId].position.x += moveDir.x * speed;
            players[myId].position.z += moveDir.z * speed;

            // ارسال موقعیت به سرور
            socket.emit('playerInput', {
                x: players[myId].position.x,
                z: players[myId].position.z
            });
        }

        // تعقیب دوربین
        camera.position.set(players[myId].position.x, 12, players[myId].position.z + 12);
        camera.lookAt(players[myId].position);
    }

    renderer.render(scene, camera);
}
animate();
