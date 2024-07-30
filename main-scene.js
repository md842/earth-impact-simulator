import {defs, tiny} from './dependencies/common.js';
import {Simulation} from "./simulation.js";

// Pull these names into this module's scope for convenience:
const {Vector, Vector3, vec, vec3, vec4, color, Matrix, Mat4, Light, Shape,
       Material, Shader, Texture, Scene, Canvas_Widget} = tiny;

// (Can define Main_Scene's class here)
const Main_Scene = Simulation;

export {Main_Scene, Canvas_Widget, defs}