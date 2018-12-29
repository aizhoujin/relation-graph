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

/** 解决浏览器标签切换排列问题 */
var _isNeedReload = false;
var _isGraphLoaded = false;
document.addEventListener(visibilityChange, function () {

    if (document[state] == 'visible') {
        if (_isNeedReload) {
            $("#MainCy").html('');
            $('#TrTxt').removeClass('active');
            getData(_rootCurrent);
        }
        //document.title = 'hidden-not-loaded'
    } else {
        if (!_isGraphLoaded) {
            _isNeedReload = true;
        }
    }
}, false);
/** end 解决浏览器标签切换排列问题 */


/** end 网页当前状态判断 */

// 定义INDEXURL;
var INDEXURL = '';

var cy;// 图谱依赖点
var id;
var activeNode;

var drawGraphData; // 当前图谱渲染的数据

// 当前中心节点 and 中心节点id;
var _rootCurrent, _rootId;

var _rootData, _rootNode;
var _rootDataList;
var latoutData;

// 节点颜色；
var _COLOR = {
    //node :   {person: '#09ACB2',company:'#128BED',current:'#FD485E'},
    //node :   {person: '#20BDBF',company:'#4EA2F0',current:'#FD485E'},
    node: {project: '#FD485E', company: '#409EFF', person: '#ff9e00', event: '#67C23A', current: '#666'},
    //node :   {person: '#a177bf',company:'#4ea2f0',current:'#FD485E'},
    //node :   {person: '#f2af00',company:'#0085c3',current:'#7ab800'},
    //border : {person: '#09ACB2',company:'#128BED',current:'#FD485E'},
    //border : {person: '#57A6A8',company:'#128BED',current:'#FD485E'},
    border: {project: '#FD485E', company: '#128BED', person: '#EF941B', event: '#67C23A', current: '#909399'},
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


/****** 工具 ******/

//去重操作,元素为对象
/*array = [
    {a:1,b:2,c:3,d:4},
    {a:11,b:22,c:333,d:44},
    {a:111,b:222,c:333,d:444}
];
var arr = uniqeByKeys(array,['a','b']);*/
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
//去重操作,普通元素
Array.prototype.unique = function () {
    var res = [];
    var json = {};
    for (var i = 0; i < this.length; i++) {
        if (!json[this[i]]) {
            res.push(this[i]);
            json[this[i]] = 1;
        }
    }
    return res;
};

//深复制对象方法
function cloneObj(obj) {
    var newObj = {};
    if (obj instanceof Array) {
        newObj = [];
    }
    for (var key in obj) {
        var val = obj[key];
        //newObj[key] = typeof val === 'object' ? arguments.callee(val) : val; //arguments.callee 在哪一个函数中运行，它就代表哪个函数, 一般用在匿名函数中。
        newObj[key] = typeof val === 'object' ? cloneObj(val) : val;
    }
    return newObj;
};

/****** 数据处理 ******/

// 数据处理：将原始数据转换成graph数据
function getRootData(list) {
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

            // 设置_rootNode`
            // if (_currentKeyNo == o.data.obj.properties.keyNo){
            //     _rootNode = o;
            // }
        }
    }
    graph.nodes = uniqeByKeys(graph.nodes, ['nodeId']);

    //graph.links
    for (var i = 0; i < list.length; i++) {
        var relationships = list[i].graph.relationships;

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
            o.source = getNodesIndex(relationship.startNode, graph.nodes);
            o.target = getNodesIndex(relationship.endNode, graph.nodes);
            graph.links.push(o);
        }
    }
    graph.links = uniqeByKeys(graph.links, ['linkId']);


    //emplyRevert(graph.links);
    //mergeLinks(graph.links);
    setLevel(graph.nodes, graph.links);
    setCategoryColor(graph.nodes, graph.links);

    return graph;
}

// 数据处理：董监高箭头翻转
function emplyRevert(links) {
    links.forEach(function (link, i) {
        if (link.data.obj.type == 'EMPLOY') {
            var tmpObj = link.source;
            var tmpObjNode = link.sourceNode;
            link.source = link.target;
            link.sourceNode = link.targetNode;
            link.target = tmpObj;
            link.targetNode = tmpObjNode;
        }
    });
}

// 数据处理：董监高、法人线合并
function mergeLinks(links) {
    links.forEach(function (link, i) {
        if (link.sourceNode.data.obj.labels[0] == 'Person' && link.data.obj.type == 'LEGAL') {
            links.forEach(function (nextLink, j) {
                if (link.linkId != nextLink.linkId &&
                    link.sourceNode.nodeId == nextLink.sourceNode.nodeId &&
                    link.targetNode.nodeId == nextLink.targetNode.nodeId &&
                    nextLink.data.obj.type == 'EMPLOY') {

                    links.splice(j, 1);
                }
            });
        }

        if (link.sourceNode.data.obj.labels[0] == 'Person' && link.data.obj.type == 'EMPLOY') {
            links.forEach(function (nextLink, j) {
                if (link.linkId != nextLink.linkId &&
                    link.sourceNode.nodeId == nextLink.sourceNode.nodeId &&
                    link.targetNode.nodeId == nextLink.targetNode.nodeId &&
                    nextLink.data.obj.type == 'LEGAL') {

                    links.splice(j, 1);
                }
            });
        }
    });
//        console.log(links);
}

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
    while (nodes.length) {
        var nextNodes = [];
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            node.layout.level = level;
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
        if (node.data.obj.labels[0] == 'correlation_project') {
            node.data.color = _COLOR.node.company;
            node.data.strokeColor = _COLOR.border.company;
        } else if (node.data.obj.labels[0] == 'state_relevantpeople') {
            node.data.color = _COLOR.node.person;
            node.data.strokeColor = _COLOR.border.person;
        } else if (node.data.obj.labels[0] == 'projects') {
            node.data.color = _COLOR.node.project;
            node.data.strokeColor = _COLOR.border.project;
        } else {
            node.data.color = _COLOR.node.event;
            node.data.strokeColor = _COLOR.border.event;
        }

        if (node.data.obj.properties.name == _rootCurrent) {
            node.data.color = _COLOR.node.current;
            node.data.strokeColor = _COLOR.border.current;
        }
    }
}

// 数据处理：设置唯一孩子
function setSingleLinkNodes(links) {
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

// 数据处理：根据nodeId获取node 索引
function getNodesIndex(nodeId, nodes) {
    var index = 0;
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (nodeId == node.nodeId) {
            index = i;
            break;
        }
    }
    return index;
}

// 数据处理：node是否存在
function isNodeExist(nodeId, nodes) {
    var exist = false;
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (nodeId == node.nodeId) {
            exist = true;
            break;
        }
    }
    return exist;
}

// 数据处理：根据nodes过滤出相应连线（没有节点的连线删除）
function filterLinksByNodes(nodes, allLinks) {
    function isExists(nodes, nodeId) {
        var exist = false;
        for (var i = 0; i < nodes.length; i++) {
            var node = nodes[i];
            if (node.nodeId == nodeId) {
                exist = true;
                break;
            }
        }
        return exist;
    }

    var sel_links = [];
    for (var i = 0; i < allLinks.length; i++) {
        var link = allLinks[i];
        if (isExists(nodes, link.sourceNode.nodeId) && isExists(nodes, link.targetNode.nodeId)) {
            //link.source = getNodesIndex(link.sourceNode.nodeId,nodes);
            //link.target = getNodesIndex(link.targetNode.nodeId,nodes);
            sel_links.push(link);
        }
    }
    return sel_links;
}

// 数据处理：根据links过滤出相应节点(没有连线的节点删除)
function filterNodesByLinks(nodes, links) {
    function isExists(links, nodeId) {
        var exist = false;
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            if (link.sourceNode.nodeId == nodeId || link.targetNode.nodeId == nodeId) {
                exist = true;
                break;
            }
        }
        return exist;
    }

    var sel_nodes = [];
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if (isExists(links, node.nodeId)) {
            sel_nodes.push(node);
        }
    }
    return sel_nodes;
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

// 数据处理：获取子节点
function getSubNodes(node, links) {
    var subNodes = [];
    var nodeId = node.nodeId;
    var level = node.layout.level;
    for (var i = 0; i < links.length; i++) {
        var link = links[i];
        if (link.sourceNode.nodeId == nodeId && link.targetNode.layout.level == level + 1) {
            subNodes.push(link.targetNode);
        }
        if (link.targetNode.nodeId == nodeId && link.sourceNode.layout.level == level + 1) {
            subNodes.push(link.sourceNode);
        }
    }
    subNodes = uniqeByKeys(subNodes, ['nodeId']);
    return subNodes;
}

/**筛选*/
// 数据处理：按状态过滤
function filterNodesByLevel(level, nodes) {
    var sel_nodes = [];
    nodes.forEach(function (node) {
        if (node.layout.level <= level) {
            sel_nodes.push(node);
        }
    })
    return sel_nodes;
}

// 数据处理：按状态过滤
function filterNodesByStatus(status, nodes) {
    if (status == 'all') {
        return nodes;
    }

    var sel_nodes = [];
    for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        if ((node.data.obj.labels == 'Company' && node.data.obj.properties.status == status) || node.nodeId == _rootNode.nodeId) {
            sel_nodes.push(node);
        }
    }
    return sel_nodes;
}

// 数据处理：按持股数过滤
function filterNodesByStockNum(num, links) {
    var sel_links = [];
    for (var i = 0; i < links.length; i++) {
        if (num == links[i].data.obj.properties.stockPercent) {
            sel_links.push(links[i]);
        }
    }
    return sel_links;
}

// 数据处理：按投资过滤
function filterNodesByInvest(invest, nodes, links) {
    /*获取直接投资的节点*/
    function getInvestNodes(nodeId, links) {
        var investNodes = [];
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            if (link.sourceNode.nodeId == nodeId && link.data.obj.type == 'INVEST') {
                investNodes.push(link.targetNode);
            }
        }

        //investNodes = uniqeByKeys(investNodes,['nodeId']);
        return investNodes;
    }

    /*获取公司股东*/
    function getCompanyStockholder(nodeId, links) {
        var stockholderNodes = [];
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            if (link.targetNode.nodeId == nodeId && link.data.obj.type == 'INVEST') {
                stockholderNodes.push(link.sourceNode);
            }
        }

        //stockholderNodes = uniqeByKeys(stockholderNodes,['nodeId']);
        return stockholderNodes;
    }

    /*获取董监高法*/
    function getPersonStockholder(nodeId, links) {
        var stockholderNodes = [];
        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            if (link.targetNode.nodeId == nodeId && link.data.obj.type == 'INVEST' && link.sourceNode.data.obj.labels[0] == 'Person') {
                stockholderNodes.push(link.sourceNode);
            }
        }

        //stockholderNodes = uniqeByKeys(stockholderNodes,['nodeId']);
        return stockholderNodes;
    }

    var sel_nodes = [];

    switch (invest) {
        case 'all':
            return nodes;
            break;
        case 'direct': //直接投资
            sel_nodes = getInvestNodes(_rootNode.nodeId, links);
            break;
        case 'stockholder': // 股东投资
            var nextNodes = [];
            var stockholderNodes = getCompanyStockholder(_rootNode.nodeId, links);
            for (var i = 0; i < stockholderNodes.length; i++) {
                nextNodes = nextNodes.concat(getInvestNodes(stockholderNodes[i].nodeId, links));
            }
            sel_nodes = stockholderNodes.concat(nextNodes);
            break;
        case 'legal': // 董监高法投资
            var nextNodes = [];
            var stockholderNodes = getPersonStockholder(_rootNode.nodeId, links);
            for (var i = 0; i < stockholderNodes.length; i++) {
                nextNodes = nextNodes.concat(getInvestNodes(stockholderNodes[i].nodeId, links));
            }
            sel_nodes = stockholderNodes.concat(nextNodes);
            break;
    }


    sel_nodes = sel_nodes.concat(_rootNode);
    sel_nodes = uniqeByKeys(sel_nodes, ['nodeId']);
    return sel_nodes;
}

// 数据处理：根据所有条件过滤
function filter(rootData) {
    function isParentExist(node, nodes, links) {
        var isExist = false;
        var parentLevel = node.layout.level - 1;

        if (parentLevel < 2) {
            return true;
        }

        for (var i = 0; i < links.length; i++) {
            var link = links[i];
            if ((link.sourceNode.nodeId == node.nodeId && link.targetNode.layout.level == parentLevel) && isNodeExist(link.targetNode.nodeId, nodes)) {
                isExist = true;
                break;
            }
            if ((link.targetNode.nodeId == node.nodeId && link.sourceNode.layout.level == parentLevel) && isNodeExist(link.sourceNode.nodeId, nodes)) {
                isExist = true;
                break;
            }
        }

        return isExist;
    }

    function getFilterData(rootData) {
        //
        var sel_nodes = [];
        for (var i = 0; i < rootData.nodes.length; i++) {
            sel_nodes.push(rootData.nodes[i]);
        }
        var sel_links = [];
        for (var i = 0; i < rootData.links.length; i++) {
            sel_links.push(rootData.links[i]);
        }

        var level = $('#SelPanel').attr('param-level');
        var status = $('#SelPanel').attr('param-status');
        var num = $('#SelPanel').attr('param-num');
        var invest = $('#SelPanel').attr('param-invest');

        //console.log('status:' + status + ' num:' + num + ' invest:' + invest);

        // 层级
        level = parseInt(level) + 1;
        sel_nodes = filterNodesByLevel(level, sel_nodes);

        // 状态
        if (status) {
            sel_nodes = filterNodesByStatus(status, sel_nodes);
        }

        // 持股
        var stock_nodes = [];
        if (num && num != 0) {
            sel_links = filterLinksByNodes(sel_nodes, sel_links);
            sel_links = filterNodesByStockNum(num, sel_links);
            for (var i = 0; i < sel_links.length; i++) {
                stock_nodes.push(sel_links[i].sourceNode);
                stock_nodes.push(sel_links[i].targetNode);
            }
            sel_nodes = uniqeByKeys(stock_nodes, ['nodeId']);
        }

        // 投资
        if (invest) {
            sel_nodes = filterNodesByInvest(invest, sel_nodes, sel_links);
        }

        //父节点不存在则删除
        var sel_nodes2 = [];
        sel_nodes.forEach(function (node, i) {
            if (isParentExist(node, sel_nodes, sel_links)) {
                sel_nodes2.push(node);
            }
        })
        sel_links = filterLinksByNodes(sel_nodes2, sel_links);

        return {links: sel_links, nodes: sel_nodes2};
    }

    var nodesIds = [];
    var selGraph = getFilterData(rootData)
    selGraph.nodes.forEach(function (node) {
        nodesIds.push(node.nodeId);
    })
    highLightFilter(nodesIds, cy);

    /*//
    //$("#load_data").show();

    // 保证始终存在当前节点
    /!*if(sel_nodes2.length == 0){
        sel_nodes2.push(_rootNode);
    }*!/

    // 更新图谱
    /!*$("#TrTxt").removeClass('active');
    domUpdate(getFilterData(rootData));*!/

    /!*setTimeout(function () {
        domUpdate({links:sel_links,nodes:sel_nodes2});
    },5000)*!/;*/
}

//
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

/****** Html 相关 ******/


//筛选面板：显示
function selPanelShow() {
    $('.tp-sel').fadeIn();
    //$('.tp-sel').addClass('zoomIn');
    $('#TrSel').addClass('active');
}

//筛选面板：隐藏
function selPanelHide() {
    $('.tp-sel').fadeOut();
    $('#TrSel').removeClass('active');
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

//筛选面板：聚焦准备
function focusReady(node) {
    filterReset();
    $('#FocusInput').val(node.data.obj.properties.name);
    $('#FocusInput').attr('node_id', node.nodeId);
    $('#FocusBt').text('聚焦');
    $('#FocusBt').removeClass('focusDisable');
    $('#ClearInput').show();
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

function maoScale(type) {

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
    if (type == 1) {
        scale += rate;
    } else if (type == 2) {
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
        console.log(3);
        $(dom).html('<div><i class="glyphicon glyphicon-resize-full"></i></div><p>全屏</p>');
        exitFullScreen();
    }
}

var sereenHeight = window.screen.height + 'px';

function resizeScreen() {
    if (isFullScreen()) {
        $('#TrFullScreen').addClass('active');
        $('#TrFullScreen').html('<div><i class="glyphicon glyphicon-resize-small"></i></div><p>退出</p>');
        $('#selectLayout').css({'top': '0px', 'height': sereenHeight});
    } else {
        $('#TrFullScreen').removeClass('active');
        $('#TrFullScreen').html('<div><i class="glyphicon glyphicon-resize-full"></i></div><p>全屏</p>');
        $('#selectLayout').css({'top': '37px', 'height': containerHeight + 'px'});

    }
}

function launchFullScreen(element) {
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}

function exitFullScreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    }
    else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    }
    else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
    else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
    }
}

function isFullScreen() {
    if (document.fullscreen) {
        return true;
    } else if (document.mozFullScreen) {
        return true;
    } else if (document.webkitIsFullScreen) {
        return true;
    } else if (document.msFullscreenElement) {
        return true;
    } else if (window.fullScreen) {
        return true;
    } else {
        return false;
    }
}

// 关系toggleRelation
var allNode = [];
var toggleRelationFlag = false;

// 点击关系触发的事件
function toggleRelation() {
    if ($('#TrRelation').hasClass('active')) {
        // 回到原先的图谱
        $('#TrRelation').removeClass('active');
        if (toggleRelationFlag) {
            $('.relationInfer').hide();
            $('.foldLeft').hide();
            toggleRelationFlag = false;
            filId = null;
            $('#filtrateAllNodeInput').val('');
            relationInferParams = [];
            $("#filBtn").attr({"disabled": "disabled"});
            refresh();
        }
    } else {
        // 进入找关系图谱
        $('.relationInfer').show();
        if (allNode.length == 0) {
            getAllNode();
        } else {
            filtrateAllNode();
        }
    }
}

// 点击关系弹框的 ‘ 叉号 ’ 触发
function fold(type) {
    if (type == 1) {
        $('.relationInfer').show();
        $('.foldLeft').hide();
        filtrateAllNode();
    } else {
        $('.relationInfer').hide();
        $('.foldLeft').show();
        if ($('#TrRelation').hasClass('active')) {
            $('.foldLeft').css({'display': 'block'});
        }
    }
}

// 关系弹框获取全局全部节点
function getAllNode() {
    $('.relationInfer-li').html(`<div class="overall-loading relationInferLoading">
        <div class="iconfont icon-loading myLoading"></div>
        </div>
        <li class="notData">数据加载中...</li>`)
    $.ajax({
        url: INDEXURL + './graph.json',
        // url: './MapData.json',
        method: 'get',
        dataType: 'JSON',
        timeout: 120000,
        success: function (res) {
            allNode = res.result.results[0].data[0].graph.nodes;
            if (relationInferParams.length == 0) {
                relationInferParams.push(parseInt(_rootId));
            }
            $("#filBtn2").removeAttr("disabled");
            filtrateAllNode();
        },
        error: function (err) {
            errMessage('获取人物数据失败');
            $('.relationInfer-li').html('<li class="notData">数据加载失败</li>')
        }
    })
}

var filtrateList;
var filId = null;

// 筛选节点，模糊匹配输入框文字
function filtrateAllNode() {
    if (allNode.length == 0) {
        return;
    }
    filId = null;
    var filtrateName = $('#filtrateAllNodeInput').val();
    filtrateList = [];
    $.each(allNode, function (index, item) {
        if (item.properties.name.indexOf(filtrateName) != -1) {
            filtrateList.push(item);
        }
    })
    var currentDrawArr = [];
    $.each(drawGraphData.nodes, function (index, item) {
        currentDrawArr.push(item.data.id);
    })
    var filStr = '';
    if (filtrateList.length == 0) {
        filStr = '<li class="notData">未搜索到相关数据</li>';
    } else {
        for (var i = 0; i < filtrateList.length; i++) {
            if (currentDrawArr.indexOf(filtrateList[i].id) != -1) {
                filStr += '<li onclick="selectFil(' + i + ')"><span>' + (i + 1) + '.</span>' + filtrateList[i].properties.name + '<span>√</span></li>'
            } else {
                filStr += '<li onclick="selectFil(' + i + ')"><span>' + (i + 1) + '.</span>' + filtrateList[i].properties.name + '</li>'
            }

        }
    }
    $('.relationInfer-li').html(filStr);
}

// 选择节点
function selectFil(index) {
    $('#filtrateAllNodeInput').val(filtrateList[index].properties.name);
    // $("#filBtn").attr({"disabled":"disabled"});
    // $("#filBtn").removeAttr("disabled");
    filId = filtrateList[index].id;
}

var relationInferParams = [];
var setTime = 0;

// 关系弹框的找关系或者加入按钮
function relationInfer(type) {
    if (setTime == 0) {
        setTime++;
        var setTimeOrage = setTimeout(function () {
            setTime = 0;
        }, 1000)
    } else {
        return;
    }
    if (filId == null) {
        errMessage('请选择一个实体');
        return;
    }
    if (relationInferParams.indexOf(parseInt(filId)) != -1) {
        errMessage('当前关系列表已经存在该实体');
        return
    }


    if (type == 1) { // 找关系
        relationInferParams[relationInferParams.length - 1] = parseInt(filId);
    } else {
        relationInferParams.push(parseInt(filId));
    }

    $.ajax({
        url: INDEXURL + './graph.json',
        method: 'get',
        data: {
            ids: relationInferParams.toString()
        },
        headers: {
            "content-type": "application/json;charset=UTF-8"
        },
        dataType: 'JSON',
        success: function (res) {
            if (!res.result || res.result.results.length == 0 || res.result.results[0].data.length == 0 || res.result.results[0].data[0].graph.nodes.length == 0) {
                console.log('没有数据');
                relationInferParams.pop(); // 如果没有成功让参数回退到之前;
                errMessage('没有找到相关数据');
                return
            } else {
                $('.foldLeft').css({'display': 'block'});
                $('.relationInfer').hide();
                $('#TrRelation').addClass('active');
                $('.foldLeft').show();
                toggleRelationFlag = true;
                _rootDataList = res.result.results[0].data;
                _rootData = getRootData(_rootDataList);
                domUpdate(_rootData);
                updataShowList(_rootData);
                $("#filBtn").removeAttr("disabled");
            }
        }
    })
}


// 文字
function toggleText() {
    if ($("#TrTxt").hasClass('active')) {
        $("#TrTxt").removeClass('active');
        cy.collection("edge").removeClass("edgeShowText");
    } else {
        $("#TrTxt").addClass('active');
        cy.collection("edge").addClass("edgeShowText");
    }
}

/****** 图谱 相关 ******/

/*function highlight( node ){
    var oldNhood = lastHighlighted;

    var nhood = lastHighlighted = node.closedNeighborhood();
    var others = lastUnhighlighted = cy.elements().not( nhood );

    var reset = function(){
        cy.batch(function(){
            others.addClass('hidden');
            nhood.removeClass('hidden');

            allEles.removeClass('faded highlighted');

            nhood.addClass('highlighted');

            others.nodes().forEach(function(n){
                var p = n.data('orgPos');

                n.position({ x: p.x, y: p.y });
            });
        });

        return Promise.resolve().then(function(){
            if( isDirty() ){
                return fit();
            } else {
                return Promise.resolve();
            };
        }).then(function(){
            return Promise.delay( aniDur );
        });
    };

    var runLayout = function(){
        var p = node.data('orgPos');

        var l = nhood.filter(':visible').makeLayout({
            name: 'concentric',
            fit: false,
            animate: true,
            animationDuration: aniDur,
            animationEasing: easing,
            boundingBox: {
                x1: p.x - 1,
                x2: p.x + 1,
                y1: p.y - 1,
                y2: p.y + 1
            },
            avoidOverlap: true,
            concentric: function( ele ){
                if( ele.same( node ) ){
                    return 2;
                } else {
                    return 1;
                }
            },
            levelWidth: function(){ return 1; },
            padding: layoutPadding
        });

        var promise = cy.promiseOn('layoutstop');

        l.run();

        return promise;
    };

    var fit = function(){
        return cy.animation({
            fit: {
                eles: nhood.filter(':visible'),
                padding: layoutPadding
            },
            easing: easing,
            duration: aniDur
        }).play().promise();
    };

    var showOthersFaded = function(){
        return Promise.delay( 250 ).then(function(){
            cy.batch(function(){
                others.removeClass('hidden').addClass('faded');
            });
        });
    };

    return Promise.resolve()
        .then( reset )
        .then( runLayout )
        .then( fit )
        .then( showOthersFaded )
        ;

}//hilight*/

var layoutType = 'preset';

// 切换布局样式
function layoutChange(type) {
    // layoutType = 'circle';
    // refresh();
    if ($('.selectLayout .selectLayout-layout').eq(type).hasClass('layoutActive')) {
        return
    } else {
        $('.selectLayout .selectLayout-layout').removeClass('layoutActive');
        $('.selectLayout .selectLayout-layout').eq(type).addClass('layoutActive');
        if (type == 0) {
            layoutType = 'preset';
        } else if (type == 1) {
            layoutType = 'circle'
        } else if (type == 2) {
            layoutType = 'breadthfirst'
        }
        drawGraph(latoutData);
    }
}

var layoutNodeType = 0;

// 切换布局节点样式
function layoutNodeChange(nodeType) {
    layoutNodeType = nodeType;
    drawGraph(latoutData);
    if ($(".selectLayout .selectLayout-node").eq(nodeType).hasClass('layoutActive')) {
        return
    } else {
        $('.selectLayout .selectLayout-node').removeClass('layoutActive');
        $('.selectLayout .selectLayout-node').eq(nodeType).addClass('layoutActive');
    }
}


// 图谱绘制
function drawGraph(elements) {
    drawGraphData = elements;
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
            name: layoutType, // preset 自定义  、 circle 圆环  、   concentric 中心 、 breadthfirst 分叉型号
            tree: true,
            concentric: true,
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
                    /*shape: 'diamond', ellipse 圆形; rectangle矩形; triangle三角形；roundrectangle圆角矩形；pentagon 五边形；hexagon 六边形；heptagon七角形；octagon八变形； concavehexagon漏斗；star 星星； vee v字形； diamond 菱形；*/
                    shape: function (ele) {
                        if (layoutNodeType == 0) {
                            return 'ellipse'
                        } else {
                            if (ele.data("type") == 'correlation_project') {
                                return 'pentagon'
                            } else if (ele.data("type") == 'state_relevantpeople') {
                                return 'ellipse'
                            } else if (ele.data("type") == 'projects') {
                                return 'hexagon'
                            } else {
                                return 'roundrectangle'
                            }
                        }

                    },
                    width: function (ele) {
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
                        if (hasImage && type == 'state_relevantpeople') {
                            return hasImage;
                        } else {
                            return 'none';
                        }

                    },
                    // 'background-image-crossorigin': 'use-credentials',
                    'border-color': function (ele) {
                        if (relationInferParams != [] && relationInferParams != undefined && relationInferParams.indexOf(parseInt(ele.data('id'))) != -1 && toggleRelationFlag) {
                            return '#909399';
                        } else {
                            return ele.data("borderColor");
                        }
                    },
                    'border-width': function (ele) {
                        // if (ele.data('hasImage') && ele.data('type') == 'Person') {
                        //     return 3;
                        // } else {
                        //     return 1;
                        // }
                        if (relationInferParams != [] && relationInferParams != undefined && toggleRelationFlag) {
                            var widthBorder = 1;
                            if (relationInferParams.indexOf(parseInt(ele.data('id'))) != -1) {
                                widthBorder = 5;
                            }
                            return widthBorder;
                        } else {
                            return 1;
                        }
                    },
                    'border-opacity': 0.6,
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
                    'width': 0.5,
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
                    // 'z-index':300,
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
        $('#circle-nav').hide();
        if (evt.target._private.style['z-index'].value == 20) { // 非暗淡状态
            _isFocus = true;
            var node = evt.target;

            highLight([node._private.data.id], cy);

            if (node.hasClass("nodeActive")) {
                activeNode = null;
                $('#company-detail').hide();
                node.removeClass("nodeActive");
                cy.collection("edge").removeClass("edgeActive");
            } else {
                var nodeData = node._private.data;
                if (nodeData.type == 'projects') {
                    showDetail2(nodeData);
                    cy.collection("node").addClass('nodeDull');
                } else {
                    showDetail2(nodeData);
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
            _isFocus = false;
            activeNode = null;
            cy.collection("node").removeClass("nodeActive");
            $('.tp-detail').fadeOut();
            cancelHighLight();
        }
    });
    cy.on('cxttapstart', 'node', function (evt) {
        if (evt.target._private.style['z-index'].value == 20) {
            $('#circle-nav .circle-nav-one-circle').html(evt.target._private.rscratch.labelWrapCachedText).css({'background': evt.target._private.style['background-color'].strValue});
            $('#circle-nav').show();
            $('#circle-nav').css({
                'left': evt.renderedPosition.x - 140,
                'top': evt.renderedPosition.y - 110
            });
        }
        var node = evt.target;
        var nodeData = node._private.data;
        var nodeId = node._private.data.id;
        var nodeName = node._private.data.name;

        // 轮盘 查看详情
        $('#circle-nav-one-ul .state').off("click").click(function () {
            $('#circle-nav').hide();
            detailDialogEvent(nodeData, false);
        })

        // 轮盘 删除实体功能
        $('#circle-nav-one-ul .circle-nav-one-add').off("click").click(function () {
            $('#circle-nav').hide();
            var dialogText = '';
            dialogText = '是否删除' + nodeName + '?';
            $('#myDiaLog .modal-body').text(dialogText);
            $('#myDiaLog').modal('show');
            $('#confirm-button').show();
            $('#confirm-button').off("click").click(function () {
                var url = INDEXURL + './NodeDel.json';
                $.ajax({
                    url: url,
                    method: 'get',
                    data: {
                        id: nodeId
                    },

                    dataType: 'JSON',
                    success: function (res) {
                        $('#myDiaLog .modal-body').text('删除成功');
                        $('#confirm-button').hide();
                        $('#myDiaLog').modal('show');
                        refresh(_currentKeyNo);
                    },
                    error: function () {
                        $('#myDiaLog .modal-body').text('删除失败');
                        $('#confirm-button').hide();
                        $('#myDiaLog').modal('show');
                    }
                })
            })
            $('#circle-nav').hide();
        })


        // 轮盘 修改
        $('#circle-nav-one-ul .organization').off("click").click(function () {
            $('#circle-nav').hide();
            modificationNodeID = nodeId;
            $('.addNodeDialog .tab-content .exist').hide();
            $('.addNodeDialog').show();
            $('.addNodeDialog .tab-content .tab-pane input').val('');
            $('.addNodeDialog .addNodeDialog-main .nav').hide();
            $('.addNodeDialog .addNodeDialog-title').text('修改实体');
            $('.addNodeDialog .addNodeDialog-main .tab-content>div').removeClass('active');
            addNodeTypeInt = 1;
            $('.addNodeDialog .addNodeDialog-main .tab-content .addNodeDialog-table').addClass('borderBottomLi');
            var nodeDataDetail = nodeData.data.obj.properties;
            if (nodeData.type == 'projects') {
                $('.addNodeDialog .addNodeDialog-main .tab-content>div').eq(0).addClass('active');
                addNodeTypeInt = 1;
                $('.addNodeDialog .tab-content .addProjectName').val(nodeDataDetail.name);
                $('.addNodeDialog .tab-content .addProjectType').val(nodeDataDetail.type);
                $('.addNodeDialog .tab-content .addProjectInvestPattern').val(nodeDataDetail.investPattern);
                $('.addNodeDialog .tab-content .addProjectIndustry').val(nodeDataDetail.industry);
                $('.addNodeDialog .tab-content .addProjectLocation').val(nodeDataDetail.location);
                $('.addNodeDialog .tab-content .addProjectValidDate').val(nodeDataDetail.validDate);
                $('.addNodeDialog .tab-content .addProjectBeginDate').val(nodeDataDetail.beginDate);
                $('.addNodeDialog .tab-content .addProjectEndDate').val(nodeDataDetail.endDate);
                $('.addNodeDialog .tab-content .addProjectCompanyName').val(nodeDataDetail.companyName);
                $('.addNodeDialog .tab-content .addProjectTotalSumPlan').val(nodeDataDetail.totalSumPlan);
                $('.addNodeDialog .tab-content .addProjectLabel').val(nodeDataDetail.label);
                $('.addNodeDialog .tab-content .addProjectDescription').val(nodeDataDetail.description);
            } else if (nodeData.type == 'correlation_project') {
                $('.addNodeDialog .addNodeDialog-main .tab-content>div').eq(1).addClass('active');
                addNodeTypeInt = 2;
                $('.addNodeDialog .tab-content .addCompanyName').val(nodeDataDetail.name);
            } else if (nodeData.type == 'state_relevantpeople') {
                $('.addNodeDialog .addNodeDialog-main .tab-content>div').eq(2).addClass('active');
                addNodeTypeInt = 3;
                $('.addNodeDialog .tab-content .addPersonName').val(nodeDataDetail.name);
                $('.addNodeDialog .tab-content .addPersonPeopleDescription').val(nodeDataDetail.peopleDescription)
                $('.addNodeDialog .tab-content .addPersonCompanyName').val(nodeDataDetail.companyName)
            } else {
                addNodeTypeInt = 4;
                $('.addNodeDialog .addNodeDialog-main .tab-content>div').eq(3).addClass('active');
                $('.addNodeDialog .tab-content .addEventName').val(nodeDataDetail.name);
                $('.addNodeDialog .tab-content .addEventDescription').val(nodeDataDetail.description);
                $('.addNodeDialog .tab-content .addEventState').val(nodeDataDetail.state);
                $('.addNodeDialog .tab-content .addEventBeginDate').val(nodeDataDetail.beginDate);
            }
        })

        // 轮盘 新增关系
        $('#circle-nav-one-ul .circle-nav-one-remove').off("click").click(function () {
            $('#circle-nav').hide();
            addDialogEvent(nodeData);
        })

        // 扩散
        $('#circle-nav-one-ul .circle-nav-one-gather').off("click").click(function () {
            $('#circle-nav').hide();
            diffusionEvent(nodeData);
        })

        // 聚集
        $('#circle-nav-one-ul .resume').off("click").click(function () {
            console.log(nodeId);
            $('#circle-nav').hide();
            aggregateEvent(nodeData);
        })
    });
    cy.on('click', function (params) {
        if (params.target._private.data == undefined) {
            $('#circle-nav').hide();
            $('.detail').hide();
        }
    })
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
    cy.on('cxttapstart', 'edge', function (evt) {
        $('#circle-nav').hide();
        var edge = evt.target;
        var edgeData = edge._private.data;
        // console.log(edgeData);
        var event = evt.originalEvent || window.event;
        var x = event.clientX + 10;
        var y = event.clientY + 10;
        var clientY = event.srcElement.clientHeight;
        var clientX = event.srcElement.clientWidth;
        if ((y + 300) > clientY) {
            y = clientY - 250;
        }
        if ((x + 150) > clientX) {
            x = clientX - 150;
        }
        $('.linksAction').css({'top': y, 'left': x});
        $('.linksAction').show();
        $('.linksActionSelect span').click(function () {
            $('.linksActionInput').val($(this).html());
        })
        $('#linksActionSubmit').click(function () {
            var params = {};
            var linksActionInput = $('.linksActionInput').val();
            if (linksActionInput == '') {
                alert('关系不能为空');
            } else {
                var typeAction = getLinkType(linksActionInput);
                var propertiesAction = edgeData.data.obj.properties;
                if (typeAction == 'c1') {
                    propertiesAction.name = linksActionInput;
                }
                ;

                params = {
                    fromId: edgeData.data.obj.startNode,
                    toId: edgeData.data.obj.endNode,
                    oldRelationType: edgeData.data.obj.type,
                    newRelationType: typeAction,
                    jsonStr: JSON.stringify(propertiesAction)
                }
                // console.log(params);
                $.ajax({
                    url: INDEXURL + './relationAmend.json',
                    method: 'get',
                    data: params,
                    dataType: 'JSON',
                    success: function (res) {
                        if (res.success) {
                            $('#myDiaLog .modal-body').html('关系修改成功')
                            $('#myDiaLog #confirm-button').hide();
                            $('#myDiaLog').modal('show');
                            refresh();
                        } else {
                            errMessage('修改失败');
                        }
                    },
                    error: function (err) {
                        errMessage('修改失败');
                    }
                })
            }
        })
        $("#linksActionDel").click(function () {
            var relationIdDel = (edgeData.id || edge.data.obj.id);
            relationIdDel = relationIdDel.substr(1);
            relationIdDel = parseInt(relationIdDel);
            $.ajax({
                url: INDEXURL + 'NodeDel.json',
                method: 'get',
                dataType: 'JSON',
                success: function (res) {
                    if (res.success) {
                        $('#myDiaLog .modal-body').html('删除成功');
                        $('#myDiaLog #confirm-button').hide();
                        $('#myDiaLog').modal('show');
                        $('.linksAction').hide();
                        refresh();
                    } else {
                        errMessage('删除失败');
                    }
                },
                error: function (err) {
                    errMessage('删除失败');
                }
            })
        })
    })
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
        $('#circle-nav').hide();
        $('.linksAction').hide();
        _isFocus = false;
        activeNode = null;
        cy.collection("node").removeClass("nodeActive");
        $('.tp-detail').fadeOut();
        cancelHighLight();
    });
    cy.on('click', function (event) {
        $('#circle-nav').hide();
        $('.linksAction').hide();
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
        $('#circle-nav').hide();
        // 加载完成后，加载该类，修复线有锯齿的问题
        setTimeout(function () {
            cy.collection("edge").removeClass("lineFixed");
            cy.collection("edge").addClass("lineFixed");
        }, 200);
    });


    // 定位
    if (layoutType == 'preset') {
        cy.nodes().positions(function (node, i) {
            // // 保持居中
            if (node._private.data.name == '中国中铁股份有限公司') {
                var position = cy.pan();
                cy.pan({
                    x: position.x - node._private.data.d3x,
                    y: position.y - node._private.data.d3y
                });
            }
            return {
                x: node._private.data.d3x,
                y: node._private.data.d3y
            };
        });
    }

    cy.ready(function () {
        $(".overall").hide();

        if (!$('#TrTxt').hasClass('active')) {
            $('#TrTxt').click();
        }

        if ($('#TrTxt').hasClass('active') && !cy.collection("edge").hasClass("edgeShowText")) {
            cy.collection("edge").addClass("edgeShowText")
        }

        $('#NodeCount').html(elements.nodes.length);
        $('#linkCount').html(elements.edges.length);

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

// 图谱节点样式切换
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

function highLightFilter(nodeIds, cy) {
    function isInNodeIds(nodeId) {
        for (var i = 0; i < nodeIds.length; i++) {
            if (nodeId == nodeIds[i]) {
                return true;
                break;
            }
        }
        return false;
    }

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
                /*node.neighborhood("edge").removeClass("dull");
                node.neighborhood("edge").addClass("edgeActive");
                node.neighborhood("edge").connectedNodes().removeClass("dull");*/
                //node.neighborhood("edge").connectedNodes().addClass("nodeActive");
            }
        });
    }

    cy.edges(function (edge) {
        var data = edge._private.data;
        if (isInNodeIds(data.target) && isInNodeIds(data.source)) {
            edge.removeClass('dull');
            edge.addClass('edgeActive');
        }
    });
}

function cancelHighLight() {
    cy.collection("node").removeClass("nodeActive");
    cy.collection("edge").removeClass("edgeActive");
    cy.collection("node").removeClass('dull');
    cy.collection("edge").removeClass('dull');
}

/**其他*/

function getD3Position(graph) {
    getLayoutNode(graph);

    function filterLinks1(graph) {
        // 筛选用于布局的links
        console.log('筛选用于布局的links')
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
        function getIndex(val, arr) {
            var index = 0;
            for (var i = 0; i < arr.length; i++) {
                var obj = arr[i];
                if (val == obj.nodeId) {
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
            link.source = getIndex(link.sourceNode.nodeId, graph.nodes);
            link.target = getIndex(link.targetNode.nodeId, graph.nodes);
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

    d3.forceSimulation(graph.nodes)
        .force('charge', d3.forceManyBody().strength(strength).distanceMax(distanceMax).theta(theta))
        .force('link', d3.forceLink(graph.layoutLinks).distance(distance))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide().radius(function () {
            return colideRadius;
        }))
    //.on('tick',ticked);
}

/** d3 svg */
/*var svg = d3.select('svg');
svg.selectAll('g').remove();// 清空
var svg_g = svg.append("g")

// 结点
var svg_nodes = svg_g.selectAll('circle')
    .enter().append('circle')
    .attr('r', function (d) {
        if(d.data.obj.labels[0] == 'Company'){
            return 33;
        } else {
            return 24;
        }
    })
    .attr('fill', function(d, i) {
        return d.data.color;
    })
    .style('opacity',1)*/
/** end d3 svg */


/*function ticked() {
    svg_nodes.attr("cx", function(d) {  return d.x; })
        .attr("cy", function(d) { return d.y; });
}*/

//设置符合Layout的node
function getLayoutNode(graphData) {
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

//将rootData转换成cy图谱框架所需要的数据结构
function transformData(graphData) {
    function getLinkColor(type) {
        if (type == 'INVEST') {
            return _COLOR.line.invest;
        } else if (type == 'EMPLOY') {
            return _COLOR.line.employ;
        } else if (type == 'LEGAL') {
            return _COLOR.line.legal;
        } else {
            return _COLOR.line.invest;
        }
    }

    function getLinkLabel(link) {
        // console.log(link);
        var type = link.data.obj.type, role = link.data.obj.properties.role;
        // if (type == 'INVEST') {
        //     return '投资';
        // } else if (type == 'EMPLOY') {
        //     return (role ? role : '任职');
        // } else if (type == 'LEGAL') {
        //     return '法定代表人';
        // } else {
        //     return '投资';
        // }
        if (type == 'c1') {
            return link.data.obj.properties.name;
        } else if (type == 'r1') {
            return 'BOO'
        } else if (type == 'r2') {
            return 'BOOT'
        } else if (type == 'r3') {
            return 'BOT'
        } else if (type == 'r4') {
            return 'BT'
        } else if (type == 'r5') {
            return 'DB'
        } else if (type == 'r6') {
            return 'EP'
        } else if (type == 'r7') {
            return 'EPC'
        } else if (type == 'r8') {
            return 'EPC总承包'
        } else if (type == 'r9') {
            return '保运'
        } else if (type == 'r10') {
            return '共现'
        } else if (type == 'r11') {
            return '其他'
        } else if (type == 'r12') {
            return '参与'
        } else if (type == 'r13') {
            return '合作'
        } else if (type == 'r14') {
            return '合建'
        } else if (type == 'r15') {
            return '合资'
        } else if (type == 'r16') {
            return '并购'
        } else if (type == 'r17') {
            return '开发'
        } else if (type == 'r18') {
            return '总包'
        } else if (type == 'r19') {
            return '总承包'
        } else if (type == 'r20') {
            return '承包'
        } else if (type == 'r21') {
            return '承建'
        } else if (type == 'r22') {
            return '承接'
        } else if (type == 'r23') {
            return '投建'
        } else if (type == 'r24') {
            return '投资'
        } else if (type == 'r25') {
            return '控股'
        } else if (type == 'r26') {
            return '援助'
        } else if (type == 'r27') {
            return '援建'
        } else if (type == 'r28') {
            return '收购'
        } else if (type == 'r29') {
            return '融资'
        } else if (type == 'r30') {
            return '资助'
        } else {
            return ''
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
                hasImage: false,
                //labelLine:1 // 解决文字行距问题，第1行
            }
        });
    });

    return els;
}


// 通过关系name获取type
function getLinkType(name) {
    if (name == 'BOO') {
        return 'r1'
    } else if (name == 'BOOT') {
        return 'r2'
    } else if (name == 'BOT') {
        return 'r3'
    } else if (name == 'BT') {
        return 'r4'
    } else if (name == 'DB') {
        return 'r5'
    } else if (name == 'EP') {
        return 'r6'
    } else if (name == 'EPC') {
        return 'r7'
    } else if (name == 'EPC总承包') {
        return 'r8'
    } else if (name == '保运') {
        return 'r9'
    } else if (name == '共现') {
        return 'r10'
    } else if (name == '其他') {
        return 'r11'
    } else if (name == '参与') {
        return 'r12'
    } else if (name == '合作') {
        return 'r13'
    } else if (name == '合建') {
        return 'r14'
    } else if (name == '合资') {
        return 'r15'
    } else if (name == '并购') {
        return 'r16'
    } else if (name == '开发') {
        return 'r17'
    } else if (name == '总包') {
        return 'r18'
    } else if (name == '总承包') {
        return 'r19'
    } else if (name == '承包') {
        return 'r20'
    } else if (name == '承建') {
        return 'r21'
    } else if (name == '承接') {
        return 'r22'
    } else if (name == '投建') {
        return 'r23'
    } else if (name == '投资') {
        return 'r24'
    } else if (name == '控股') {
        return 'r25'
    } else if (name == '援助') {
        return 'r26'
    } else if (name == '援建') {
        return 'r27'
    } else if (name == '收购') {
        return 'r28'
    } else if (name == '融资') {
        return 'r29'
    } else if (name == '资助') {
        return 'r30'
    } else {
        return 'c1'
    }
}


// 图谱、筛选面板更新
function domUpdate(graphData) {
    getD3Position(graphData);

    setTimeout(function () {
        latoutData = transformData(graphData);
        drawGraph(latoutData);
    }, 1000);

    selPanelUpdateList(graphData.nodes, graphData.links, true);
}

//截图2
function downImg(imgdata) {
    var type = 'png';
    //将mime-type改为image/octet-stream,强制让浏览器下载
    var fixtype = function (type) {
        type = type.toLocaleLowerCase().replace(/jpg/i, 'jpeg');
        var r = type.match(/png|jpeg|bmp|gif/)[0];
        return 'image/' + r;
    }
    imgdata = imgdata.replace(fixtype(type), 'image/octet-stream')
    //将图片保存到本地
    var saveFile = function (data, filename) {
        var link = document.createElement('a');
        link.href = data;
        link.download = filename;
        var event = document.createEvent('MouseEvents');
        event.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
        link.dispatchEvent(event);
    }
    var filename = new Date().toLocaleDateString() + '.' + type;
    saveFile(imgdata, filename);
}

//截图2 IE
function downloadimgIE(canvas) {
    function post(URL, PARAMS) {
        var temp = document.createElement("form");

        temp.style.display = "none";
        // for (var x in PARAMS) {
        var opt = document.createElement("textarea");
        opt.name = 'imgStr';
        opt.value = PARAMS;
        temp.appendChild(opt);


        var opt2 = document.createElement("textarea");
        opt2.name = 'name';
        opt2.value = '关系图';
        temp.appendChild(opt2);


        // }
        temp.action = URL;
        temp.enctype = "multipart/form-data";
        temp.method = "post";
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
    //var filename = '{{$smarty.get.name}}的关联图谱_'+new Date().toLocaleDateString() + '.jpeg';
    // var filename = _FILENAME + '的关联图谱.png';
    var filename = '关系图谱';
    var imgUrl = INDEXURL + 'modifier/imgDownload';
    post(imgUrl, imgdata);
}

//截图1
function canvasImg(imgData) {


    var img = new Image();

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
        for (var i = 0; i < canvas.width + 100; i += 600) {
            for (var j = 0; j < canvas.height + 100; j += 456) {
                // context.drawImage(shuiying, i, j);
            }
        }

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

// 点击
function showDetail2(node) {
    $('.detail').show();
    $('.detail-name').text(node.name);
    $('.detail-ID .detail-ID-context').text(node.id);
    var current = node.name;
    var type = node.type;
    var NodeId = node.nodeId;
    var toUrl = '';
    toUrl = '<a href="./index.html?current=' + current + '&type=' + type + '&id=' + NodeId + '"' + 'target="_blank"><button id="detail-button">查看图谱</button></a>'
    $('#detail-button-box').html(toUrl);
    var relationData = _rootData.links;
    var NodeData = _rootData.nodes;
    var relationDataList = []; // 于当前节点有关的数据；
    var NodeDataList = []; // 与当前节点有关的节点
    var relationProject = []; // 与当前节点有关的 项目;
    var relationCompay = []; // 于当前节点有关的 企业；
    var relationPerson = []; // 于当前节点有关的 人物；
    var relationEvent = []; // 于当前节点有关的 事件；
    function getRelation(link) {
        var type = link.data.obj.type, role = link.data.obj.properties.role;
        if (type == 'c1') {
            return link.data.obj.properties.name;
        } else if (type == 'r1') {
            return 'BOO'
        } else if (type == 'r2') {
            return 'BOOT'
        } else if (type == 'r3') {
            return 'BOT'
        } else if (type == 'r4') {
            return 'BT'
        } else if (type == 'r5') {
            return 'DB'
        } else if (type == 'r6') {
            return 'EP'
        } else if (type == 'r7') {
            return 'EPC'
        } else if (type == 'r8') {
            return 'EPC总承包'
        } else if (type == 'r9') {
            return '保运'
        } else if (type == 'r10') {
            return '共现'
        } else if (type == 'r11') {
            return '其他'
        } else if (type == 'r12') {
            return '参与'
        } else if (type == 'r13') {
            return '合作'
        } else if (type == 'r14') {
            return '合建'
        } else if (type == 'r15') {
            return '合资'
        } else if (type == 'r16') {
            return '并购'
        } else if (type == 'r17') {
            return '开发'
        } else if (type == 'r18') {
            return '总包'
        } else if (type == 'r19') {
            return '总承包'
        } else if (type == 'r20') {
            return '承包'
        } else if (type == 'r21') {
            return '承建'
        } else if (type == 'r22') {
            return '承接'
        } else if (type == 'r23') {
            return '投建'
        } else if (type == 'r24') {
            return '投资'
        } else if (type == 'r25') {
            return '控股'
        } else if (type == 'r26') {
            return '援助'
        } else if (type == 'r27') {
            return '援建'
        } else if (type == 'r28') {
            return '收购'
        } else if (type == 'r29') {
            return '融资'
        } else if (type == 'r30') {
            return '资助'
        } else {
            return ''
        }
    }

    // console.log(relationData);
    for (var i = 0; i < relationData.length; i++) {
        if (relationData[i].data.obj.startNode == node.id || relationData[i].data.obj.endNode == node.id) {
            relationDataList.push(relationData[i]);
            for (var j = 0; j < NodeData.length; j++) {
                if (NodeData[j].id == relationData[i].data.obj.startNode || NodeData[j].id == relationData[i].data.obj.endNode) {
                    if (node.id !== NodeData[j].id) {
                        NodeData[j].data.obj.type = getRelation(relationData[i]);
                        NodeDataList.push(NodeData[j]);
                    }
                }
            }
        }
    }
    NodeDataList = uniqeByKeys(NodeDataList, ['nodeId']);
    var projectStr = '<li><div class="detail-list-name">项目名称</div><div class="detail-list-relation">关系</div></li>';
    var compayStr = '<li><div class="detail-list-name">企业名称</div><div class="detail-list-relation">关系</div></li>';
    var personStr = '<li><div class="detail-list-name">重点人名称</div><div class="detail-list-relation">关系</div></li>';
    var eventStr = '<li><div class="detail-list-name">事件名称</div><div class="detail-list-relation">关系</div></li>';
    for (var o = 0; o < NodeDataList.length; o++) {
        if (NodeDataList[o].data.obj.labels == 'projects') {
            relationProject.push(NodeData[o]);
            projectStr += '<li><div class="detail-list-name">' + NodeDataList[o].data.obj.properties.name + '</div><div class="detail-list-relation">' + NodeDataList[o].data.obj.type + '</div></li>'
        } else if (NodeDataList[o].data.obj.labels == 'correlation_project') {
            relationCompay.push(NodeData[o]);
            compayStr += '<li><div class="detail-list-name">' + NodeDataList[o].data.obj.properties.name + '</div><div class="detail-list-relation">' + NodeDataList[o].data.obj.type + '</div></li>';
        } else if (NodeDataList[o].data.obj.labels == 'state_relevantpeople') {
            relationPerson.push(NodeData[o]);
            personStr += '<li><div class="detail-list-name">' + NodeDataList[o].data.obj.properties.name + '</div><div class="detail-list-relation">' + NodeDataList[o].data.obj.type + '</div></li>';
        } else {
            relationEvent.push(NodeData[o]);
            eventStr += '<li><div class="detail-list-name">' + NodeDataList[o].data.obj.properties.name + '</div><div class="detail-list-relation">' + NodeDataList[o].data.obj.type + '</div></li>';
        }
    }
    $('.detail .detail-project').html(projectStr);
    $('.detail .detail-compay').html(compayStr);
    $('.detail .detail-person').html(personStr);
    $('.detail .detail-event').html(eventStr);
    $('.detail .nav li').addClass('Myhide');
    if (relationProject.length > 0) {
        $('.detail .nav li').eq(0).removeClass('Myhide');
    }
    if (relationCompay.length > 0) {
        $('.detail .nav li').eq(1).removeClass('Myhide');
    }
    if (relationPerson.length > 0) {
        $('.detail .nav li').eq(2).removeClass('Myhide');
    }
    if (relationEvent.length > 0) {
        $('.detail .nav li').eq(3).removeClass('Myhide');
    }
    $('.detail .tab-content .tab-pane').removeClass('active');
    $('.detail .nav li').removeClass('active');

    $('.detail .detail-relation-count').html('共有<b>' + relationDataList.length + '</b>个相关实体');

    if (!$('.detail .nav li').eq(0).hasClass('Myhide')) {
        $('.detail .nav li').eq(0).addClass('active');
        $('.detail .tab-content .tab-pane').eq(0).addClass('active');
        return;
    } else if (!$('.detail .nav li').eq(1).hasClass('Myhide')) {
        $('.detail .nav li').eq(1).addClass('active');
        $('.detail .tab-content .tab-pane').eq(1).addClass('active');
        return;
    } else if (!$('.detail .nav li').eq(2).hasClass('Myhide')) {
        $('.detail .nav li').eq(2).addClass('active');
        $('.detail .tab-content .tab-pane').eq(2).addClass('active');
        return;
    } else if (!$('.detail .nav li').eq(3).hasClass('Myhide')) {
        $('.detail .nav li').eq(3).addClass('active');
        $('.detail .tab-content .tab-pane').eq(3).addClass('active');
        return;
    } else {
    }

}

// 获取数据
function getData(current) {
    // param = $.extend(defaultParam, param);
    $(".overall").show();
    var url;

    if (current == null) {
        url = INDEXURL + './graph.json';
        var params = {
            name: '万丰奥特控股集团有限公司'
        }
    } else {
        url = INDEXURL + './graph.json';
        var params = {
            name: current,
            level: 6
        }
    }


    // var url = INDEXURL + 'findAtlasByName';
    $.ajax({
        url: url,
        //url:'http://10.0.0.38:9600/api/Graph/GetCompanyGraph',
        type: 'GET',
        data: params,
        dataType: 'JSON',
        headers: {
            "content-type": "application/json;charset=UTF-8"
        },
        success: function (res) {
            re = res.data;
            dataList = re;
            /*大咖搜索地址栏补足keyNo*/
            if (window.location.pathname == '/company_muhouperson') {
                history.pushState('', '', 'company_muhouperson?keyNo=' + _currentKeyNo);
            }

            if (!res.result || res.result.results.length == 0 || res.result.results[0].data.length == 0 || res.result.results[0].data[0].graph.nodes.length == 0) {
                $(".overall").hide();
                console.log('没有数据');
                errMessage('抱歉，没有找到符合条件的数据');
                return
            } else {
                _rootDataList = res.result.results[0].data;
                _rootData = getRootData(_rootDataList);
                domUpdate(_rootData);
                updataShowList(_rootData);
            }

        }, error: function (data) {
            $(".overall").hide();
            errMessage('数据请求失败');
            $(".printLogo").hide();
            $(".tp-foot").hide();
            $("#Main").hide();
            $('#no_data').show();
        }
    });
}

// 刷新图谱
function refresh(keyNo) {
    $('.company-detail').fadeOut();
    $('#MainCy').html('');
    _currentKeyNo = keyNo;
    $('#TrTxt').removeClass('active');
    getData(_rootCurrent);
    focusCancel();
    filterReset();
    if (toggleRelationFlag) {
        $('#TrRelation').click();
    }

    //页面
    try {
        hideSearchBoxHide();
    } catch (e) {
    }
}

/**详情弹窗*/
function showPerTupu(type) {
    var canshow = $("#ShowPerTupu").attr('canshow');
    if (canshow) {
        var keyNo = $("#ShowPerTupu").attr('keyno');
        refresh(keyNo);
    }
}

/*关闭详情*/
function popclose(dom) {
    $(dom).parent().parent().fadeOut();
}

/*人物头像没有时处理*/
function personImgErr() {
    var name = $(".ea_name").text();
    $('#face_oss').hide();
    $('.ea_defaultImg').show();
    $('.ea_defaultImg').text(name[0]);
}

// 扩散请求
function diffusionData(params) {
    $.ajax({
        url: INDEXURL + './graph.json',
        method: 'get',
        data: params,
        dataType: 'JSON',
        success: function (res) {
            if (res.result.results[0].data[0].graph.nodes.length == 0){
                errMessage('抱歉，没有找到符合条件的数据');
                return;
            }
            _rootDataList[0].graph.nodes = _rootDataList[0].graph.nodes.concat(res.result.results[0].data[0].graph.nodes);
            _rootDataList[0].graph.relationships = _rootDataList[0].graph.relationships.concat(res.result.results[0].data[0].graph.relationships);

            var _rootDataAdd = getRootData(_rootDataList);
            domUpdate(_rootDataAdd);
            updataShowList(_rootDataAdd);
        },
        error: function (err) {
            errMessage('请求失败');
        }
    })
}

// 轮盘点击扩散的事件
function diffusionEvent(nodeData) {
    var params;
    params = {
        name: nodeData.name,
        level: 1
    }
    diffusionData(params);
}

// 轮盘聚集事件
function aggregateEvent(nodeData) {
    function aaggregateList(nodeData) {
        var onlyNode = [];
        var onlyEdge = [];
        $.each(drawGraphData.edges, function (index, item) {
            if (item.data.source == nodeData.nodeId && item.data.target != _rootId) {
                var targenCount = 0;
                for (var i = 0; i < drawGraphData.edges.length; i++) {
                    if (item.data.id != drawGraphData.edges[i].data.id && (item.data.target == drawGraphData.edges[i].data.source || item.data.target == drawGraphData.edges[i].data.target)) {
                        targenCount++;
                    }
                }
                if (targenCount == 0) {
                    onlyNode.push(item.data.target);
                    onlyEdge.push(item.data.id);
                }
            } else if (item.data.target == nodeData.nodeId && item.data.source != _rootId) {
                var sourceCount = 0;
                for (var i = 0; i < drawGraphData.edges.length; i++) {
                    if (item.data.id != drawGraphData.edges[i].data.id && (item.data.source == drawGraphData.edges[i].data.source || item.data.source == drawGraphData.edges[i].data.target)) {
                        sourceCount++;
                    }
                }
                if (sourceCount == 0) {
                    onlyNode.push(item.data.source);
                    onlyEdge.push(item.data.id);
                }
            } else {
            }
        })
        var aaggregateData = {};
        if (onlyNode.length > 0) {
            var aaggregateDrawGraphDataNode = [];
            $.each(drawGraphData.nodes, function (index, item) {
                if (onlyNode.indexOf(item.data.nodeId) == -1) {
                    aaggregateDrawGraphDataNode.push(item);
                }
            });

            drawGraphData.nodes = aaggregateDrawGraphDataNode;
        }

        if (onlyEdge.length > 0) {
            var aaggregateDrawGraphDataEdge = [];
            $.each(drawGraphData.edges, function (index, item) {
                if (onlyEdge.indexOf(item.data.id) == -1) {
                    aaggregateDrawGraphDataEdge.push(item);
                }
            })
            drawGraphData.edges = aaggregateDrawGraphDataEdge;
        }
        drawGraph(drawGraphData);
    }

    if (nodeData.name == _rootCurrent) {
        errMessage('当前节点不允许聚集');
    } else {
        aaggregateList(nodeData);
    }
}

// 新增实体
function addNode() {
    $('.addNodeDialog .tab-content .tab-pane input').val('');
    $('.addNodeDialog').show();
    $('.addNodeDialog .addNodeDialog-main .nav').show();
    $('.addNodeDialog .addNodeDialog-title').text('新增实体');
    $('.addNodeDialog .addNodeDialog-main .tab-content>div').removeClass('active');
    $('.addNodeDialog .addNodeDialog-main .tab-content>div').eq(0).addClass('active');
    $('.addNodeDialog .addNodeDialog-main .nav>li').removeClass('active');
    $('.addNodeDialog .addNodeDialog-main .nav>li').eq(0).addClass('active');
    addNodeTypeInt = 1;
    $('.addNodeDialog .addNodeDialog-main .tab-content .addNodeDialog-table').removeClass('borderBottomLi');
    $('.addNodeDialog .tab-content .exist').hide();
}


var addNodeTypeInt = 1;

function addNodeType(int) {
    addNodeTypeInt = int;
}

// 新增实体 name输入框 失焦
function addNodeName() {
    $('.addNodeDialog .tab-content .exist').hide();
    if (addNodeTypeInt == 1) {
        var addNodeNmae = $('#addNode-Name').val();
    } else if (addNodeTypeInt == 2) {
        var addNodeNmae = $('#addNode-Name-company').val();
    } else if (addNodeTypeInt == 3) {
        var addNodeNmae = $('#addNode-Name-person').val();
    } else {
        var addNodeNmae = $('#addNode-Name-event').val();
    }
    if (addNodeNmae.length > 0 && $('.addNodeDialog .addNodeDialog-title').text() == '新增实体') {
        $.ajax({
            url: INDEXURL + './graph.json',
            type: 'GET',
            data: {
                name: addNodeNmae,
                type: addNodeTypeInt
            },
            dataType: 'json',
            success: function (res) {
                if (res.result.results.length > 0 && res.result.results[0].data.length > 0) {
                    var nodeData = getRootData(res.result.results[0].data);

                    var existNode = nodeData.nodes;
                    for (var i = 0; i < existNode.length; i++) {
                        if (addNodeNmae == existNode[i].data.obj.properties.name) {
                            $('.addNodeDialog .tab-content .exist').show();
                        }
                    }

                    $('.addNodeDialog .tab-content .exist').click(function () {
                        detailDialogEvent(nodeData.nodes[0], true);
                    })
                } else {
                    $('.addNodeDialog .tab-content .exist').hide();

                }
            }, error: function (data) {

            }
        })
    } else {
        $('.exist').hide();
    }

}

var modificationNodeID = null;

// 新增节点事件
function addNodeEvent() {
    $('.overall').show();
    $('.addNodeDialog').hide();
    var params = {};
    var labels = '';
    var obj = {};
    if (addNodeTypeInt == 1 || $('.addNodeDialog .addNodeDialog-main .tab-content>div').eq(0).hasClass('active')) {
        labels = 'projects';
        obj = {
            'name': $('.addNodeDialog .tab-content .addProjectName').val(),
            'type': $('.addNodeDialog .tab-content .addProjectType').val(),
            'investPattern': $('.addNodeDialog .tab-content .addProjectInvestPattern').val(),
            'industry': $('.addNodeDialog .tab-content .addProjectIndustry').val(),
            'location': $('.addNodeDialog .tab-content .addProjectLocation').val(),
            'state': $('#cityInputProject').val(),
            'stateSimple': slectSateSimple1,
            'validDate': $('.addNodeDialog .tab-content .addProjectValidDate').val(),
            'beginDate': $('.addNodeDialog .tab-content .addProjectBeginDate').val(),
            'endDate': $('.addNodeDialog .tab-content .addProjectEndDate').val(),
            'companyName': $('.addNodeDialog .tab-content .addProjectCompanyName').val(),
            'totalSumPlan': $('.addNodeDialog .tab-content .addProjectTotalSumPlan').val(),
            'label': $('.addNodeDialog .tab-content .addProjectLabel').val(),
            'description': $('.addNodeDialog .tab-content .addProjectDescription').val()
        }
    } else if (addNodeTypeInt == 2 || $('.addNodeDialog .addNodeDialog-main .tab-content>div').eq(1).hasClass('active')) {
        labels = 'correlation_project';
        obj = {
            'name': $('.addNodeDialog .tab-content .addCompanyName').val()
        }
    } else if (addNodeTypeInt == 3 || $('.addNodeDialog .addNodeDialog-main .tab-content>div').eq(2).hasClass('active')) {
        labels = 'state_relevantpeople';
        obj = {
            'name': $('.addNodeDialog .tab-content .addPersonName').val(),
            'peopleDescription': $('.addNodeDialog .tab-content .addPersonPeopleDescription').val(),
            'companyName': $('.addNodeDialog .tab-content .addPersonCompanyName').val()
        }
    } else {
        labels = 'event';
        obj = {
            'name': $('.addNodeDialog .tab-content .addEventName').val(),
            'description': $('.addNodeDialog .tab-content .addEventDescription').val(),
            'state': $('.addNodeDialog .tab-content .addEventState').val(),
            'beginDate': $('.addNodeDialog .tab-content .addEventBeginDate').val(),
            'state': $('#cityInputEvent').val(),
        }
    }
    var url = null;
    if ($('.addNodeDialog .addNodeDialog-title').text() == '新增实体') {
        url = INDEXURL + 'modifier/addEntity';
        params = {
            jsonStr: JSON.stringify(obj),
            labels: labels
        }
    } else if ($('.addNodeDialog .addNodeDialog-title').text() == '修改实体') {
        url = INDEXURL + 'modifier/updateEntity';
        params = {
            jsonStr: JSON.stringify(obj),
            id: modificationNodeID
        }
    }
    // url: './mockAdd.json',
    // method: 'get',
    $.ajax({
        url: url,
        method: 'POST',

        data: params,
        dataType: 'JSON',
        success: function (res) {
            if ($('.addNodeDialog .addNodeDialog-title').text() == '新增实体') {
                if (res.message == '添加成功') {
                    _rootDataList[0].graph.nodes.push(res.result.results[0].data[0].graph.nodes[0]);
                    var _rootDataAdd = getRootData(_rootDataList);
                    _rootData = _rootDataAdd;
                    domUpdate(_rootDataAdd);
                    updataShowList(_rootDataAdd);
                    $('#addRelationDiaLog .modal-body').text('节点添加成功，是否为新增节点添加关系?');
                    $('#addRelationDiaLog').modal('show');
                    $('#addRelationDiaLog-button').click(function () {
                        $('#addRelationDiaLog').modal('hide');
                        var addDialogEventParams = {};
                        $.each(drawGraphData.nodes, function (index, item) {
                            if (item.data.nodeId == res.result.results[0].data[0].graph.nodes[0].id) {
                                addDialogEventParams = item.data;
                                return;
                            }
                        })
                        addDialogEvent(addDialogEventParams);
                    })
                }
            } else if ($('.addNodeDialog .addNodeDialog-title').text() == '修改实体') {
                $('#myDiaLog .modal-body').text(res.message);
                $('#confirm-button').hide();
                $('.overall').hide();
                refresh();
                $('#myDiaLog').modal('show');
            }
        },
        error: function (res) {
            alert(res.message);
            $('.addNodeDialog').hide();
            $('.overall').show();
        }
    })
}


// 选择国家
var flag;

function selectCityEvent(flagIndex) {
    flag = flagIndex;
    searchCityEvent();
}

function searchCityEvent() {
    if (flag == 1) {
        var state = $('.addNodeDialog .tab-content .addProjectState').val();
    } else {
        var state = $('.addNodeDialog .tab-content .addEventState').val();
    }
    // console.log(state);
    $.ajax({
        url: '',
        method: 'get',
        data: {
            state: state,
        },
        jsonp: 'callback',
        dataType: 'jsonp',
        jsonpCallback: "success_jsonpCallback",
    })
}

var cityList = [];

// 选择国家回调
function callback(res) {
    // console.log(res);
    if (res != undefined || res.data.length > 0) {
        cityList = res.data;
        var cityStr = '';
        for (var i = 0; i < cityList.length; i++) {
            var state = cityList[i].state;
            var stateSimple = cityList[i].stateSimple;
            cityStr += '<li class="selectCity-list" onclick="selectCity(' + i + ')">' + state + '</li>'
        }
        // console.log(cityStr);
    } else {
        var cityStr = '<li class="selectCity-list">暂无匹配选项</li>';
    }
    $('.selectCity').html(cityStr);
    $('.selectCity').show();
}


var selectState1 = '';
var slectSateSimple1 = '';
var selectState2 = '';
var slectSateSimple2 = '';

// 用户点击选中国家
function selectCity(index) {
    // console.log(flag)
    if (flag == 1) {
        $('#cityInputProject').val(cityList[index].state);
        selectState1 = cityList[index].state;
        slectSateSimple1 = cityList[index].stateSimple;
    } else {
        $('#cityInputEvent').val(cityList[index].state);
        selectState2 = cityList[index].state;
        slectSateSimple2 = cityList[index].stateSimple;
    }

}

function success_jsonpCallback() {
}

var getShowListLiFlag = false;

function searchHeadChange() {
    getShowListLiFlag = false;
}


// 更新搜索列表数据
function updataShowList(dataList) {
    var upDataList = [];
    var idStr = 0;
    var str = '';
    for (var i = 0; i < dataList.nodes.length; i++) {

        var ShowLIstType = '';
        var ShowListName = dataList.nodes[i].data.obj.properties.name;
        var ShowListId = dataList.nodes[i].data.obj.id;
        if (dataList.nodes[i].data.obj.labels[0] == 'correlation_project') {
            ShowLIstType = '企业'
        } else if (dataList.nodes[i].data.obj.labels[0] == 'state_relevantpeople') {
            ShowLIstType = '重点人'
        } else if (dataList.nodes[i].data.obj.labels[0] == 'projects') {
            ShowLIstType = '项目'
        } else {
            ShowLIstType = '事件'
        }
        if (searchType == '全部') {
            idStr++;
            str += '<li id=' + idStr + ' class="showList-li" onclick="getShowListLi(' + idStr + ',' + ShowListId + ')"><div class="showList-project"><span>' + ShowLIstType + '</span></div><div class="showList-name">' + ShowListName + '</div><div class="showList-id">' + ShowListId + '</div></li>'
        } else if (searchType !== '全部' && searchType == ShowLIstType) {
            idStr++;
            str += '<li id=' + idStr + ' class="showList-li" onclick="getShowListLi(' + idStr + ',' + ShowListId + ')"><div class="showList-project"><span>' + ShowLIstType + '</span></div><div class="showList-name">' + ShowListName + '</div><div class="showList-id">' + ShowListId + '</div></li>'
        }
    }
    // $('#showList').html(str);
    $('#cityList').html(str);
}

// 详情、修改弹框
function detailDialogEvent(nodeData, showHide) {
    // console.log(nodeData);
    $('#circle-nav').hide();
    $('#DetailDiaLog').modal('show');
    var nodeDataDetail = nodeData.data.obj.properties;
    var detailDialogStr = '';
    if (nodeData.type == 'projects' || nodeData.data.obj.labels[0] == 'projects') {
        detailDialogStr = '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '项目名称' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.name + '</div></li>' +
            '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '项目类型' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.type + '</div></li>' +
            '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '投资方式' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.investPattern + '</div></li>' +
            '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '所属行业' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.industry + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '项目地点' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.location + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '项目有效期' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.validDate + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '开始时间' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.beginDate + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '结束时间' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.endDate + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '项目承接单位' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.companyName + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '项目总金额' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.totalSum + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '项目标注' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.label + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '项目内容描述' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.description + '</div></li>'
    } else if (nodeData.type == 'state_relevantpeople' || nodeData.data.obj.labels[0] == 'state_relevantpeople') {
        detailDialogStr = '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '重点人ID' + '</div><div class="DetailDialog-li-context">' + nodeData.nodeId + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '重点人姓名' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.name + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '重点人简介' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.peopleDescription + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '重点人企业' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.companyName + '</div></li>';
    } else if (nodeData.type == 'correlation_project' || nodeData.data.obj.labels[0] == 'correlation_project') {
        detailDialogStr = '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '企业ID' + '</div><div class="DetailDialog-li-context">' + nodeData.nodeId + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '企业名称' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.name + '</div></li>';
    } else {
        detailDialogStr = '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '事件ID' + '</div><div class="DetailDialog-li-context">' + nodeData.id + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '事件名称' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.name + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '描述' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.description + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '国家(地点)' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.state + '</div></li>' + '<li class="DetailDialog-li"><div class="DetailDialog-li-name">' +
            '发生时间' + '</div><div class="DetailDialog-li-context">' + nodeDataDetail.beginDate + '</div></li>';
    }
    $('.DetailDialog-project').html(detailDialogStr);
    if (showHide == true) {
        $('#DetailDiaLog .modal-dialog .modal-footer').show();
        var toUrlStr;
        toUrlStr = '<a href="./index.html?current=' + nodeDataDetail.name + '&type=' + nodeData.data.obj.labels[0] + '"' + 'target="_blank"><button id="DetailDiaLog-button">查看图谱</button></a>'
        $('#DetailDiaLog .modal-dialog .modal-footer').html(toUrlStr);
    } else {
        $('#DetailDiaLog .modal-dialog .modal-footer').hide();
    }
}

// 新增关系弹框
var formId = null, toId = null;
var repeatClick = 1;

function addDialogEvent(nodeData) {
    $('#addDiaLog').modal('show');
    $("#addDiaLog .addRelation-box .addDialog-startNode .addRelationButton span").text(nodeData.name);
    formId = parseInt(nodeData.nodeId);
    var AddNodeList = _rootData.nodes;
    var AddNodeListStartStr = '';
    var AddNodeListendStr = '';
    AddNodeList.forEach(function (item, index) {
        AddNodeListStartStr += '<li onclick="selectAddNode(' + item.id + ',1,$(this).text())">' + item.data.obj.properties.name + '</li>';
        AddNodeListendStr += '<li onclick="selectAddNode(' + item.id + ',2,$(this).text())">' + item.data.obj.properties.name + '</li>';
    });
    $('#addDiaLog .addRelation-box .addDialog-startNode .dropdown-menu').html(AddNodeListStartStr);
    $('#addDiaLog .addRelation-box .addDialog-endNode .dropdown-menu').html(AddNodeListendStr);
    $('#addDiaLog .addDialog-relation .dropdown-menu span').click(function () {
        $('#addDiaLog .addDialog-relation input').val($(this).html());
    })
    $('#addDiaLog-button').click(function () {
        if (formId == null) {
            errMessage('请选择开始节点')
        } else if (toId == null) {
            errMessage('请选择结束节点')
        } else if ($('#addDiaLog .addDialog-relation input').val() == '') {
            errMessage('请输入要创建的关系名称');
        } else if (formId == toId) {
            errMessage('开始节点不能和结束节点相同');
        } else {


            var relationInputVal = $('#addDiaLog .addDialog-relation input').val();
            var relationType = getLinkType(relationInputVal);

            var properties = {};
            if (relationType == 'c1') {
                properties.name = relationInputVal;
            }
            var params;
            params = {
                fromId: formId,
                toId: toId,
                relationType: relationType,
                jsonStr: JSON.stringify(properties)
            }
            // console.log(params);
            $('#addDiaLog').modal('hide');
            $('#addDiaLog .addDialog-relation input').val('');
            $('#addDiaLog .addDialog-endNode .addRelationButton span').val('请选择节点');
            if (repeatClick == 1) {
                repeatClick = 2;
                $.ajax({
                    url: INDEXURL + './addNode.json',
                    method: 'post',
                    data: params,
                    dataType: 'JSON',
                    success: function (res) {
                        repeatClick = 1;
                        // console.log(res);
                        if (res.success) {
                            $('#myDiaLog .modal-body').text('新增关系成功');
                            $('#myDiaLog').modal('show');
                            $('#confirm-button').hide();
                            refresh();
                        } else {
                            errMessage('新增失败')
                        }
                    },
                    error: function (err) {
                        repeatClick = 1;
                        errMessage('新增失败')
                    }
                })
            }
        }
    })
}

// 选择新增关系
function selectAddNode(nodeId, type, name) {
    // console.log(nodeId, type, name);
    if (type == 1) {
        $("#addDiaLog .addRelation-box .addDialog-startNode .addRelationButton span").text(name);
        formId = nodeId;
    } else if (type == 2) {
        $("#addDiaLog .addRelation-box .addDialog-endNode .addRelationButton span").text(name);
        toId = nodeId;
    } else {
    }
}

// 错误提示事件
function errMessage(text) {
    $('.errMessage span').text(text);
    $('#errMessage').show();
    setTimeout(function () {
        $('#errMessage').hide();
    }, 1000)
}

var getShowListData;
var getShowListId;

function getShowListLi(data, ShowListId) {
    getShowListLiFlag = true;
    getShowListData = data;
    getShowListId = ShowListId;
    $('#cityName').val($('#' + data + ' .showList-name').html());
    // console.log(ShowListId);
    if (!ShowListId) {
        return;
    } else {
        highLight([ShowListId], cy);
    }
    //
    // document.getElementById('cityName').value = data;
    // $('#cityName').value = data;
}

function headSearch() {
    if (getShowListLiFlag) {
        getShowListLi(getShowListData, getShowListId)
    } else {
        errMessage('请选择一个实体');
    }
}

// 输入框聚焦
function searchInputFocus() {
    $('#showList').show();
}

// 视窗发生变化触发
window.onresize = function (evt) {
    resizeScreen();
}

//页面加载完成触发
$(document).ready(function () {

    // _currentKeyNo = getQueryString('keyNo');
    if (!_currentKeyNo) {
        if (typeof _HOTPERSON != 'undefined' && _HOTPERSON) {
            _currentKeyNo = _HOTPERSON;
        } else {
            _currentKeyNo = '';
        }
    }

    var Winurl = window.location;

    function getUrlParam(url, name) {
        var pattern = new RegExp("[?&]" + name + "\=([^&]+)", "g");
        var mathcer = pattern.exec(url);
        var items = null;
        if (mathcer != null) {
            try {
                items = decodeURIComponent(decodeURIComponent(mathcer[1]))
            } catch (e) {
                try {
                    items = decodeURIComponent(mathcer[1]);
                } catch (e) {
                    items = mathcer[1];
                }
            }
        }
        return items;
    }

    var current = getUrlParam(Winurl, 'current');
    _rootId = getUrlParam(Winurl, 'id')
    _rootCurrent = current;
    $('#currentNode').hide();
    if (current !== null) {
        var str = '';
        str = '<a href="http://10.16.1.22:8080/web/client/Knowledge.action" class="glyphicon glyphicon-share-alt" style="transform: rotateY(180deg);line-height: 32px;margin: 0 10px;text-decoration: none;"></a> <span>' + current + '</span>'
        $('.crumbs').html(str);
        $('#currentNode').show();
        $('#current').show();
        $('title').html(current);
    }
    ;
    getData(current);

    /**筛选面板*/

    // 层级筛选
    $("#ShowLevel > a").click(function () {
        $('#ShowLevel > a').removeClass('active');
        $(this).addClass('active');

        var level = parseInt($(this).attr('level'));
        $('#SelPanel').attr('param-level', level);
        filter(_rootData);
    });//#ShowLevel
    // 状态筛选
    $("#ShowStatus > a").click(function () {
        $('#ShowStatus > a').removeClass('active');
        $(this).addClass('active');

        var status = $(this).attr('status');
        $('#SelPanel').attr('param-status', status);
        filter(_rootData);
    });//#ShowLevel
    // 持股筛选
    var inputEvent = (!!window.ActiveXObject || "ActiveXObject" in window) ? 'change' : 'input';
    $('#inputRange').bind(inputEvent, function (e) {

        var value = $('#inputRange').val();
        $('#rangeValue').text(value);
        $('#inputRange').css('background-size', value + '% 100%');
        $('#RangeLabel span').text(value + '%');

        $('#SelPanel').attr('param-num', value);
        filter(_rootData);
    });
    // 投资筛选
    $("#ShowInvest > a").click(function () {
        $('#ShowInvest > a').removeClass('active');
        $(this).addClass('active');

        var invest = $(this).attr('invest');
        $('#SelPanel').attr('param-invest', invest);
        filter(_rootData);
    });//#ShowLevel
    // 关闭
    $('.tp-sel-close span').click(function () {
        selPanelHide();
    });
    // 聚焦
    $('#FocusBt').click(function () {
        var status = $('#FocusBt').text();
        if (!$(this).hasClass('focusDisable')) {
            if (status == '聚焦') {
                if (!$('#FocusInput').val()) {
                    faldia({content: '请点击选取结点'});
                    return;
                }

                var nodeId = $('#FocusInput').attr('node_id')
                if (!nodeId) {
                    return;
                } else {
                    $('#FocusBt').text('取消');
                    highLight([nodeId], cy);
                }
            } else if (status == '取消') {
                focusCancel();
            }
        }

    });
    // 输入框
    $('#FocusInput').keyup(function () {
        $('.tp-list').html('');
        var _this = $(this);
        var keyword = _this.val();

        if (keyword) {
            $('#ClearInput').show();
        } else {
            $('#ClearInput').hide();
        }

        setTimeout(function () {
            var selNodes = [];
            _rootData.nodes.forEach(function (node) {
                var name = node.data.obj.properties.name;
                if (name.match(keyword)) {
                    selNodes.push(node);
                }
            });

            selPanelUpdateList(selNodes, _rootData.links, false);
        }, 500);
    });
    $('#ClearInput').click(function () {
        focusCancel();
    });

    /**详情面板*/

    $('.tp-detail-close span').click(function () {
        //cancelHighLight();
        $('.tp-detail').fadeOut();
    });
    /*$('#ViewTupu').click(function () {
        var guid = $(this).attr('guid');
        init(guid);
    });*/

    /**侧边栏*/

    $('#TrSel').click(function () {
        var _this = $(this);
        if (_this.hasClass('active')) {
            selPanelHide();
        } else {
            selPanelShow();
        }
    });
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

            launchFullScreen($('#Main'));
        }
    });
    $('#TrRefresh').click(function () {
        refresh(_currentKeyNo);
    });
    $('#TrSave').click(function () {
        if (!$('#TrTxt').hasClass('active')) {
            $('#TrTxt').click();
        }

        canvasImg(cy.png({full: true, bg: '#0000', scale: 1.8}));
    });
    // 第二层轮子
    $(".circle-nav-one-gather").click(function () {
        // $('.circle-nav-two').css({'display': 'block'});
    })
    //     .mouseout(function (){
    //     $('.circle-nav-two').css({'display':'none'});
    // });
    $(".circle-nav-two").click(function () {
        // $('.circle-nav-two').css({'display': 'block'});
    })
    //     .mouseout(function (){
    //     $('.circle-nav-two').css({'display':'none'});
    // });
});
