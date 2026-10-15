(function () {
  'use strict';

  function showError(msg) {
    var box = document.getElementById('load-error');
    if (!box) {
      box = document.createElement('div');
      box.id = 'load-error';
      box.style.cssText = 'position:fixed;bottom:10px;left:10px;right:10px;background:#7a1f1f;color:#fff;padding:12px 16px;border-radius:8px;font-family:monospace;font-size:13px;white-space:pre-wrap;z-index:9999;';
      document.body.appendChild(box);
    }
    box.style.display = 'block';
    box.textContent = 'Ошибка: ' + msg;
  }

  window.addEventListener('error', function (e) {
    showError((e.message || e.error) + (e.filename ? '\n' + e.filename + ':' + e.lineno : ''));
  });

  function init() {
    try {
      if (typeof THREE === 'undefined') {
        showError('Three.js не загрузился. Нужен интернет для первого запуска.');
        return;
      }

      var canvas = document.getElementById('game');
      if (!canvas) { showError('canvas #game не найден'); return; }

      var els = {
        hudLap:       document.getElementById('hud-lap'),
        lastLapEl:    document.getElementById('last-lap'),
        bestLapEl:    document.getElementById('best-lap'),
        lapTimeEl:    document.getElementById('lap-time'),
        raceTimeEl:   document.getElementById('race-time'),
        speedValEl:   document.getElementById('speed-val'),
        overlay:      document.getElementById('overlay'),
        overlayTitle: document.getElementById('overlay-title'),
        overlayText:  document.getElementById('overlay-text'),
        startBtn:     document.getElementById('start-btn'),
        leftBtn:      document.getElementById('left-btn'),
        rightBtn:     document.getElementById('right-btn')
      };

      var speedDots = [
        document.getElementById('dot-0'),
        document.getElementById('dot-1'),
        document.getElementById('dot-2'),
        document.getElementById('dot-3'),
        document.getElementById('dot-4'),
        document.getElementById('dot-5')
      ];

      var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.82;
      renderer.setClearColor(0x6aa8d0);

      var scene = new THREE.Scene();
      scene.background = new THREE.Color(0x6aa8d0);
      scene.fog = new THREE.Fog(0x9cc0dc, 90, 320);

      var camera = new THREE.PerspectiveCamera(
        68, window.innerWidth / window.innerHeight, 0.1, 700
      );
      camera.position.set(0, 5.5, 9.5);
      camera.lookAt(0, 0.5, -15);

      scene.add(new THREE.AmbientLight(0xffffff, 0.28));

      var hemi = new THREE.HemisphereLight(0xa8c4e8, 0x907050, 0.5);
      scene.add(hemi);

      var sunLight = new THREE.DirectionalLight(0xffeac0, 1.0);
      sunLight.position.set(30, 50, 20);
      scene.add(sunLight);

      var fillLight = new THREE.DirectionalLight(0xffd8a0, 0.2);
      fillLight.position.set(-25, 30, -20);
      scene.add(fillLight);

      var bounce = new THREE.PointLight(0xffd8a0, 0.15, 80);
      bounce.position.set(0, 3, 0);
      scene.add(bounce);

      function makeEnvMap() {
        var size = 256;
        var faces = [];
        for (var i = 0; i < 6; i++) {
          var c = document.createElement('canvas');
          c.width = size; c.height = size;
          var cx = c.getContext('2d');

          if (i === 2) {
            var skyGrad = cx.createLinearGradient(0, 0, 0, size);
            skyGrad.addColorStop(0,    '#3878b8');
            skyGrad.addColorStop(0.5,  '#6aa8d0');
            skyGrad.addColorStop(1,    '#a8c8e0');
            cx.fillStyle = skyGrad;
            cx.fillRect(0, 0, size, size);

            var sunX = size * 0.72, sunY = size * 0.28;
            var sunGlow = cx.createRadialGradient(sunX, sunY, 0, sunX, sunY, size * 0.5);
            sunGlow.addColorStop(0,   'rgba(255, 250, 225, 0.95)');
            sunGlow.addColorStop(0.15,'rgba(255, 240, 200, 0.7)');
            sunGlow.addColorStop(0.4, 'rgba(255, 235, 190, 0.25)');
            sunGlow.addColorStop(1,   'rgba(255, 235, 190, 0)');
            cx.fillStyle = sunGlow;
            cx.fillRect(0, 0, size, size);

            cx.fillStyle = '#fdf8e0';
            cx.beginPath();
            cx.arc(sunX, sunY, size * 0.05, 0, Math.PI * 2);
            cx.fill();

            cx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            for (var cl = 0; cl < 5; cl++) {
              var clx = Math.random() * size;
              var cly = size * 0.35 + Math.random() * size * 0.35;
              var r = 12 + Math.random() * 26;
              cx.beginPath();
              cx.arc(clx, cly, r, 0, Math.PI * 2);
              cx.arc(clx + r * 0.7, cly + 3, r * 0.75, 0, Math.PI * 2);
              cx.arc(clx - r * 0.7, cly + 4, r * 0.65, 0, Math.PI * 2);
              cx.fill();
            }
          } else if (i === 3) {
            var gGrad = cx.createLinearGradient(0, 0, 0, size);
            gGrad.addColorStop(0, '#8a6a48');
            gGrad.addColorStop(1, '#5a4030');
            cx.fillStyle = gGrad;
            cx.fillRect(0, 0, size, size);
          } else {
            var sGrad = cx.createLinearGradient(0, 0, 0, size);
            sGrad.addColorStop(0,    '#4a88c0');
            sGrad.addColorStop(0.45, '#88b8d8');
            sGrad.addColorStop(0.52, '#b0a088');
            sGrad.addColorStop(0.68, '#806a50');
            sGrad.addColorStop(1,    '#504030');
            cx.fillStyle = sGrad;
            cx.fillRect(0, 0, size, size);

            if (i === 0 || i === 2) {
              var sunSide = cx.createRadialGradient(
                size * 0.7, size * 0.15, 0,
                size * 0.7, size * 0.15, size * 0.6
              );
              sunSide.addColorStop(0, 'rgba(255, 245, 215, 0.4)');
              sunSide.addColorStop(1, 'rgba(255, 245, 215, 0)');
              cx.fillStyle = sunSide;
              cx.fillRect(0, 0, size, size);
            }
          }

          faces.push(c);
        }
        var tex = new THREE.CubeTexture(faces);
        tex.needsUpdate = true;
        return tex;
      }
      var envMap = makeEnvMap();

      var ROAD_WIDTH = 14;
      var SIDEWALK_WIDTH = 2.2;
      var ROAD_LENGTH = 400;
      var ROAD_NEAR = 20;
      var ROAD_FAR = ROAD_NEAR - ROAD_LENGTH;
      var ROAD_CENTER_Z = (ROAD_NEAR + ROAD_FAR) / 2;
      var WALL_HEIGHT = 3.0;
      var WALL_THICK = 0.5;

      var ground = new THREE.Mesh(
        new THREE.PlaneGeometry(500, ROAD_LENGTH + 200),
        new THREE.MeshStandardMaterial({
          color: 0x3a5c2e, roughness: 0.95, metalness: 0.0
        })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(0, -0.06, ROAD_CENTER_Z);
      scene.add(ground);

      var road = new THREE.Mesh(
        new THREE.PlaneGeometry(ROAD_WIDTH, ROAD_LENGTH),
        new THREE.MeshStandardMaterial({
          color: 0x35353d, roughness: 0.9, metalness: 0.05,
          envMap: envMap, envMapIntensity: 0.25
        })
      );
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, 0, ROAD_CENTER_Z);
      scene.add(road);

      var sidewalkMat = new THREE.MeshStandardMaterial({
        color: 0xa0a0a0, roughness: 0.95, metalness: 0.0
      });
      function createSidewalk(sideSign) {
        var g = new THREE.Group();

        var slab = new THREE.Mesh(
          new THREE.BoxGeometry(SIDEWALK_WIDTH, 0.18, ROAD_LENGTH),
          sidewalkMat
        );
        slab.position.set(
          sideSign * (ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2),
          0.09,
          ROAD_CENTER_Z
        );
        g.add(slab);

        var curb = new THREE.Mesh(
          new THREE.BoxGeometry(0.16, 0.26, ROAD_LENGTH),
          new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 })
        );
        curb.position.set(
          sideSign * (ROAD_WIDTH / 2 + 0.08),
          0.13,
          ROAD_CENTER_Z
        );
        g.add(curb);

        var tileMat = new THREE.MeshBasicMaterial({
          color: 0x808080, transparent: true, opacity: 0.5
        });
        for (var tz = 0; tz < ROAD_LENGTH; tz += 2.5) {
          var tileLine = new THREE.Mesh(
            new THREE.PlaneGeometry(SIDEWALK_WIDTH, 0.06),
            tileMat
          );
          tileLine.rotation.x = -Math.PI / 2;
          tileLine.position.set(
            sideSign * (ROAD_WIDTH / 2 + SIDEWALK_WIDTH / 2),
            0.181,
            ROAD_NEAR - tz
          );
          g.add(tileLine);
        }

        return g;
      }
      scene.add(createSidewalk(-1));
      scene.add(createSidewalk(1));

      var WALL_X = ROAD_WIDTH / 2 + SIDEWALK_WIDTH + WALL_THICK / 2;
      function createWall(sideSign) {
        var group = new THREE.Group();
        var base = new THREE.Mesh(
          new THREE.BoxGeometry(WALL_THICK, WALL_HEIGHT * 0.4, ROAD_LENGTH),
          new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.8 })
        );
        base.position.y = WALL_HEIGHT * 0.2;
        group.add(base);

        var mid = new THREE.Mesh(
          new THREE.BoxGeometry(WALL_THICK * 1.05, WALL_HEIGHT * 0.25, ROAD_LENGTH),
          new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.8 })
        );
        mid.position.y = WALL_HEIGHT * 0.525;
        group.add(mid);

        var top = new THREE.Mesh(
          new THREE.BoxGeometry(WALL_THICK, WALL_HEIGHT * 0.35, ROAD_LENGTH),
          new THREE.MeshStandardMaterial({ color: 0x2878a8, roughness: 0.8 })
        );
        top.position.y = WALL_HEIGHT * 0.825;
        group.add(top);

        group.position.set(sideSign * WALL_X, 0, ROAD_CENTER_Z);
        return group;
      }
      scene.add(createWall(-1));
      scene.add(createWall(1));

      var dashes = [];
      var dashSpacing = 8;
      var dashCount = 55;
      var dashStartZ = ROAD_NEAR;
      var dashGeo = new THREE.PlaneGeometry(0.28, 3.2);
      var dashMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
      for (var di = 0; di < dashCount; di++) {
        for (var lane = 1; lane < 3; lane++) {
          var dash = new THREE.Mesh(dashGeo, dashMat);
          dash.rotation.x = -Math.PI / 2;
          var dx = -ROAD_WIDTH / 2 + (ROAD_WIDTH / 3) * lane;
          dash.position.set(dx, 0.015, dashStartZ - di * dashSpacing);
          scene.add(dash);
          dashes.push(dash);
        }
      }
      var totalDashRange = dashCount * dashSpacing;

      function createTree() {
        var g = new THREE.Group();

        var trunkMat = new THREE.MeshStandardMaterial({
          color: 0x5a3a1a, roughness: 1.0
        });
        var leafMat = new THREE.MeshStandardMaterial({
          color: 0x2a6020, roughness: 1.0
        });
        var leafMat2 = new THREE.MeshStandardMaterial({
          color: 0x357a28, roughness: 1.0
        });

        var trunkH = 1.8 + Math.random() * 1.2;
        var trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.22, trunkH, 8),
          trunkMat
        );
        trunk.position.y = trunkH / 2;
        g.add(trunk);

        var scale = 0.85 + Math.random() * 0.5;

        var big = new THREE.Mesh(
          new THREE.SphereGeometry(1.15 * scale, 12, 10),
          leafMat
        );
        big.position.y = trunkH + 0.85 * scale;
        g.add(big);

        var left = new THREE.Mesh(
          new THREE.SphereGeometry(0.8 * scale, 10, 8),
          leafMat2
        );
        left.position.set(-0.65 * scale, trunkH + 0.4 * scale, 0.15);
        g.add(left);

        var right = new THREE.Mesh(
          new THREE.SphereGeometry(0.85 * scale, 10, 8),
          leafMat2
        );
        right.position.set(0.65 * scale, trunkH + 0.5 * scale, -0.15);
        g.add(right);

        var top = new THREE.Mesh(
          new THREE.SphereGeometry(0.75 * scale, 10, 8),
          leafMat
        );
        top.position.set(0.1, trunkH + 1.55 * scale, 0.1);
        g.add(top);

        return g;
      }

      var trees = [];
      var TREE_COUNT = 34;
      var TREE_RANGE = 400;

      function placeTree(mesh, zPos) {
        var side = Math.random() > 0.5 ? 1 : -1;
        var offset = ROAD_WIDTH / 2 + SIDEWALK_WIDTH * (0.45 + Math.random() * 0.35);
        mesh.position.x = side * offset;
        mesh.position.y = 0.18;
        mesh.position.z = zPos;
      }

      function initTrees() {
        for (var i = 0; i < TREE_COUNT; i++) {
          var t = createTree();
          var z = ROAD_NEAR - Math.random() * TREE_RANGE;
          placeTree(t, z);
          scene.add(t);
          trees.push(t);
        }
      }
      initTrees();

      function makeBuildingTexture(baseColor) {
        var w = 64, h = 128;
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var cx = c.getContext('2d');

        cx.fillStyle = baseColor;
        cx.fillRect(0, 0, w, h);

        cx.strokeStyle = 'rgba(0,0,0,0.25)';
        cx.lineWidth = 1;
        for (var gx = 0; gx < w; gx += 8) {
          cx.beginPath(); cx.moveTo(gx, 0); cx.lineTo(gx, h); cx.stroke();
        }
        for (var gy = 0; gy < h; gy += 8) {
          cx.beginPath(); cx.moveTo(0, gy); cx.lineTo(w, gy); cx.stroke();
        }

        var cols = 5, rows = 12;
        var marginX = 5, marginY = 5;
        var cellW = (w - marginX * 2) / cols;
        var cellH = (h - marginY * 2) / rows;
        for (var r = 0; r < rows; r++) {
          for (var col = 0; col < cols; col++) {
            var rnd = Math.random();
            var winColor;
            if (rnd > 0.75) {
              winColor = '#2a2f38';
            } else if (rnd > 0.4) {
              winColor = '#4a6a88';
            } else {
              winColor = '#7a98b0';
            }
            cx.fillStyle = winColor;
            cx.fillRect(
              marginX + col * cellW + 2,
              marginY + r * cellH + 2,
              cellW - 4,
              cellH - 4
            );
          }
        }

        var tex = new THREE.CanvasTexture(c);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        return tex;
      }

      var buildingPalette = {
        base: ['#9a9488', '#8a8478', '#a09888', '#807a70', '#b0a898', '#8890a0']
      };

      function createBuilding() {
        var w = 6 + Math.random() * 9;
        var d = 6 + Math.random() * 9;
        var h = 10 + Math.random() * 34;

        var baseColor = buildingPalette.base[Math.floor(Math.random() * buildingPalette.base.length)];

        var tex = makeBuildingTexture(baseColor);
        tex.repeat.set(Math.max(1, Math.round(w / 5)), Math.max(1, Math.round(h / 5)));

        var mat = new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.9,
          metalness: 0.05
        });

        var geo = new THREE.BoxGeometry(w, h, d);
        var mesh = new THREE.Mesh(geo, mat);
        mesh.userData.h = h;
        return mesh;
      }

      var buildings = [];
      var BUILDING_COUNT = 44;
      var BUILDING_RANGE = 420;
      var BUILDING_WALL_OFFSET = ROAD_WIDTH / 2 + SIDEWALK_WIDTH + WALL_THICK;

      function placeBuilding(mesh, zPos) {
        var side = Math.random() > 0.5 ? 1 : -1;
        var offset = BUILDING_WALL_OFFSET + 4 + Math.random() * 22;
        mesh.position.x = side * offset;
        mesh.position.y = mesh.userData.h / 2;
        mesh.position.z = zPos;
      }

      function initCity() {
        for (var i = 0; i < BUILDING_COUNT; i++) {
          var b = createBuilding();
          var z = ROAD_NEAR - Math.random() * BUILDING_RANGE;
          placeBuilding(b, z);
          scene.add(b);
          buildings.push(b);
        }
      }
      initCity();

      // ====================== ТЕКСТУРА НОМЕРА ======================
      function makeNumberTexture(number) {
        var size = 512;
        var c = document.createElement('canvas');
        c.width = size; c.height = size;
        var cx = c.getContext('2d');
        cx.clearRect(0, 0, size, size);

        cx.fillStyle = '#ffffff';
        cx.beginPath();
        cx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
        cx.fill();

        cx.strokeStyle = '#0a0a0a';
        cx.lineWidth = size * 0.05;
        cx.beginPath();
        cx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
        cx.stroke();

        cx.fillStyle = '#0a0a0a';
        cx.font = 'bold ' + Math.round(size * 0.62) + 'px Arial, sans-serif';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText(number, size / 2, size * 0.545);

        var tex = new THREE.CanvasTexture(c);
        tex.anisotropy = 16;
        return tex;
      }

      // ====================== МАШИНА (классический 911-спорткар) ======================
      function createCar(color, withLivery) {
        var g = new THREE.Group();

        var bodyMat = new THREE.MeshPhysicalMaterial({
          color: color,
          metalness: 0.75,
          roughness: 0.22,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
          envMap: envMap,
          envMapIntensity: 1.0
        });

        var glassMat = new THREE.MeshPhysicalMaterial({
          color: 0x06101a,
          metalness: 0.95,
          roughness: 0.04,
          envMap: envMap,
          envMapIntensity: 1.8
        });

        var blackMat = new THREE.MeshStandardMaterial({
          color: 0x08080a, roughness: 0.85, metalness: 0.1
        });

        var darkMat = new THREE.MeshStandardMaterial({
          color: 0x1a1c20, roughness: 0.65, metalness: 0.35
        });

        var chromeMat = new THREE.MeshPhysicalMaterial({
          color: 0xd8dcdf, metalness: 1.0, roughness: 0.08,
          envMap: envMap, envMapIntensity: 1.7
        });

        var rubberMat = new THREE.MeshStandardMaterial({
          color: 0x181818, roughness: 0.85, metalness: 0.05
        });

        var headLensMat = new THREE.MeshPhysicalMaterial({
          color: 0xfafae8, metalness: 0.5, roughness: 0.05,
          envMap: envMap, envMapIntensity: 1.7,
          emissive: 0xfff0c0, emissiveIntensity: 0.15
        });

        var headGlowMat = new THREE.MeshStandardMaterial({
          color: 0xffffff, emissive: 0xfff2c0, emissiveIntensity: 0.6
        });

        var tailLensMat = new THREE.MeshPhysicalMaterial({
          color: 0xc8121e, metalness: 0.6, roughness: 0.15,
          envMap: envMap, envMapIntensity: 0.8,
          emissive: 0x550000, emissiveIntensity: 0.6
        });

        var tireMat = new THREE.MeshStandardMaterial({
          color: 0x040404, roughness: 0.95, metalness: 0.02
        });

        var rimMat = new THREE.MeshPhysicalMaterial({
          color: 0xc2c6ca, metalness: 1.0, roughness: 0.12,
          envMap: envMap, envMapIntensity: 1.4
        });

        var plateMat = new THREE.MeshStandardMaterial({
          color: 0xf0f0f0, roughness: 0.5, metalness: 0.05
        });

        // ---- Силуэт классического 911-спорткара ----
        var shape = new THREE.Shape();

        shape.moveTo(-2.15, 0.22);
        shape.lineTo(-2.15, 0.55);
        shape.quadraticCurveTo(-2.18, 0.72, -2.02, 0.78);
        shape.quadraticCurveTo(-1.80, 0.82, -1.55, 0.83);
        shape.lineTo(-1.15, 0.86);
        shape.quadraticCurveTo(-0.85, 0.90, -0.60, 1.10);
        shape.quadraticCurveTo(-0.30, 1.38,  0.00, 1.47);
        shape.quadraticCurveTo(0.30, 1.50,  0.50, 1.42);
        shape.quadraticCurveTo(0.72, 1.28,  0.85, 1.02);
        shape.quadraticCurveTo(0.98, 0.88,  1.22, 0.82);
        shape.lineTo(1.75, 0.78);
        shape.quadraticCurveTo(2.05, 0.74, 2.18, 0.62);
        shape.quadraticCurveTo(2.24, 0.52, 2.18, 0.40);
        shape.quadraticCurveTo(2.20, 0.28, 2.10, 0.22);
        shape.lineTo(-2.05, 0.22);
        shape.quadraticCurveTo(-2.15, 0.22, -2.15, 0.22);
        shape.closePath();

        var BODY_WIDTH = 1.78;
        var bodyGeo = new THREE.ExtrudeGeometry(shape, {
          depth: BODY_WIDTH,
          bevelEnabled: true,
          bevelThickness: 0.14,
          bevelSize: 0.06,
          bevelSegments: 5,
          curveSegments: 36
        });

        bodyGeo.computeBoundingBox();
        var bb0 = bodyGeo.boundingBox;
        bodyGeo.translate(0, 0, -(bb0.min.z + bb0.max.z) / 2);
        bodyGeo.rotateY(Math.PI / 2);
        bodyGeo.computeBoundingBox();
        var bb1 = bodyGeo.boundingBox;
        bodyGeo.translate(0, 0.20 - bb1.min.y, 0);

        var body = new THREE.Mesh(bodyGeo, bodyMat);
        g.add(body);

        var HALF_W = BODY_WIDTH / 2 + 0.06; // ≈ 0.95

        // Лобовое стекло
        var wsMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.52, 0.02, 0.55),
          glassMat
        );
        wsMesh.position.set(0, 1.19, -0.78);
        wsMesh.rotation.x = -0.65;
        g.add(wsMesh);

        // Заднее стекло
        var rwMesh = new THREE.Mesh(
          new THREE.BoxGeometry(1.52, 0.02, 0.75),
          glassMat
        );
        rwMesh.position.set(0, 1.19, 0.85);
        rwMesh.rotation.x = 0.55;
        g.add(rwMesh);

        // Боковые окна
        var swGeo = new THREE.BoxGeometry(0.03, 0.26, 1.15);
        var swL = new THREE.Mesh(swGeo, glassMat);
        swL.position.set(-HALF_W + 0.02, 1.20, 0.05);
        g.add(swL);
        var swR = new THREE.Mesh(swGeo, glassMat);
        swR.position.set(HALF_W - 0.02, 1.20, 0.05);
        g.add(swR);

        // Воздухозаборники на капоте
        var ventGrilleMat = new THREE.MeshStandardMaterial({
          color: 0x1a1a1c, roughness: 0.85, metalness: 0.1
        });
        for (var v = 0; v < 3; v++) {
          var vent = new THREE.Mesh(
            new THREE.BoxGeometry(0.85, 0.012, 0.10),
            ventGrilleMat
          );
          vent.position.set(0, 0.775 - v * 0.008, -1.60 + v * 0.14);
          vent.rotation.x = 0.06;
          g.add(vent);
        }

        // Жалюзи моторного отсека
        for (var j = 0; j < 6; j++) {
          var louver = new THREE.Mesh(
            new THREE.BoxGeometry(1.05, 0.012, 0.06),
            ventGrilleMat
          );
          louver.position.set(0, 0.795 - j * 0.005, 1.20 + j * 0.11);
          louver.rotation.x = -0.05;
          g.add(louver);
        }

        // Круглые фары
        function makeRoundHeadlight(side) {
          var hlGroup = new THREE.Group();

          var bezel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.165, 0.165, 0.12, 28),
            chromeMat
          );
          bezel.rotation.x = Math.PI / 2;
          hlGroup.add(bezel);

          var lens = new THREE.Mesh(
            new THREE.SphereGeometry(0.145, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
            headLensMat
          );
          lens.rotation.x = -Math.PI / 2;
          lens.position.z = -0.055;
          hlGroup.add(lens);

          var glow = new THREE.Mesh(
            new THREE.SphereGeometry(0.10, 14, 12),
            headGlowMat
          );
          glow.scale.set(1, 1, 0.6);
          glow.position.z = -0.03;
          hlGroup.add(glow);

          hlGroup.position.set(side * 0.66, 0.78, -2.10);
          return hlGroup;
        }
        g.add(makeRoundHeadlight(-1));
        g.add(makeRoundHeadlight(1));

        // Круглые задние фонари
        function makeRoundTaillight(side) {
          var tlGroup = new THREE.Group();

          var bezel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.13, 0.13, 0.09, 22),
            chromeMat
          );
          bezel.rotation.x = Math.PI / 2;
          tlGroup.add(bezel);

          var lens = new THREE.Mesh(
            new THREE.SphereGeometry(0.115, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.6),
            tailLensMat
          );
          lens.rotation.x = Math.PI / 2;
          lens.position.z = 0.045;
          tlGroup.add(lens);

          tlGroup.position.set(side * 0.66, 0.65, 2.12);
          return tlGroup;
        }
        g.add(makeRoundTaillight(-1));
        g.add(makeRoundTaillight(1));

        // Бамперы
        function makeBumper(isFront) {
          var bGroup = new THREE.Group();

          var chromeBar = new THREE.Mesh(
            new THREE.BoxGeometry(1.82, 0.09, 0.08),
            chromeMat
          );
          bGroup.add(chromeBar);

          var rubberStrip = new THREE.Mesh(
            new THREE.BoxGeometry(1.84, 0.04, 0.10),
            rubberMat
          );
          rubberStrip.position.y = 0.01;
          bGroup.add(rubberStrip);

          var z = isFront ? -2.17 : 2.17;
          bGroup.position.set(0, 0.36, z);
          return bGroup;
        }
        g.add(makeBumper(true));
        g.add(makeBumper(false));

        // Номерные знаки
        var plateRear = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.13, 0.02),
          plateMat
        );
        plateRear.position.set(0, 0.30, 2.22);
        g.add(plateRear);

        var plateFront = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.13, 0.02),
          plateMat
        );
        plateFront.position.set(0, 0.28, -2.22);
        g.add(plateFront);

        // Выхлоп
        var exhaustGroup = new THREE.Group();
        var pipeL = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.16, 16),
          chromeMat
        );
        pipeL.rotation.x = Math.PI / 2;
        pipeL.position.x = -0.08;
        exhaustGroup.add(pipeL);

        var pipeR = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.16, 16),
          chromeMat
        );
        pipeR.rotation.x = Math.PI / 2;
        pipeR.position.x = 0.08;
        exhaustGroup.add(pipeR);

        exhaustGroup.position.set(0, 0.24, 2.20);
        g.add(exhaustGroup);

        // Зеркала
        function makeMirror(side) {
          var mGroup = new THREE.Group();

          var stem = new THREE.Mesh(
            new THREE.BoxGeometry(0.10, 0.03, 0.04),
            blackMat
          );
          mGroup.add(stem);

          var housing = new THREE.Mesh(
            new THREE.BoxGeometry(0.11, 0.07, 0.14),
            chromeMat
          );
          housing.position.set(side * 0.09, 0.015, 0);
          mGroup.add(housing);

          var glass = new THREE.Mesh(
            new THREE.BoxGeometry(0.09, 0.055, 0.01),
            glassMat
          );
          glass.position.set(side * 0.09, 0.015, side * 0.075);
          mGroup.add(glass);

          mGroup.position.set(side * (HALF_W + 0.02), 1.02, -0.72);
          return mGroup;
        }
        g.add(makeMirror(-1));
        g.add(makeMirror(1));

        // Колёса
        function makeWheel() {
          var wGroup = new THREE.Group();

          var tireGeo = new THREE.TorusGeometry(0.30, 0.10, 16, 32);
          tireGeo.rotateY(Math.PI / 2);
          var tire = new THREE.Mesh(tireGeo, tireMat);
          wGroup.add(tire);

          var rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.22, 32);
          rimGeo.rotateZ(Math.PI / 2);
          var rim = new THREE.Mesh(rimGeo, rimMat);
          wGroup.add(rim);

          for (var s = 0; s < 5; s++) {
            var spokeGeo = new THREE.BoxGeometry(0.21, 0.38, 0.04);
            var spoke = new THREE.Mesh(spokeGeo, rimMat);
            spoke.rotation.z = (s / 5) * Math.PI * 2;
            wGroup.add(spoke);
          }

          var hubGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.24, 20);
          hubGeo.rotateZ(Math.PI / 2);
          var hub = new THREE.Mesh(hubGeo, chromeMat);
          wGroup.add(hub);

          return wGroup;
        }

        var wheelRadius = 0.40;
        var wheelPositions = [
          [-HALF_W + 0.02, wheelRadius, -1.42],
          [ HALF_W - 0.02, wheelRadius, -1.42],
          [-HALF_W + 0.02, wheelRadius,  1.38],
          [ HALF_W - 0.02, wheelRadius,  1.38]
        ];
        for (var w = 0; w < wheelPositions.length; w++) {
          var wh = makeWheel();
          wh.position.set(wheelPositions[w][0], wheelPositions[w][1], wheelPositions[w][2]);
          g.add(wh);
        }

        // Ливрея
        if (withLivery) {
          var numTex = makeNumberTexture('19');
          var numMat = new THREE.MeshBasicMaterial({
            map: numTex,
            transparent: true,
            depthWrite: false,
            side: THREE.FrontSide
          });

          var sideX = HALF_W + 0.001;

          var numR = new THREE.Mesh(
            new THREE.PlaneGeometry(0.95, 0.95),
            numMat
          );
          numR.rotation.y = Math.PI / 2;
          numR.position.set(sideX, 0.60, 0.10);
          g.add(numR);

          var numL = new THREE.Mesh(
            new THREE.PlaneGeometry(0.95, 0.95),
            numMat
          );
          numL.rotation.y = -Math.PI / 2;
          numL.position.set(-sideX, 0.60, 0.10);
          g.add(numL);
        }

        // Тень
        var shadow = new THREE.Mesh(
          new THREE.PlaneGeometry(2.6, 4.8),
          new THREE.MeshBasicMaterial({
            color: 0x000000, transparent: true, opacity: 0.45,
            depthWrite: false
          })
        );
        shadow.rotation.x = -Math.PI / 2;
        shadow.position.y = 0.02;
        g.add(shadow);

        return g;
      }

      // Машина игрока — оранжевая с номером 19
      var playerCar = createCar(0xd45a1c, true);
      playerCar.position.set(0, 0, 0);
      scene.add(playerCar);

      // ---------- Состояние ----------
      var state = 'menu';
      var score = 0;
      var best = 0;
      var speed = 22;
      var BASE_SPEED = 22;
      var MAX_SPEED = 65;
      var TOTAL_LAPS = 3;
      var POINTS_PER_LAP = 1500;
      var nextLapTarget = POINTS_PER_LAP;

      var currentLap = 1;
      var lastLapTime = 0;
      var bestLapTime = Infinity;
      var raceStartTime = 0;
      var lapStartTime = 0;

      var enemies = [];
      var spawnTimer = 0;
      var spawnInterval = 1.2;
      var lastTime = 0;

      var keys = { left: false, right: false };
      var playerX = 0;
      var PLAYER_SPEED = 11;

      try {
        var stored = parseInt(localStorage.getItem('arcade_racing_best'), 10);
        best = (isFinite(stored) && stored > 0) ? stored : 0;
      } catch (e) { best = 0; }

      function formatTime(ms) {
        if (!isFinite(ms) || ms < 0) return '00:00:000';
        var m = Math.floor(ms / 60000);
        var s = Math.floor((ms % 60000) / 1000);
        var mm = Math.floor(ms % 1000);
        return (m < 10 ? '0' : '') + m + ':' +
               (s < 10 ? '0' : '') + s + ':' +
               (mm < 100 ? (mm < 10 ? '00' : '0') : '') + mm;
      }

      function updateLapUI() {
        els.hudLap.textContent = 'Lap ' + currentLap + '/' + TOTAL_LAPS;
        var now = Date.now();
        els.lapTimeEl.textContent  = formatTime(now - lapStartTime);
        els.raceTimeEl.textContent = formatTime(now - raceStartTime);
        els.lastLapEl.textContent  = formatTime(lastLapTime);
        els.bestLapEl.textContent  = formatTime(bestLapTime);
      }

      function updateSpeedUI(ratio) {
        var mph = Math.floor(20 + ratio * 140);
        els.speedValEl.textContent = mph;
        var thresholds = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85];
        for (var i = 0; i < speedDots.length; i++) {
          if (!speedDots[i]) continue;
          if (ratio > thresholds[i]) speedDots[i].classList.add('active');
          else speedDots[i].classList.remove('active');
        }
      }

      function spawnEnemy() {
        var lanes = [-1, 0, 1];
        var available = lanes.filter(function (lane) {
          var xPos = lane * (ROAD_WIDTH / 3);
          return !enemies.some(function (e) {
            return Math.abs(e.mesh.position.x - xPos) < 2.6 &&
                   e.mesh.position.z < -250;
          });
        });
        if (available.length === 0) return;

        var lane = available[Math.floor(Math.random() * available.length)];
        var xPos = lane * (ROAD_WIDTH / 3);

        var colors = [0x2a6cc0, 0xd8c820, 0x3a8a40, 0xe6e6e6,
                      0x8a2828, 0x2080a0, 0x505868];
        var color = colors[Math.floor(Math.random() * colors.length)];

        var car = createCar(color, false);
        car.rotation.y = Math.PI;
        car.position.set(xPos, 0, ROAD_FAR + 20);
        scene.add(car);

        enemies.push({
          mesh: car,
          factor: 0.85 + Math.random() * 0.35
        });
      }

      function reset() {
        score = 0;
        speed = BASE_SPEED;
        currentLap = 1;
        nextLapTarget = POINTS_PER_LAP;
        lastLapTime = 0;
        bestLapTime = Infinity;
        raceStartTime = Date.now();
        lapStartTime = Date.now();
        playerX = 0;
        playerCar.position.set(0, 0, 0);

        for (var i = 0; i < enemies.length; i++) {
          scene.remove(enemies[i].mesh);
        }
        enemies = [];
        spawnTimer = 0;
        spawnInterval = 1.2;

        updateLapUI();
        updateSpeedUI(0);
      }

      function update(dt) {
        speed = Math.min(MAX_SPEED, speed + 1.6 * dt);
        score += speed * dt * 0.9;

        if (score >= nextLapTarget) {
          var now = Date.now();
          lastLapTime = now - lapStartTime;
          if (lastLapTime < bestLapTime) bestLapTime = lastLapTime;
          currentLap++;
          if (currentLap > TOTAL_LAPS) currentLap = TOTAL_LAPS;
          lapStartTime = now;
          nextLapTarget += POINTS_PER_LAP;
        }

        var dir = 0;
        if (keys.left) dir -= 1;
        if (keys.right) dir += 1;
        playerX += dir * PLAYER_SPEED * dt;

        var maxX = ROAD_WIDTH / 2 - 1.4;
        if (playerX < -maxX) playerX = -maxX;
        if (playerX > maxX) playerX = maxX;
        playerCar.position.x = playerX;
        playerCar.rotation.z = -dir * 0.06;

        var targetCamX = playerX * 0.45;
        camera.position.x += (targetCamX - camera.position.x) * 0.12;
        camera.lookAt(playerX * 0.35, 0.8, -15);

        var roadMove = speed * dt;
        for (var i = 0; i < dashes.length; i++) {
          dashes[i].position.z += roadMove;
          if (dashes[i].position.z > dashStartZ + dashSpacing * 2) {
            dashes[i].position.z -= totalDashRange;
          }
        }

        for (var ti = 0; ti < trees.length; ti++) {
          var t = trees[ti];
          t.position.z += roadMove;
          if (t.position.z > ROAD_NEAR + 25) {
            t.position.z -= TREE_RANGE;
            placeTree(t, t.position.z);
          }
        }

        for (var bi = 0; bi < buildings.length; bi++) {
          var b = buildings[bi];
          b.position.z += roadMove;
          if (b.position.z > ROAD_NEAR + 40) {
            b.position.z -= BUILDING_RANGE;
            placeBuilding(b, b.position.z);
          }
        }

        for (var k = enemies.length - 1; k >= 0; k--) {
          var e = enemies[k];
          e.mesh.position.z += (speed + speed * e.factor * 0.5) * dt;

          if (e.mesh.position.z > ROAD_NEAR + 12) {
            scene.remove(e.mesh);
            enemies.splice(k, 1);
            continue;
          }

          if (Math.abs(e.mesh.position.z - playerCar.position.z) < 3.6 &&
              Math.abs(e.mesh.position.x - playerCar.position.x) < 1.6) {
            gameOver();
            return;
          }
        }

        spawnTimer += dt;
        if (spawnTimer >= spawnInterval) {
          spawnTimer = 0;
          spawnInterval = Math.max(0.4, 1.3 - (speed - BASE_SPEED) / 45);
          spawnEnemy();
        }

        updateLapUI();
        var ratio = (speed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED);
        if (ratio < 0) ratio = 0;
        if (ratio > 1) ratio = 1;
        updateSpeedUI(ratio);
      }

      function gameOver() {
        state = 'gameover';
        var finalScore = Math.floor(score);
        if (finalScore > best) {
          best = finalScore;
          try { localStorage.setItem('arcade_racing_best', String(best)); } catch (e) {}
        }
        showOverlay(
          'Игра окончена',
          'Ваш счёт: <b>' + finalScore + '</b><br>Рекорд: <b>' + Math.floor(best) + '</b>',
          'Играть снова'
        );
      }

      function showOverlay(title, text, btnText) {
        els.overlayTitle.textContent = title;
        els.overlayText.innerHTML = text;
        els.startBtn.textContent = btnText;
        els.overlay.classList.remove('hidden');
      }

      function startGame() {
        reset();
        els.overlay.classList.add('hidden');
        state = 'playing';
      }

      function loop(now) {
        if (!lastTime) lastTime = now;
        var dt = (now - lastTime) / 1000;
        lastTime = now;
        if (dt > 0.05) dt = 0.05;

        if (state === 'playing') {
          update(dt);
        } else {
          var idleMove = 22 * dt;
          for (var i = 0; i < dashes.length; i++) {
            dashes[i].position.z += idleMove;
            if (dashes[i].position.z > dashStartZ + dashSpacing * 2) {
              dashes[i].position.z -= totalDashRange;
            }
          }
          for (var ti = 0; ti < trees.length; ti++) {
            var t = trees[ti];
            t.position.z += idleMove;
            if (t.position.z > ROAD_NEAR + 25) {
              t.position.z -= TREE_RANGE;
              placeTree(t, t.position.z);
            }
          }
          for (var bi = 0; bi < buildings.length; bi++) {
            var b = buildings[bi];
            b.position.z += idleMove;
            if (b.position.z > ROAD_NEAR + 40) {
              b.position.z -= BUILDING_RANGE;
              placeBuilding(b, b.position.z);
            }
          }
          playerCar.rotation.z = Math.sin(now * 0.002) * 0.015;
        }

        renderer.render(scene, camera);
        requestAnimationFrame(loop);
      }

      function onResize() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', function () {
        setTimeout(onResize, 120);
      });

      function setKey(e, pressed) {
        var k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'ф' || k === 'Ф') {
          keys.left = pressed; return true;
        }
        if (k === 'ArrowRight' || k === 'd' || k === 'D' || k === 'в' || k === 'В') {
          keys.right = pressed; return true;
        }
        return false;
      }

      document.addEventListener('keydown', function (e) {
        if (setKey(e, true)) { e.preventDefault(); return; }
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          if (state !== 'playing') startGame();
        }
      });
      document.addEventListener('keyup', function (e) {
        if (setKey(e, false)) e.preventDefault();
      });
      window.addEventListener('blur', function () {
        keys.left = false;
        keys.right = false;
      });

      function bindHold(el, on, off) {
        if (!el) return;
        el.addEventListener('pointerdown', function (e) { e.preventDefault(); on(); });
        el.addEventListener('pointerup',   function (e) { e.preventDefault(); off(); });
        el.addEventListener('pointerleave', off);
        el.addEventListener('pointercancel', off);
      }
      bindHold(els.leftBtn,  function () { keys.left = true;  }, function () { keys.left = false;  });
      bindHold(els.rightBtn, function () { keys.right = true; }, function () { keys.right = false; });

      els.startBtn.addEventListener('click', function () {
        if (state !== 'playing') startGame();
      });

      updateLapUI();
      updateSpeedUI(0);
      showOverlay('Гонки 3D', 'Управление: ← → или A / D<br>Избегай столкновений!', 'Начать игру');
      requestAnimationFrame(loop);
    } catch (err) {
      showError((err && err.stack) ? err.stack : String(err));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();