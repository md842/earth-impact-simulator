import {defs, tiny} from './dependencies/common.js';
import Fragment from './fragment.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Material, Texture, Shape, Scene,
} = tiny;

const {Textured_Phong} = defs

export class FinalProject extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            s5: new defs.Subdivision_Sphere(5),
        };

        this.fragment = new Fragment();

        this.scale = 3.0; // For Michelle

        this.launch = this.hit = this.reset = this.destroy = this.cratered = false;
        this.projectile_speed = 100000;
        this.projectile_pos = 10 * this.scale;
        this.projectile_size = 500000;

        this.textures = [new Texture("assets/projectile/apple.jpg"), new Texture("assets/projectile/discoball.jpg"),
            new Texture("assets/projectile/greenmarble.jpg"), new Texture("assets/projectile/lemon.jpg"),
            new Texture("assets/projectile/pokeball.png"), new Texture("assets/projectile/masterball.png"),
            new Texture("assets/projectile/yarn.jpg"), new Texture("assets/earth.gif"),
            new Texture("assets/projectile/8ball.png")];

        // Define the materials used to draw the Earth and its moon.
        const bump = new defs.Fake_Bump_Map(1);
        this.materials = {
            earth: new Material(bump,
                {specularity: 0.75, diffusivity: 1, ambient: 1, texture: new Texture("assets/earth.gif")}),
            cratered_earth: new Material(new Craterable_Texture(), {
                color: hex_color("#000000"),
                ambient: 1, diffusivity: 0.1, specularity: 0.1,
                texture: new Texture("assets/earth.gif", "LINEAR_MIPMAP_LINEAR")
            }),
            destroyed_earth: new Material(new defs.Phong_Shader(),
                {specularity: 0.75, diffusivity: 1, ambient: 0.25, color: hex_color("#FF0000")}),
            moon: new Material(bump,
                {specularity: 0.75, diffusivity: 1, ambient: 1, texture: new Texture("assets/moon.jpg")}),
            projectile: new Material(bump, {ambient: 1, texture: this.textures[0]}),
            stars: new Material(new defs.Phong_Shader(),
                {specularity: 0.75, diffusivity: 1, ambient: 0.25, color: hex_color("#FFFFFF")}),
        }

        this.projectile_texture = 0;

        this.initial_camera_location = Mat4.look_at(vec3(6, 2 * this.scale, 15 * this.scale), vec3(0, 0, 0), vec3(0, 1, 0));

        this.star_transforms = [];
        this.star_colors = [hex_color("#ffa6a6"),hex_color("#ffcaa6"),hex_color("#ffeca6"),hex_color("#a6fff9"),hex_color("#a6d4ff"),hex_color("#a6b0ff")];
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.new_line();
        this.key_triggered_button("Free Camera", ["Control", "s"], () => this.attached = () => null);
        this.key_triggered_button("Projectile Camera", ["Control", "d"], () => this.attached = () => this.projectile);
        this.new_line();
        this.new_line();

        this.make_slider("Projectile Velocity (m/s):", () => this.projectile_speed = this.slider_value, 10000, 299792457, 100000);
        this.live_string(box => box.textContent = "Velocity in terms of c: " + (this.projectile_speed / 299792458).toFixed(12) + "c");
        this.new_line();
        // Lorentz factor = 1 / sqrt(1 - v^2/c^2) where c is speed of light in vacuum
        this.live_string(box => box.textContent = "Lorentz factor: Î³ = " + (1 / Math.sqrt(1 - (this.projectile_speed ** 2) / (299792458 ** 2))).toFixed(12));

        this.new_line();
        this.new_line();

        this.make_slider("Projectile Radius (m):", () => this.projectile_size = this.slider_value, 1, 6378100, 500000);
        this.live_string(box => box.textContent = "% of Earth's radius: " + (this.projectile_size / 63781).toFixed(4) + "%");

        this.new_line();
        this.new_line();
        this.key_triggered_button("Randomize Projectile", ["Control", "e"], () => this.projectile_texture = Math.floor(Math.random()*this.textures.length));
        this.live_string(box => box.textContent = this.projectile_texture);
        this.new_line();
        this.new_line();

        this.key_triggered_button("Launch Projectile", ["Control", "l"], () => this.launch = !this.launch);
        this.key_triggered_button("Reset Simulation", ["Control", "r"], () => this.reset = true);
        this.new_line();
        this.new_line();
        // Kinetic Energy = 0.5*m*v^2
        // Relativistic kinetic energy: (Lorentz factor - 1)(m_0)(c^2) where m_0 is mass at rest and c is speed of light
        this.live_string(box => box.textContent = "Projectile Energy");
        this.live_string(box => box.textContent = "- Classical Kinetic Energy: " + 0.5 * this.projectile_size * this.projectile_speed ** 2 + " Joules");
        this.live_string(box => box.textContent = "- Relativistic Kinetic Energy: " + ((1 / Math.sqrt(1 - (this.projectile_speed ** 2) / (299792458 ** 2))) - 1) * this.projectile_size * 299792458 ** 2 + " Joules");
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }

        // Define the program's lights
        program_state.lights = [new Light(vec4(0, 0, 0, 1), color(1, 1, 1, 1), 1000)];

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 10000);

        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        let model_transform = Mat4.identity();

        // EARTH
        const rotation_multiplier = 0.25; // Control the rotation speed of Earth on its axis
        let earth_transform = model_transform.times(Mat4.rotation(t * rotation_multiplier, t, t / (rotation_multiplier ** 2), 1).times(Mat4.scale(this.scale, this.scale, this.scale)));
        if(this.destroy)
            this.fragment.render(context, program_state, model_transform, 0.4, 100, 2, t); // Earth was destroyed by impact, draw with a different material
        else if (this.cratered) // Earth was cratered by impact, draw with a different material
            this.shapes.s5.draw(context, program_state, earth_transform, this.materials.cratered_earth);
        else // Earth has not been impacted, draw with base material
            this.shapes.s5.draw(context, program_state, earth_transform, this.materials.earth);
        this.earth = earth_transform;

        // MOON
        let moon_transform = earth_transform.times(Mat4.rotation(t, 0, t, 1)).times(Mat4.translation(2, 0, 0).times(Mat4.rotation(t, 0, t, 1)).times(Mat4.scale(0.1, 0.1, 0.1)));
        this.shapes.s5.draw(context, program_state, moon_transform, this.materials.moon);
        this.moon = moon_transform;

        // PROJECTILE
        let scale_factor = this.scale * this.projectile_size / 6378100.0;
        let projectile_transform = model_transform.times(Mat4.translation(0, 0, this.projectile_pos)).times(Mat4.scale(scale_factor, scale_factor, scale_factor));

        if(this.projectile_pos + scale_factor < this.scale){ // Hit detection; scale factor of Earth is 15
            this.hit = true;
            // Relativistic kinetic energy: (Lorentz factor - 1)(m_0)(c^2) where m_0 is mass at rest and c is speed of light
            let relativistic_kinetic_energy = ((1 / Math.sqrt(1 - (this.projectile_speed ** 2)/(299792458 ** 2))) - 1) * this.projectile_size * 299792458 ** 2;
            if (relativistic_kinetic_energy > 1250000000000000) // Threshold for destruction in Joules
                this.destroy = true;
            else { // Not enough energy to destroy the Earth! Draw a crater instead.
                let energy_ratio = relativistic_kinetic_energy / 1250000000000000; // Need to figure out how to pass this (and ideally also impact location) to GLSL code
                this.cratered = true;
            }
        }

        // TODO: projectile (olive, meatball, volleyball, popcorn, tennis ball, watermelon, character faces, beach ball, saturn, marble, bubble)

        if(this.reset){
            this.launch = this.hit = this.reset = this.destroy = this.cratered = false;
            this.projectile_pos = 10 * this.scale;
        }

        if (!this.hit)
            if(this.launch)
                this.projectile_pos -= this.scale * this.projectile_speed / 6378100.0; // Move projectile towards Earth based on scale factor
        this.shapes.s5.draw(context, program_state, projectile_transform, this.materials.projectile.override({ambient: 1, texture:this.textures[this.projectile_texture]})); // Draw projectile based on position; will not be drawn after impact

        // STARS
        function rand_int(min, max) {return Math.round(100 * (min + Math.random() * max)) / 100;}
        function rand_pos_neg() {return Math.random() < 0.5 ? -1 : 1;}

        let star_transform = model_transform;
        let star_count = 300;
        let star_field_min_radius = 15;     let star_field_max_radius = 40;
        let star_min_size = 0.05;           let star_max_size = 0.1;

        // call star randomizer once
        for (let i = 0; i < star_count; i++) {
            star_transform = model_transform;
            let star_scale = rand_int(star_min_size, star_max_size);
            let star_trans_x = rand_pos_neg() * rand_int(0, star_field_max_radius);
            let star_trans_y = rand_pos_neg() * rand_int(0, star_field_max_radius);
            let star_trans_z = rand_pos_neg() * rand_int(0, star_field_max_radius);
            // re-roll if point under minimum radius
            while (Math.sqrt(star_trans_x ** 2 + star_trans_y ** 2 + star_trans_z ** 2) < star_field_min_radius) {
                star_trans_x = rand_pos_neg() * rand_int(star_field_min_radius, star_field_max_radius);
                star_trans_y = rand_pos_neg() * rand_int(star_field_min_radius, star_field_max_radius);
                star_trans_z = rand_pos_neg() * rand_int(star_field_min_radius, star_field_max_radius);
            }
            star_transform = model_transform.times(Mat4.translation(star_trans_x, star_trans_y, star_trans_z)).times(Mat4.scale(star_scale,star_scale,star_scale));
            if (this.star_transforms.length < star_count) {
                this.star_transforms.push(star_transform);
            }
        }

        // draw stars
        for (let i = 0; i < star_count; i++) {
            this.shapes.s5.draw(context, program_state, this.star_transforms[i], this.materials.stars.override({color:this.star_colors[i%6]}));
        }


        // camera movement
        this.projectile = projectile_transform;

        let desired = this.initial_camera_location;
        if (this.attached === undefined) {}
        else {
            if (this.attached() == null) {
                program_state.set_camera(this.initial_camera_location.map((x,i) =>
                    Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)));
            }
            if(!!this.attached()) { desired = Mat4.inverse(this.attached().times(Mat4.translation(0,10,50)));} // Dynamic view offset
            desired.map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1));
            program_state.set_camera(desired);
        }

    }
}

class Craterable_Texture extends Textured_Phong {
    fragment_glsl_code() {
        return this.shared_glsl_code() + `
            varying vec2 f_tex_coord;
            uniform sampler2D texture;
            uniform float animation_time;
            
            void main(){
                vec4 tex_color = texture2D( texture, f_tex_coord);

                // crater_size of 2.0 covers the whole planet
                float crater_size = 0.1;

                // Draw a red crater
                if (distance(vec2(0.5, 0.5), vec2(2.0 * f_tex_coord.x, f_tex_coord.y)) < crater_size)
                    tex_color = vec4(1, 0, 0, 1.0);

                if( tex_color.w < .01 ) discard;
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( ( tex_color.xyz + shape_color.xyz ) * ambient, shape_color.w * tex_color.w ); 
                                                                         // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
        } `;
    }
}