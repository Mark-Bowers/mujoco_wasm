import * as THREE from 'three';
import { Reflector  } from './utils/Reflector.js';
import { MuJoCoDemo } from './main.js';

const decodeName = (function() {
  const textDecoder = new TextDecoder("utf-8");

  return function(model, index) {
    const name_arr = model.names.subarray(index);
    const end = name_arr.indexOf(0);    // Decode to NUL terminator
    return textDecoder.decode(name_arr.subarray(0, end));
  };
})();

export async function reloadFunc() {
  // Delete the old scene and load the new scene
  this.scene.remove(this.scene.getObjectByName("MuJoCo Root"));
  [this.model, this.state, this.simulation, this.bodies, this.lights] =
    await loadSceneFromURL(this.mujoco, this.params.scene, this);
  this.simulation.forward();
  for (let i = 0; i < this.updateGUICallbacks.length; i++) {
    this.updateGUICallbacks[i](this.model, this.simulation, this.params);
  }
}

/** @param {MuJoCoDemo} parentContext*/
export function setupGUI(parentContext) {

  // Make sure we reset the camera when the scene is changed or reloaded.
  parentContext.updateGUICallbacks.length = 0;
  parentContext.updateGUICallbacks.push((model, simulation, params) => {
    // TODO: Use free camera parameters from MuJoCo
    parentContext.camera.position.set(2.0, 1.7, 1.7);
    parentContext.controls.target.set(0, 0.7, 0);
    parentContext.controls.update(); });

  // Add scene selection dropdown.
  let reload = reloadFunc.bind(parentContext);
  parentContext.gui.add(parentContext.params, 'scene', {
    "Pupper": "Pupper/pupper.xml",
    "Cassie": "agility_cassie/scene.xml",
    "Humanoid": "humanoid.xml",
    "Hammock": "hammock.xml",
    "Hand": "shadow_hand/scene_right.xml",
    "Balloons": "balloons.xml", "Mug": "mug.xml"
  }).name('Example Scene').onChange(reload);

  // Add a help menu.
  // Parameters:
  //  Name: "Help".
  //  When pressed, a help menu is displayed in the top left corner. When pressed again
  //  the help menu is removed.
  //  Can also be triggered by pressing F1.
  // Has a dark transparent background.
  // Has two columns: one for putting the action description, and one for the action key trigger.keyframeNumber
  let keyInnerHTML = '';
  let actionInnerHTML = '';
  const displayHelpMenu = () => {
    if (parentContext.params.help) {
      const helpMenu = document.createElement('div');
      helpMenu.style.position = 'absolute';
      helpMenu.style.top = '10px';
      helpMenu.style.left = '10px';
      helpMenu.style.color = 'white';
      helpMenu.style.font = 'normal 18px Arial';
      helpMenu.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      helpMenu.style.padding = '10px';
      helpMenu.style.borderRadius = '10px';
      helpMenu.style.display = 'flex';
      helpMenu.style.flexDirection = 'column';
      helpMenu.style.alignItems = 'center';
      helpMenu.style.justifyContent = 'center';
      helpMenu.style.width = '400px';
      helpMenu.style.height = '400px';
      helpMenu.style.overflow = 'auto';
      helpMenu.style.zIndex = '1000';

      const helpMenuTitle = document.createElement('div');
      helpMenuTitle.style.font = 'bold 24px Arial';
      helpMenuTitle.innerHTML = '';
      helpMenu.appendChild(helpMenuTitle);

      const helpMenuTable = document.createElement('table');
      helpMenuTable.style.width = '100%';
      helpMenuTable.style.marginTop = '10px';
      helpMenu.appendChild(helpMenuTable);

      const helpMenuTableBody = document.createElement('tbody');
      helpMenuTable.appendChild(helpMenuTableBody);

      const helpMenuRow = document.createElement('tr');
      helpMenuTableBody.appendChild(helpMenuRow);

      const helpMenuActionColumn = document.createElement('td');
      helpMenuActionColumn.style.width = '50%';
      helpMenuActionColumn.style.textAlign = 'right';
      helpMenuActionColumn.style.paddingRight = '10px';
      helpMenuRow.appendChild(helpMenuActionColumn);

      const helpMenuKeyColumn = document.createElement('td');
      helpMenuKeyColumn.style.width = '50%';
      helpMenuKeyColumn.style.textAlign = 'left';
      helpMenuKeyColumn.style.paddingLeft = '10px';
      helpMenuRow.appendChild(helpMenuKeyColumn);

      const helpMenuActionText = document.createElement('div');
      helpMenuActionText.innerHTML = actionInnerHTML;
      helpMenuActionColumn.appendChild(helpMenuActionText);

      const helpMenuKeyText = document.createElement('div');
      helpMenuKeyText.innerHTML = keyInnerHTML;
      helpMenuKeyColumn.appendChild(helpMenuKeyText);

      // Close buttom in the top.
      const helpMenuCloseButton = document.createElement('button');
      helpMenuCloseButton.innerHTML = 'Close';
      helpMenuCloseButton.style.position = 'absolute';
      helpMenuCloseButton.style.top = '10px';
      helpMenuCloseButton.style.right = '10px';
      helpMenuCloseButton.style.zIndex = '1001';
      helpMenuCloseButton.onclick = () => {
        helpMenu.remove();
      };
      helpMenu.appendChild(helpMenuCloseButton);

      document.body.appendChild(helpMenu);
    } else {
      document.body.removeChild(document.body.lastChild);
    }
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'F1') {
      parentContext.params.help = !parentContext.params.help;
      displayHelpMenu();
      event.preventDefault();
    }
  });
  keyInnerHTML += 'F1<br>';
  actionInnerHTML += 'Help<br>';

  let simulationFolder = parentContext.gui.addFolder("Simulation");

  // Add pause simulation checkbox.
  // Parameters:
  //  Under "Simulation" folder.
  //  Name: "Pause Simulation".
  //  When paused, a "pause" text in white is displayed in the top left corner.
  //  Can also be triggered by pressing the spacebar.
  const pauseSimulation = simulationFolder.add(parentContext.params, 'paused').name('Pause Simulation');
  pauseSimulation.onChange((value) => {
    if (value) {
      const pausedText = document.createElement('div');
      pausedText.style.position = 'absolute';
      pausedText.style.top = '10px';
      pausedText.style.left = '10px';
      pausedText.style.color = 'white';
      pausedText.style.font = 'normal 18px Arial';
      pausedText.innerHTML = 'pause';
      parentContext.container.appendChild(pausedText);
    } else {
      parentContext.container.removeChild(parentContext.container.lastChild);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      parentContext.params.paused = !parentContext.params.paused;
      pauseSimulation.setValue(parentContext.params.paused);
      event.preventDefault();
    }
  });
  actionInnerHTML += 'Play / Pause<br>';
  keyInnerHTML += 'Space<br>';

  // Add reload model button.
  // Parameters:
  //  Under "Simulation" folder.
  //  Name: "Reload".
  //  When pressed, calls the reload function.
  //  Can also be triggered by pressing ctrl + L.
  simulationFolder.add({reload: () => { reload(); }}, 'reload').name('Reload');
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.code === 'KeyL') { reload();  event.preventDefault(); }});
  actionInnerHTML += 'Reload XML<br>';
  keyInnerHTML += 'Ctrl L<br>';

  // Add reset simulation button.
  // Parameters:
  //  Under "Simulation" folder.
  //  Name: "Reset".
  //  When pressed, resets the simulation to the initial state.
  //  Can also be triggered by pressing backspace.
  const resetSimulation = () => {
    parentContext.simulation.resetData();
    parentContext.simulation.forward();
  };
  simulationFolder.add({reset: () => { resetSimulation(); }}, 'reset').name('Reset');
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Backspace') { resetSimulation(); event.preventDefault(); }});
  actionInnerHTML += 'Reset simulation<br>';
  keyInnerHTML += 'Backspace<br>';

  // Add keyframe slider.
  let nkeys = parentContext.model.nkey;
  let keyframeGUI = simulationFolder.add(parentContext.params, "keyframeNumber", 0, nkeys - 1, 1).name('Load Keyframe').listen();
  keyframeGUI.onChange((value) => {
    if (value < parentContext.model.nkey) {
      parentContext.simulation.qpos.set(parentContext.model.key_qpos.slice(
        value * parentContext.model.nq, (value + 1) * parentContext.model.nq)); }});
  parentContext.updateGUICallbacks.push((model, simulation, params) => {
    let nkeys = parentContext.model.nkey;
    console.log("new model loaded. has " + nkeys + " keyframes.");
    if (nkeys > 0) {
      keyframeGUI.max(nkeys - 1);
      keyframeGUI.domElement.style.opacity = 1.0;
    } else {
      // Disable keyframe slider if no keyframes are available.
      keyframeGUI.max(0);
      keyframeGUI.domElement.style.opacity = 0.5;
    }
  });

  // Add sliders for ctrlnoiserate and ctrlnoisestd; min = 0, max = 2, step = 0.01.
  simulationFolder.add(parentContext.params, 'ctrlnoiserate', 0.0, 2.0, 0.01).name('Noise rate' );
  simulationFolder.add(parentContext.params, 'ctrlnoisestd' , 0.0, 2.0, 0.01).name('Noise scale');

  function actuatorName(model, actuatorId) {
    return decodeName(model, model.name_actuatoradr[actuatorId]);
  }

  // Add actuator sliders.
  let actuatorFolder = simulationFolder.addFolder("Actuators");
  const addActuators = (model, simulation, params) => {
    let act_range = model.actuator_ctrlrange;
    let actuatorGUIs = [];
    for (let i = 0; i < model.nu; i++) {
      if (!model.actuator_ctrllimited[i]) { continue; }
      const name = actuatorName(parentContext.model, i);

      parentContext.params[name] = 0.0;
      let actuatorGUI = actuatorFolder.add(parentContext.params, name, act_range[2 * i], act_range[2 * i + 1], 0.01).name(name).listen();
      actuatorGUIs.push(actuatorGUI);
      actuatorGUI.onChange((value) => {
        simulation.ctrl[i] = value;
      });
    }
    return actuatorGUIs;
  };
  let actuatorGUIs = addActuators(parentContext.model, parentContext.simulation, parentContext.params);
  parentContext.updateGUICallbacks.push((model, simulation, params) => {
    for (let i = 0; i < actuatorGUIs.length; i++) {
      actuatorGUIs[i].destroy();
    }
    actuatorGUIs = addActuators(model, simulation, parentContext.params);
  });
  actuatorFolder.close();

  // Add function that resets the camera to the default position.
  // Can be triggered by pressing ctrl + A.
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.code === 'KeyA') {
      // TODO: Use free camera parameters from MuJoCo
      parentContext.camera.position.set(2.0, 1.7, 1.7);
      parentContext.controls.target.set(0, 0.7, 0);
      parentContext.controls.update(); 
      event.preventDefault();
    }
  });
  actionInnerHTML += 'Reset free camera<br>';
  keyInnerHTML += 'Ctrl A<br>';

  parentContext.gui.open();
}


function bodyName(model, bodyId) {
  return decodeName(model, model.name_bodyadr[bodyId]);
}

function createBody(name, bodyId, bodies) {
  let body = new THREE.Group();
  body.name = name;
  body.bodyId = bodyId;
  body.has_custom_mesh = false;

  bodies[bodyId] = body;  // Add this new body to set of bodies

  return body;
}

function getBody(model, geomId, bodies) {
  const b = model.geom_bodyid[geomId];
  let body =  bodies[b];

  // Create the body if it doesn't exist
  if (body == undefined) {
    const name = bodyName(model, b);
    body = createBody(name, b, bodies);
  }

  return body;
}

// Function to convert a floating point number in the range [0 1] to a two-digit hexadecimal string
const norm2hex = (c) => {
  const hex = Math.round(c * 255).toString(16);
  return hex.length === 1 ? '0' + hex : hex;
};

// Convert an rgba array to a hex string representation of the color
function rgba2name(rgba) {
  let name = "#";
  for (const c of rgba) { name += norm2hex(c); };
  return name;
}

// subarray helper function (computes start and end and returns subarray)
function subarray(array, index, size, num = 1) {
  const start = index * size;
  const end = start + size * num;
  return array.subarray(start, end);
}

// Swizzles (permute) each point in an array of xyz coordinates (z->y, -y->z)
function swizzlePointArray(points) { // model.mesh_vert, model.mesh_vertadr[meshId], 3, model.mesh_vertnum[meshId]
  for (let v = 0; v < points.length; v+=3) {
    //points[v + 0] =  points[v + 0];   // x (no change)
    const y       =  points[v + 1];     // save y value
    points[v + 1] =  points[v + 2];     // move z value to y
    points[v + 2] = -y;                 // use saved y value to move -y to z
  }
}

// Create a new THREE.BufferGeometry from the corresponding MuJoCo mesh
function createBufferGeometry(model, meshId, body) {
  let geometry = new THREE.BufferGeometry();

  const vert_index = model.mesh_vertadr[meshId];
  const num_vertices = model.mesh_vertnum[meshId];

  // TODO: Since these arrays are swizzled in place, make sure it only happens once.
  let vertex_buffer = subarray(model.mesh_vert, vert_index, 3, num_vertices);
  swizzlePointArray(vertex_buffer);

  let normal_buffer = subarray(model.mesh_normal, vert_index, 3, num_vertices);
  swizzlePointArray(normal_buffer);

  const uv_buffer = subarray(model.mesh_texcoord, model.mesh_texcoordadr[meshId], 2, num_vertices);
  const triangle_buffer = subarray(model.mesh_face, model.mesh_faceadr[meshId], 3, model.mesh_facenum[meshId]);

  geometry.setAttribute("position", new THREE.BufferAttribute(vertex_buffer, 3));
  geometry.setAttribute("normal"  , new THREE.BufferAttribute(normal_buffer, 3));
  geometry.setAttribute("uv"      , new THREE.BufferAttribute(    uv_buffer, 2));
  geometry.setIndex    (Array.from(triangle_buffer));

  body.has_custom_mesh = true;

  return geometry
}

function getBufferGeometry(model, meshId, body, meshes) {
  let geometry = undefined;

  if (meshId in meshes) {
    geometry = meshes[meshId];
  } else {
    geometry = meshes[meshId] = createBufferGeometry(model, meshId, body);
  }

  return geometry;
}

function getGeometry(mujoco, model, geomId, body, meshes) {
  const type = model.geom_type[geomId];
  const size = subarray(model.geom_size, geomId, 3);

  let geometry = undefined;

  if (type == mujoco.mjtGeom.mjGEOM_PLANE.value) {
    // TODO: 0 values should be set to the far clipping plane rather than 100
    const x = size[0] == 0 ? 100 : size[0] * 2;
    const y = size[1] == 0 ? 100 : size[1] * 2;
    geometry = new THREE.PlaneGeometry(x, y);
  } else if (type == mujoco.mjtGeom.mjGEOM_HFIELD.value) {
    // TODO: Implement height field.
  } else if (type == mujoco.mjtGeom.mjGEOM_SPHERE.value) {
    geometry = new THREE.SphereGeometry(size[0]);
  } else if (type == mujoco.mjtGeom.mjGEOM_CAPSULE.value) {
    geometry = new THREE.CapsuleGeometry(size[0], size[1] * 2.0, 20, 20);
  } else if (type == mujoco.mjtGeom.mjGEOM_ELLIPSOID.value) {
    geometry = new THREE.SphereGeometry(1); // Stretch a sphere into an ellipsoid
    geometry.scale(size[0], size[2], size[1]);
  } else if (type == mujoco.mjtGeom.mjGEOM_CYLINDER.value) {
    geometry = new THREE.CylinderGeometry(size[0], size[0], size[1] * 2.0);
  } else if (type == mujoco.mjtGeom.mjGEOM_BOX.value) {
    geometry = new THREE.BoxGeometry(size[0] * 2.0, size[2] * 2.0, size[1] * 2.0);
  } else if (type == mujoco.mjtGeom.mjGEOM_MESH.value) {
    const meshId = model.geom_dataid[geomId];
    geometry = getBufferGeometry(model, meshId, body, meshes);
  } else {    // Set the default geometry. In MuJoCo, this is a sphere.
    geometry = new THREE.SphereGeometry(size[0] * 0.5);
  }

  return geometry;
}

function textureName(model, texId) {
  return decodeName(model, model.name_texadr[texId]);
}

function createTexture(model, texId, textures) {
  const type    = model.tex_type[texId];    // 2d:0, cube:1, skybox:2
  const width   = model.tex_width[texId];
  const height  = model.tex_height[texId];
  const offset  = model.tex_adr[texId];
  const rgb     = model.tex_rgb;

  // Create a THREE.RGBAFormat texture format array from MuJoCo RGB texture
  const len = width * height * 4;
  let rgba = new Uint8Array(len);
  for (let p1 = 0, p2 = offset; p1 < len;){
    rgba[p1++] = rgb[p2++];
    rgba[p1++] = rgb[p2++];
    rgba[p1++] = rgb[p2++];
    rgba[p1++] = 1.0;
  }
  let texture = new THREE.DataTexture(rgba, width, height)
  texture.name = textureName(model, texId);
  texture.mtype = type;         // MuJoCo type // TODO: Is this necessary/useful?
  texture.needsUpdate = true;

  textures[texId] =  texture;   // Add this texture to set of textures

  return texture;
}

// Create a material properties object with core properties
function createMatProperties(name, red, green, blue, alpha) {
  return {
    name        : name,
    color       : new THREE.Color(red, green, blue),
    transparent : alpha < 1.0,
    opacity     : alpha
  };
}

function materialName(model, matId) {
  return decodeName(model, model.name_matadr[matId]);
}

function createMaterial(model, matId, textures) {
  // TODO: Get the appearance as close as possible to MuJoCo viewer

  // MeshStandardMaterial
  const name = materialName(model, matId);
  const rgba = subarray(model.mat_rgba, matId, 4);
  let matProperties = createMatProperties(name, ...rgba);

  const roughness =   1.0 - model.mat_shininess[matId];
  // const metalness         = model.mat_specular[matId];
  const metalness         = 0.1;

  matProperties.roughness = roughness;
  matProperties.metalness = metalness;

  // MeshPhysicalMaterial
  const reflectivity      = model.mat_reflectance[matId];
  const specularIntensity = model.mat_specular[matId] * 0.5;

  matProperties.reflectivity  = reflectivity;
  matProperties.specularIntensity = specularIntensity;
  // matProperties.clearcoat= reflectivity;
  // matProperties.clearcoatRoughness= roughness;

  const texId = model.mat_texid[matId];
  if (texId != -1) {              // material specifies a texture
    let texture = textures[texId];
    if (texture == undefined) {
      texture = createTexture(model, texId, textures);
    }
    const mat_texrepeat = subarray(model.mat_texrepeat, matId, 2)
    const set_repeat = mat_texrepeat[0] != texture.repeat.x || mat_texrepeat[1] != texture.repeat.x;
    if (set_repeat) {             // Set texture.repeat to match mat_texrepeat
      if (texture.repeat.x != 1 || texture.repeat.y != 1) {
        // TODO: Need to copy texture object and set texrepeat
      }
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(...mat_texrepeat);   // TODO: Test cube wrapping
      texture.needsUpdate = true;
    }
    matProperties.map = texture;  // Assign the texture to the material
  }

  return new THREE.MeshPhysicalMaterial(matProperties);
}

function getMaterial(model, g, materials, textures) {
  const matId = model.geom_matid[g];                  // geom material id

  let material = undefined;

  if (matId != -1) {                    // geom specifies a material
    material = materials[matId];
    if (material == undefined) {        // material has not been created yet
      material = materials[matId] = createMaterial(model, matId, textures);
    }
  } else {                              // geom does not specify a material; use geom color
    const geom_rgba = subarray(model.geom_rgba, g, 4);  // geom rgba color
    const name = rgba2name(geom_rgba);  // Name the material based on its color
    material = materials[name];         // Check if material already exists

    if (!material) {                    // Need to create a new material
      material = new THREE.MeshPhysicalMaterial(createMatProperties(name, ...geom_rgba));
      materials[name] = material;       // Save the new material indexed by name
    }
  }

  return material;
}

function createMesh(mujoco, model, g, geometry, material, body) {
  let mesh = undefined;

  const geom_type = model.geom_type[g];
  if (geom_type == mujoco.mjtGeom.mjGEOM_PLANE.value) {
    mesh = new Reflector( geometry, {
      color: material.color,
      clipBias: 0.003,
      texture: material.map,
      reflectivity: material.reflectivity
    });
    mesh.rotateX( - Math.PI / 2 );

    mesh.castShadow = false;                  // The (floor) plane recieves shadows, but does not cast them
    mesh.receiveShadow = true;
  } else {
    mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = true;                   // Meshes, other than plane, cast shadows
    mesh.receiveShadow = geom_type != 7;      // Set mesh to not recieve shadow

    getQuaternion(model.geom_quat, g, mesh.quaternion);
  }
  getPosition( model.geom_pos, g, mesh.position );

  mesh.bodyId = body.bodyId;  // Used to identify body for selection and dragging
  body.add(mesh);             // Add mesh to body

  return mesh;
}

function createTendons(mujocoRoot) {
  // Parse tendons.
  let tendonMat = new THREE.MeshPhongMaterial();
  tendonMat.color = new THREE.Color(0.8, 0.3, 0.3);

  mujocoRoot.cylinders = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 1),
      tendonMat, 1023);
  mujocoRoot.cylinders.receiveShadow = true;
  mujocoRoot.cylinders.castShadow    = true;
  mujocoRoot.add(mujocoRoot.cylinders);

  mujocoRoot.spheres = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 10, 10),
      tendonMat, 1023);
  mujocoRoot.spheres.receiveShadow = true;
  mujocoRoot.spheres.castShadow    = true;
  mujocoRoot.add(mujocoRoot.spheres);
}

function createLights(model, mujocoRoot, bodies) {
  /** @type {THREE.Light[]} */
  let lights = [];

  for (let l = 0; l < model.nlight; l++) {
    let light = undefined;
    if (model.light_directional[l]) {
      light = new THREE.DirectionalLight();
    } else {
      light = new THREE.SpotLight();
    }
    light.decay = model.light_attenuation[l] * 100;
    light.penumbra = 0.5;
    light.castShadow = true;            // default false

    light.shadow.mapSize.width = 1024;  // default
    light.shadow.mapSize.height = 1024; // default
    light.shadow.camera.near = 1;       // default
    light.shadow.camera.far = 10;       // default

    //bodies[model.light_bodyid()].add(light);
    if (bodies[0]) {
      bodies[0].add(light);
    } else {
      mujocoRoot.add(light);
    }
    lights.push(light);
  }

  if (model.nlight == 0) {
    let light = new THREE.DirectionalLight();
    mujocoRoot.add(light);
  }

  return lights;
}

/** Loads a scene for MuJoCo
 * @param {mujoco} mujoco This is a reference to the mujoco namespace object
 * @param {string} filename This is the name of the .xml file in the /working/ directory of the MuJoCo/Emscripten Virtual File System
 * @param {MuJoCoDemo} parent The three.js Scene Object to add the MuJoCo model elements to
 */
export async function loadSceneFromURL(mujoco, filename, parent) {
    // Free the old simulation.
    if (parent.simulation != null) {
      parent.simulation.free();
      parent.model      = null;
      parent.state      = null;
      parent.simulation = null;
    }

    // Load in the state from XML.
    const model = mujoco.Model.load_from_xml("/working/"+filename);
    let state = new mujoco.State(model);
    let simulation = new mujoco.Simulation(model, state);

    // Create the root object.
    const mujocoRoot = new THREE.Group();
    mujocoRoot.name = "MuJoCo Root"
    parent.scene.add(mujocoRoot);

    /** @type {Object.<number, THREE.Group>} */
    let bodies = {};

    /** @type {Object.<number, THREE.BufferGeometry>} */
    let meshes = {};

    // Create an array of THREE.DataTexture to hold objects from the textures specified in the MuJoCo model
    let textures = new Array(model.ntex);

    // Create an array of THREE material to hold objects from the materials specified in the MuJoCo model
    let materials = new Array(model.nmat);

    // Loop through the MuJoCo geoms and recreate them in three.js
    for (let g = 0; g < model.ngeom; g++) {
      const geom_group = model.geom_group[g];

      // Only visualize geom groups up to 2 (same default behavior as simulate)
      if (geom_group > 2) { continue; }

      // Get the parent body of the geom
      const body = getBody(model, g, bodies);

      // Get the the three.js geometry for the MuJoCo geom
      const geometry = getGeometry(mujoco, model, g, body, meshes);

      // Get material for geom
      const material = getMaterial(model, g, materials, textures);

      // Create mesh from geometry
      createMesh(mujoco, model, g, geometry, material, body);
    }

    createTendons(mujocoRoot);

    const lights = createLights(model, mujocoRoot, bodies);

    let world = bodies[0];
    for (let b = 0; b < model.nbody; b++) {
      let body = bodies[b];
      if (b == 0 || !world) {
        mujocoRoot.add(body);
      } else if(body){
        world.add(body);
      } else {
        const name = bodyName(model, b);
        console.log("Body without Geometry detected; adding to bodies", b, name);
        body = createBody(name, b, bodies);
        world.add(body);
      }
    }

    parent.mujocoRoot = mujocoRoot;

    return [model, state, simulation, bodies, lights]
}

/** Downloads the scenes/examples folder to MuJoCo's virtual filesystem
 * @param {mujoco} mujoco */
export async function downloadExampleScenesFolder(mujoco) {
  let allFiles = [
    "22_humanoids.xml",
    "adhesion.xml",
    "agility_cassie/assets/achilles-rod.obj",
    "agility_cassie/assets/cassie-texture.png",
    "agility_cassie/assets/foot-crank.obj",
    "agility_cassie/assets/foot.obj",
    "agility_cassie/assets/heel-spring.obj",
    "agility_cassie/assets/hip-pitch.obj",
    "agility_cassie/assets/hip-roll.obj",
    "agility_cassie/assets/hip-yaw.obj",
    "agility_cassie/assets/knee-spring.obj",
    "agility_cassie/assets/knee.obj",
    "agility_cassie/assets/pelvis.obj",
    "agility_cassie/assets/plantar-rod.obj",
    "agility_cassie/assets/shin.obj",
    "agility_cassie/assets/tarsus.obj",
    "agility_cassie/cassie.xml",
    "agility_cassie/scene.xml",
    "arm26.xml",
    "balloons.xml",
    "flag.xml",
    "hammock.xml",
    "humanoid.xml",
    "humanoid_body.xml",
    "mug.obj",
    "mug.png",
    "mug.xml",
    "Pupper/pupper.xml",
    "Pupper/assets/AbBracket_Screw_Caps.stl",
    "Pupper/assets/Abduction_Bracket_V10.stl",
    "Pupper/assets/BodyV4v70.001.stl",
    "Pupper/assets/Body_V4.obj",
    "Pupper/assets/Body_V4_Display.obj",
    "Pupper/assets/Body_V4_Ears.obj",
    "Pupper/assets/Body_V4_Glass.obj",
    "Pupper/assets/Body_V4_Handle.obj",
    "Pupper/assets/Body_V4_Servos.obj",
    "Pupper/assets/Body_V4_Strap.obj",
    // "Pupper/assets/BrushedAluminum.png",
    // "Pupper/assets/CarbonFiber.png",
    // "Pupper/assets/CarbonFiber2D.png",
    // "Pupper/assets/CLS6336HV.png",
    // "Pupper/assets/Concrete.png",
    // "Pupper/assets/Fir.png",
    // "Pupper/assets/Fir2D.png",
    "Pupper/assets/GIM4305_Mounting_Disc.stl",
    "Pupper/assets/GIM4305_Servo_Motor.stl",
    "Pupper/assets/GIM4305_Tab_Connector.stl",
    "Pupper/assets/LegAssemblyForFlangedv26.001.stl",
    "Pupper/assets/LegAssemblyForFlangedv26.002.stl",
    "Pupper/assets/LegAssemblyForFlangedv26.003.stl",
    "Pupper/assets/Lower_Leg_V6_1.obj",
    "Pupper/assets/Lower_Leg_V6_2.obj",
    // "Pupper/assets/Marble.png",
    "Pupper/assets/Oak.png",
    "Pupper/assets/Slate.png",
    "Pupper/assets/Upper_Leg_0.obj",
    "Pupper/assets/Upper_Leg_1.obj",
    "scene.xml",
    "shadow_hand/assets/f_distal_pst.obj",
    "shadow_hand/assets/f_knuckle.obj",
    "shadow_hand/assets/f_middle.obj",
    "shadow_hand/assets/f_proximal.obj",
    "shadow_hand/assets/forearm_0.obj",
    "shadow_hand/assets/forearm_1.obj",
    "shadow_hand/assets/forearm_collision.obj",
    "shadow_hand/assets/lf_metacarpal.obj",
    "shadow_hand/assets/mounting_plate.obj",
    "shadow_hand/assets/palm.obj",
    "shadow_hand/assets/th_distal_pst.obj",
    "shadow_hand/assets/th_middle.obj",
    "shadow_hand/assets/th_proximal.obj",
    "shadow_hand/assets/wrist.obj",
    "shadow_hand/left_hand.xml",
    "shadow_hand/right_hand.xml",
    "shadow_hand/scene_left.xml",
    "shadow_hand/scene_right.xml",
    "simple.xml",
    "slider_crank.xml",
    "model_with_tendon.xml",
  ];

  let requests = allFiles.map((url) => fetch("./examples/scenes/" + url));
  let responses = await Promise.all(requests);
  for (let i = 0; i < responses.length; i++) {
      let split = allFiles[i].split("/");
      let working = '/working/';
      for (let f = 0; f < split.length - 1; f++) {
          working += split[f];
          if (!mujoco.FS.analyzePath(working).exists) { mujoco.FS.mkdir(working); }
          working += "/";
      }

      if (allFiles[i].endsWith(".png") || allFiles[i].endsWith(".stl") || allFiles[i].endsWith(".skn")) {
          mujoco.FS.writeFile("/working/" + allFiles[i], new Uint8Array(await responses[i].arrayBuffer()));
      } else {
          mujoco.FS.writeFile("/working/" + allFiles[i], await responses[i].text());
      }
  }
}

/** Access the vector at index, swizzle for three.js, and apply to the target THREE.Vector3
 * @param {Float32Array|Float64Array} buffer
 * @param {number} index
 * @param {THREE.Vector3} target */
export function getPosition(buffer, index, target, swizzle = true) {
  if (swizzle) {
    return target.set(
       buffer[(index * 3) + 0],
       buffer[(index * 3) + 2],
      -buffer[(index * 3) + 1]);
  } else {
    return target.set(
       buffer[(index * 3) + 0],
       buffer[(index * 3) + 1],
       buffer[(index * 3) + 2]);
  }
}

/** Access the quaternion at index, swizzle for three.js, and apply to the target THREE.Quaternion
 * @param {Float32Array|Float64Array} buffer
 * @param {number} index
 * @param {THREE.Quaternion} target */
export function getQuaternion(buffer, index, target, swizzle = true) {
  if (swizzle) {
    return target.set(
      -buffer[(index * 4) + 1],
      -buffer[(index * 4) + 3],
       buffer[(index * 4) + 2],
      -buffer[(index * 4) + 0]);
  } else {
    return target.set(
       buffer[(index * 4) + 0],
       buffer[(index * 4) + 1],
       buffer[(index * 4) + 2],
       buffer[(index * 4) + 3]);
  }
}

/** Converts this Vector3's Handedness to MuJoCo's Coordinate Handedness
 * @param {THREE.Vector3} target */
export function toMujocoPos(target) { return target.set(target.x, -target.z, target.y); }

/** Standard normal random number generator using Box-Muller transform */
export function standardNormal() {
  return Math.sqrt(-2.0 * Math.log( Math.random())) *
         Math.cos ( 2.0 * Math.PI * Math.random()); }

