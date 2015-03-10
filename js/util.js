//添加按钮
bgp.addButton = function (div, name, src, callback) {
    var button = document.createElement('input');
    button.setAttribute('type', src ? 'image' : 'button');
    button.setAttribute('title', name);
    button.style.verticalAlign = 'top';
    if (src) {
        button.style.padding = '4px 4px 4px 4px';
        button.setAttribute('src', src);
    } else {
        button.value = name;
    }
    button.addEventListener('click', callback, false);
    div.appendChild(button);
    return button;
};
//添加checkbox
bgp.addCheckBox = function (div, checked, name, callback) {
    var checkBox = document.createElement('input');
    checkBox.id = name;
    checkBox.type = 'checkbox';
    checkBox.style.padding = '4px 4px 4px 4px';
    checkBox.checked = checked;
    if (callback) checkBox.addEventListener('click', callback, false);
    div.appendChild(checkBox);
    var label = document.createElement('label');
    label.htmlFor = name;
    label.innerHTML = name;
    div.appendChild(label);
    return checkBox;
};
//添加拖拽按钮
bgp.addDraggableButton = function (div, name, src, className) {
    var image = new Image();
    image.setAttribute('title', name);
    image.setAttribute('draggable', 'true');
    image.style.cursor = 'move';
    image.style.verticalAlign = 'top';
    image.style.padding = '4px 4px 4px 4px';
    image.setAttribute('src', src);
    image.addEventListener('dragstart', function (e) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('Text', 'className:' + className);
    }, false);
    div.appendChild(image);
    return image;
};
//添加输入框
bgp.addInput = function (div, value, name, callback){
	var input = document.createElement('input');
	input.id = name;
	input.value = value;
	input.addEventListener('keydown', function (e) {
		if (e.keyCode == 13) {
			callback(input.value);
		}
	}, false);
	var label = document.createElement('label');
	label.htmlFor = name;
	label.innerHTML = name;
	div.appendChild(label);
	div.appendChild(input);
	return input;
};
//添加多选框
bgp.addComboBox = function (div, items, value, callback) {
	var comboBox = document.createElement('select');
	//comboBox.style.verticalAlign = 'top';
	items.forEach(function (item) {
		var option = document.createElement('option');
		option.appendChild(document.createTextNode(item));
		option.setAttribute('value', item);
		comboBox.appendChild(option);
	});

	if (callback) {
		comboBox.addEventListener('change', callback, false);
	}

	if (value) {
		comboBox.value = value;
	}
	div.appendChild(comboBox);
	return comboBox;
};
//添加节点
bgp.addNode = function(box,index){

	var data = nodes[index].clients;
	
	if (box.getDataById(data.num))
		return;
		
	var newNode = 
	{
		id: data.num,
		clients: {num: data.num, alias: data.alias, name: data.name, links:data.link}
	};

	var newAsNode = new bgp.AsNode(newNode);
	box.add(newAsNode);
};
//添加连线
bgp.addLink = function (box,from,to,clients){
	
	var data = {
				from:nodes[from].id,
				to:nodes[to].id,
				prefixs:clients.prefixs
				};
	data.id = data.from + '-' + data.to;
	
	if (box.getDataById(data.id))
		return;
	
	var fromNode = box.getDataById(data.from);
	var toNode = box.getDataById(data.to);
	
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
	
	box.add(link);
};

//注册图片
bgp.registerImage = function (url) {
    var image = new Image();
    image.src = url;
    var views = arguments;
    image.onload = function () {
        twaver.Util.registerImage(bgp._getImageName(url), image, image.width, image.height);
        image.onload = null;
        for (var i = 1; i < views.length; i++) {
            var view = views[i];
            if (view.invalidateElementUIs) {
                view.invalidateElementUIs();
            }
            if (view.invalidateDisplay) {
                view.invalidateDisplay();
            }
        }
    };
};
bgp._getImageName = function (url) {
    var index = url.lastIndexOf('/');
    var name = url;
    if (index >= 0) {
        name = url.substring(index + 1);
    }
    index = name.lastIndexOf('.');
    if (index >= 0) {
        name = name.substring(0, index);
    }
    return name;
};
//添加属性页属性
bgp.addProperty = function (box, propertyName, name, category, valueType, propertyType, isVisible) {
    var property = new twaver.Property();
    property.setEditable(true);
    property.setPropertyType(propertyType);
    property.setPropertyName(propertyName);
    property.setName(name);
    property.setCategoryName(category);
    property.setValueType(valueType);
    if (isVisible)
		property.isVisible = isVisible;

    box.add(property);
    return property;
};

//让network接收拖拽事件
bgp.createDraggableNetwork = function (box) {
    var network = new twaver.canvas.Network(box);

    //拖拽移动时，更改鼠标样式
    network.getView().addEventListener('dragover', function (e) {
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }
        e.dataTransfer.dropEffect = 'copy';
        return false;
    }, false);
    //拖拽结束后，创建网元
    network.getView().addEventListener('drop', function (e) {
        if (e.stopPropagation) {
            e.stopPropagation();
        }
        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }
        var text = e.dataTransfer.getData('Text');
        if (!text) {
            return false;
        }
        if (text && text.indexOf('className:') == 0) {
            bgp._createElement(network, text.substr(10, text.length), network.getLogicalPoint(e));
        }
        if (text && text.indexOf('<twaver') == 0) {
            network.getElementBox().clear();
            new twaver.XMLSerializer(network.getElementBox()).deserialize(text);
        }
        return false;
    }, false);

    //设置拓扑允许拖拽
    network.getView().setAttribute('draggable', 'true');
    //拖拽拓扑时，将拓扑序列化成xml字符串
    network.getView().addEventListener('dragstart', function (e) {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('Text', new twaver.XMLSerializer(network.getElementBox()).serialize());
    }, false);

    return network;
};
//network接收拖拽事件后，创建节点或连线，加入twaver容器后并选中
bgp._createElement = function (network, className, centerLocation) {
    var num = window.prompt('AS num', '');
    if(num == null || num === ''){
        return;
    }
    var element = twaver.Util.newInstance(className, {id: num, clients: {num: num}});
    element.setCenterLocation(centerLocation);
    element.setParent(network.getCurrentSubNetwork());
    network.getElementBox().add(element);
    network.getElementBox().getSelectionModel().setSelection(element);
};

//添加表格列
bgp.createColumn = function (table, name, propertyName, propertyType, valueType, editable) {
    var column = new twaver.Column(name);
    column.setName(name);
    column.setPropertyName(propertyName);
    column.setPropertyType(propertyType);
    if (valueType) column.setValueType(valueType);
    column.setEditable(editable);
    column.renderHeader = function (div) {
        var span = document.createElement('span');
        span.style.whiteSpace = 'nowrap';
        span.style.verticalAlign = 'middle';
        span.style.padding = '1px 2px 1px 2px';
        span.innerHTML = column.getName() ? column.getName() : column.getPropertyName();
        span.setAttribute('title', span.innerHTML);
        span.style.font = 'bold 12px Helvetica';
        div.style.textAlign = 'center';
        div.appendChild(span);
    };
    table.getColumnBox().add(column);
    return column;
};

//添加Tab
bgp.addTab = function (tabPane, name, view, selected, closable) {
    var tab = new twaver.Tab(name);
    tab.setName(name);
    tab.setView(view)
    tabPane.getTabBox().add(tab);
    tab.setClosable(closable);
    if (selected) {
        tabPane.getTabBox().getSelectionModel().setSelection(tab);
    }
    return tab;
};

bgp.createXMLHttpRequest = function (){
	return window.ActiveXObject
		? new ActiveXObject("Microsoft.XMLHTTP")
		: new XMLHttpRequest();
}

bgp.sendData = function(datas,url,callback){
	var xmlHttp = bgp.createXMLHttpRequest();
	
		xmlHttp.open("POST",url,true);
		xmlHttp.onreadystatechange = function(){
			if(xmlHttp.readyState == 4 && xmlHttp.status == 200){
				callback(xmlHttp.responseText);
		}};
		xmlHttp.setRequestHeader("Content-Type","application/x-www-form-urlencoded;");
		xmlHttp.send(JSON.stringify(datas));
}		

//根据prefixs确定连线的颜色和粗细
var prefixs_0 = {color: 'gray', width: 0};
var prefixs_0_10 = {color: '#00FF00', width: 1};
var prefixs_10_100 = {color: 'yellow', width: 2};
var prefixs_100_1000 = {color: 'orange', width: 3};
var prefixs_1000 = {color: 'red', width: 4};
bgp.getColorAndWidthByPrefixs = function (prefixs, tab) {
  if (tab === undefined || tab != 'global')
  {
    if(prefixs == 0){
      return prefixs_0;
    }else if(prefixs <= 10){
      return prefixs_0_10;
    }else if(prefixs <= 100){
      return prefixs_10_100;
    }else if(prefixs <= 1000){
      return prefixs_100_1000;
    }else{
      return prefixs_1000;
    }
  }
  else
  {
    return {color:'#0066CC', width:1};
  }
};

//EBGPLocalNetwork
bgp.EBGPLocalNetwork = function (box) {
    bgp.EBGPLocalNetwork.superClass.constructor.call(this, box);
    //禁用默认删除操作
    this.setKeyboardRemoveEnabled(false);
    //自定义拓扑和树标签生成器，默认是取twaver网元对象的name属性（twaver.Data#getName）
    var getLabel = function(data){
        //如果是AS节点，这返回业务属性num的值
        if(data instanceof bgp.AsNode){
            if(data.getClient('num') !== undefined){
                return 'AS' + data.getClient('num');
            }else{
                return '';
            }
        }
        //如果是AS连线，这返回业务属性prefixs的值
        else if(data instanceof bgp.AsLink){
            return data.getClient('prefixs');
        }
        return '';
    };
    //设置拓扑标签生成器
    this.getLabel = getLabel;
    //自定义拓扑提示信息生成器，默认是取twaver网元对象的toolTip属性（twaver.Data#getToolTip）
    var getToolTip = function(data){
        //如果是AS节点，这返回业务属性num的值
        if(data instanceof bgp.AsNode){
            return data.getClient('num');
        }
        //如果是AS连线，这返回业务属性prefixs的值
        else if(data instanceof bgp.AsLink){
            return data.getFromNode().getClient('num') + '->' + data.getToNode().getClient('num') + ':' + data.getClient('prefixs');
        }
        return '';
    }
    //设置拓扑提示信息生成器
    this.getToolTip = getToolTip;
    //添加Logo
    //this.logo = new Image();
    //this.logo.src = 'images/logo.png';
    //this.logo.style.opacity = 0.5;
    //this.logo.style.position = 'absolute';
    //this.getView().insertBefore(this.logo, this.getRootDiv());
    //var self = this;
    //滚动Network时，移动Logo位置
    //this.getView().addEventListener('scroll', function(e){
   // 	self.resetLogo();
    //});
    //self.resetLogo();
    //setTimeout(function(){self.resetLogo();}, 200);
};
twaver.Util.ext('bgp.EBGPLocalNetwork', twaver.canvas.Network, {
	resetLogo: function () {
        //设置Logo位置
        //this.logo.style.left = this.getView().scrollLeft + 'px';
        //this.logo.style.top = this.getView().scrollTop + this.getView().offsetHeight - this.logo.height + 'px';
	}
});

//=====================定制的webgl 3d拓扑=========================
bgp.webglNetwork = function (box, bgpValue) {
    bgp.webglNetwork.superClass.constructor.call(this, box);
    this.bgpValue = bgpValue;

	this.edgeCanvas = document.getElementById("can"); 
	
	//console.log(this.edgeCanvas.width);
	//console.log(this.edgeCanvas.height);
	
    this.edgeCanvas.style.position = 'absolute';
	//this.edgeCanvas.style.left = '10px';
    //this.edgeCanvas.style.right = '10px';
    //this.edgeCanvas.style.top = '10px';
    //this.edgeCanvas.style.bottom = '10px';
	
	//console.log(this.edgeCanvas.width);
	//console.log(this.edgeCanvas.height);
	
    //将3d画布加入Network所在的视图
    this.getView().insertBefore(this.edgeCanvas, this.getRootDiv());
	
	//获取webgl Context
	try {
		gl =this.edgeCanvas.getContext("experimental-webgl");
		gl.viewportWidth =  this.edgeCanvas.width;
		gl.viewportHeight = this.edgeCanvas.height;
	} catch (e) {
	}
	if (!gl) {
		alert("Could not initialise WebGL, sorry :-(");
	}
	
	//添加透明的 text canvas，用来显示文字信息
	this.textCanvas = document.getElementById("text"); 
	
	//console.log(this.textCanvas.width);
	//console.log(this.textCanvas.height);
	
    this.textCanvas.style.position = 'absolute';
	//this.textCanvas.style.left = '10px';
    //this.textCanvas.style.right = '10px';
    //this.textCanvas.style.top = '10px';
    //this.textCanvas.style.bottom = '10px';
	
	//console.log(this.textCanvas.width);
	//console.log(this.textCanvas.height);
	
    //将text画布加入Network所在的视图
    this.getView().insertBefore(this.textCanvas, this.getRootDiv());
	info = this.textCanvas.getContext('2d');
	info.font="12pt Calibri";
	info.textAlign="central";
	info.fillStyle="#ff0000";
	//info.fillText("AS",100,100);
	
	/*
    this.logo = new Image();
    this.logo.src = 'images/logo.png';
    this.logo.style.opacity = 0.5;
    this.logo.style.position = 'absolute';
   // this.getView().insertBefore(this.logo, this.edgeCanvas);
    var self = this;

	 var getLabel = function(data){
        //如果是AS节点，这返回业务属性num的值
        if(data instanceof bgp.AsNode){
            if(data.getClient('num') !== undefined){
                return 'AS' + data.getClient('num');
            }else{
                return '';
            }
        }
        //如果是AS连线，这返回业务属性prefixs的值
        else if(data instanceof bgp.AsLink){
            return data.getClient('prefixs');
        }
        return '';
    };
    //设置拓扑标签生成器
    this.getLabel = getLabel;
	
    //自定义拓扑提示信息生成器，默认是取twaver网元对象的toolTip属性（twaver.Data#getToolTip）
    var getToolTip = function(data){
        //如果是AS节点，这返回业务属性name的值
        if(data instanceof bgp.AsNode){
            return data.getClient('name');
        }
        //如果是AS连线，这返回业务属性prefixs的值
        else if(data instanceof bgp.AsLink){
            return data.getFromNode().getClient('num') + '->' + data.getToNode().getClient('num') + ':' + data.getClient('prefixs');
        }
        return '';
    }
    //设置拓扑提示信息生成器
    this.getToolTip = getToolTip;
	*/
};
twaver.Util.ext('bgp.webglNetwork', twaver.canvas.Network, {
	/*resetLogo: function () {
        //设置Logo位置
        this.logo.style.left = this.getView().scrollLeft + 'px';
        this.logo.style.top = this.getView().scrollTop + this.getView().offsetHeight - this.logo.height + 'px';
	}*/
});


//自定义节点基类，主要用于从后台业务json对象构造节点，或从节点生成业务json对象
bgp.BgpNode = function(data) {
    bgp.BgpNode.superClass.constructor.call(this, data);
}
twaver.Util.ext('bgp.BgpNode', twaver.Node, {
    toData: function() {
        return {
            id: this.getId(),
            num: this.getClient('num'),
            alias: this.getClient('alias'),
            name: this.getClient('name'),
            links: !this.getLinks() ? 0 : this.getLinks().size()
            //location: {x: this.getX(), y: this.getY()}
        };
    }
});

//自定义连线基类，主要用于从后台业务json对象构造连线
bgp.BgpLink = function(data, from, to) {
    bgp.BgpLink.superClass.constructor.call(this, data, from, to);
}
twaver.Util.ext('bgp.BgpLink', twaver.Link, {
    toData: function() {
        return {
            id: this.getId(),
            from: this.getFromNode().getId(),
            to: this.getToNode().getId(),
            prefixs: this.getClient('prefixs')
        };
    }
});

//AS节点
bgp.AsNode = function(data) {
    bgp.AsNode.superClass.constructor.call(this, data);
   // if (this.isUserAsNode(parseInt(data.clients.num)))
    //  this.setImage('user_as');
    //else
    //  this.setImage('as');
}
twaver.Util.ext('bgp.AsNode', bgp.BgpNode, {
  isUserAsNode: function (id){
    if (id == 60001)
      return true;
    else
      return false;
  },
  toData:function(){
		return {
			id:this.getId(),
			location: {x: this.getX(), y: this.getY()}
		};
	}
});

//RR节点
bgp.RrNode = function(data) {
    bgp.RrNode.superClass.constructor.call(this, data);
   // if (data.clients.links > 0)
    //  this.setImage('rr');
    //else
    //  this.setImage('r');
}
twaver.Util.ext('bgp.RrNode', bgp.BgpNode, {
   toData:function(){
		return {
			id:this.getId(),
			location: {x: this.getX(), y: this.getY()}
		};
	}
});

//R节点
bgp.RNode = function(data) {
    bgp.RNode.superClass.constructor.call(this, data);
    //if (data.clients.links > 0)
    //  this.setImage('rr');
    //else
    //  this.setImage('r');
}
twaver.Util.ext('bgp.RNode', bgp.BgpNode, {
   toData:function(){
		return {
			id:this.getId(),
			location: {x: this.getX(), y: this.getY()}
		};
	}
});

//AS连线
bgp.AsLink = function(data, from, to) {
    bgp.AsLink.superClass.constructor.call(this, data, from, to);
}
twaver.Util.ext('bgp.AsLink', bgp.BgpLink, {

});

//R连线
bgp.RLink = function(data, from, to) {
    bgp.RLink.superClass.constructor.call(this, data, from, to);
}
twaver.Util.ext('bgp.RLink', bgp.BgpLink, {

});
