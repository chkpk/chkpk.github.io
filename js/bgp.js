var bgp = {};
bgp.Bgp = function() {
    //修改默认选中模式为边框样式
    twaver.Styles.setStyle('select.style', 'border');
    //显示连线的终止箭头
    twaver.Styles.setStyle('arrow.to', true);
    //定义数据容器和相关视图（树、拓扑、属性页）
    this.box = new twaver.ElementBox();
    this.box['countNode'] = 0;
    this.tree = new twaver.controls.Tree(this.box);
    
    this.network = new bgp.webglNetwork();

    //注册网元图片
    this.registerImages();
    this.propertySheet = new twaver.controls.PropertySheet(this.box);
    this.sheet = new twaver.controls.PropertySheet();
    this.infoElement = new twaver.Element();
    //this.alarmTable = new twaver.controls.Table(this.box.getAlarmBox());
    this.tabPane = new twaver.controls.TabPane();
    this.checkSpin = null;
    var self = this;
    this.combo = null;
    
    //设置Tree排序方法
    this.tree.setSortFunction(function (data1, data2){
        return (''+(data1.getClient('name') || data1.getClient('prefixs'))).localeCompare(''+(data2.getClient('name') || data2.getClient('prefixs')));
        //return !(nodes[nodes_hash[data1._id]].l > nodes[nodes_hash[data2._id]].l);
    });

        //tree与拓扑图的选中同步
    this.tree.getSelectionModel().addSelectionChangeListener(function(e){
        
        this.tree.getSelectionModel().getSelection().forEach(function(tree_select){

            if (tree_select instanceof bgp.AsNode){
                tree_peer = nodes_hash[tree_select._id];
            }else if(tree_select instanceof bgp.AsLink){
                var tree_link_from = nodes_hash[tree_select._fromNode._id];
                var tree_link_to = nodes_hash[tree_select._toNode._id];
                tree_peer = (tree_link_from == selected)? tree_link_to:tree_link_from;
            }
            if (tree_peer == selected)
                return;
            asNumText.push(tree_peer);
            asNumTextColor.push("purple");
            
       }, this);
    }, this);

}
twaver.Util.ext('bgp.Bgp', Object, {
    init:function(){
        
        // 初始化属性页
        //this.initPropertySheet();
        this.initSheet();
        //初始化界面
        //右边分割面板，包含搜索框、树和属性页
        var searchPane = document.createElement('div');
        this.initSearchPane(searchPane);
        
        var treePane = new twaver.controls.BorderPane(this.tree,searchPane);
        treePane.setTopHeight(25);

        var infoPane = new twaver.controls.SplitPane(this.sheet,treePane,'vertical',0.2);
        
        //var rightSplitPane = new twaver.controls.SplitPane(infoPane, this.propertySheet, 'vertical', 0.8);
        //拓扑工具条
        var toolbar = document.createElement('div');
        //初始化拓扑工具条
        this.initToolbar(toolbar);
        
        //拓扑面板，包含拓扑工具条、拓扑
        var networkPane = new twaver.controls.BorderPane(this.network, toolbar);
        networkPane.setTopHeight(25);
        
        //Tab面板，包含不可关闭的EBGP拓扑
        bgp.addTab(this.tabPane, '3D', networkPane, true, false);
        //全局分割面板，包含左分割面板和Tab面板
        var splitPane = new twaver.controls.SplitPane(this.tabPane, infoPane, null, 0.75);
        //var splitPane = new twaver.controls.SplitPane(this.tabPane, rightSplitPane, null, 0.75);
        //添加中间分割面板到body中
        document.getElementById('main').appendChild(splitPane.getView());
        splitPane.getView().style.left = '10px';
        splitPane.getView().style.right = '10px';
        splitPane.getView().style.top = '10px';
        splitPane.getView().style.bottom = '10px';
        
        //窗口变化时，调整中间分割面板
        window.onresize = function()
        {
            splitPane.invalidate();
        };
    
        this.propertySheet.setDataBox(this.box);
        //设置各tab的dataBox及显示标签
        this.tabPane.getTabBox().getSelectionModel().addSelectionChangeListener(function(e){
            this.tabPane.getTabBox().getSelectionModel().getSelection().forEach(function(tab){
                if (tab._name == "3D"){
                    this.propertySheet.setDataBox(this.box);
                    this.tree.setDataBox(this.box);
                    this.infoElement.setClient('totalSelected',this.box.count);
                    //if (!pause){
                    //  tick();
                    //}
                }else if (tab.box){
                    this.propertySheet.setDataBox(tab.box);
                    this.tree.setDataBox(tab.box);
                    if (tab.box.count != undefined)
                        this.infoElement.setClient('totalSelected',tab.box.count);
                }
            }, this);
        },this);
        
        //自定义拓扑和树标签生成器，默认是取twaver网元对象的name属性（twaver.Data#getName）
        var getLabel = function(data){
            //如果是AS节点，这返回业务属性num的值
            if(data instanceof bgp.AsNode){
                if(data.getClient('num') !== undefined){
                    return data.getClient('num');
                }else{
                    return '';
                }
            }
            //如果是AS连线，这返回业务属性prefixs的值
            else if(data instanceof bgp.AsLink){
                return data.getFromNode().getClient('num') + '->' + data.getToNode().getClient('num') + ':' + data.getClient('prefixs');
            }
            return '';
        };
        //设置树标签生成器
        this.tree.getLabel = getLabel;
    
        
    },
   
    initColorSetting:function(div){
        
        var divColor = document.createElement("div");
        div.appendChild(divColor);
        divColor.style.position = "relative";
        //divColor.style.left = "270px";
        divColor.style.top = "80px";
        divColor.style.textAlign = "center";
        
        var self = this;
        var items = [   'CENTRAL_NODE_TEXT_COLOR', 
                        'FROM_NODE_COLOR', 
                        'TO_NODE_COLOR', 
                        'FROM_TEXT_COLOR', 
                        'TO_TEXT_COLOR', 
                        'MULTI_COLOR', 
                ];
        this.combo = bgp.addComboBox(divColor, items, "CENTRAL_NODE_TEXT_COLOR", function(){});
        //console.log(divColor.style);
        
        var sel = document.getElementById('colorSelector');
        divColor.appendChild(sel);
        cs.show();  
        sel.style.position = "relative";
        sel.style.left = "470px";       
        sel.style.top = "0px";
        
        var colorAlpha = bgp.addInput(divColor,"0.5",'alpha',function(){
            alpha = colorAlpha.value * 1.0;
            if (alpha>1) alpha = 1.0;
            if (alpha<0) alpha = 0.0;
        });
        
        var colorSet = bgp.addInput(divColor,"default",'name');
                
        var bottonSave = bgp.addButton(divColor, "Save Color", "images/save1.png", function(){
            self.saveColorSettings(colorSet.value);
        });

        
    },
    initToolbar:function (toolbar){//
        var self = this;
        bgp.addButton(toolbar, 'Save', 'images/save1.png', function(){
            alert("data sent!");
            self.save();
        });
        
        bgp.addButton(toolbar, 'update', 'images/reload1.png', function(){
            alert("request sent!");
            self.update();
        });
        
        bgp.addButton(toolbar, 'Layout', 'images/layout.png', function(){
            self.layout();
        });
        
        bgp.addButton(toolbar, 'Filter', 'images/filter.png', function(){
            var levelStr = null;
            if (levelStr = window.prompt('Least Links:', 1)){
                linkFilter = parseInt(levelStr);
            
                window.cancelAnimationFrame(requestId);
                //clearSelected();
                clearAll("filter");
                initBuffers();  
                loadBuffer();
                setTimeout(function(){  
                    if (pause){
                        pause = false;
                        button.src = 'images/pause.png';
                    }
                    tick()
                },100);
            }                   
        });
        
        var button = bgp.addButton(toolbar, 'Pause', 'images/pause.png', function(){
            if (pause){
                tick();
                yRot = yRot1;
                pause = false;
                button.src = 'images/pause.png';
            }else{
                window.cancelAnimationFrame(requestId);
                yRot1 = yRot;
                pause = true;
                button.src = 'images/conti.png';
            }
            lastTime = new Date().getTime();            
        });
                
        self.checkSpin = bgp.addCheckBox(toolbar, true, "spin", function(){
            if (spin)
                yRot1 = yRot;
            else
                yRot = yRot1;
            spin = self.checkSpin.checked;
            lastTime = new Date().getTime();
            console.log(spin);
        });
        
        self.checkMulti = bgp.addCheckBox(toolbar, false, "multi", function(){
            clearSelected();            
            if (multi){
                selected = null;
            }else{
                if (selected){
                    selectedMulti.push(selected);
                    self.box.clear();
                    self.addNode(selected);
                    asNumText.push(selected);
                    asNumTextColor.push("red");
                }   
            }
            multi = self.checkMulti.checked;
            console.log(multi);
        });
    },
    initToolbar2:function (toolbar){ //初始化twaver 2D里面的工具栏
        var self = this;
        //var  network = self.tabPane.getTabBox().getSelectionModel().getSelection().network;
        bgp.addButton(toolbar, 'Zoom In', 'images/zoomIn.png', function(){
            console.log(self.tabPane.getTabBox().getSelectionModel().getSelection().get(0));
            self.tabPane.getTabBox().getSelectionModel().getSelection().get(0).network.zoomIn(false);
        });
        bgp.addButton(toolbar, 'Zoom Out', 'images/zoomOut.png', function(){
            self.tabPane.getTabBox().getSelectionModel().getSelection().get(0).network.zoomOut(false);
        });
        bgp.addButton(toolbar, 'Zoom Overview', 'images/zoomOverview.png', function(){
            self.tabPane.getTabBox().getSelectionModel().getSelection().get(0).network.zoomOverview(true);
        });
        bgp.addButton(toolbar, 'Zoom Reset', 'images/zoomReset.png', function(){
            self.tabPane.getTabBox().getSelectionModel().getSelection().get(0).network.zoomReset(true);
        });
        //自动布局
        // var items = ['symmetry', 'round', 'topbottom', 'bottomtop', 'leftright', 'rightleft', 'hierarchic'];
        var items = ['hierarchic', 'symmetry'];
        self.autoLayouterType = bgp.addComboBox(toolbar, items, "hierarchic", function(){
            var autoLayouter = new twaver.layout.AutoLayouter(
                self.tabPane.getTabBox().getSelectionModel().getSelection().get(0).network.getElementBox());
            //autoLayouter.setAnimate(false);
            autoLayouter.setRepulsion(10);
            autoLayouter.doLayout(self.autoLayouterType.value);
        }); 
    },
    initMouseEvent:function(){//
        var textLayer = this.network.textCanvas
        textLayer.onmousedown = onMouseDown;
        textLayer.ondblclick = onDoubleClick;
        textLayer.onmouseup = onMouseUp;
        textLayer.onmousemove = onMouseMove;
        textLayer.onmousewheel= onMouseWheel;
        textLayer.onDOMMouseScroll = onMouseWheel;
        textLayer.addEventListener( 'mousewheel', onMouseWheel, false );
        textLayer.addEventListener( 'DOMMouseScroll', onMouseWheel, false);
    },
    initInfo:function(){//信息统计栏
        this.infoElement.setClient("updateTime", Date());
        this.infoElement.setClient("totalNodes", total_nodes);
        this.infoElement.setClient("totalLinks", total_links);
    },
    initSearchPane:function (searchPane){//搜索框
        var self = this;
        var searchbox = bgp.addInput(searchPane, '', '    Search', function(asnum){
            self.searchInBox(asnum);
        }); 
        bgp.addButton(searchPane, 'Search All', 'images/search.png', function(){
            self.searchAS(searchbox.value);
        });
    },
    initPropertySheet:function (){//初始化属性页
        //让属性页可编辑
        this.propertySheet.setEditable(true);
        var sheetBox = this.propertySheet.getPropertyBox();
        //属性可见过滤器，只对ASNode可见
        var isAsNodeVisible = function(data){
            return data instanceof bgp.AsNode;
        };
        //属性可见过滤器，只对ASLink可见
        var isAsLinkVisible = function(data){
            return data instanceof bgp.AsLink;
        };

        //Node属性num
        bgp.addProperty(sheetBox, 'num', 'AS Number', 'AS Information', 'number', 'client', isAsNodeVisible);
        //Node属性alias
        bgp.addProperty(sheetBox, 'alias', 'AS Short Name', 'AS Information', 'string', 'client', isAsNodeVisible);
        //Node属性name
        bgp.addProperty(sheetBox, 'name', 'AS FULL Name', 'AS Information', 'string', 'client', isAsNodeVisible);
        //Link属性prefixs
        bgp.addProperty(sheetBox, 'prefixs', 'Prefix Count', null, 'number', 'client', isAsLinkVisible);
        //Link属性from
        var property = bgp.addProperty(sheetBox, 'fromNode', 'Neighbor From', null, 'string', 'accessor', isAsLinkVisible);
        property.getValue = function (data) {
            if (data.getFromNode) {
                return data.getFromNode().getClient('num');
            }
            return '';
        };
        //Link属性to
        property = bgp.addProperty(sheetBox, 'toNode', 'Neighbor To', null, 'string', 'accessor', isAsLinkVisible);
        property.getValue = function (data) {
            if (data.getToNode) {
                return data.getToNode().getClient('num');
            }
            return '';
        };
    },
    /*
    initAlarmTable: function () {
        this.alarmTable.setEditable(false);
        this.alarmTable.onCellRendered = function (params) {
            if (params.column.getName() === 'Alarm Severity') {
                params.div.style.backgroundColor = params.data.getAlarmSeverity().color;
            }
        };

        bgp.createColumn(this.alarmTable, 'As num', 'elementId', 'accessor');
        var column = bgp.createColumn(this.alarmTable, 'Alarm Severity', 'alarmSeverity', 'accessor', 'string', true);
        column.setWidth(120);
        column.setHorizontalAlign('center');
        bgp.createColumn(this.alarmTable, 'Acked', 'acked', 'accessor', 'boolean', true).setWidth(50);
        bgp.createColumn(this.alarmTable, 'Cleared', 'cleared', 'accessor', 'boolean', true).setWidth(50);
        var timeColumn = bgp.createColumn(this.alarmTable, 'Raised Time', 'raisedTime', 'client');
        timeColumn.setWidth(150);
        timeColumn.setHorizontalAlign('center');
    },
    */
    initSheet: function () {//
        this.sheet.setEditable(false);
        var propertyBox = this.sheet.getPropertyBox();
        bgp.addProperty(propertyBox, 'updateTime', 'Last Update Time', 'Data Information', 'string', 'client');//, function(){return true});
        bgp.addProperty(propertyBox, 'totalNodes', 'Total Nodes', 'Data Information', 'int', 'client');//, true);
        bgp.addProperty(propertyBox, 'totalLinks', 'Total Links', 'Data Information', 'int', 'client');//, true);
        bgp.addProperty(propertyBox, 'totalSelected', 'Total Selected', 'Selected Information', 'int', 'client');//, true);
        
        this.infoElement.setClient('updateTime', null);
        this.infoElement.setClient('totalNodes', 0);
        this.infoElement.setClient('totalLinks', 0);
        this.infoElement.setClient('totalSelected', 0);
        
        this.sheet.getDataBox().add(this.infoElement);
        this.sheet.getDataBox().getSelectionModel().setSelection(this.infoElement);
        //this.sheet.getDataBox().addDataPropertyChangeListener(this.handlePropertyChange, this);
    },
    update:function(){//重新载入
        window.cancelAnimationFrame(requestId);
        spin = false;
        this.checkSpin.checked = spin;
        yRot1 = yRot;
        lastTime = new Date().getTime();

        var self = this;
        time0 = new Date().getTime();
        clearAll("update");
        setTimeout(function(){
            $.getJSON("view_as_topo2.php" + location.search, function(data){
                
                for (key in data["time"])
                    console.log(key + ": " + data["time"][key] + "s");
                    
                console.log("ajax_data: "+(new Date().getTime()-time1)/1000+'s');
                
                time2 =  new Date().getTime();

                readEdgeFromServer(data);
                alert("data arrived,drawing...");
                self.infoElement.setClient("updateTime", Date());
                self.infoElement.setClient("totalNodes", total_nodes);
                self.infoElement.setClient("totalLinks", total_links);
                    
                var timel = new Date().getTime();
                initBuffers();
                loadBuffer();
                console.log("init & load buffer time: "+(new Date().getTime()-timel)/1000+'s');
                console.log("webGL showdata: "+(new Date().getTime()-time2)/1000+'s');
                console.log("total: "+(new Date().getTime()-time0)/1000+'s');
                
                setTimeout(function(){
                    b.initInfo();
                                    
                    spin = true;
                    self.checkSpin.checked = spin;
                    yRot = yRot1;
                    lastTime = new Date().getTime();                    
                    alert("finished!");
                    if (pause){
                        pause = false;
                        button.src = 'images/pause.png';
                    }
                    tick();
                },200);


            });
        },50);
    },
    layout:function(){//重新布局
        
        var self = this;
        still = false;
        self.checkSpin.checked = spin;
        yRot1 = yRot;
        lastTime = new Date().getTime();
        window.cancelAnimationFrame(requestId);

        var datas = {};
        
        for (var i = 0, ll = nodes.length; i<ll; i++)
            datas[i] = { l:nodes[i].l,
                         links:nodes[i].links
                    };
        
        //console.log(JSON.stringify(datas));
        //console.log(JSON.stringify(pos));
        console.log(nodes.length);
        console.log("layout data sent...");
        
        bgp.sendData(datas,"layout_delete_tree.php",function(responeData){
            //console.log(responeData);
            var data = JSON.parse(responeData);
            for (key in data['time'])
                console.log(key + ": " + data['time'][key] + "s");
            console.log(data['pos4'].length);
            self.layout_update(data['pos4']);   
        });
    },
    layout_update:function(datas){//重新布局异步回调函数

        var self = this;
        time0 = new Date().getTime();
        clearAll("layout");
        alert("data arrived, drawing...");
        setTimeout(function(){
                
                for (var i = 0; i< total_nodes; i++)
                    pos[i] = datas[i];
                
                setTimeout(function(){
                    var timel = new Date().getTime();
                    initBuffers();
                    loadBuffer();
                    console.log("init & load buffer time: "+(new Date().getTime()-timel)/1000+'s');
                
                    setTimeout(function(){                                      
                        still = true;
                        self.checkSpin.checked = spin;
                        yRot = yRot1;
                        lastTime = new Date().getTime();
                        if (pause){
                            pause = false;
                            button.src = 'images/pause.png';
                        }
                        tick();
                    },100);
                },100);
        },50);
    },

    searchAS:function(asnum){//搜索所有AS
        var p = asnum.indexOf('-');
        if (p == 0 || p == asnum.length)
            return;
            
        if (p<0){//搜node
            selected = nodes_hash[asnum];
            if (!selected){
                alert("not found!");
                return;
            }
            headLightNode(selected);
            tree_select(asnum);
        }else{//搜link
            var link1 = this.box.getDataById(asnum);
            if (link1){
                tree_select(asnum);
            }else{
                var asnum1 = asnum.slice(0,p);
                var asnum2 = asnum.slice(p+1);
                console.log(asnum2+'-'+asnum1);
                var link2 = this.box.getDataById(asnum2+'-'+asnum1);
                if (link2){
                    tree_select(asnum2+'-'+asnum1);
                }else
                    return;
            }   
        }   
    },
    searchInBox:function(asnum){//仅在box里面搜索
        var p = asnum.indexOf('-');
        if (p == 0 || p == asnum.length)
            return;
            
        if (p<0){//搜node
            tree_peer = this.box.getDataById(asnum);
            if (!tree_peer){
                alert("not found!");
                return;
            }
            tree_select(asnum);
        }else{//搜link
            var link1 = this.box.getDataById(asnum);
            if (link1){
                tree_select(asnum);
            }else{
                var asnum1 = asnum.slice(0,p);
                var asnum2 = asnum.slice(p+1);
                console.log(asnum2+'-'+asnum1);
                var link2 = this.box.getDataById(asnum2+'-'+asnum1);
                if (link2){
                    tree_select(asnum2+'-'+asnum1);
                }else
                    return;
            }   
        }   
    },
    //从后台拿到数据后，创建node和link，并添加到twaver容器中
    /*showData:function (datas){//
        if(!datas){
            return;
        }
        //添加节点和连线
        this.addDatas(datas);
    },*/
    //保存数据
    save:function (){

        var datas = {};

        /*
        this.box.forEach(function(data){
            if(data instanceof bgp.AsNode){
                //datas.push(data.toData());
                datas[data.getId()] = data.toData();
                tt++;
            }
        });*/
        
        for (var i = 0, ll = nodes.length; i<ll; i++)
            datas[nodes[i].id] = {  id:nodes[i].id,
                                    location: {x: pos[i][0], y: pos[i][1],z:pos[i][2]}
                                  };

        bgp.sendData(datas,"save_bgp.php",function(responeData){
            console.log(responeData);
        });
        datas = null;
    },
    saveColorSettings:function (id){
        
        if (!id)
            id = "default";
            
        var datas = {id:id};
        
        datas["sColors"] = sColors;
        datas["vColors"] = vColors;
        
        bgp.sendData(datas,"save_colorSettings.php",function(responeData){
            console.log(responeData);
        });
        
        datas = null;
    },
    //批量添加节点以及连线
    /*addDatas: function (datas) {
        if(!datas){
            return;
        }
        
        var i, n, result;
        //先添加节点
        //var node_hash = [];
        var time01 = new Date().getTime();
        if(datas.AsNode){
            console.log('AsNode Count:', datas.AsNode.length);
            for(result = datas.AsNode, i=0, n = result.length; i<n; i++){
                var data = result[i];
                var newNode = 
                {
                    id: data.id,
                    clients: {num: data.num, alias: data.alias, name: data.name, links:data.links}
                };
                if(data.location)
                    newNode.location = data.location;
                if(data.links == '0'){
                    newNode.styles = {'inner.color': 'gray'};
                }
                var newAsNode = new bgp.AsNode(newNode);
                this.box.add(newAsNode);

            }
        }
        var time02 = new Date().getTime();
        console.log("add node time : "+(time02-time01)/1000+'s');
        
        //再添加连线
        if(datas.AsLink){
            console.log('AsLink Count:', datas.AsLink.length);
            var linktmp = [];
            for(result = datas.AsLink, i=0, n = result.length; i<n; i++){
                var data = result[i];
                var from = this.box.getDataById(data.from);
                var to = this.box.getDataById(data.to);
                //var from = this.box.get(data.from);
                //var to = this.box.get(data.to);
                //设置颜色和宽度
                var linkColorAndWidth = bgp.getColorAndWidthByPrefixs(parseInt(data.prefixs), 'global');
                var link = new bgp.AsLink(
                {
                  id: data.id,
                  clients: {
                    prefixs: data.prefixs
                  },
                  styles: {
                    'link.width': linkColorAndWidth.width,
                    'link.color': linkColorAndWidth.color
                  }
                },
                from,to);
                var link2 = new bgp.AsLink(
                {
                  id: '_'+ data.id,
                  clients: {
                    prefixs: '0'
                  },
                  styles: {
                    'link.width': linkColorAndWidth.width,
                    'link.color': linkColorAndWidth.color
                  }
                },
                from,to);
                
                from.addChild(link);
                //to.addChild(link2);
                linktmp.push(link);
                //linktmp.push(link2);

            }
            var time031 = new Date().getTime();
            console.log("add link time1 : "+(time031-time02)/1000+'s');
            for (var i = 0, nl = linktmp.length; i< nl; i++)
                this.box.add(linktmp[i]);
        }
        
        var time03 = new Date().getTime();
        console.log("add link time : "+(time03-time02)/1000+'s');
        var time04 = new Date().getTime();
        console.log("check prefix time : "+(time04-time03)/1000+'s');
        
        console.log('Total Count:', datas.AsLink.length + datas.AsNode.length);
    },*/
    //添加节点
    addNode: function(index){
    
        var data = nodes[index].clients;
        
        if (this.box.getDataById(data.num))
            return;
            
        var newNode = 
        {
            id: data.num,
            clients: {num: data.num, alias: data.alias, name: data.name, links:data.link}
        };

        var newAsNode = new bgp.AsNode(newNode);
        this.box.add(newAsNode);
    },
    //添加连线
    addLink: function (from,to,clients){
        
        var data = {
                    from:nodes[from].id,
                    to:nodes[to].id,
                    prefixs:clients.prefixs
                    };
        data.id = data.from + '-' + data.to;
        
        if (this.box.getDataById(data.id))
            return;
        
        var fromNode = this.box.getDataById(data.from);
        var toNode = this.box.getDataById(data.to);
        
        var link = new bgp.AsLink(
        {
              id: data.id,
              clients: {
                prefixs: data.prefixs
              },
        }, fromNode,toNode);
        
        if (from == selected)
            toNode.addChild(link);
        else
            fromNode.addChild(link);
        
        this.box.add(link);
    },
    //修改节点
    changeData: function (data){
        //同步节点
        var asNode = this.box.getDataById(data.id);
        //节点不存在
        if(!asNode){
            return;
        }
        if(data.location){
            asNode.setLocation(data.location.x, data.location.y);
        }
        asNode.setStyle('inner.color', data.links == '0' ? 'gray' : null);
        asNode.setClient('num', data.num);
        asNode.setClient('alias', data.alias);
        asNode.setClient('name', data.name);
    },
    //删除节点
    removeData: function (data){
        this.box.removeById(data.id);
    },
    //注册网元图片
    registerImages: function() {
        this.registerImage("images/as.png");
        this.registerImage("images/layout.png");
        this.registerImage("images/loading.gif");
        this.registerImage("images/num.png");
        this.registerImage("images/reload1.png");
        this.registerImage("images/save1.png");
        this.registerImage("images/sphere.png");
    },
    registerImage: function(url) {
        bgp.registerImage(url, this.network, this.tree);
    },
    //显示局部EBGP拓扑
    showLocalNetwork: function(index) {
        if (Str = window.prompt('central node:level', nodes[index].id + ':1'))
        {
            var p = Str.indexOf(':');
            if (p == 0 || p == Str.length || p < 0)
                return;
            index = nodes_hash[parseInt(Str.slice(0,p))];
            var level = parseInt(Str.slice(p+1));
        }
        
        if ( index == undefined) 
            return;
            
        var self = this;
        var name = nodes[index].id;
        var tab = self.tabPane.getTabBox().getDataById("AS"+name+":"+level);
        //如果局部拓扑已存在，则选中，否则创建
        if(tab){
            self.tabPane.getTabBox().getSelectionModel().setSelection(tab);
        }else{
            //弹出窗口输入level
            if (level){
                var localNetwork = new bgp.EBGPLocalNetwork();
                var toolbarZoom = document.createElement('div');
                self.initToolbar2(toolbarZoom);
                var networkPane = new twaver.controls.BorderPane(localNetwork, toolbarZoom);
                networkPane.setTopHeight(25);
                tab = bgp.addTab(this.tabPane, "AS"+name+":"+level, networkPane, true, true);
                tab.network = localNetwork;
                var box = localNetwork.getElementBox();
                
                if (level>0)
                    self.copyAsNodeAndLink(box, index,level);
                else{
                    //请求AS内部信息。未实现。
                }
                tab.box = box;
                var count = 0;
                box.forEach(function(data){           
                    if(data instanceof bgp.AsNode)
                        count++;
                });
                box.count = count;
                this.tree.setDataBox(box);
                this.propertySheet.setDataBox(box);
                this.infoElement.setClient('totalSelected', count);
                var autoLayouter = new twaver.layout.AutoLayouter(box);
                autoLayouter.setRepulsion(3);
                autoLayouter.doLayout('hierarchic');
                //console.log(autoLayouter);
                //new twaver.layout.AutoLayouter(box).doLayout('symmetry');
            }else{
            //levelStr = 0 时显示对应AS内部tab。
            }
        }
    },
    //生成局部拓扑图数据
    copyAsNodeAndLink: function (box, index,level) {
            
        var self = this;
        box.clear();
        bgp.addNode(box,index);

        self.copyAsNode(box,index);
        
        if (level == 1) 
            return;
            
        var peer,node;
        for (var k = 0, lk = nodes[index].l,Link = nodes[index].links; k < lk; k++ ){
            peer = Link[k];
            self.copyAsNode(box,peer);              
        }
        
        /*
        for (var i = 0,l = temp.length; i < l; i ++){
            var cur = temp[i];
            bgp.addNode(box,cur);
            var fromLinks = nodes[cur].fromLinks;
            var fromClients = nodes[cur].fromClients;
            for (var j =0,l = fromLinks.length; j < l; j++)
                bgp.addLink(box,cur,fromLinks[j],{prefixs:fromClients[j].prefixs});
                                    
            var toLinks = nodes[i].toLinks;
            var toClients = nodes[cur].toClients;
            for (var j =0,ll = toLinks.length; j < ll; j++)
                for (var k=0,lll = temp.length; i < ll;)
                bgp.addLink(box,cur,toLinks[j],{prefixs:toClients[j].prefixs});
        }*/
        return;     
    },
    copyAsNode: function(box,index) {
        
        node = nodes[index];        
        for (var i = 0, l = node.lf,links = node.fromLinks,clients = node.fromClients; i < l; i ++ ){   
            bgp.addNode(box,links[i]);
            bgp.addLink(box,index,links[i],{prefixs:clients[i].prefixs});
            
        }   
        for (var i = 0, l = node.lt,links = node.toLinks,clients = node.toClients; i < l; i ++ ){
            bgp.addNode(box,links[i]);
            bgp.addLink(box,links[i],index,{prefixs:clients[i].prefixs});
        }   
    },
    copyAsLink: function(element, root, to) {
        //设置颜色和宽度
        var linkColorAndWidth = bgp.getColorAndWidthByPrefixs(element.getClient('prefixs'));

        return new bgp.AsLink({
            id: element.getId(),
            clients: {
                prefixs: element.getClient('prefixs')
            },
            styles: {
                'link.width': linkColorAndWidth.width,
                'link.color': linkColorAndWidth.color
            }
        }, root, to);
    }
});


        
