var cy;
var id;
var activeNode;
var flag = true;

var _rootData, _rootNode;

/** 网页当前状态判断 (解决没布局完就切换页面造成点聚集在一起)*/
var hidden, state, visibilityChange;
if (typeof document.hidden !== "undefined") {
    hidden = "hidden";
    visibilityChange = "visibilitychange";
    state = "visibilityState";
} else if (typeof document.mozHidden !== "undefined") {
    hidden = "mozHidden";
    visibilityChange = "mozvisibilitychange";
    state = "mozVisibilityState";
} else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange";
    state = "msVisibilityState";
} else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
    state = "webkitVisibilityState";
}


var _COLOR = {
    //node :   {person: '#09ACB2',company:'#128BED',current:'#FD485E'},
    //node :   {person: '#20BDBF',company:'#4EA2F0',current:'#FD485E'},
    node: {project: '#FD485E', company: '#409EFF', person: '#ff9e00',event: '#67C23A'},
    //node :   {person: '#a177bf',company:'#4ea2f0',current:'#FD485E'},
    //node :   {person: '#f2af00',company:'#0085c3',current:'#7ab800'},
    //border : {person: '#09ACB2',company:'#128BED',current:'#FD485E'},
    //border : {person: '#57A6A8',company:'#128BED',current:'#FD485E'},
    border: {project: '#FD485E', company: '#128BED', person: '#EF941B', event:'#67C23A'},
    //border : {person: '#7F5AB8',company:'#128BED',current:'#FD485E'},
    //border : {person: '#f2af00',company:'#0085c3',current:'#7ab800'},
    //line:    {invest:'#128BED',employ:'#FD485E',legal:'#09ACB2'},
    //line:    {invest:'#4EA2F0',employ:'#20BDBF',legal:'#D969FF'}
    line: {invest: '#fd485e', employ: '#4ea2f0', legal: '#4ea2f0'}
    //line:    {invest:'#e43055',employ:'#a177bf',legal:'#4ea2f0'}
};
var _currentKeyNo, _companyRadius = 35, _personRadius = 15, _circleMargin = 10, _circleBorder = 3,
    _layoutNode = {}, _isFocus = false;
var _maxChildrenLength = 0;

// $('#context').hide();
$("#context").hide();


document.addEventListener(visibilityChange, function() {

    if(document[state] == 'visible'){
        if(_isNeedReload){
            $("#MainCy").html('');
            $('#TrTxt').removeClass('active');
            console.log(2)
            getData(_currentKeyNo);
        }
        //document.title = 'hidden-not-loaded'
    } else {
        if(!_isGraphLoaded){
            _isNeedReload = true;
        }
    }
}, false);


var dataList;

// 请求数据
function getData() {
    console.log('请求数据')
    var _currentKeyNo= '75fcf8cab66b9053a2e407dd1cc49ac5'
    $.ajax({
        url: './mock1.json',
        type: 'GET',
        dataType: 'JSON',
        success: function (re) {
            re = re.data;
            dataList = re;
            _rootData = getRootData(dataList);
            domUpdate(_rootData);
        }
    })
}

// 新增实体
function addNode() {
    $('.addNodeDialog').show()
    // console.log(dataList);
    // let obj = {
    //         "id":"864268183",
    //         "labels":[
    //             "Person"
    //         ],
    //         "properties":{
    //             "keyNo":"p4c2ddb3fcc91aa0e71f286bede57d20",
    //             "role":"",
    //             "name":"新增",
    //             "hasImage":false
    //         }
    // }
    // dataList[0].graph.nodes.push(obj);
    // _rootData = getRootData(dataList);
    // domUpdate(_rootData);
}



// 图谱、筛选面板更新
function domUpdate(graphData) {
    console.log('图谱、筛选面板更新')
    getD3Position(graphData);
    console.log(graphData)
    setTimeout(function () {
        drawGraph(transformData(graphData));
    }, 5000);

    selPanelUpdateList(graphData.nodes, graphData.links, true);
}


// 数据处理：将原始数据转换成graph数据
function getRootData(list) {
    console.log('开始处理数据')
    var graph = {}
    graph.nodes = [];
    graph.links = [];

    //graph.nodes
    for (var i = 0; i < list.length; i++) {
        var nodes = list[i].graph.nodes;
        for (var j = 0; j < nodes.length; j++) {
            var node = nodes[j];
            var o = {};
            o.nodeId = node.id;
            o.data = {};
            o.data.obj = node;
            //o.data.showStatus = 'NORMAL'; // NORMAL HIGHLIGHT DULL
            o.data.showStatus = null; // NORMAL HIGHLIGHT DULL
            o.layout = {}
            o.layout.level = null; // 1 当前查询节点
            o.layout.singleLinkChildren = []; // 只连接自己的node
            graph.nodes.push(o);
            _rootNode = o;
            // console.log(_rootNode)
            // 设置_rootNode`
            // if (_currentKeyNo == o.data.obj.properties.keyNo){
            //     _rootNode = o;
            // }
        }
    }
    graph.nodes = uniqeByKeys(graph.nodes, ['nodeId']);

    //graph.links
    for (var i = 0; i < list.length; i++) {
        var relationships = list[i].graph.links;

        for (var k = 0; k < relationships.length; k++) {
            var relationship = relationships[k];
            var o = {}
            o.data = {};
            o.data.obj = relationship;
            //o.data.showStatus = 'NORMAL'; // NORMAL HIGHLIGHT DULL
            o.data.showStatus = null; // NORMAL HIGHLIGHT DULL
            o.sourceNode = getGraphNode(relationship.startNode, graph.nodes);
            o.targetNode = getGraphNode(relationship.endNode, graph.nodes);
            o.linkId = relationship.id;
            o.source = getNodesIndex(relationship.startNode,graph.nodes);
            o.target = getNodesIndex(relationship.endNode,graph.nodes);
            graph.links.push(o);
        }
        console.log(graph)
    }
    graph.links = uniqeByKeys(graph.links, ['linkId']);


    //emplyRevert(graph.links);
    //mergeLinks(graph.links);
    setLevel(graph.nodes, graph.links);
    setCategoryColor(graph.nodes, graph.links);
    // console.log(graph)
    return graph;
}

// 去重操作
function uniqeByKeys(array, keys) {
    //将对象元素转换成字符串以作比较
    function obj2key(obj, keys) {
        var n = keys.length,
            key = [];
        while (n--) {
            key.push(obj[keys[n]]);
        }
        return key.join('|');
    }

    var arr = [];
    var hash = {};
    for (var i = 0, j = array.length; i < j; i++) {
        var k = obj2key(array[i], keys);
        if (!(k in hash)) {
            hash[k] = true;
            arr.push(array[i]);
        }
    }
    return arr;
};

// 数据处理：设置节点层级
function setLevel(svg_nodes, svg_links) {
    function getNextNodes(nodeId, links, parentLevel) {
        var nextNodes = [];
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            if (nodeId == link.sourceNode.nodeId && !link.targetNode.layout.level) {
                link.targetNode.layout.level = parentLevel;
                nextNodes.push(link.targetNode);
            } else if (nodeId == link.targetNode.nodeId && !link.sourceNode.layout.level) {
                link.sourceNode.layout.level = parentLevel;
                nextNodes.push(link.sourceNode);
            }
        }
        nextNodes = uniqeByKeys(nextNodes, ['nodeId']);

        return nextNodes;
    }

    var level = 1;
    var nodes = [];
    nodes.push(_rootNode);
    // console.log(nodes)
    while (nodes.length) {
        var nextNodes = [];
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            node.layout.level = level;
            // console.log(getNextNodes(node.nodeId, svg_links, level))
            nextNodes = nextNodes.concat(getNextNodes(node.nodeId, svg_links, level));
        }
        level++;
        nodes = nextNodes;
    }
}

// 数据处理：设置节点角色
function setCategoryColor(nodes, links) {
    for (var i = 0; i < links.length; i++) {
        var sameLink = {}; // 两点间连线信息
        sameLink.length = 0; // 两点间连线数量
        sameLink.currentIndex = 0; // 当前线索引
        sameLink.isSetedSameLink = false;
        links[i].sameLink = sameLink;
    }

    /*链接相同两点的线*/
    for (var i = 0; i < links.length; i++) {
        var baseLink = links[i];

        if (baseLink.sameLink.isSetedSameLink == false) {
            baseLink.sameLink.isSetedSameLink = true;
            var nodeId1 = baseLink.sourceNode.nodeId;
            var nodeId2 = baseLink.targetNode.nodeId;

            var sameLinks = [];
            sameLinks.push(baseLink);
            for (var j = 0; j < links.length; j++) {
                var otherLink = links[j];
                if (baseLink.linkId != otherLink.linkId && !otherLink.sameLink.isSetedSameLink) {
                    if ((otherLink.sourceNode.nodeId == nodeId1 && otherLink.targetNode.nodeId == nodeId2) ||
                        (otherLink.sourceNode.nodeId == nodeId2 && otherLink.targetNode.nodeId == nodeId1)) {
                        sameLinks.push(otherLink);
                        otherLink.sameLink.isSetedSameLink = true;
                    }
                }
            }

            for (var k = 0; k < sameLinks.length; k++) {
                var oneLink = sameLinks[k];
                oneLink.sameLink.length = sameLinks.length; // 两点间连线数量
                oneLink.sameLink.currentIndex = k; // 当前线索引
            }
        }
    }

    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (node.data.obj.labels[0] == 'correlation_project') { // 当前节点
            node.data.color = _COLOR.node.company;
            node.data.strokeColor = _COLOR.border.company;
        } else if (node.data.obj.labels[0] == 'state_relevantpeople') {
            node.data.color = _COLOR.node.person;
            node.data.strokeColor = _COLOR.border.person;
        } else if (node.data.obj.labels[0] == 'projects'){
            node.data.color = _COLOR.node.project;
            node.data.strokeColor = _COLOR.border.project;
        } else {
            node.data.color = _COLOR.node.person;
            node.data.strokeColor = _COLOR.border.person;
        }
    }
}

// 数据处理：根据nodeId获取node
function getGraphNode(nodeId, nodes) {
    var node = null;
    for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].nodeId == nodeId) {
            node = nodes[i];
            break;
        }
    }
    return node;
}

// 数据处理：根据nodeId获取node 索引
function getNodesIndex(nodeId,nodes) {
    var index = 0;
    for(var i = 0; i < nodes.length; i++){
        var node = nodes[i];
        if(nodeId == node.nodeId){
            index = i;
            break;
        }
    }
    return index;
}


/**其他*/

function getD3Position(graph) {
    getLayoutNode(graph);

    function filterLinks1(graph) {
        // 筛选用于布局的links
        var layoutLinks = [];
        for (var i = 0; i < graph.links.length; i++) {
            var link = graph.links[i];
            var sourceLevel = link.sourceNode.layout.level;
            var targetLevel = link.targetNode.layout.level;
            var sourceNode = link.sourceNode;
            var targetNode = link.targetNode;
//            sourceNode.layout.isSetLink = false;
//            targetNode.layout.isSetLink = false;


//            if(!sourceNode.layout.isSetLink && !targetNode.layout.isSetLink){
            if ((sourceLevel == 1 && targetLevel == 2) || (sourceLevel == 2 && targetLevel == 1)) {
//                    sourceNode.layout.isSetLink = true;
//                    targetNode.layout.isSetLink = true;
                layoutLinks.push(link);
            }
            if ((sourceLevel == 2 && targetLevel == 3) || (sourceLevel == 3 && targetLevel == 2)) {
//                    sourceNode.layout.isSetLink = true;
//                    targetNode.layout.isSetLink = true;
                layoutLinks.push(link);
            }
//            }

        }

        layoutLinks.forEach(function (link, i) {

            if (link.targetNode.layout.level == 3) {
                layoutLinks.forEach(function (alink, j) {
                    if (alink.linkId != link.linkId &&
                        (alink.targetNode.nodeId == link.targetNode.nodeId || alink.sourceNode.nodeId == link.targetNode.nodeId)) {
                        layoutLinks.splice(j, 1);
                    }
                })
            }

            if (link.sourceNode.layout.level == 3) {
                layoutLinks.forEach(function (alink, j) {
                    if (alink.linkId != link.linkId &&
                        (alink.targetNode.nodeId == link.sourceNode.nodeId || alink.sourceNode.nodeId == link.sourceNode.nodeId)) {
                        layoutLinks.splice(j, 1);
                    }
                })
            }
        })

        return layoutLinks;
    }

    function filterLinks2(graph) {
        // console.log(2)
        // 筛选用于布局的links
        var layoutLinks = [];
        for (var i = 0; i < graph.links.length; i++) {
            var link = graph.links[i];
            var sourceLevel = link.sourceNode.layout.level;
            var targetLevel = link.targetNode.layout.level;
            var sourceNode = link.sourceNode;
            var targetNode = link.targetNode;


            if ((sourceLevel == 1 && targetLevel == 2) || (sourceLevel == 2 && targetLevel == 1)) {
                layoutLinks.push(link);
            }
            if ((sourceLevel == 2 && targetLevel == 3) || (sourceLevel == 3 && targetLevel == 2)) {
                layoutLinks.push(link);
            }

        }

        return layoutLinks;
    }

    function initD3Data(graph) { //
        // console.log(3)
        function getIndex(val,arr) {
            var index = 0;
            for(var i = 0; i < arr.length; i++){
                var obj = arr[i];
                if(val == obj.nodeId){
                    index = i;
                    break;
                }
            }
            return index;
        }

        /*封装符合d3的数据*/
        for (var i = 0; i < graph.nodes.length; i++) {
            var node = graph.nodes[i];
            node.id = node.nodeId;
        }

        for (var i = 0; i < graph.links.length; i++) {
            var link = graph.links[i];
            link.source = getIndex(link.sourceNode.nodeId, graph.nodes) ;
            link.target = getIndex(link.targetNode.nodeId, graph.nodes) ;
            link.index = i; //
        }

        graph.layoutLinks = filterLinks1(graph);

        // 围绕节点最大数值
        setSingleLinkNodes(graph.layoutLinks);
        graph.nodes.forEach(function (node, i) {
            if (node.layout.singleLinkChildren.length && _maxChildrenLength < node.layout.singleLinkChildren.length) {
                _maxChildrenLength = node.layout.singleLinkChildren.length
            }
        })
        //console.log('围绕节点最大数值:' + _maxChildrenLength);
    }

    initD3Data(graph); //

    var width = $("#MainD3 svg").width();
    var height = $("#MainD3 svg").height();

    var strength = -600, distanceMax = 330, theta = 0, distance = 130, colideRadius = 35, distanceMin = 400;
    // 根据节点数量调节
    if (graph.nodes.length < 50) {
        strength = -800;
        distanceMax = 400;
    } else if (graph.nodes.length > 50 && graph.nodes.length < 100) {
        strength = -800;
        distanceMax = 350;
        distance = 130;
        colideRadius = 35;
    } else if (graph.nodes.length > 100 && graph.nodes.length < 150) {
        strength = -900;
        distanceMax = 450;
    } else if (graph.nodes.length > 150 && graph.nodes.length < 200) {
        strength = -1000;
        distanceMax = 500;
    } else if (graph.nodes.length > 200) {
        strength = -1600;
        distanceMax = 500;
        theta = 0.6, distance = 100, colideRadius = 35;
    }
    // 根据围绕数量调节
    if (_maxChildrenLength > 50 && _maxChildrenLength < 100) {
        strength = -2000;
        distanceMax = 500;
    } else if (_maxChildrenLength > 1000 && _maxChildrenLength < 2000) {
        strength = -4000;
        distanceMax = 1500;
    }
    // console.log(graph.nodes)
    d3.forceSimulation(graph.nodes)
        .force('charge', d3.forceManyBody().strength(strength).distanceMax(distanceMax).theta(theta))
        .force('link', d3.forceLink(graph.layoutLinks).distance(distance))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius(function () {
            return colideRadius;
        }))
    // .on('tick',ticked);
}


//设置符合Layout的node
function getLayoutNode(graphData) {
    // console.log(4)
    var layoutNode = {current: _rootNode, level1: [], level2: [], level3: [], level4: [], level5: [], other: []};

    graphData.nodes.forEach(function (node, i) {
        switch (node.layout.level) {
            case 1:
                layoutNode.level1.push(node);
                break;
            case 2:
                layoutNode.level2.push(node);
                break;
            case 3:
                layoutNode.level3.push(node);
                break;
            case 4:
                layoutNode.level4.push(node);
                break;
            case 5:
                layoutNode.level5.push(node);
                break;
            default:
                layoutNode.other.push(node);
                break;
        }
    });

    _layoutNode = layoutNode;

    return layoutNode;
}

// 数据处理：设置唯一孩子
function setSingleLinkNodes(links) {
    console.log('设置数据唯一的孩子')
    function isSingleLink(nodeId, links) {
        var hasLinks = 0;
        var isSingle = true;
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            if (link.targetNode.nodeId == nodeId || link.sourceNode.nodeId == nodeId) {
                hasLinks++;
            }
            if (hasLinks > 1) {
                isSingle = false;
                break;
            }
        }

        return isSingle;
    } // isSingleLink

    links.forEach(function (link, i) {
        if (isSingleLink(link.sourceNode.nodeId, links)) {
            link.targetNode.layout.singleLinkChildren.push(link.sourceNode);
        }
        if (isSingleLink(link.targetNode.nodeId, links)) {
            link.sourceNode.layout.singleLinkChildren.push(link.targetNode);
        }
    });
}

//筛选面板：列表更新
function selPanelUpdateList(nodes, links, isShowCheckbox) {
    $('.tp-list').html('');
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var index = i + 1;
        var name = node.data.obj.properties.name;
        var keyNo = node.data.obj.properties.keyNo;
        var str = '';
        if (isShowCheckbox) {
            str = '<div class="checkbox" node_id="' + node.nodeId + '" keyno="' + keyNo + '"> <input checked type="checkbox"><label> ' + index + '.' + name + '</label> </div>';
//            var str = '<div class="checkbox" node_id="'+ node.nodeId +'" keyno="'+ keyNo +'"> <label> ' + index + '.' + name + '</label> </div>';
        } else {
            str = '<div class="checkbox" node_id="' + node.nodeId + '" keyno="' + keyNo + '"><label> ' + index + '.' + name + '</label> </div>';
        }

        $('.tp-list').append(str);
    }

    $('.tp-list > div > label').click(function () {
        var _parent = $(this).parent();
        var nodeId = _parent.attr('node_id');

        focusReady(getGraphNode(nodeId, nodes));
    });

    $('.tp-list > div > input').click(function () {
        /*var _this = $(this);
        var _parent = $(this).parent();
        var nodeId = _parent.attr('node_id');
        var checkedNodeIds = $('.tp-list').attr('node_ids');
        if(checkedNodeIds){
            checkedNodeIds = checkedNodeIds.split(',');
        }*/

        var checkedNodeIds = [];
        $('.tp-list input:checked').each(function () {
            var _parent = $(this).parent();
            var nodeId = _parent.attr('node_id');
            checkedNodeIds.push(nodeId);
        });

        /*if(_this.is(':checked')){
            checkedNodeIds.push(nodeId);
            nodes.splice(1,1);
            console.log('checked');
        } else {
            console.log('un checked');
            var sub_nodes = []
            sub_nodes = nodes.splice(0,1);
            console.log(nodes);
            console.log(sub_nodes);
            graphInit(nodes, links);
        }*/
        highLight(checkedNodeIds, cy);
        /*// 需要隐藏的节点及子节点
        var choosedNode = getGraphNode(nodeId,nodes);
        var subNodes = getSubNodes(choosedNode,links);
        subNodes.push(choosedNode);

        // 剩下的节点
        var lastNodes = [];
        for(var i = 0; i < nodes.length; i++){
            var node = nodes[i];
            if(!getGraphNode(node.nodeId,subNodes)){
                lastNodes.push(node);
            }
        }

        // 剩下的连线
        var lastLinks = filterLinksByNodes(lastNodes,links);

        graphInit(lastNodes, lastLinks);
        if(_this.is(':checked')){
            nodes.splice(1,1);
            console.log('checked');
        } else {
            console.log('un checked');
            var sub_nodes = []
            sub_nodes = nodes.splice(0,1);
            console.log(nodes);
            console.log(sub_nodes);
            graphInit(nodes, links);
        }
        console.log(nodeId);*/
    });
}

function drawGraph(elements) {
    // console.log(elements);
    _currentKeyNo, _companyRadius = 35, _personRadius = 15, _circleMargin = 10, _circleBorder = 3;
    cy = cytoscape({
        container: document.getElementById('MainCy'),
        motionBlur: false,
        textureOnViewport: false,
        wheelSensitivity: 0.1,
        elements: elements,
        minZoom: 0.4,
        maxZoom: 2.5,
        layout: {
            name: 'preset',
            componentSpacing: 40,
            nestingFactor: 12,
            padding: 10,
            edgeElasticity: 800,
            stop: function (e) {

                //解决浏览器标签切换排列问题
                if (document[state] == 'hidden') {
                    _isNeedReload = true;
//                        console.log('stop _isNeedReload=true');
                } else {
                    _isNeedReload = false;
                }
                setTimeout(function () {
                    if (document[state] == 'hidden') {
                        _isGraphLoaded = false;
                        console.log('stop _isGraphLoaded=false');
                    } else {
                        _isGraphLoaded = true;
                    }
                }, 1000);
            }
        },
        style: [
            {
                selector: 'node',
                style: {
                    shape: 'ellipse',
                    width: function (ele) {
                        // console.log(ele)
                        //当前节点有图片
                        if (ele.data("type") == 'Person' && _currentKeyNo == ele.data('keyNo') && ele.data('hasImage')) {
                            return 80;
                        }
                        //有图片
                        if (ele.data('hasImage') && ele.data('type') == 'Person') {
                            return 60;
                        }
                        //普通
                        if (ele.data("type") == 'Company') {
                            return 60;
                        }
                        return 65;
                    },
                    height: function (ele) {
                        //当前节点有图片
                        if (ele.data("type") == 'Person' && _currentKeyNo == ele.data('keyNo') && ele.data('hasImage')) {
                            return 80;
                        }
                        //有图片
                        if (ele.data('hasImage') && ele.data('type') == 'Person') {
                            return 60;
                        }
                        //普通
                        if (ele.data("type") == 'Company') {
                            return 60;
                        }
                        return 65;
                    },
                    'background-color': function (ele) {
                        return ele.data('color');
                    },
                    'background-fit': 'cover',
                    'background-image': function (ele) {
                        var hasImage = ele.data('hasImage');
                        var keyNo = ele.data('keyNo');
                        var type = ele.data('type');
                        if (hasImage && type == 'Person') {
                            return '/proxyimg_' + keyNo + '.jeg';
                        } else {
                            return 'none';
                        }
                    },
                    // 'background-image-crossorigin': 'use-credentials',
                    'border-color': function (ele) {
                        return ele.data("borderColor");
                    },
                    'border-width': function (ele) {
                        if (ele.data('hasImage') && ele.data('type') == 'Person') {
                            return 3;
                        } else {
                            return 1;
                        }
                    },
                    'border-opacity': 1,
                    label: function (ele) {
                        var label = ele.data("name");
                        var length = label.length;
                        if (length <= 5) { // 4 5 4排列
                            return label;
                        } else if (length >= 5 && length <= 9) {
                            return label.substring(0, length - 5) + '\n' + label.substring(length - 5, length);
                        } else if (length >= 9 && length <= 13) {
                            return label.substring(0, 4) + '\n' + label.substring(4, 9) + '\n' + label.substring(9, 13);
                        } else {
                            return label.substring(0, 4) + '\n' + label.substring(4, 9) + '\n' + label.substring(9, 12) + '..';
                        }
                    },
                    'z-index-compare': 'manual',
                    'z-index': 20,
                    color: "#fff",
                    //'padding-top':0,
                    'padding': function (ele) {
                        if (ele.data("type") == 'Company') {
                            return 3;
                        }
                        return 0;
                    },
                    'font-size': 12,
                    //'min-height':'400px',
                    //'ghost':'yes',
                    //'ghost-offset-x':300,
                    //'font-weight':800,
                    //'min-zoomed-font-size':6,
                    'font-family': 'microsoft yahei',
                    'text-wrap': 'wrap',
                    'text-max-width': 60,
                    'text-halign': 'center',
                    'text-valign': 'center',
                    'overlay-color': '#fff',
                    'overlay-opacity': 0,
                    'background-opacity': 1,
                    'text-background-color': '#000',
                    'text-background-shape': 'roundrectangle',
                    'text-background-opacity': function (ele) {
                        if (ele.data('hasImage') && ele.data('type') == 'Person') {
                            return 0.3;
                        } else {
                            return 0
                        }
                    },
                    'text-background-padding': 0,
                    'text-margin-y': function (ele) {
                        //当前节点有图片
                        if (ele.data("type") == 'Person' && _currentKeyNo == ele.data('keyNo') && ele.data('hasImage')) {
                            return 23;
                        }
                        // 有图片
                        if (ele.data('hasImage') && ele.data('type') == 'Person') {
                            return 16;
                        }
                        //
                        if (ele.data("type") == 'Company') {
                            return 4;
                        }
                        return 2;
                    },
                },
            },
            {
                selector: 'edge',
                style: {
                    'line-style': function (ele) {
                        return 'solid';
                        /*if(ele.data('data').obj.type == 'INVEST'){
                            return 'solid';
                        } else {
                            return 'dashed'
                        }*/
                    },
                    'curve-style': 'bezier',
                    'control-point-step-size': 20,
                    'target-arrow-shape': 'triangle-backcurve',
                    'target-arrow-color': function (ele) {

                        return ele.data("color");
                    },
                    'arrow-scale': 0.5,
                    'line-color': function (ele) {
                        //return '#aaaaaa';
                        return ele.data("color");
                    },
                    label: function (ele) {
                        return '';
                    },
                    'text-opacity': 0.8,
                    'font-size': 12,
                    'background-color': function (ele) {
                        return '#ccc';
                        return ele.data("color");
                    },
                    'width': 0.3,
                    'overlay-color': '#fff',
                    'overlay-opacity': 0,
                    'font-family': 'microsoft yahei',
                }
            },
            {
                "selector": ".autorotate",
                "style": {
                    "edge-text-rotation": "autorotate"
                }
            },
            {
                selector: '.nodeActive',
                style: {
                    /*'background-color':function (ele) {
                        if(ele.data("category")==1){
                            return "#5c8ce4"
                        }
                        return "#d97a3a";
                    },*/
                    //'z-index':300,
                    'border-color': function (ele) {
                        return ele.data("color");
                    },
                    'border-width': 10,
                    'border-opacity': 0.5
                }
            },
            {
                selector: '.edgeShow',
                style: {
                    'color': '#999',
                    'text-opacity': 1,
                    'font-weight': 400,
                    label: function (ele) {
                        return ele.data("label");
                    },
                    'font-size': 10,
                }
            },
            {
                selector: '.edgeActive',
                style: {
                    'arrow-scale': 0.8,
                    'width': 1.5,
                    'color': '#330',
                    'text-opacity': 1,
                    'font-size': 12,
                    'text-background-color': '#fff',
                    'text-background-opacity': 0.8,
                    'text-background-padding': 0,
                    'source-text-margin-y': 20,
                    'target-text-margin-y': 20,
                    //'text-margin-y':3,
                    'z-index-compare': 'manual',
                    'z-index': 1,
                    'line-color': function (ele) {
                        return ele.data("color");
                    },
                    'target-arrow-color': function (ele) {
                        return ele.data("color");
                    },
                    label: function (ele) {

                        /*if(ele.data('data').obj.type == 'INVEST'){
                            return 'solid';
                        } else {
                            return 'dashed'
                        }*/
                        return ele.data("label");
                    }
                }

            },
            {
                selector: '.hidetext',
                style: {
                    'text-opacity': 0,
                }
            },
            {
                selector: '.dull',
                style: {
                    'z-index': 1,
                    opacity: 0.2,
                }
            },
            {
                selector: '.nodeHover',
                style: {
                    shape: 'ellipse',
                    'background-opacity': 0.9,
                }
            },
            {
                selector: '.edgeLevel1',
                style: {
                    label: function (ele) {
                        return ele.data("label");
                    },
                }
            },
            {
                selector: '.edgeShowText',
                style: {
                    label: function (ele) {
                        return ele.data("label");
                    },
                }
            },
            {
                selector: '.lineFixed',// 加载完成后，加载该类，修复线有锯齿的问题
                style: {
                    'overlay-opacity': 0,
                }
            },
        ],
    });

    cy.on('click', 'node', function (evt) {
        if (evt.target._private.style['z-index'].value == 20) { // 非暗淡状态
            console.log('非暗淡状态')
            _isFocus = true;
            var node = evt.target;

            highLight([node._private.data.id], cy);

            if (node.hasClass("nodeActive")) {
                console.log('存在')
                activeNode = null;
                $('#company-detail').hide();
                node.removeClass("nodeActive");
                cy.collection("edge").removeClass("edgeActive");
            } else {
                console.log('不存在')
                var nodeData = node._private.data;
                console.log(node._private.data)
                if (nodeData.type == 'Company') {
                    showDetail2(nodeData.keyNo, 'company_muhou3');
                    cy.collection("node").addClass('nodeDull');
                } else {
                    showDetail2(node._private.data.data, 'company_muhou3', 'person');
                    cy.collection("node").addClass('nodeDull');
                }

                activeNode = node;
                cy.collection("node").removeClass("nodeActive");

                cy.collection("edge").removeClass("edgeActive");
                node.addClass("nodeActive");
                node.neighborhood("edge").removeClass("opacity");
                node.neighborhood("edge").addClass("edgeActive");
                node.neighborhood("edge").connectedNodes().removeClass("opacity");
            }
            //_firstTab = false;
        } else {
            console.log('暗淡状态')
            _isFocus = false;
            activeNode = null;
            cy.collection("node").removeClass("nodeActive");
            $('.tp-detail').fadeOut();
            cancelHighLight();
        }
    });
    var showTipsTime = null;
    cy.on('mouseover', 'node', function (evt) {
        if (evt.target._private.style['z-index'].value == 20) { // 非暗淡状态
            //
            $("#Main").css("cursor", "pointer");

            //
            var node = evt.target;
            node.addClass('nodeHover');
            if (!_isFocus) {
                cy.collection("edge").removeClass("edgeShow");
                cy.collection("edge").removeClass("edgeActive");
                node.neighborhood("edge").addClass("edgeActive");
            }

            // 提示
            clearTimeout(showTipsTime);
            //if(node._private.data.name.length > 13 || (node._private.data.keyNo[0] == 'p' && node._private.data.name.length > 3) || node._private.data.layout.revel > 2){
            if (node._private.data.name.length > 13 || (node._private.data.keyNo && node._private.data.keyNo[0] == 'p' && node._private.data.name.length > 3)) {
                showTipsTime = setTimeout(function () {
                    var name = node._private.data.name;


                    // 显示在节点位置
                    /*var tipWidth = name.length * 12 + 16;
                    var x = node._private.data.d3x + 655 - (tipWidth / 2);
                    var y = node._private.data.d3y + 598;
                    if(node._private.data.type == 'Person'){
                        y = node._private.data.d3y + 590;
                    }*/


                    // 显示在鼠标位置
                    var event = evt.originalEvent || window.event;
                    var x = event.clientX + 10;
                    var y = event.clientY + 10;

                    var html = "<div class='tips' style='font-size:12px;background:white;box-shadow:0px 0px 3px #999;border-radius:1px;opacity:1;padding:1px;padding-left:8px;padding-right:8px;display:none;position: absolute;left:" + x + "px;top:" + y + "px;'>" + name + "</div>";
                    $('body').append($(html));
                    $('.tips').fadeIn();
                }, 600);
            }
        }
    });
    cy.on('mouseout', 'node', function (evt) {
        $("#Main").css("cursor", "default");

        // 提示
        $('.tips').fadeOut(function () {
            $('.tips').remove();
        });

        clearTimeout(showTipsTime);

        //
        var node = evt.target;
        node.removeClass('nodeHover');
        if (!_isFocus) {
            cy.collection("edge").removeClass("edgeActive");
            /*if(moveTimeer){
                clearTimeout(moveTimeer);
            }*/
            /*moveTimeer = setTimeout(function() {
                cy.collection("edge").addClass("edgeActive");
                //cy.collection("edge").addClass("edgeShow");
            }, 300);
            if(activeNode){
                activeNode.neighborhood("edge").addClass("edgeActive");
            }*/
        }
    });
    cy.on('mouseover', 'edge', function (evt) {
        if (!_isFocus) {
            var edge = evt.target;
            /*if(moveTimeer){
                clearTimeout(moveTimeer);
            }*/
            cy.collection("edge").removeClass("edgeActive");
            edge.addClass("edgeActive");
            /*if(activeNode){
                activeNode.neighborhood("edge").addClass("edgeActive");
            }*/
        }

    });
    cy.on('mouseout', 'edge', function (evt) {
        if (!_isFocus) {
            var edge = evt.target;
            edge.removeClass("edgeActive");
            // moveTimeer = setTimeout(function() {
            //     cy.collection("edge").addClass("edgeActive");
            //     //cy.collection("edge").addClass("edgeShow");
            // }, 400);
            if (activeNode) {
                activeNode.neighborhood("edge").addClass("edgeActive");
            }
        }

    });
    cy.on('vmousedown', 'node', function (evt) {
        var node = evt.target;
        if (!_isFocus) {
            highLight([node._private.data.id], cy);
        }
    });
    cy.on('tapend', 'node', function (evt) {
        if (!_isFocus) {
            cancelHighLight();
        }
    });

    cy.on('click', 'edge', function (evt) {
        _isFocus = false;
        activeNode = null;
        cy.collection("node").removeClass("nodeActive");
        $('.tp-detail').fadeOut();
        cancelHighLight();
    });
    cy.on('click', function (event) {
        var evtTarget = event.target;

        if (evtTarget === cy) {
            _isFocus = false;
            activeNode = null;
            cy.collection("node").removeClass("nodeActive");
            $('.tp-detail').fadeOut();
            cancelHighLight();
            focusCancel();
            filterReset();

            //cy.collection("edge").addClass("edgeActive");
        } else {
            //console.log('tap on some element');
        }
    });

    cy.on('zoom', function () {
        if (cy.zoom() < 0.5) {
            cy.collection("node").addClass("hidetext");
            cy.collection("edge").addClass("hidetext");
        } else {
            cy.collection("node").removeClass("hidetext");
            cy.collection("edge").removeClass("hidetext");
        }

        // 加载完成后，加载该类，修复线有锯齿的问题
        setTimeout(function () {
            cy.collection("edge").removeClass("lineFixed");
            cy.collection("edge").addClass("lineFixed");
        }, 200);
    })

    cy.on('pan', function () {
        console.log('完成')
        // 加载完成后，加载该类，修复线有锯齿的问题
        setTimeout(function () {
            cy.collection("edge").removeClass("lineFixed");
            cy.collection("edge").addClass("lineFixed");
        }, 200);
    });

    // 定位
    cy.nodes().positions(function (node, i) {

        // 保持居中
        // console.log(_currentKeyNo,node._private.data.keyNo);

        if (node._private.data.keyNo == _currentKeyNo) {
            var position = cy.pan();
            cy.pan({
                x: position.x - node._private.data.d3x,
                y: position.y - node._private.data.d3y
            });
        }

        //
        return {
            x: node._private.data.d3x,
            y: node._private.data.d3y
        };
    });

    cy.ready(function () {


        if (!$('#TrTxt').hasClass('active')) {
            $('#TrTxt').click();
        }

        cy.zoom({
            level: 1.0000095043745896, // the zoom level
        });
        // $("#load_data").hide();
        //cy.$('#'+id).emit('tap');
        //cy.center(cy.$('#'+id));
        //cy.collection("edge").addClass("edgeActive");

        // 加载完成后，加载该类，修复线有锯齿的问题
        setTimeout(function () {
            cy.collection("edge").addClass("lineFixed");
        }, 400);

        // 首页的插入图谱默认高亮第一层
        if (_rootData && _rootData.nodes.length > 30 && typeof _INSERT_URL != 'undefined' && _INSERT_URL) {
            highLight([_rootNode.nodeId], cy);
        }
    });

    cy.nodes(function (node) {

        /*
        // 当前查询节点关系文字显示
        if(node._private.data.nodeId == _rootNode.nodeId){
            node.neighborhood("edge").addClass("edgeLevel1");
        }*/
    });
}

//将rootData转换成cy图谱框架所需要的数据结构
function transformData(graphData) {
    // console.log()
    function getLinkColor(type) {
        if (type == 'INVEST') {
            return _COLOR.line.invest;
        } else if (type == 'EMPLOY') {
            return _COLOR.line.employ;
        } else if (type == 'LEGAL') {
            return _COLOR.line.legal;
        }else {
            return _COLOR.line.invest;
        }
    }

    function getLinkLabel(link) {
        var type = link.data.obj.type, role = link.data.obj.properties.role;
        if (type == 'INVEST') {
            return '投资';
        } else if (type == 'EMPLOY') {
            return (role ? role : '任职');
        } else if (type == 'LEGAL') {
            return '法定代表人';
        }else {
            return '投资';
        }
    }

    //getLayoutNode(graphData);

    //
    id = graphData.nodes[0].nodeId;
    var els = {};
    els.nodes = [];
    els.edges = [];

    graphData.links.forEach(function (link, i) {
        var color = getLinkColor(link.data.obj.type);
        var label = getLinkLabel(link);

        els.edges.push({
            data: {
                data: link.data,
                color: color,
                id: link.linkId,
                label: label,
                source: link.sourceNode.nodeId,
                target: link.targetNode.nodeId
            },
            classes: 'autorotate'
        });
    });

    graphData.nodes.forEach(function (node) {
        els.nodes.push({
            data: {
                nodeId: node.nodeId,
                type: node.data.obj.labels[0],
                keyNo: node.data.obj.properties.keyNo,
                data: node.data,
                id: node.nodeId,
                name: node.data.obj.properties.name,
                category: node.data.category,
                color: node.data.color,
                borderColor: node.data.strokeColor,
                layout: node.layout,
                d3x: node.x,
                d3y: node.y,
                hasImage: node.data.obj.properties.hasImage,
                //labelLine:1 // 解决文字行距问题，第1行
            }
        });
    });
    // console.log(els);
    return els;
}

/** d3 svg */
// var svg = d3.select('svg');
// svg.selectAll('g').remove();// 清空
// var svg_g = svg.append("g")
//
// // 结点
// var svg_nodes = svg_g.selectAll('circle')
//     .enter().append('circle')
//     .attr('r', function (d) {
//         if (d.data.obj.labels[0] == 'Company') {
//             return 33;
//         } else {
//             return 24;
//         }
//     })
//     .attr('fill', function (d, i) {
//         return d.data.color;
//     })
//     .style('opacity', 1)


// 鼠标按住当前人物，与其无直接关系的变白
function highLight(nodeIds, cy) {
    cy.collection("node").removeClass("nodeActive");
    cy.collection("edge").removeClass("edgeActive");
    cy.collection("node").addClass('dull');
    cy.collection("edge").addClass('dull');

    for (var i = 0; i < nodeIds.length; i++) {
        var nodeId = nodeIds[i];
        cy.nodes(function (node) {
            var nodeData = node._private.data;
            if (nodeData.id == nodeId) {
                node.removeClass('dull');
                //node.addClass('nodeActive');
                node.neighborhood("edge").removeClass("dull");
                node.neighborhood("edge").addClass("edgeActive");
                node.neighborhood("edge").connectedNodes().removeClass("dull");
                //node.neighborhood("edge").connectedNodes().addClass("nodeActive");
            }
        });
    }
}

// 鼠标松开当前人物，恢复原样
function cancelHighLight() {
    cy.collection("node").removeClass("nodeActive");
    cy.collection("edge").removeClass("edgeActive");
    cy.collection("node").removeClass('dull');
    cy.collection("edge").removeClass('dull');
}


function showDetail2(data) {
    console.log(data)
    $('.detail').show()
}


// 原版点击人物 展示详情
function showDetail3(keyNo, tupuUrl, type) {
    $(".company-detail").hide();

    if (type && type == 'person') {
        // var url = INDEX_URL+"boss_getDetail";
        $.ajax({
            url: './personDetail.json',
            type: 'GET',
            // data: {"keyNo": keyNo},
            dataType: 'JSON',
            success: function (data) {
                if (!data.name) return;
                $("#ScrollContent").remove();
                // $("#ShowPerTupu").after($("#PerDeailTpl").html());

                $("#NameBar").after($("#PerDeailTpl").html());

                /*人物搜索里的查看图谱*/
                if (_currentKeyNo == keyNo || !data.boss_id) {
                    $("#ShowPerTupu").attr('canshow', '0');
                    $("#ShowPerTupu").hide();
                } else {
                    $("#ShowPerTupu").attr('keyno', keyNo);
                    $("#ShowPerTupu").attr('canshow', '1');
                    $("#ShowPerTupu").show();
                }
                /*muhou3 muhou4里的查看图谱*/
                if (_currentKeyNo == keyNo) {
                    $("#ShowPerTupuA").parent().hide();
                } else {
                    $("#ShowPerTupuA").parent().show();
                    $("#ShowPerTupuA").attr("href", "/company_muhou4?keyNo=" + keyNo + "&name=" + encodeURIComponent(data.name));
                }

                $("#BossInfo").hide();

                $('.allRrelative').attr('href', '/pl_' + keyNo);

                $('.ea_name').text(data.name ? data.name : '-');
                $('.ea_name').attr('href', '/pl_' + keyNo);


                $('.ea_defaultImg').text();
                $('.ea_defaultImg').hide();
                $('#face_oss').show();
                if (data.boss_id) {
                    $('#face_oss').attr('src', data.face_oss);
                } else {
                    $('#face_oss').attr('src', 'https://co-image.qichacha.com/PersonImage/' + keyNo + '.jpg');
                }

                $('#PerCom').text(data.companyname ? data.companyname : '-');
                $('#PerJob').text(data.job ? data.job : '-');
                if (data.companykey) {
                    $('#PerCom').attr('href', '/firm_' + data.companykey);
                } else {
                    $('#PerCom').attr('href', '');
                }
                $("#des").parent().parent().removeAttr('style');

                $("#des").text(data.des ? data.des : '暂无');
                /*简介没有时隐藏*/
                if (!data.des) {
                    var desWrap = $("#des").parent().parent().parent();
                    desWrap.siblings('.detail-title-wrap').eq(0).remove();
                    desWrap.remove();
                }


                $(".relativeInfoCount").text(data.relativeInfoCount ? data.relativeInfoCount : '0');

                $("#relativeInfoData").html('');
                if (data.relativeInfoData && data.relativeInfoData.length) {
                    var html = '';
                    data.relativeInfoData.forEach(function (obj, index) {
                        obj.Name = obj.Name ? obj.Name : '-';
                        obj.OperName = obj.OperName ? obj.OperName : '-';
                        if (index < 10) {
                            html += '<tr><td>' +
                                '<a class="c_a" target="_blank" href="/firm_' + obj.KeyNo + '"><span>' + obj.Name + '</span></a></td>' +
                                '<td style="text-align: center;">' + obj.OperName + '</td></tr>'
                        }
                    })
                    $("#relativeInfoData").html(html);
                }

                if (data.boss_id) { // 热门人物
                    $("#BossInfo").show();
                    $('#biye').text(data.biye ? data.biye : '-');
                    $('#zhuanye').text(data.zhuanye ? data.zhuanye : '-');
                    $('#xueli').text(data.xueli ? data.xueli : '-');
                    $('#hobby').text(data.hobby ? data.hobby : '-');
                    $('#companyname').text(data.companyname ? data.companyname : '-');
                    $('#job').text(data.job ? data.job : '-');
                    /*教育经历*/
                    $('#edu').html('');
                    var edus = '';
                    if (data.edu) {
                        edus = JSON.parse(data.edu);
                    }
                    if (data.edu && edus && edus.length) {
                        var html = '';
                        edus.forEach(function (obj) {
                            if (!obj.TimeQuantum) {
                                obj.TimeQuantum = '-'
                            }
                            if (!obj.Diplomas) {
                                obj.Diplomas = '-'
                            }
                            if (!obj.University) {
                                obj.University = '-'
                            }
                            if (!obj.Major) {
                                obj.Major = '-'
                            }
                            html += '<table class="ntable"><tbody>' +
                                '<tr><td class="tb" style="width: 85px;">教育时间</td><td >' + obj.TimeQuantum + '</td></tr>' +
                                '<tr><td class="tb">学历</td><td>' + obj.Diplomas + '</td></tr>' +
                                '<tr><td class="tb">毕业院校</td><td>' + obj.University + '</td></tr>' +
                                '<tr><td class="tb">所学专业</td><td>' + obj.Major + '</td></tr>' +
                                '</tbody></table>';
                        })
                        $('#edu').html(html);
                        $('#edu-wrap').show();
                    } else {
                        $('#edu-wrap').hide();
                    }
                    /*工作经历*/
                    $('#everjob').html('');
                    var jobs = '';
                    if (data.everjob) {
                        jobs = JSON.parse(data.everjob);
                    }
                    if (data.everjob && jobs && jobs.length) {
                        var html = '';
                        jobs.forEach(function (obj) {
                            if (!obj.TimeQuantum) {
                                obj.TimeQuantum = '-'
                            }
                            if (!obj.Job) {
                                obj.Job = '-'
                            }
                            if (!obj.CompanyName) {
                                obj.CompanyName = '-'
                            }
                            if (!obj.Abstract) {
                                obj.Abstract = '-'
                            }
                            html += '<table class="ntable"><tbody>' +
                                '<tr><td class="tb" style="width: 85px;">工作时间</td><td >' + obj.TimeQuantum + '</td></tr>' +
                                '<tr><td class="tb">职位</td><td>' + obj.Job + '</td></tr>' +
                                '<tr><td class="tb">工作单位</td><td>' + obj.CompanyName + '</td></tr>' +
                                '<tr><td class="tb">描述</td><td>' +
                                '<div class="e_contentMore">' +
                                '<div class="ea_content">' + obj.Abstract + '</div>' +
                                '<a class="ea_bt">...展开</a>' +
                                '</div>' +
                                '</td></tr>' +
                                '</tbody></table>';
                        })
                        $('#everjob').html(html);
                        $('#everjob-wrap').show();
                    } else {
                        $('#everjob-wrap').hide();
                    }
                    /*重要事件*/
                    $('#milestone').html('');
                    var milestones = '';
                    if (data.milestone) {
                        milestones = JSON.parse(data.milestone);
                    }
                    if (data.milestone && milestones && milestones.length) {
                        var html = '';
                        milestones.forEach(function (obj) {
                            if (!obj.Milestone) {
                                obj.Milestone = '-'
                            }
                            html += '<tr><td><div class="e_contentMore">' +
                                '<div class="ea_content">' + obj.Milestone + '</div>' +
                                '<a class="ea_bt">...展开</a>' +
                                '</div></td></tr>';
                        })
                        $('#milestone').html(html);
                        $('#milestone-wrap').show();
                    } else {
                        $('#milestone-wrap').hide();
                    }
                    /*相关新闻*/
                    $('#sayings').html('');
                    var sayings = '';
                    if (data.sayings) {
                        sayings = JSON.parse(data.sayings);
                    }
                    if (data.sayings && sayings && sayings.length) {
                        var html = '';
                        sayings.forEach(function (obj) {
                            if (!obj.TimeQuantum) {
                                obj.TimeQuantum = '-'
                            }
                            if (!obj.Job) {
                                obj.Job = '-'
                            }
                            if (!obj.CompanyName) {
                                obj.CompanyName = '-'
                            }
                            if (!obj.Abstract) {
                                obj.Abstract = '-'
                            }
                            obj.Link = obj.Link.replace('http://', '');
                            obj.Link = obj.Link.replace('https://', '');
                            html += '<tr><td><a target="_blank" href="http://' + obj.Link + '">' + obj.Title + '</a></td></tr>';
                        })
                        $('#sayings').html(html);
                        $('#sayings-wrap').show();
                    } else {
                        $('#sayings-wrap').hide();
                    }
                }

                $("#person-detail").fadeIn();

                /*e_contentMore元素初始化*/
                $(".e_contentMore").each(function () {
                    var wrap = $(this);
                    var content = wrap.find(".ea_content");
                    var bt = wrap.find(".ea_bt");

                    var wrapHeight = wrap.height();
                    var contentHeight = content.height();
                    if (contentHeight > wrapHeight) {
                        bt.show();
                    } else {
                        bt.hide();
                    }
                    bt.click(function () {
                        if (bt.text() == "收起") {
                            wrap.css({maxHeight: wrapHeight});
                            bt.text("...展开");
                        } else {
                            wrap.css({maxHeight: (contentHeight + 20), height: (contentHeight + 20)});
                            bt.text("收起");
                        }

                        scrollTitleInit();
                    });
                })

                /*样式处理,bug #2191-1*/
                if ($("#BossInfo").is(':hidden')) {
                    $("#glgs").siblings('.ntable').addClass('marginNone');
                } else {
                    $("#glgs").siblings('.ntable').removeClass('marginNone');
                }

                /*$('#ScrollContent').slimScroll({
                    wheelStep: 1
                });*/

                scrollTitleInit();

            },
            error: function (data) {
                console.log(data);
            }
        });
    } else {
        $.ajax({
            url: './personDetail',
            type: 'GET',
            data: {"keyNo": keyNo},
            dataType: 'JSON',
            success: function (data) {
                if (data.Status != 200) {
                    return;
                }
                var companyDetail = $('#company-detail');
                companyDetail.find('.mao-img').attr("src", data.Result.ImageUrl);
                companyDetail.find('.mao-company-name').text(data.Result.Name);
                companyDetail.find('.mao-company-status').text(data.Result.ShortStatus || '-');
                if (data.Result.Oper && data.Result.Oper.Name) {
                    if (data.Result.Oper.KeyNo) {
                        if (data.Result.Oper.KeyNo[0] == 'p') {
                            companyDetail.find('.mao-oper').html('<a target="_blank" href="/pl_' + data.Result.Oper.KeyNo + '.html">' + data.Result.Oper.Name + '</a>');
                        } else {
                            companyDetail.find('.mao-oper').html('<a target="_blank" href="/firm_' + data.Result.Oper.KeyNo + '.shtml">' + data.Result.Oper.Name + '</a>');
                        }
                    } else {
                        companyDetail.find('.mao-oper').html('<a target="_blank" href="/people?name=' + encodeURI(data.Result.Oper.Name) + '&keyno=' + keyNo + '">' + data.Result.Oper.Name + '</a>');
                    }
                    if (data.Result.Oper.OperType == 1) {
                        companyDetail.find('.mao-oper').prev().text('法定代表人：');
                    } else if (data.Result.Oper.OperType == 2) {
                        companyDetail.find('.mao-oper').prev().text('执行事务合伙人：');
                    } else if (data.Result.Oper.OperType == 3) {
                        companyDetail.find('.mao-oper').prev().text('负责人：');
                    } else if (data.Result.Oper.OperType == 4) {
                        companyDetail.find('.mao-oper').prev().text('经营者：');
                    } else if (data.Result.Oper.OperType == 5) {
                        companyDetail.find('.mao-oper').prev().text('投资人：');
                    } else if (data.Result.Oper.OperType == 6) {
                        companyDetail.find('.mao-oper').prev().text('董事长：');
                    } else if (data.Result.Oper.OperType == 7) {
                        companyDetail.find('.mao-oper').prev().text('理事长：');
                    }
                } else {
                    companyDetail.find('.mao-oper').text('-');
                }

                companyDetail.find('.mao-ziben').text(data.Result.RegistCapi || '-');
                companyDetail.find('.mao-date').text((data.Result.StartDate || ''));
                companyDetail.find('.mao-company-name').attr("href", "firm_" + keyNo + ".shtml");
                if (!tupuUrl) {
                    tupuUrl = 'company_relation';
                }
                companyDetail.find('.mao-tupu-link').attr("href", tupuUrl + "?keyNo=" + keyNo + "&name=" + encodeURIComponent(data.Result.Name));
                //companyDetail.find('.mao-tupu-link').attr("onclick","zhugeTrack(\'图谱页面-侧边栏企业信息-查看图谱\')");
                companyDetail.find('.close').click(function () {
                    companyDetail.fadeOut();
                });

                if (_currentKeyNo == keyNo) {
                    $(".mao-tupu-link").parent().hide();
                } else {
                    $(".mao-tupu-link").parent().show();
                }

                var noData = '<div class="mao-noresult"> <p ><img src="/material/theme/chacha/cms/v2/images/nodata.png"></p>暂无信息</div>';

                //股东
                if (data.Result.Partners && data.Result.Partners.length > 0) {
                    var html = '<table class="ntable">';
                    html += "<thead><tr><th style='text-align: left'>名称</th><th>类型</th></tr></thead>";
                    for (var i = 0; i < data.Result.Partners.length; i++) {
                        html += "<tr>";
                        if (data.Result.Partners[i].KeyNo) {
                            if (data.Result.Partners[i].KeyNo[0] == 'p') {
                                html += '<td><a onclick="" target="_blank" href="/pl_' + data.Result.Partners[i].KeyNo + '.html">' + data.Result.Partners[i].StockName + '</a></td>';
                            } else {
                                html += '<td><a onclick="" target="_blank" href="/firm_' + data.Result.Partners[i].KeyNo + '.shtml">' + data.Result.Partners[i].StockName + '</a></td>';
                            }
                        } else {
                            if (data.Result.Partners[i].StockName.length > 3) {
                                html += "<td>" + data.Result.Partners[i].StockName + "</td>";
                            } else {
                                html += '<td><a onclick="" target="_blank" href="/people?name=' + encodeURI(data.Result.Partners[i].StockName) + '&keyno=' + keyNo + '">' + data.Result.Partners[i].StockName + '</a></td>';
                            }
                        }
                        html += "<td>" + (data.Result.Partners[i].StockType || "-") + "</td>";
                        html += "</tr>";
                    }
                    html += '</table>'

                    companyDetail.find('.gudong-list').html(html);


                } else {
                    companyDetail.find('.gudong-list').html(noData);
                }

                //投资
                if (data.Result.touziList && data.Result.touziList.length > 0) {

                    var html = '<table class="ntable">';
                    html += "<thead><tr><th  style='text-align: left'>名称</th></tr></thead>";
                    for (var i = 0; i < data.Result.touziList.length; i++) {
                        html += "<tr>";
                        html += "<td><a onclick='' href='/firm_" + data.Result.touziList[i].KeyNo + ".shtml' target='_blank'>" + data.Result.touziList[i].Name + "</a></td>";
                        html += "</tr>";
                    }
                    html += '</table>';
                    companyDetail.find('.touzi-list').html(html);
                } else {
                    companyDetail.find('.touzi-list').html(noData);
                }

                //成员
                if (data.Result.Employees && data.Result.Employees.length > 0) {
                    var html = '<table class="ntable">';
                    html += "<thead><tr><th  style='text-align: left'>名称</th><th>类型</th></tr></thead>";
                    for (var i = 0; i < data.Result.Employees.length; i++) {
                        html += "<tr>";
                        if (data.Result.Employees[i].KeyNo && data.Result.Employees[i].KeyNo[0] == 'p') {
                            html += '<td><a onclick="" target="_blank" href="/pl_' + data.Result.Employees[i].KeyNo + '.html">' + data.Result.Employees[i].Name + '</a></td>';
                        } else {
                            html += '<td><a onclick="" target="_blank" href="/people?name=' + encodeURI(data.Result.Employees[i].Name) + '&keyno=' + keyNo + '">' + data.Result.Employees[i].Name + '</a></td>';
                        }
                        html += "<td>" + (data.Result.Employees[i].Job || "-") + "</td>";
                        html += "</tr>";
                    }
                    html += '</table>';
                    companyDetail.find('.member-list').html(html);

                } else {
                    companyDetail.find('.member-list').html(noData);
                }

                $("#company-detail").fadeIn();
                companyDetail.find('.mao-tab-content').slimScroll({
                    wheelStep: 1
                });
            },
            error: function (data) {
                console.log(data);
            }
        });
    }
}

//筛选面板：取消聚焦
function focusCancel() {
    $('#ClearInput').hide();
    $('#FocusBt').text('聚焦');
    $('#FocusBt').addClass('focusDisable');
    $('#FocusInput').val('');
    $('#FocusInput').attr('node_id', '');
    selPanelUpdateList(_rootData.nodes, _rootData.links, true);
    cancelHighLight();
}

function filterReset() {
    $('#SelPanel').attr('param-level', '2');
    $('#SelPanel').attr('param-status', '');
    $('#SelPanel').attr('param-num', '');
    $('#SelPanel').attr('param-invest', '');

    $('#ShowLevel a').removeClass('active');
    $('#ShowLevel a').eq(1).addClass('active');
    $('#ShowStatus a').removeClass('active');
    $('#ShowStatus a').eq(0).addClass('active');
    $('#ShowInvest a').removeClass('active');
    $('#ShowInvest a').eq(0).addClass('active');
    $('#inputRange').val(0);
    $('#inputRange').css({'backgroundSize': '0% 100%'});
}

function canvasImg(imgData) {
    var img = new Image();
    // console.log(1)
    img.onload = function (e) {

        var canvas = document.createElement('canvas');  //准备空画布
        canvas.width = img.width;
        canvas.height = img.height;
        var context = canvas.getContext('2d');  //取得画布的2d绘图上下文
        context.fillStyle = "#fff";
        context.fillRect(0, 0, canvas.width, canvas.height);

        //画水印
        // var shuiying = new Image();
        // shuiying.src="/material/theme/chacha/cms/v2/images/shuiying2.png";
        // if(canvas.width>320){
        //     context.drawImage(shuiying, canvas.width/2-160, canvas.height/2-80,320,160);
        // }else{
        //     context.drawImage(shuiying, canvas.width/2-80, canvas.height/2-40,160,80);
        // }

        // var shuiying = new Image();
        // shuiying.src = "/material/theme/chacha/cms/v2/images/shuiying2.png";
        // for (var i = 0; i < canvas.width + 100; i += 600) {
        //     for (var j = 0; j < canvas.height + 100; j += 456) {
        //         context.drawImage(shuiying, i, j);
        //     }
        // }

        //画图谱
        context.drawImage(img, 0, 0);

        if (canvas.width > 400) {
            var marker = '关联图谱';
            context.font = "28px 微软雅黑";
            context.fillStyle = "#aaaaaa";
            context.fillText(marker, canvas.width / 2 - context.measureText(marker).width / 2, canvas.height - 30);
        }

        downloadimgIE(canvas);

        /*if(!!window.ActiveXObject || "ActiveXObject" in window){ // ie
            context.drawImage(shuiying, canvas.width/2-160, canvas.height/2-80,320,160);
            downloadimgIE(canvas);
        } else {
            downImg(canvas.toDataURL('image/jpeg',1));
        }*/
    }

    img.src = imgData;
}

//截图2 IE
function downloadimgIE(canvas) {
    function post(URL, PARAMS) {
        var temp = document.createElement("form");
        temp.action = URL;
        temp.enctype = "multipart/form-data";
        temp.method = "post";
        temp.style.display = "none";
        for (var x in PARAMS) {
            var opt = document.createElement("textarea");
            opt.name = x;
            opt.value = PARAMS[x];
            temp.appendChild(opt);
        }
        document.body.appendChild(temp);
        temp.submit();
        return temp;
    }

    var qual = 1;
    if (canvas.width > 3000) {
        qual = 0.5;
    } else if (canvas.width > 5000) {
        qual = 0.4;
    }
    //设置保存图片的类型
    var imgdata = canvas.toDataURL('image/jpeg', qual);
    // console.log(imgdata);

    //var filename = '{{$smarty.get.name}}的关联图谱_'+new Date().toLocaleDateString() + '.jpeg';
    // var filename = _FILENAME + '的关联图谱.png';
    var filename = '我的图片.png';
    post('https://www.qichacha.com/cms_downloadimg?cms_downloadimg?filename=' + filename, {img: imgdata});
}

// 文字
function toggleText() {
    if($("#TrTxt").hasClass('active')){
        console.log(1)
        $("#TrTxt").removeClass('active');
        cy.collection("edge").removeClass("edgeShowText");
    } else {
        console.log(2)

        $("#TrTxt").addClass('active');
        cy.collection("edge").addClass("edgeShowText");
    }
    // console.log('切换文字');
    // if (flag) {
    //     flag = false;
    //     cy.collection("edge").removeClass("edgeShowText");
    // } else {
    //     flag = true;
    //     cy.collection("edge").addClass("edgeShowText");
    // }
}
// 放大缩小
function maoScale(type){

    /*var c=$('canvas').eq(2).attr('id','myCanvas');
    var c=document.getElementById("myCanvas");
    console.log(c);
    var ctx = c.getContext("2d");
    ctx.font = "5px Arial";
    ctx.fillText("上海", 1, 10);

    return;*/

    //
    var rate = 0.2;
    var scale = cy.zoom();
    if(type==1){
        scale += rate;
    }else if(type==2){
        scale -= rate;
    }

    cy.zoom({
        level: scale, // the zoom level
    });
}

// 全屏
function changeScreen(dom) {
    if (!isFullScreen()) {
        $(dom).html('<div><i class="glyphicon glyphicon-resize-small"></i></div><p>退出</p>');
        launchFullScreen($('#main')[0]);
    } else {
        $(dom).html('<div><i class="glyphicon glyphicon-resize-full"></i></div><p>全屏</p>');
        exitFullScreen();
    }
}
function resizeScreen(){
    if(isFullScreen()){
        $('#TrFullScreen').addClass('active');
        $('#TrFullScreen').html('<span class="screen2ed"></span>退出');
    } else {
        $('#TrFullScreen').removeClass('active');
        $('#TrFullScreen').html('<span class="screen2"></span>全屏');
    }
}
function launchFullScreen(element) {
    if(element.requestFullscreen) {
        element.requestFullscreen();
    }else if(element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    }else if(element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if(element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}
function exitFullScreen(){


    if(document.exitFullscreen){
        document.exitFullscreen();
    }
    else if(document.mozCancelFullScreen){
        document.mozCancelFullScreen();
    }
    else if(document.msExitFullscreen){
        document.msExitFullscreen();
    }
    else if(document.webkitCancelFullScreen){
        document.webkitCancelFullScreen();
    }
}

function isFullScreen(){
    if(document.fullscreen){
        return true;
    }else if(document.mozFullScreen){
        return true;
    }else if(document.webkitIsFullScreen){
        return true;
    }else if(document.msFullscreenElement){
        return true;
    }else{
        return false;
    }
}



window.onresize = function () {
    resizeScreen();
    // printLogoFixed();
}
$(document).ready(function () {
    console.log(1)

    // // printLogoFixed();
    //
    _currentKeyNo = '';
    if(!_currentKeyNo){
        if(typeof _HOTPERSON != 'undefined' && _HOTPERSON){
            _currentKeyNo = _HOTPERSON;
        } else {
            _currentKeyNo = '';
        }
    }
    //
    getData(_currentKeyNo);
    //
    //
    // /**筛选面板*/
    //
    // // 层级筛选
    // $("#ShowLevel > a").click(function () {
    //     $('#ShowLevel > a').removeClass('active');
    //     $(this).addClass('active');
    //
    //     var level = parseInt($(this).attr('level'));
    //     $('#SelPanel').attr('param-level',level);
    //     filter(_rootData);
    // });//#ShowLevel
    // // 状态筛选
    // $("#ShowStatus > a").click(function () {
    //     $('#ShowStatus > a').removeClass('active');
    //     $(this).addClass('active');
    //
    //     var status = $(this).attr('status');
    //     $('#SelPanel').attr('param-status',status);
    //     filter(_rootData);
    // });//#ShowLevel
    // // 持股筛选
    // var inputEvent = (!!window.ActiveXObject || "ActiveXObject" in window) ? 'change' : 'input';
    // $('#inputRange').bind(inputEvent, function(e){
    //
    //     var value = $('#inputRange').val();
    //     $('#rangeValue').text(value);
    //     $('#inputRange').css('background-size', value + '% 100%' );
    //     $('#RangeLabel span').text(value + '%');
    //
    //     $('#SelPanel').attr('param-num',value);
    //     filter(_rootData);
    // });
    // // 投资筛选
    // $("#ShowInvest > a").click(function () {
    //     $('#ShowInvest > a').removeClass('active');
    //     $(this).addClass('active');
    //
    //     var invest = $(this).attr('invest');
    //     $('#SelPanel').attr('param-invest',invest);
    //     filter(_rootData);
    // });//#ShowLevel
    // // 关闭
    // $('.tp-sel-close span').click(function () {
    //     selPanelHide();
    // });
    // // 聚焦
    // $('#FocusBt').click(function () {
    //     var status = $('#FocusBt').text();
    //     if(!$(this).hasClass('focusDisable')){
    //         if(status == '聚焦'){
    //             if(!$('#FocusInput').val()){
    //                 faldia({content:'请点击选取结点'});
    //                 return;
    //             }
    //
    //             var nodeId = $('#FocusInput').attr('node_id')
    //             if(!nodeId){
    //                 return;
    //             } else {
    //                 $('#FocusBt').text('取消');
    //                 highLight([nodeId],cy);
    //             }
    //         } else if (status == '取消'){
    //             focusCancel();
    //         }
    //     }
    //
    // });
    // // 输入框
    // $('#FocusInput').keyup(function () {
    //     $('.tp-list').html('');
    //     var _this = $(this);
    //     var keyword = _this.val();
    //
    //     if(keyword){
    //         $('#ClearInput').show();
    //     } else {
    //         $('#ClearInput').hide();
    //     }
    //
    //     setTimeout(function () {
    //         var selNodes = [];
    //         _rootData.nodes.forEach(function (node) {
    //             var name = node.data.obj.properties.name;
    //             if(name.match(keyword)){
    //                 selNodes.push(node);
    //             }
    //         });
    //
    //         selPanelUpdateList(selNodes,_rootData.links,false);
    //     },500);
    // });
    // $('#ClearInput').click(function () {
    //     focusCancel();
    // });
    //
    // /**详情面板*/
    //
    // $('.tp-detail-close span').click(function () {
    //     //cancelHighLight();
    //     $('.tp-detail').fadeOut();
    // });
    // /*$('#ViewTupu').click(function () {
    //     var guid = $(this).attr('guid');
    //     init(guid);
    // });*/
    //
    // /**侧边栏*/
    //
    // $('#TrSel').click(function () {
    //     var _this = $(this);
    //     if(_this.hasClass('active')){
    //         selPanelHide();
    //     } else {
    //         selPanelShow();
    //     }
    // });
    function isFullScreen(){
        if(document.fullscreen){
            return true;
        }else if(document.mozFullScreen){
            return true;
        }else if(document.webkitIsFullScreen){
            return true;
        }else if(document.msFullscreenElement){
            return true;
        }else{
            return false;
        }
    }



    $('#TrFullScreen').click(function () {
        var old = cy.pan();
        var distance = 60;
        if (isFullScreen()) {
            cy.pan({
                x: old.x,
                y: old.y - distance
            });
            exitFullScreen();
        } else {
            cy.pan({
                x: old.x,
                y: old.y + distance
            });
            launchFullScreen($('#Main')[0]);
        }
    });
    $('#TrRefresh').click(function () {
        refresh(_currentKeyNo);
    });
    $('#TrSave').click(function () {
        // if(!$('#TrTxt').hasClass('active')){
        //     $('#TrTxt').click();
        // }
        // console.log(1)
        canvasImg(cy.png({full: true, bg: '#0000', scale: 1.8}));
    });
});