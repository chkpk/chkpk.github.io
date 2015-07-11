var time00 = new Date().getTime();
var layouting = true;
var gl,info,total_nodes,total_links;

var mouseDown = false, spin = true, dragNode = false, dragSence = false, marquee = false, pause = false,
mouseLastX = window.innerWidth/2 ,mouseLastY = window.innerHeight / 2, //拖拽视角
marqueeX1,marqueeX2,marqueeY1,marqueeY2,//矩形选框
moveX,moveY,wheelSpeeed = 1.0,lastTime = 0,
zTran = 10000.0, yRot = 0, yTran = 0, yRot1 = 0;

var vertexPositionBuffer;               // 节点坐标缓存
var vertexSizeBuffer;                   // 节点大小（连接数）缓存
var lineVertexPositionBuffer;           // 连线坐标缓存
var headLightBuffer;                    // 高亮连线坐标缓存
var headLightColorBuffer;               // 高亮连线颜色缓存

var vertexSize = [];                    //节点大小
var vertices = [];                      // 节点坐标（一维）
var lineVertex = [];                    // 连线坐标
var headLightVertex = [];               //  高亮连线坐标
var headLightColor = [];                // 高亮颜色
var asNumText = [];
var asNumTextColor = [];
var lineVertexIndex = [];               // 连线坐标索引

var nodes = [];                         //节点信息 
var nodes_hash = [];                    //节点id到下标的转换表
var pos = [];                           // 髙维嵌入法计算出的3维坐标
var pos_hash = [];
var linksMax = 0;
var debug = 1;                          // 
var multi = false;
var autoLayout = false;
var alpha = 0.5;

//========== shaders ===========
function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    //console.log(str);
    str = modifyShaderColor(id,str);
    //console.log(str);
    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function modifyShaderColor(id,str){
    if (id == 'node-shader-fs'){
        return str;
    }
    if (id == 'line-shader-fs'){
        return str;
    }
    if (id == 'headlight-shader-fs'){
        return str;
    }
    return str;
}

var lineShaderModify;
var nodeShaderModify;
var headLightShadeModify;

var lineShaderProgram;
var nodeShaderProgram;
var headLightShadeProgram;
var currentShaderProgram;

function initLineShaders() {
    var fragmentShader = getShader(gl, "line-shader-fs");
    var vertexShader = getShader(gl, "line-shader-vs");

    lineShaderProgram = gl.createProgram();
    gl.attachShader(lineShaderProgram, vertexShader);
    gl.attachShader(lineShaderProgram, fragmentShader);
    gl.linkProgram(lineShaderProgram);

    if (!gl.getProgramParameter(lineShaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise line shaders");
    }

    //gl.useProgram(lineShaderProgram);

    lineShaderProgram.vertexPositionAttribute = gl.getAttribLocation(lineShaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(lineShaderProgram.vertexPositionAttribute);

    lineShaderProgram.pMatrixUniform = gl.getUniformLocation(lineShaderProgram, "uPMatrix");
    lineShaderProgram.mvMatrixUniform = gl.getUniformLocation(lineShaderProgram, "uMVMatrix");
}

function initHeadLightShaders() {
    var fragmentShader = getShader(gl, "headlight-shader-fs");
    var vertexShader = getShader(gl, "headlight-shader-vs");

    headLightShadeProgram = gl.createProgram();
    gl.attachShader(headLightShadeProgram, vertexShader);
    gl.attachShader(headLightShadeProgram, fragmentShader);
    gl.linkProgram(headLightShadeProgram);

    if (!gl.getProgramParameter(headLightShadeProgram, gl.LINK_STATUS)) {
        alert("Could not initialise headlight shaders");
    }

    //gl.useProgram(headLightShadeProgram);

    headLightShadeProgram.vertexColorAttribute = gl.getAttribLocation(headLightShadeProgram,"aVertexColor");
    gl.enableVertexAttribArray(headLightShadeProgram.vertexColorAttribute);
    
    headLightShadeProgram.vertexPositionAttribute = gl.getAttribLocation(headLightShadeProgram, "aVertexPosition");
    gl.enableVertexAttribArray(headLightShadeProgram.vertexPositionAttribute);

    headLightShadeProgram.pMatrixUniform = gl.getUniformLocation(headLightShadeProgram, "uPMatrix");
    headLightShadeProgram.mvMatrixUniform = gl.getUniformLocation(headLightShadeProgram, "uMVMatrix");
}

function initNodeShaders() {
    var fragmentShader = getShader(gl, "node-shader-fs");
    var vertexShader = getShader(gl, "node-shader-vs");

    nodeShaderProgram = gl.createProgram();
    gl.attachShader(nodeShaderProgram, vertexShader);
    gl.attachShader(nodeShaderProgram, fragmentShader);
    gl.linkProgram(nodeShaderProgram);

    if (!gl.getProgramParameter(nodeShaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise node shaders");
    }

    //gl.useProgram(nodeShaderProgram);

    nodeShaderProgram.vertexPositionAttribute = gl.getAttribLocation(nodeShaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(nodeShaderProgram.vertexPositionAttribute);
    
    nodeShaderProgram.vertexSizeAttribute = gl.getAttribLocation(nodeShaderProgram,"aVertexSize");
    gl.enableVertexAttribArray(nodeShaderProgram.vertexSizeAttribute);

    nodeShaderProgram.pMatrixUniform = gl.getUniformLocation(nodeShaderProgram, "uPMatrix");
    nodeShaderProgram.mvMatrixUniform = gl.getUniformLocation(nodeShaderProgram, "uMVMatrix");
    nodeShaderProgram.samplerUniform = gl.getUniformLocation(nodeShaderProgram, "uSampler");
}

//========= texture =========
function handleLoadedTexture(texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

var nodeTexture;
//var textTexture;

function initNodeTexture() {
    nodeTexture = gl.createTexture();
    nodeTexture.image = new Image();
    nodeTexture.image.onload = function () {
        handleLoadedTexture(nodeTexture)
    }

    nodeTexture.image.src = "images/sphere.png";
}

var mvMatrix ;
var pMatrix ;

(function() {
    var lastTime1 = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = 
          window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime1));
            var id2 = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime1 = currTime + timeToCall;
            return id2;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id2) {
            clearTimeout(id2);
        };
}());

//===========auto spin============
var requestId = null;
var lastTime = 0;
function animate() {
    var timeNow = new Date().getTime();
    if (lastTime != 0) {
        var elapsed = timeNow - lastTime;

        yRot += (10 * elapsed) / 1000.0;
    }
    lastTime = timeNow;
}

//============draw loop===============
function tick() {
    //okRequestAnimationFrame(tick);
    requestId = window.requestAnimationFrame(tick);
    drawScene();
    if (spin)
        animate();
    //stats.update();
}

//======= main ========
function webGLStart() {

    //initGL(canvas);
    initNodeTexture();
    initLineShaders();
    initHeadLightShaders();
    initNodeShaders();  
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    //gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.frontFace( gl.CCW );
    gl.cullFace( gl.BACK );
    gl.enable( gl.CULL_FACE );
    
    
    gl.enable( gl.BLEND );
    gl.blendEquation( gl.FUNC_ADD );
    gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );

}

//========= mouse event =========

var selected = null;
var tree_peer = null;
var selectedMulti = [];

function onMouseDown(event) {
    
    event.preventDefault();
    event.stopPropagation();
    mouseLastX = event.clientX;
    mouseLastY = event.clientY;
    
    info.clearRect(0, 0, 900, 550);
    if (event.button == 2 ) {
        if (spin)
            yRot1 = yRot;
        else
            yRot = yRot1;
        lastTime = new Date().getTime();
        spin = !spin;
    }else{
            
        var result = pickUp(event.clientX-10,event.clientY-34-25); 
        
        if (result > -1 )
        {
            dragNode = true;
            selected = result;
            if (!multi){
                headLightNode(selected);
            }else{
                //headLightMulti(result);
            }
        }else{
            if (spin)
                return;
                            
            if (marquee){//矩形框多选 未实现
                marqueeX1 = mouseLastX;
                marqueeY1 = mouseLastY;
            }else{ //拖拽视角
                dragSence = true;               
            }
            
        }   
    }
}

function onMouseUp(event) {
    
    //if (marquee && 
    dragNode = false;
    dragSence = false;
    marquee = false;
    event.preventDefault();
    event.stopPropagation();
}

function onMouseMove(event) {

    event.preventDefault();
    event.stopPropagation();
    
    if (!spin) {

        var mat = okMat4Mul(pMatrix,mvMatrix);
        
        if (dragNode){
            var newVec = to3d(mat,event.clientX-10,event.clientY-34-25,selected);       
            modify(selected,newVec);
            loadBuffer();
            headLightNode(selected);
            tree_select(nodes[selected].id);
            
        }else if (dragSence && !marquee){  //拖拽视角
            var deltaX = ( mouseLastX - event.clientX ) ;
            var deltaY = ( event.clientY - mouseLastY ) ;
            yRot -= deltaX * (zTran + 1000)/1000* 0.15;
            yTran -= deltaY * (zTran + 1000) / 1000  * 1.0;
            lastTime = new Date().getTime();
            yRot1 = yRot;       
        }else if(!dragSence && marquee){//矩形选框
            //重绘矩形选框，修改被选中的节点？
            //if 
        }
    }   
    mouseLastX = event.clientX;
    mouseLastY = event.clientY;
}

function onMouseWheel( event ) {

    event.preventDefault();
    event.stopPropagation();
    
    var moveZ = 0;
    // WebKit

    if ( event.wheelDeltaY ) {

        moveZ = event.wheelDeltaY * wheelSpeeed;

    // Opera / Explorer 9

    } else if ( event.wheelDelta ) {

        moveZ = event.wheelDelta * wheelSpeeed;

    // Firefox

    } else if ( event.detail ) {

        moveZ = event.detail * wheelSpeeed*100;

    }

    zTran -= moveZ * (zTran+1000) *0.0001;
    if (zTran < 0) 
        zTran = 0;
    //write_text(selected);
    
}

//==========3d to 2d ============
function to2d(mat,index){
    var x,y,pos0 = pos[index];
    var vec  = new okVec4(pos0[0],pos0[1],pos0[2], 1.0);
    var pos1 = okMat4MulVec4(mat, vec);
    x = (pos1.x / pos1.w + 1) / 2 * gl.viewportWidth;
    y = (1- pos1.y / pos1.w ) / 2 * gl.viewportHeight;
    return {x:x,y:y};
}

//==========2d to 3d ===========
function to3d(mat,x,y,index){
    x = x/gl.viewportWidth * 2 - 1, 
    y = 1- 2* y/gl.viewportHeight;
    var pos0 = pos[index];
    //var textX = event.clientX-10,  textY = event.clientY-34-25;
    var vec  = new okVec4(pos0[0],pos0[1],pos0[2],1.0);
    var pos1 = okMat4MulVec4(mat, vec);
    pos1.x = x * pos1.w;
    pos1.y = y * pos1.w;
    return okMat4MulVec4(mat.inverse(),pos1);
}

//=========pick node ========
function pickUp(x,y){

    x += 5;
    y += 53;
    
    var result = -1;
    var vec  = new okVec4();
    var mat = okMat4Mul(pMatrix,mvMatrix);
    var min = 0.0004, minW = 10000000, pos1,dis,dx,dy;

    x = x/gl.viewportWidth * 2 - 1, 
    y = 1- 2* y/gl.viewportHeight;
    for (var i = 0, l = pos.length; i< total_nodes; i++)
    {
        if (!nodeFilter(i))
            continue;
        vec.set(pos[i][0],pos[i][1],pos[i][2], 1.0);
        pos1 = okMat4MulVec4(mat, vec);
        dx = pos1.x / pos1.w -x;
        dy = pos1.y / pos1.w -y;
        dis = dx * dx + dy * dy;
        if ( dis < min && pos1.w < minW)
        {
            minW = pos1.w;
            result = i;
        }
    }
    
    return result;
}

function handleKeyDown(event) {

        //layout10()
}
//========= headlight & synchronization=======
var vColors;
var sColors;
        
function clearAll(type){
    
    gl.deleteBuffer(vertexPositionBuffer);              // 节点坐标缓存
    gl.deleteBuffer(vertexSizeBuffer);                  // 节点大小（连接数）缓存
    gl.deleteBuffer(lineVertexPositionBuffer);          // 连线坐标缓存引
    gl.deleteBuffer(headLightBuffer);                   // 高亮连线坐标缓存
    gl.deleteBuffer(headLightColorBuffer);              // 高亮连线颜色缓存
    
    pos_hash.length = 0;
    vertices.length = 0;                    // 节点坐标（一维）
    lineVertex.length = 0;                  // 连线坐标
    lineVertexIndex.length = 0;             // 连线坐标索引
    vertexSize.length = 0;                  //节点大小
    headLightVertex.length = 0;             //  高亮连线坐标
    headLightColor.length = 0;              // 高亮颜色
    
    selected = null;
    tree_peer = null;
    
    if (type == "filter" || "layout") 
        return;
        
    pos.length = 0;                         
    
    if (type == "layout")
        return;

    nodes.length = 0;                   
    nodes_hash.length = 0;              

    
    
}

//========add headlight data to buffer ========
function addHeadLight(node1,node2,c1,c2){
    var pos1 = pos[node1];
    var pos2 = pos[node2];
    var color1 = vColors[c1];
    var color2 = vColors[c2];
    
    headLightVertex.push(pos1[0]);
    headLightVertex.push(pos1[1]);
    headLightVertex.push(pos1[2]);
    headLightColor.push(color1[0]);
    headLightColor.push(color1[1]);
    headLightColor.push(color1[2]);
    headLightColor.push(color1[3]);

    headLightVertex.push(pos2[0]);
    headLightVertex.push(pos2[1]);
    headLightVertex.push(pos2[2]);
    headLightColor.push(color2[0]);
    headLightColor.push(color2[1]);
    headLightColor.push(color2[2]);
    headLightColor.push(color2[3]);

    pos1 = null;
    pos2 = null;
    color1 = null;
    color2 = null;
}

//========witer text over webgl context =============
function writeText(){
    
    info.clearRect(0, 0, 900, 550);
    
    var mat = okMat4Mul(pMatrix,mvMatrix);
    
    if (asNumText.length == 0)
        return;
    
    var xy;
    for (var i = 0, l = asNumText.length; i < l; i++){
        xy = to2d(mat,asNumText[i]);
        info.fillStyle = sColors[asNumTextColor[i]];
        //info.fillStyle = colors[asNumTextColor[i]];
        info.fillText(nodes[ asNumText[i] ].id,xy.x,xy.y);
    }   
}

//=====prepare headlight data for the selected node and its neighbours========= 
function headLightNode(index){

    if (!nodeFilter(index)) 
        return;
        
    headLightVertex.length = 0;
    headLightColor.length = 0;
    gl.deleteBuffer(headLightBuffer);
    gl.deleteBuffer(headLightColorBuffer);
    
    asNumText.length = 0;
    asNumTextColor.length = 0;
    
    asNumText.push(index);
    //asNumTextColor.push("yellow");
    asNumTextColor.push("CENTRAL_NODE_TEXT_COLOR");

    for(var i = 0, l = nodes[index].lf,links = nodes[index].fromLinks; i < l; i++){
        
        
        var peer = links[i];
        
        if (!nodeFilter(peer)) 
            continue;
            
        //addHeadLight(index,peer,"red","green");
        addHeadLight(index,peer,"FROM_NODE_COLOR","TO_NODE_COLOR");
        
        //if (nodes[index].l> 20)
        //  continue;   
        
        asNumText.push(peer);
        //asNumTextColor.push("green");
        asNumTextColor.push("TO_TEXT_COLOR");
        
    }
    
    for(var i = 0, l = nodes[index].lt,links = nodes[index].toLinks; i < l; i++){
        
        var peer = links[i];
        
        if (!nodeFilter(peer)) 
            continue;
            
        //addHeadLight(index,peer,"green","red");
        addHeadLight(index,peer,"TO_NODE_COLOR","FROM_NODE_COLOR");
    
        //if (nodes[index].l> 20)
        //  continue;
            
        asNumText.push(peer);
        //asNumTextColor.push("red");
        asNumTextColor.push("FROM_TEXT_COLOR");
    }
    
    if (asNumText.length > 30){
        asNumText.length = 1;
        asNumTextColor.length = 1;
    }
    
    gl.deleteBuffer(headLightBuffer);
    gl.deleteBuffer(headLightColorBuffer);
    
    headLightBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, headLightBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(headLightVertex), gl.STATIC_DRAW);
    headLightBuffer.itemSize = 3;
    headLightBuffer.numItems = headLightVertex.length /3;
        
    headLightColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, headLightColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(headLightColor), gl.STATIC_DRAW);
    headLightColorBuffer.itemSize = 4;
    headLightColorBuffer.numItems = headLightColor.length / 4;
}

//=====prepare headlight data for the selected link =========
function headLightLink(from,to){

    if (!nodeFilter(from) || !nodeFilter(to) ) 
            return;
            
    headLightVertex.length = 0;
    headLightColor.length = 0;
    gl.deleteBuffer(headLightBuffer);
    gl.deleteBuffer(headLightColorBuffer);
    
    asNumText.length = 0;
    asNumTextColor.length = 0;
    
    //addHeadLight(from,to,"red","green");
    addHeadLight(from,to,"FROM_NODE_COLOR","TO_NODE_COLOR");
    
    asNumText.push(from);
    //asNumTextColor.push("red");
    asNumTextColor.push("FROM_TEXT_COLOR");
    
    asNumText.push(to);
    //asNumTextColor.push("green");
    asNumTextColor.push("TO_TEXT_COLOR");
    
    headLightBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, headLightBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(headLightVertex), gl.STATIC_DRAW);
    headLightBuffer.itemSize = 3;
    headLightBuffer.numItems = headLightVertex.length /3;
        
    headLightColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, headLightColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(headLightColor), gl.STATIC_DRAW);
    headLightColorBuffer.itemSize = 4;
    headLightColorBuffer.numItems = headLightColor.length / 4;
}

//=====modify the position when a node is dragged======
function modify(index, v){
    //依次修改缓存
    
    //console.log("in modify");     
    pos[index] = [v.x,v.y,v.z];
    //pos[index] = pos[index];
    var i = pos_hash[index];
    vertices[i] = v.x;
    vertices[i + 1] = v.y;
    vertices[i + 2] = v.z;
    
    
    var t = lineVertexIndex.length;
    for (var i = 0; i < t; i++)
        if (lineVertexIndex[i] == index) 
        {
            lineVertex[ i * 3 ] = v.x;
            lineVertex[ i * 3 + 1] = v.y;
            lineVertex[ i * 3 + 2] = v.z;
        }
}

//==========sync the selection between 3d topo and the twaver tree ======
function clearSelected(){
    selectedMulti = [];
    headLightVertex.length = 0;
    headLightColor.length = 0;
    gl.deleteBuffer(headLightBuffer);
    gl.deleteBuffer(headLightColorBuffer);
    asNumText.length = 0;
    asNumTextColor.length = 0;
}

function initMouseEvent(){
  var textLayer = textCanvas;
  textLayer.onmousedown = onMouseDown;
  //textLayer.ondblclick = onDoubleClick;
  textLayer.onmouseup = onMouseUp;
  textLayer.onmousemove = onMouseMove;
  textLayer.onmousewheel= onMouseWheel;
  textLayer.onDOMMouseScroll = onMouseWheel;
  textLayer.addEventListener( 'mousewheel', onMouseWheel, false );
  textLayer.addEventListener( 'DOMMouseScroll', onMouseWheel, false);
}

function filterChanged(obj){
  linkFilter = parseInt(obj.value);
  console.log(linkFilter);
  window.cancelAnimationFrame(requestId);
  //clearSelected();
  clearAll("filter");
  initBuffers();  
  loadBuffer();
  setTimeout(function(){  
      tick()
      },100);
}

function initWebGl() {
	  edgeCanvas = document.getElementById("can"); 
    edgeCanvas.style.position = 'absolute';
    //获取webgl Context
    try {
      gl = edgeCanvas.getContext("experimental-webgl");
      gl.viewportWidth =  edgeCanvas.width;
      gl.viewportHeight = edgeCanvas.height;
    } catch (e) {
    }
    if (!gl) {
      alert("Could not initialise WebGL, sorry :-(");
    }
	
    //添加透明的 text canvas，用来显示文字信息
    textCanvas = document.getElementById("text"); 
    textCanvas.style.position = 'absolute';

    info = textCanvas.getContext('2d');
    info.font="12pt Calibri";
    info.textAlign="central";
    info.fillStyle="#ff0000";
}

// ======= read topology data =======
function readEdgeFromServer(datas){

    if(!datas){
        conosle.log("no data");
        return;
    }

    if (datas.colors){
        vColors = datas.colors['vColors'];
        sColors = datas.colors['sColors'];
    }else{
        vColors = { 
                CENTRAL_NODE_TEXT_COLOR:    [1.0,1.0,0.0,alpha],
                FROM_NODE_COLOR:            [1.0,0.0,0.0,alpha],
                TO_NODE_COLOR:              [1.0,0.0,0.0,alpha],
                FROM_TEXT_COLOR:            [0.0,1.0,0.0,alpha],
                TO_TEXT_COLOR:              [0.0,1.0,0.0,alpha],
                MULTI_COLOR:                [0.0,1.0,1.0,alpha],
              };
              
        sColors = { 
                CENTRAL_NODE_TEXT_COLOR:    "#ffff00",
                FROM_NODE_COLOR:            "#ff0000",
                TO_NODE_COLOR:              "#ff0000",
                FROM_TEXT_COLOR:            "#00ff00",
                TO_TEXT_COLOR:              "#00ff00",
                MULTI_COLOR:                "#00ffff",
            };
    
    }

    //添加节点
    if(datas.nodes){
        total_nodes = datas.nodes.length;
        for(var result = datas.nodes, i=0, n = total_nodes; i<n; i++){         
            var newNode = {
              id: result[i].id, l :0, links:[],
              fromLinks:[], toLinks:[],
              fromClients:[], toClients:[],
              lf:0, lt:0,
              clients: {num: result[i].id, alias: result[i].alias, name: result[i].name}//, link:result[i].links}
            };
            pos[i] = [result[i].x,result[i].y,result[i].z];
            nodes.push(newNode);
            nodes_hash[newNode.id] = nodes.length-1;
        }
    }
    //console.log(nodes_hash);
    //添加连线
    if(datas.links){
        total_links = datas.links.length;
        for(var result = datas.links, i=0, n = total_links; i<n; i++){         
            var from = result[i].from;
            var to  = result[i].to;
            nodes[from].links.push(to);
            nodes[to].links.push(from);
            nodes[from].l++;
            nodes[to].l++;          
            nodes[from].fromLinks.push(to);
            nodes[to].toLinks.push(from);
            nodes[from].fromClients.push({ prefixs: 10});
            nodes[to].toClients.push({ prefixs: 10});
            nodes[from].lf++;
            nodes[to].lt++; 
        }
    }
    for (i =0 ; i < total_nodes; i++){
      nodes[i].clients.link = nodes[i].links;
      linksMax = linksMax > nodes[i].l? linksMax:nodes[i].l;
      if (nodes[i].l < 1)
        console.log(i);
    }


    //console.log(nodes);
    //console.log(pos);
}

//
var md = 50;                //高维数
var adj = 300;              //坐标系数
var e = 0.0001;             //迭代法计算特征向量时迭代结束的界限
var max_run = 20;           //迭代法计算特诊向量时迭代次数限制

//高维嵌入布局算法 未用，挪到服务器端用C++实现了。
function layout_high_dimensional_embedding(){
    var xx = [];             // 高维坐标数据
    var ss = [];             //协方差矩阵ss
    var deg = [];            // 到当前BFS中心节点的距离
    var d = [];              // 到所有中心节点的最短距离
    var q = [];              // BFS搜索 队列
    var h,t;                 // 队列头与对列尾
    
    //初始化
    for (var i = 0; i< total_nodes; i++)
        d.push(100000);
    for (var i = 0; i< total_nodes; i++){
        xx.push([]);
        if (i < md) ss.push([]);
        for (var j = 0; j < md; j++){
            xx[i].push(0);
            if (i < md) ss[i].push(0);
        }
    }

    p=0;
    for (var k = 0; k < md; k++)
    {   //广度优先搜索
        q.length = 0;
        for (var i = 0; i< total_nodes; i++)    
            deg[i] = -1;
        
        h = 0, t = 0;
        q.push(p);
        deg[p] = 0;
        t++;
        while ( h < t){
            for (var j = 0; j< nodes[ q[h] ].l; j++){
                var tmp = nodes[ q[h] ].links[j];
                if (deg[tmp] > -1) continue;
                q.push(tmp);    
                deg[ tmp ] = deg[ q[h] ] +1;
                t++;
            }
            h++;
        }

        //构造原始高维坐标数据，确定下一个坐标
        var far = 0;
        for (var i = 0; i < total_nodes; i ++)
        {
            xx[i][k] = deg[i];
            
            if (deg[i] < d[i])
                d[i]  = deg[i];
                
            if (d[i] > far){
                far  = d[i];
                p = i;
            }
        }
    }
    
    var average;
    //预处理，去平均值
    for ( var i = 0; i < md; i++){  
    
        average = 0.0;
        for (var j = 0; j < total_nodes; j++)
            average += xx[j][i] ;
        average = average / total_nodes;
        
        for (var j = 0; j < total_nodes; j++)
            xx[j][i] -= average;
    }
    
    console.log("covariance matrix ...");
    time_cov = new Date().getTime();
    
    //计算协方差矩阵ss
    for ( var i = 0; i < md; i ++)
        for ( var j = 0; j < md; j++ ){
            if (i > j ) {
                ss[i][j] = ss[j][i];
                continue;
            }
            ss[i][j] = 0;   
            for (var v = 0; v < total_nodes; v++)
                ss[i][j] += xx[v][i] * xx[v][j];

        }
        
    //转换为相关系数矩阵
    for ( var i = 0; i < md; i++)
        for ( var j = 0; j < md; j++)
            ss[i][j] = ss[i][j] / Math.sqrt( ss[i][i] * ss[j][j]);
            
    console.log("cov : "+(new Date().getTime()-time_cov)/1000+'s');
    //console.log(ss);
    
    //幂迭代法求协方差矩阵ss的特征值最大的3个特征向量
    var uuu = [];
    var uu = [];
    var ml,ee;
    
    for (var i = 0; i< md; i++)
        uu.push(0);
    for (var i = 0; i< 3; i++){
        uuu.push([]);
        for (var j = 0; j < md; j++){
            uuu[i].push(0);
        }
    }


    for (var i = 0; i < 3; i++){
    
        //生成迭代的初始向量
        ml = 0.0;
        for (var j = 0; j < md; j++){
            uu[j] = Math.random();
            ml += uu[j] * uu[j];
        }

        //初始向量标准化
        ml = Math.sqrt(ml);
        for (var j = 0; j < md; j++)
            uu[j] = uu[j] / ml;

        var run = 0;    
        do{
            run ++;
            for (var j = 0; j< md; j++)
                uuu[i][j] = uu[j];
                
            //与已生成的主成分向量正交化
            for (var j = 0; j < i; j ++){
                var sss = 0.0;
                for (var k = 0; k < md; k ++)
                    sss += uuu[i][k] * uuu[j][k];
                for (var k = 0; k < md; k ++)
                    uuu[i][k] -= sss * uuu[j][k];
            }

            
            //迭代计算下一个
            ml = 0.0;
            for (var j = 0; j < md; j ++ ){
                uu[j] = 0.0;
                for (var k = 0; k < md; k++)
                    uu[j] += ss[j][k] * uuu[i][k];
                ml += uu[j] * uu[j];
            }
            

            //标准化
            ml = Math.sqrt(ml);
            for (var j = 0; j < md; j++)
                uu[j] = uu[j] / ml; 

            //计算前后改变量，决定是否终止。
            ml = 0.0;
            for (var j = 0; j < md; j++)
                ml += uu[j] * uuu[i][j];
            ee = 1- ml;
        }while (ee > e && run < max_run);

        for (var j = 0; j< md; j++)
                uuu[i][j] = uu[j];  
    }
    
    ss = null;           //协方差矩阵ss
    deg = null;          // 到当前BFS中心节点的距离
    d = null;                // 到所有中心节点的最短距离
    q = null;                // BFS搜索 队列
    uu = null;
    
    //投影
    var aX = 0.0, aY = 0.0, aZ = 0.0;
    var bX = 0.0, bY = 0.0, bZ = 0.0;

    for (var i = 0; i < total_nodes; i ++){
        pos[i] = [0,0,0];

        for (var j = 0; j < 3; j++){
            for (var k = 0; k < md; k++ )
                pos[i][j] += xx[i][k] * uuu[j][k];
        }
        
        
        var tmp = pos[i][0];
        pos[i][0] = pos[i][1];
        pos[i][1] = -tmp;
        pos[i][2] = pos[i][2];
        aX += Math.abs(pos[i][0]);
        aY += Math.abs(pos[i][1]);
        aZ += Math.abs(pos[i][2]);
        bX += pos[i][0];
        bY += pos[i][1];
        bZ += pos[i][2];
    
    }
    
    //整体调整
    aX = aX/aZ; 
    aY = aY/aZ;
    bX = bX/total_nodes;
    bY = bY/total_nodes;
    bZ = bZ/total_nodes;

    
    //随机偏移量，解决有些节点的连接情况完全相同时位置重合的问题。
    var delta = 0;
    
    for (var i = 0; i < total_nodes; i ++){
        pos[i][0] -= bX;
        pos[i][1] -= bY;
        pos[i][2] -= bZ;
        pos[i][0] *=  adj+ delta*Math.random();
        pos[i][1] *=  adj/aY * aX / 1.5+ delta*Math.random();
        pos[i][2] *=  adj * aX+ delta*Math.random();
        
    }
}

//按连接数过滤显示的节点
var linkFilter = 0;
function nodeFilter(index){
    return nodes[index].l >= linkFilter;
} 

// ====prepare reder array=====
function initBuffers(){
    
    vertices = [];
    vertexSize = [];
    lineVertex = [];
    lineVertexIndex = [];
    pos_hash = [];
    
    var total_n = 0;
    var total_l = 0;
    
    for ( var i = 0; i < total_nodes; i ++ ) {
        v = pos[i];
        
        if (!nodeFilter(i)) 
            continue;
            
        pos_hash[i] = vertices.length;  
        vertices.push(v[0]);
        vertices.push(v[1]);
        vertices.push(v[2]);

        //vertexSize.push(Math.log(nodes[i].l)/Math.log(linksMax));
        vertexSize.push(nodes[i].l/linksMax);
        
        total_n ++;

    }
    
    for ( var i = 0; i< total_nodes; i++){
        
        if (!nodeFilter(i)) 
            continue;
        
        cen = pos[i];
        
        for (var j = 0; j < nodes[i].l; j++){
            
            if (!nodeFilter(nodes[i].links[j])) 
                continue;
            
            v = pos[ nodes[i].links[j] ];
            lineVertex.push(cen[0]);
            lineVertex.push(cen[1]);
            lineVertex.push(cen[2]);
            lineVertex.push(v[0]);
            lineVertex.push(v[1]);
            lineVertex.push(v[2]);
            lineVertexIndex.push(i);
            lineVertexIndex.push(nodes[i].links[j]);
            total_l ++;
        }
    }
    
    //console.log("node:"+total_n);
    //console.log("link:" +total_l);
}

// =====load reder buffer======
function loadBuffer(){
    
    //顶点坐标
    vertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    vertexPositionBuffer.itemSize = 3;
    vertexPositionBuffer.numItems = vertices.length /3;
    
    //顶点贴图大小缓存
    vertexSizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexSizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexSize), gl.STATIC_DRAW);
    vertexSizeBuffer.itemSize = 1;
    vertexSizeBuffer.numItems = vertexSize.length;
    
    //line坐标缓存
    lineVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVertex), gl.STATIC_DRAW);
    lineVertexPositionBuffer.itemSize = 3;
    lineVertexPositionBuffer.numItems = lineVertex.length /3;

}   

//=====draw the scene,including text on the 2d canvas========
function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    pMatrix = okMat4Proj(45, gl.viewportWidth / gl.viewportHeight, 100, 100000.0);


    mvMatrix = okMat4Trans(0.0, yTran*1.0, -zTran); 
    //mvMatrix.rotY(OAK.SPACE_LOCAL, yRot, true);
    mvMatrix.rotY(OAK.SPACE_LOCAL, yRot, true);
    
    //draw node
    currentProgram = nodeShaderProgram;
    gl.useProgram(currentProgram);

    gl.uniformMatrix4fv(currentProgram.pMatrixUniform, false, pMatrix.toArray());
    gl.uniformMatrix4fv(currentProgram.mvMatrixUniform, false, mvMatrix.toArray());
    
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    gl.vertexAttribPointer(currentProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexSizeBuffer);
    gl.vertexAttribPointer(currentProgram.vertexSizeAttribute, vertexSizeBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, nodeTexture);
    gl.uniform1i(currentProgram.samplerUniform, 0);
    
    gl.drawArrays(gl.POINTS, 0,vertexPositionBuffer.numItems);
    
    
    //draw headlight nodes
    if (selected){
        //console.log("in draw headlight");
        currentProgram = headLightShadeProgram;
        gl.useProgram(currentProgram);
        
        gl.uniformMatrix4fv(currentProgram.pMatrixUniform, false, pMatrix.toArray());
        gl.uniformMatrix4fv(currentProgram.mvMatrixUniform, false, mvMatrix.toArray());
        
        gl.bindBuffer(gl.ARRAY_BUFFER, headLightBuffer);
        gl.vertexAttribPointer(currentProgram.vertexPositionAttribute, headLightBuffer.itemSize, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, headLightColorBuffer);
        gl.vertexAttribPointer(currentProgram.vertexColorAttribute, headLightColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
        
        gl.drawArrays(gl.LINES, 0,headLightBuffer.numItems);
            
        writeText();

    }else
        info.clearRect(0, 0, 900, 550);
    
    //draw line
    currentProgram = lineShaderProgram;
    gl.useProgram(currentProgram);
    
    gl.uniformMatrix4fv(currentProgram.pMatrixUniform, false, pMatrix.toArray());
    gl.uniformMatrix4fv(currentProgram.mvMatrixUniform, false, mvMatrix.toArray());
    
    gl.bindBuffer(gl.ARRAY_BUFFER, lineVertexPositionBuffer);
    gl.vertexAttribPointer(currentProgram.vertexPositionAttribute, lineVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.LINES, 0,lineVertexPositionBuffer.numItems);
    
}
