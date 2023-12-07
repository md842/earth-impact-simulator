import {defs, tiny} from './dependencies/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Material, Texture, Shape, Scene,
} = tiny;

const {Obj_Shape} = defs;

export default class Fragment{
    constructor() {
        this.shapes = {
          fragments: [new Obj_Shape("./assets/fragment1.obj"), new Obj_Shape("./assets/fragment2.obj"), 
                      new Obj_Shape("./assets/fragment3.obj"), new Obj_Shape("./assets/fragment4.obj"), 
                      new Obj_Shape("./assets/fragment5.obj"), new Obj_Shape("./assets/fragment6.obj"), 
                      new Obj_Shape("./assets/fragment7.obj")],
        };

        this.materials = {
            fragment: new Material(new defs.Phong_Shader(), {
                color: color(.5, .5, .5, 1),
                ambient: .3, diffusivity: .5, specularity: .5,
            })
        }
        this.fragment_index = [];
        this.randomize = true;
        this.fragment_displacement = 1;
    }

    render(context, program_state, model_transform=Mat4.identity(), size = 1, spawn_num = 0, speed = 1, reset = false, t) {
        if(reset){
            this.randomize = true;
            this.fragment_displacement = 1;
        }
        let center_transform = model_transform.times(Mat4.scale(size, size, size));
        this.fragment_displacement += speed;
        if(this.randomize){
            this.fragment_index = [];
            for(let i = 0; i < spawn_num; i++)
                this.fragment_index.push(Math.floor(Math.random() * 7));
        }
        for(let i = 0; i < spawn_num; i++){
            if(this.randomize)
                center_transform = center_transform.times(Mat4.rotation(Math.random(), Math.random(), Math.random(), Math.random()));
            let theta = 2 * Math.PI * (i+1) * (1 - Math.sqrt(5));;
            let phi = Math.acos(1 - 2 * (i+1) / spawn_num);
            let radius = 6.7;
            let x = radius * Math.sin(phi) * Math.cos(theta);
            let y = radius * Math.sin(phi) * Math.sin(theta);
            let z = radius * Math.cos(phi);
            let rock_transform = center_transform.times(Mat4.translation(x*this.fragment_displacement, y*this.fragment_displacement, z*this.fragment_displacement));
            if (i%2 == 0)
                rock_transform = rock_transform.times(Mat4.rotation(t, 0, 0, t));
            else
                rock_transform = rock_transform.times(Mat4.rotation(-t, 0, 0, 1));
            this.shapes.fragments[this.fragment_index[i]].draw(context, program_state, rock_transform, this.materials.fragment);
        }
        this.randomize = false;
    }
}