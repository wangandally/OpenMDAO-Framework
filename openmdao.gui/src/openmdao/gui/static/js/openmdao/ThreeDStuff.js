/* 
Copyright (c) 2010. All rights reserved.
LICENSE: NASA Open Source License
*/

var openmdao = (typeof openmdao == "undefined" || !openmdao ) ? {} : openmdao ; 

/**
 * 
 * @version 0.0.0
 * @constructor
 */
openmdao.ThreeDStuff = function(id,model) {
    /***********************************************************************
     *  private (available only to privileged methods) 
     ***********************************************************************/
     
    var self = this,
        canvas = jQuery("#"+id)

    var vshader_src = "<script id='vshader' type='x-shader/x-vertex'>"
            + "uniform mat4 u_modelViewProjMatrix;"
            + "uniform mat4 u_normalMatrix;"
            + "uniform vec3 lightDir;"
            + ""
            + "attribute vec3 vNormal;"
            + "attribute vec4 vColor;"
            + "attribute vec4 vPosition;"
            + ""
            + "varying float v_Dot;"
            + "varying vec4 v_Color;"
            + ""
            + "void main() {"
            + "    gl_Position = u_modelViewProjMatrix * vPosition;"
            + "    v_Color = vColor;"
            + "    vec4 transNormal = u_normalMatrix * vec4(vNormal, 1);"
            + "    v_Dot = max(dot(transNormal.xyz, lightDir), 0.0);"
            + "}"
            + "</script>"

    var fshader_src = "<script id='fshader' type='x-shader/x-fragment'>"
            + "#ifdef GL_ES\n"
            + "    precision mediump float;\n"
            + "#endif\n"
            + ""
            + "    varying float v_Dot;"
            + "    varying vec4 v_Color;"
            + ""
            + "    void main() {"
            + "        gl_FragColor = vec4(v_Color.xyz * v_Dot, v_Color.a);"
            + "    }"
            + "</script>"
    
    function init() {
        // initWebGL wants these functions as script elements in the DOM
        jQuery(vshader_src).appendTo("body")
        jQuery(fshader_src).appendTo("body")
        
        // Initialize
        var gl = initWebGL(
            // The id of the Canvas Element
            id,
            // The ids of the vertex and fragment shaders
            "vshader", "fshader",
            // The vertex attribute names used by the shaders.
            // The order they appear here corresponds to their index
            // used later.
            [ "vNormal", "vColor", "vPosition"],
            // The clear color and depth values
            [ 0, 0, 0, 1 ], 10000);
        if (!gl) {
          return;
        }

        gl.console.log("Starting init...");

        // Set up a uniform variable for the shaders
        gl.uniform3f(gl.getUniformLocation(gl.program, "lightDir"), 0, 0, 1);

        // Create a box. On return 'gl' contains a 'box' property with
        // the BufferObjects containing the arrays for vertices,
        // normals, texture coords, and indices.
        gl.box = makeBox(gl);

        // Set up the array of colors for the cube's faces
        var colors = new Uint8Array(
            [  0, 0, 1, 1,   0, 0, 1, 1,   0, 0, 1, 1,   0, 0, 1, 1,     // v0-v1-v2-v3 front
               1, 0, 0, 1,   1, 0, 0, 1,   1, 0, 0, 1,   1, 0, 0, 1,     // v0-v3-v4-v5 right
               0, 1, 0, 1,   0, 1, 0, 1,   0, 1, 0, 1,   0, 1, 0, 1,     // v0-v5-v6-v1 top
               1, 1, 0, 1,   1, 1, 0, 1,   1, 1, 0, 1,   1, 1, 0, 1,     // v1-v6-v7-v2 left
               1, 0, 1, 1,   1, 0, 1, 1,   1, 0, 1, 1,   1, 0, 1, 1,     // v7-v4-v3-v2 bottom
               0, 1, 1, 1,   0, 1, 1, 1,   0, 1, 1, 1,   0, 1, 1, 1 ]    // v4-v7-v6-v5 back
                                                );

        // Set up the vertex buffer for the colors
        gl.box.colorObject = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.box.colorObject);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

        // Create some matrices to use later and save their locations in the shaders
        gl.mvMatrix = new J3DIMatrix4();
        gl.u_normalMatrixLoc = gl.getUniformLocation(gl.program, "u_normalMatrix");
        gl.normalMatrix = new J3DIMatrix4();
        gl.u_modelViewProjMatrixLoc =
                gl.getUniformLocation(gl.program, "u_modelViewProjMatrix");
        gl.mvpMatrix = new J3DIMatrix4();

        // Enable all of the vertex attribute arrays.
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);

        // Set up all the vertex attributes for vertices, normals and colors
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.box.vertexObject);
        gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.box.normalObject);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.box.colorObject);
        gl.vertexAttribPointer(1, 4, gl.UNSIGNED_BYTE, false, 0, 0);

        // Bind the index array
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.box.indexObject);

        return gl;
    }

    width = -1;
    height = -1;

    function reshape(gl) {
        //var canvas = document.getElementById('example');
        var windowWidth = window.innerWidth - 20;
        var windowHeight = window.innerHeight - 40;
        if (windowWidth == width && windowHeight == height)
            return;

        width = windowWidth;
        height = windowHeight;
        canvas.width = width;
        canvas.height = height;

        // Set the viewport and projection matrix for the scene
        gl.viewport(0, 0, width, height);
        gl.perspectiveMatrix = new J3DIMatrix4();
        gl.perspectiveMatrix.perspective(30, width/height, 1, 10000);
        gl.perspectiveMatrix.lookat(0, 0, 7, 0, 0, 0, 0, 1, 0);
    }

    function drawPicture(gl) {
        // Make sure the canvas is sized correctly.
        reshape(gl);

        // Clear the canvas
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Make a model/view matrix.
        gl.mvMatrix.makeIdentity();
        gl.mvMatrix.rotate(20, 1,0,0);
        gl.mvMatrix.rotate(currentAngle, 0,1,0);

        // Construct the normal matrix from the model-view matrix and pass it in
        gl.normalMatrix.load(gl.mvMatrix);
        gl.normalMatrix.invert();
        gl.normalMatrix.transpose();
        gl.normalMatrix.setUniform(gl, gl.u_normalMatrixLoc, false);

        // Construct the model-view * projection matrix and pass it in
        gl.mvpMatrix.load(gl.perspectiveMatrix);
        gl.mvpMatrix.multiply(gl.mvMatrix);
        gl.mvpMatrix.setUniform(gl, gl.u_modelViewProjMatrixLoc, false);

        // Draw the cube
        gl.drawElements(gl.TRIANGLES, gl.box.numIndices, gl.UNSIGNED_BYTE, 0);

        // Show the framerate
        //framerate.snapshot();

        currentAngle += incAngle;
        if (currentAngle > 360)
            currentAngle -= 360;
    }

    function start() {
        //var c = document.getElementById("example");
        var c = canvas
        var w = Math.floor(window.innerWidth * 0.9);
        var h = Math.floor(window.innerHeight * 0.9);

        c.width = w;
        c.height = h;

        var gl = init();
        if (!gl) {
          return;
        }
        currentAngle = 0;
        incAngle = 0.5;
        //framerate = new Framerate("framerate");
        var f = function() {
            window.requestAnimFrame(f, c);
            drawPicture(gl);
        };
        f();
    }
 
    start()
}