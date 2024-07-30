/**
 * @file
 * This file defines panels that can be placed on websites to create interactive graphics programs that use tiny-graphics.js.
 */

import {tiny} from './tiny-graphics.js';

// Pull these names into this module's scope for convenience.
const {color, Scene} = tiny;

export const widgets = {};

const Canvas_Widget = widgets.Canvas_Widget =
  class Canvas_Widget {
    // **Canvas_Widget** embeds a WebGL demo onto a website in place of the given placeholder document
    // element.  It creates a WebGL canvas and loads onto it any initial Scene objects in the
    // arguments.  Optionally spawns a Text_Widget and Controls_Widget for showing more information
    // or interactive UI buttons, divided into one panel per each loaded Scene.  You can use up to
    // 16 Canvas_Widgets; browsers support up to 16 WebGL contexts per page.
    constructor(element, initial_scenes, options = {}) {
      this.element = element;

      const defaults = {show_canvas: true, make_controls: true};
      if (initial_scenes && initial_scenes[0])
        Object.assign(options, initial_scenes[0].widget_options);
      Object.assign(this, defaults, options)

      const rules = [".canvas-widget { width: 1080px; background: White; margin:auto }",
        ".canvas-widget canvas { width: 1080px; height: 600px; margin-bottom:-3px }"];

      if (document.styleSheets.length == 0) document.head.appendChild(document.createElement("style"));
      for (const r of rules) document.styleSheets[document.styleSheets.length - 1].insertRule(r, 0)

      const canvas = this.element.appendChild(document.createElement("canvas"));

      if (this.make_controls) {
        this.embedded_controls_area = this.element.appendChild(document.createElement("div"));
        this.embedded_controls_area.className = "controls-widget";
      }

      if (!this.show_canvas)
        canvas.style.display = "none";

      this.webgl_manager = new tiny.Webgl_Manager(canvas, color(0, 0, 0, 1));
      // Second parameter sets background color.

      // Add scenes and child widgets
      if (initial_scenes)
        this.webgl_manager.scenes.push(...initial_scenes);

      if (this.make_controls)
        this.embedded_controls = new Controls_Widget(this.embedded_controls_area, this.webgl_manager.scenes);

      // Start WebGL initialization.  Note that render() will re-queue itself for continuous calls.
      this.webgl_manager.render();
    }
  }


const Controls_Widget = widgets.Controls_Widget =
  class Controls_Widget {
    // **Controls_Widget** adds an array of panels to the document, one per loaded
    // Scene object, each providing interactive elements such as buttons with key
    // bindings, live readouts of Scene data members, etc.
    constructor(element, scenes) {
      const rules = [
        ".controls-widget * { font-family: monospace }",
        ".controls-widget div { background: White }",
        ".controls-widget table { border-collapse: collapse; display:block; overflow-x: auto; table-layout: fixed;}",
        ".controls-widget table.control-box { width: 1080px; border:1px; margin:0; max-height:380px; " +
        "transition:.5s; overflow-y:scroll; background:white }",
        ".controls-widget table.control-box:hover { max-height:500px }",
        ".controls-widget table.control-box td { overflow:hidden; border:1px; background:Black; border-radius:10px; width: 540px;}",
        ".controls-widget table.control-box td .control-div { background: White; height:338px; padding: 5px 5px 5px 30px; }",
        ".controls-widget table.control-box td * { background:transparent }",
        ".controls-widget table.control-box .control-div td { border-radius:unset }",
        ".controls-widget table.control-box .control-title { padding:7px 40px; color:white; background:#252424;}",
        ".controls-widget *.live_string { display:inline-block; background:unset }",
        ".dropdown { display:inline-block }",
        ".dropdown-content { display:inline-block; transition:.2s; transform: scaleY(0); overflow:hidden; position: absolute; \
                              z-index: 1; background:#E8F6FF; padding: 16px; margin-left:30px; min-width: 100px; \
                              border-radius:10px }",
        ".dropdown-content a { color: black; padding: 4px 4px; display: block }",
        ".dropdown a:hover { background: #f1f1f1 }",
        ".controls-widget button { background: #303030; color: white; padding: 3px; border-radius:5px; \
                                    transition: background .3s, transform .3s }",
        ".controls-widget button:hover, button:focus { transform: scale(1.1); color:#FFFFFF }",
        ".link { text-decoration:underline; cursor: pointer }",
        ".show { transform: scaleY(1); height:200px; overflow:auto }",
        ".hide { transform: scaleY(0); height:0px; overflow:hidden  }"
      ];

      const style = document.head.appendChild(document.createElement("style"));
      for (const r of rules) document.styleSheets[document.styleSheets.length - 1].insertRule(r, 0)

      const table = element.appendChild(document.createElement("table"));
      table.className = "control-box";
      this.row = table.insertRow(0);

      this.panels = [];
      this.scenes = scenes;

      this.render();
    }

    make_panels(time){
      this.timestamp = time;
      this.row.innerHTML = "";
      // Traverse all scenes and their children, recursively:
      const open_list = [...this.scenes];
      while (open_list.length) {
        open_list.push(...open_list[0].children);
        const scene = open_list.shift();

        const control_box = this.row.insertCell();
        this.panels.push(control_box);
        // Draw top label bar:
        control_box.appendChild(Object.assign(document.createElement("div"), {
          textContent: scene.control_panel_name, className: "control-title"
        }))

        const control_panel = control_box.appendChild(document.createElement("div"));
        control_panel.className = "control-div";
        scene.control_panel = control_panel;
        scene.timestamp = time;
        // Draw each registered animation:
        scene.make_control_panel();
      }
    }

    render(time = 0) {
      // Check to see if we need to re-create the panels due to any scene being new.
      // Traverse all scenes and their children, recursively:
      const open_list = [...this.scenes];
      while (open_list.length) {
        open_list.push(...open_list[0].children);
        const scene = open_list.shift();
        if (!scene.timestamp || scene.timestamp > this.timestamp) {
          this.make_panels(time);
          break;
        }

        // TODO: Check for updates to each scene's desired_controls_position, including if the
        // scene just appeared in the tree, in which case call make_control_panel().
      }

      for (let panel of this.panels)
        for (let live_string of panel.querySelectorAll(".live_string")) live_string.onload(live_string);
      // TODO: Cap this so that it can't be called faster than a human can read?
      this.event = window.requestAnimFrame(this.render.bind(this));
    }
  }